import mongoose from 'mongoose';
import pino from 'pino';
import { Analytics } from '../../../models/analytics/Analytics';
import { GrowthForecast, IGrowthForecast, ForecastPeriod } from '../../../models/analytics/GrowthForecast';

const logger = pino();

export interface ForecastResult {
  period: ForecastPeriod;
  projections: {
    followers: { current: number; projected: number; lower: number; upper: number; confidence: number; growthRate: number };
    engagement: { current: number; projected: number; lower: number; upper: number; confidence: number; growthRate: number };
    reach: { current: number; projected: number; lower: number; upper: number; confidence: number; growthRate: number };
    authority: { current: number; projected: number; lower: number; upper: number; confidence: number; growthRate: number };
    opportunities: { current: number; projected: number; lower: number; upper: number; confidence: number; growthRate: number };
  };
  predictions: Array<{
    category: string;
    title: string;
    description: string;
    probability: number;
    timeframe: string;
    impact: 'high' | 'medium' | 'low';
    signals: string[];
  }>;
  risks: Array<{ risk: string; probability: number; impact: number; mitigation: string }>;
}

export class PredictionEngine {
  async forecast(userId: string, period: ForecastPeriod = '90_days'): Promise<ForecastResult> {
    logger.info({ userId, period }, 'Generating growth forecast');

    const days = period === '30_days' ? 30 : period === '90_days' ? 90 : 365;
    const lookbackDays = Math.max(days * 2, 60);

    const analytics = await Analytics.find({
      userId: new mongoose.Types.ObjectId(userId),
      'period.start': { $gte: new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000) },
    }).sort({ 'period.start': 1 }).lean();

    const dailyMetrics = this.computeDailyMetrics(analytics, lookbackDays);
    const growthRates = this.computeGrowthRates(dailyMetrics);
    const seasonality = this.computeSeasonality(dailyMetrics);

    const current = this.getCurrentTotals(analytics);

    const followersProj = this.projectMetric(current.followers, growthRates.followers, days, seasonality.followers);
    const engagementProj = this.projectMetric(current.engagement, growthRates.engagement, days, seasonality.engagement);
    const reachProj = this.projectMetric(current.reach, growthRates.reach, days, seasonality.reach);
    const authorityProj = this.projectMetric(current.authority, growthRates.authority, days, seasonality.authority);
    const opportunitiesProj = this.projectMetric(current.opportunities, growthRates.opportunities, days, seasonality.opportunities);

    const predictions = this.generatePredictions(growthRates, period);
    const risks = this.identifyRisks(growthRates, current);

