import pino from 'pino';

const logger = pino();

interface PerformanceEntry {
  calendarEntryId: string;
  date: Date;
  topic: string;
  pillarName: string;
  contentType: string;
  impressions?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  saves?: number;
  engagementRate?: number;
}

interface AnalyticsAdjustment {
  type: string;
  recommendation: string;
  impact: 'high' | 'medium' | 'low';
  parameter: string;
  newValue: any;
}

interface FeedbackOutput {
  adjustments: AnalyticsAdjustment[];
  topPerformingContentTypes: Array<{ type: string; avgEngagement: number }>;
  topPerformingPillars: Array<{ pillar: string; avgEngagement: number }>;
  bestPostingDays: string[];
  worstPostingDays: string[];
  engagementTrend: 'improving' | 'declining' | 'stable';
  summary: string;
}

export class AnalyticsFeedbackEngine {
  analyze(entries: PerformanceEntry[]): FeedbackOutput {
    logger.info({ count: entries.length }, 'Analyzing content performance feedback');
    const adjustments: AnalyticsAdjustment[] = [];

    const published = entries.filter(e => e.impressions !== undefined);
    if (published.length === 0) {
      return {
        adjustments: [],
        topPerformingContentTypes: [],
        topPerformingPillars: [],
        bestPostingDays: [],
        worstPostingDays: [],
        engagementTrend: 'stable',
        summary: 'Not enough performance data yet. Continue publishing to gather insights.',
      };
    }

    const byContentType = this.groupBy(published, 'contentType');
    const contentTypePerformance = Object.entries(byContentType).map(([type, items]) => ({
      type,
      avgEngagement: items.reduce((s, i) => s + (i.engagementRate || 0), 0) / items.length,
    })).sort((a, b) => b.avgEngagement - a.avgEngagement);

    const byPillar = this.groupBy(published, 'pillarName');
    const pillarPerformance = Object.entries(byPillar).map(([pillar, items]) => ({
      pillar,
      avgEngagement: items.reduce((s, i) => s + (i.engagementRate || 0), 0) / items.length,
    })).sort((a, b) => b.avgEngagement - a.avgEngagement);

    const byDay = this.groupBy(published, e => e.date.toLocaleDateString('en-US', { weekday: 'long' }));
    const dayPerformance = Object.entries(byDay).map(([day, items]) => ({
      day,
      avgEngagement: items.reduce((s, i) => s + (i.engagementRate || 0), 0) / items.length,
    })).sort((a, b) => b.avgEngagement - a.avgEngagement);

    if (contentTypePerformance.length > 0) {
      const best = contentTypePerformance[0];
      const worst = contentTypePerformance[contentTypePerformance.length - 1];
      adjustments.push({
        type: 'content_mix',
        recommendation: `Increase ${best.type} content by 10% — it averages ${(best.avgEngagement * 100).toFixed(1)}% engagement`,
        impact: 'high',
        parameter: 'contentMix',
        newValue: best.type,
      });
      if (worst.avgEngagement < 0.01) {
        adjustments.push({
          type: 'content_mix',
          recommendation: `Reduce ${worst.type} content — it underperforms at ${(worst.avgEngagement * 100).toFixed(1)}% engagement`,
          impact: 'medium',
          parameter: 'contentMix',
          newValue: worst.type,
        });
      }
    }

    if (dayPerformance.length >= 2) {
      const bestDay = dayPerformance[0];
      const worstDay = dayPerformance[dayPerformance.length - 1];
      adjustments.push({
        type: 'posting_schedule',
        recommendation: `${bestDay.day} is your best day (${(bestDay.avgEngagement * 100).toFixed(1)}% engagement). Schedule high-priority content on ${bestDay.day}.`,
        impact: 'high',
        parameter: 'bestDays',
        newValue: bestDay.day,
      });
    }

    const recentEntries = published.slice(-10);
    const olderEntries = published.slice(0, Math.max(0, published.length - 10));
    let engagementTrend: 'improving' | 'declining' | 'stable' = 'stable';
    if (recentEntries.length > 0 && olderEntries.length > 0) {
      const recentAvg = recentEntries.reduce((s, e) => s + (e.engagementRate || 0), 0) / recentEntries.length;
      const olderAvg = olderEntries.reduce((s, e) => s + (e.engagementRate || 0), 0) / olderEntries.length;
      engagementTrend = recentAvg > olderAvg * 1.1 ? 'improving' : recentAvg < olderAvg * 0.9 ? 'declining' : 'stable';

      if (engagementTrend === 'declining') {
        adjustments.push({
          type: 'strategy',
          recommendation: 'Engagement is declining. Consider shifting content strategy — try more engagement posts and ask questions.',
          impact: 'high',
          parameter: 'strategy',
          newValue: 'increase_engagement',
        });
      }
    }

    return {
      adjustments,
      topPerformingContentTypes: contentTypePerformance,
      topPerformingPillars: pillarPerformance,
      bestPostingDays: dayPerformance.slice(0, 2).map(d => d.day),
      worstPostingDays: dayPerformance.slice(-1).map(d => d.day),
      engagementTrend,
      summary: `${published.length} posts analyzed. ${adjustments.length} adjustments recommended. Engagement trend: ${engagementTrend}.`,
    };
  }

  private groupBy<T>(items: T[], keyFn: string | ((item: T) => string)): Record<string, T[]> {
    return items.reduce((acc: Record<string, T[]>, item: any) => {
      const key = typeof keyFn === 'function' ? keyFn(item) : item[keyFn];
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {} as Record<string, T[]>);
  }
}

export const analyticsFeedbackEngine = new AnalyticsFeedbackEngine();