    return {
      period,
      projections: {
        followers: followersProj,
        engagement: engagementProj,
        reach: reachProj,
        authority: authorityProj,
        opportunities: opportunitiesProj,
      },
      predictions,
      risks,
    };
  }

  async saveForecast(userId: string, period: ForecastPeriod = '90_days'): Promise<IGrowthForecast | null> {
    const result = await this.forecast(userId, period);

    const forecast = await GrowthForecast.create({
      userId: new mongoose.Types.ObjectId(userId),
      period,
      status: 'completed',
      generatedAt: new Date(),
      projections: result.projections,
      goalProjections: [],
      predictions: result.predictions.map(p => ({
        ...p,
        signals: p.signals || [],
      })),
      assumptions: [{
        factor: 'Historical performance',
        impact: 80,
        description: 'Based on last 60-730 days of analytics data',
      }],
      risks: result.risks,
      metadata: {
        modelVersion: '1.0',
        dataPoints: 0,
        accuracy: 70,
        recalculationNeeded: false,
      },
    });

    return forecast;
  }

  private computeDailyMetrics(analytics: any[], lookbackDays: number): Map<string, any> {
    const daily = new Map<string, { followers: number; engagement: number; reach: number; authority: number; opportunities: number }>();

    for (let i = 0; i < lookbackDays; i++) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const key = date.toISOString().split('T')[0];
      daily.set(key, { followers: 0, engagement: 0, reach: 0, authority: 0, opportunities: 0 });
    }

    for (const a of analytics) {
      const key = new Date(a.period.start).toISOString().split('T')[0];
      if (!daily.has(key)) daily.set(key, { followers: 0, engagement: 0, reach: 0, authority: 0, opportunities: 0 });

      const entry = daily.get(key)!;
      for (const m of a.metrics || []) {
        switch (m.type) {
          case 'follower': entry.followers += m.value; break;
          case 'like': case 'comment': case 'share': case 'save': entry.engagement += m.value; break;
          case 'impression': entry.reach += m.value; break;
          case 'profile_visit': entry.authority += m.value; break;
          case 'opportunity_generated': entry.opportunities += m.value; break;
        }
      }
    }

    return daily;
  }

  private computeGrowthRates(dailyMetrics: Map<string, any>): Record<string, number> {
    const days = Array.from(dailyMetrics.entries()).sort((a, b) => a[0].localeCompare(b[0]));

    if (days.length < 7) return { followers: 0, engagement: 0, reach: 0, authority: 0, opportunities: 0 };

    const mid = Math.floor(days.length / 2);
    const firstHalf = days.slice(0, mid);
    const secondHalf = days.slice(mid);

    const avg = (entries: typeof days, key: string) =>
      entries.reduce((sum, [, v]) => sum + (v as any)[key], 0) / Math.max(entries.length, 1);

    const computeRate = (key: string): number => {
      const first = avg(firstHalf, key);
      const second = avg(secondHalf, key);
      if (first === 0) return 0.01;
      return (second - first) / first;
    };

    return {
      followers: computeRate('followers'),
      engagement: computeRate('engagement'),
      reach: computeRate('reach'),
      authority: computeRate('authority'),
      opportunities: computeRate('opportunities'),
    };
  }

  private computeSeasonality(dailyMetrics: Map<string, any>): Record<string, number> {
    return { followers: 0.1, engagement: 0.15, reach: 0.1, authority: 0.05, opportunities: 0.2 };
  }

  private getCurrentTotals(analytics: any[]) {
    let followers = 0;
    let engagement = 0;
    let reach = 0;
    let authority = 0;
    let opportunities = 0;

    for (const a of analytics) {
      for (const m of a.metrics || []) {
        switch (m.type) {
          case 'follower': followers += m.value; break;
          case 'like': case 'comment': case 'share': case 'save': engagement += m.value; break;
          case 'impression': reach += m.value; break;
          case 'profile_visit': authority += m.value; break;
          case 'opportunity_generated': opportunities += m.value; break;
        }
      }
    }

    return { followers: Math.abs(followers), engagement, reach, authority, opportunities };
  }

  private projectMetric(current: number, growthRate: number, days: number, seasonality: number): { current: number; projected: number; lower: number; upper: number; confidence: number; growthRate: number } {
    const dailyRate = growthRate / 30;
    const projected = Math.round(current * Math.pow(1 + dailyRate + seasonality / 30, days));
    const confidence = Math.max(30, Math.min(95, 70 - days * 0.1 + (current > 100 ? 10 : 0)));
    const variance = 1 - (confidence / 100);
    const lower = Math.round(projected * (1 - variance));
    const upper = Math.round(projected * (1 + variance));

    return {
      current: Math.round(current),
      projected: Math.max(current, projected),
      lower: Math.max(0, lower),
      upper: Math.max(projected, upper),
      confidence: Math.round(confidence),
      growthRate: Math.round(growthRate * 100),
    };
  }

  private generatePredictions(growthRates: Record<string, number>, period: ForecastPeriod): ForecastResult['predictions'] {
    const predictions: ForecastResult['predictions'] = [];

    const timeframe = period === '30_days' ? '30 days' : period === '90_days' ? '3 months' : '12 months';

    predictions.push({
      category: 'growth',
      title: growthRates.followers > 0.05 ? 'Accelerated follower growth expected' : 'Steady follower growth',
      description: `Based on current trajectory of ${Math.round(growthRates.followers * 100)}% monthly growth`,
      probability: 70,
      timeframe,
      impact: 'high',
      signals: ['Consistent publishing', 'Engagement rate trends'],
    });

    predictions.push({
      category: 'engagement',
      title: growthRates.engagement > 0.1 ? 'Strong engagement growth' : 'Engagement plateau expected',
      description: `Engagement growing at ${Math.round(growthRates.engagement * 100)}% per period`,
      probability: 65,
      timeframe,
      impact: 'medium',
      signals: ['Content quality scores', 'Audience response patterns'],
    });

    if (growthRates.opportunities > 0.05) {
      predictions.push({
        category: 'opportunity',
        title: 'Increasing opportunity generation expected',
        description: `Opportunities growing at ${Math.round(growthRates.opportunities * 100)}% per period`,
        probability: 60,
        timeframe,
        impact: 'high',
        signals: ['Recruiter interactions', 'Client lead generation'],
      });
    }

    return predictions;
  }

  private identifyRisks(growthRates: Record<string, number>, current: any): ForecastResult['risks'] {
    const risks: ForecastResult['risks'] = [];

    if (growthRates.engagement < 0) {
      risks.push({
        risk: 'Declining engagement rate',
        probability: 60,
        impact: 80,
        mitigation: 'Review and refresh content strategy, focus on higher-engagement formats',
      });
    }

    if (current.followers < 100) {
      risks.push({
        risk: 'Small follower base limits growth potential',
        probability: 40,
        impact: 70,
        mitigation: 'Focus on networking and cross-promotion strategies',
      });
    }

    if (growthRates.reach < 0.02) {
      risks.push({
        risk: 'Reach stagnation',
        probability: 50,
        impact: 60,
        mitigation: 'Optimize posting schedule and content formats for algorithm',
      });
    }

    return risks;
  }
}

export const predictionEngine = new PredictionEngine();
