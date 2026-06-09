import mongoose from 'mongoose';
import pino from 'pino';
import { OpportunityPerformance, IOpportunityPerformance, ContentSource, OpportunityOutcome } from '../../../models/analytics/OpportunityPerformance';

const logger = pino();

export interface OpportunityFeedback {
  opportunityId: string;
  type: ContentSource;
  title: string;
  effectivenessScore: number;
  contentGenerated: number;
  careerImpact: { interviews: number; offers: number; connections: number };
  roi: { effort: 'low' | 'medium' | 'high'; return: 'low' | 'medium' | 'high'; score: number };
  rank: number;
}

export interface OpportunityFeedbackSummary {
  rankings: OpportunityFeedback[];
  bestType: { type: ContentSource; avgScore: number } | null;
  worstType: { type: ContentSource; avgScore: number } | null;
  insight: string;
}

export class OpportunityFeedbackEngine {
  async evaluate(userId: string): Promise<OpportunityFeedbackSummary> {
    logger.info({ userId }, 'Evaluating opportunity performance');

    const records = await OpportunityPerformance.find({
      userId: new mongoose.Types.ObjectId(userId),
    }).sort({ effectivenessScore: -1 }).lean();

    if (records.length === 0) {
      return { rankings: [], bestType: null, worstType: null, insight: 'No opportunity data yet. Start creating opportunities.' };
    }

    const rankings: OpportunityFeedback[] = records.map((r, i) => ({
      opportunityId: r.opportunityId.toString(),
      type: r.opportunityType,
      title: r.title,
      effectivenessScore: r.effectivenessScore,
      contentGenerated: r.contentCreated,
      careerImpact: {
        interviews: r.careerImpact.interviews,
        offers: r.careerImpact.offers,
        connections: r.careerImpact.connections,
      },
      roi: r.roi,
      rank: i + 1,
    }));

    const typeScores = new Map<ContentSource, { totalScore: number; count: number }>();
    for (const r of records) {
      if (!typeScores.has(r.opportunityType)) {
        typeScores.set(r.opportunityType, { totalScore: 0, count: 0 });
      }
      const entry = typeScores.get(r.opportunityType)!;
      entry.totalScore += r.effectivenessScore;
      entry.count += 1;
    }

    const sortedTypes = Array.from(typeScores.entries())
      .map(([type, data]) => ({ type, avgScore: Math.round(data.totalScore / data.count) }))
      .sort((a, b) => b.avgScore - a.avgScore);

    const bestType = sortedTypes[0] || null;
    const worstType = sortedTypes[sortedTypes.length - 1] || null;

    const insight = bestType
      ? `${bestType.type} opportunities are most effective (avg score: ${bestType.avgScore}/100)`
      : 'Start tracking opportunity performance';

    return { rankings, bestType, worstType, insight };
  }

  async trackResult(opportunityId: string, userId: string, outcome: OpportunityOutcome, metrics: Partial<IOpportunityPerformance['metrics']>): Promise<IOpportunityPerformance | null> {
    const record = await OpportunityPerformance.findOneAndUpdate(
      { opportunityId: new mongoose.Types.ObjectId(opportunityId), userId: new mongoose.Types.ObjectId(userId) },
      {
        $set: {
          outcome,
          dateCompleted: new Date(),
          metrics,
          effectivenessScore: this.computeEffectiveness(outcome, metrics),
          'metadata.analyzedAt': new Date(),
        },
      },
      { new: true }
    );

    return record;
  }

  async getPerformanceByType(userId: string): Promise<Array<{ type: ContentSource; avgScore: number; totalOpportunities: number; successRate: number; totalContent: number }>> {
    const records = await OpportunityPerformance.find({
      userId: new mongoose.Types.ObjectId(userId),
    }).lean();

    const typeMap = new Map<string, { scores: number[]; total: number; successful: number; contentCreated: number }>();

    for (const r of records) {
      const key = r.opportunityType;
      if (!typeMap.has(key)) typeMap.set(key, { scores: [], total: 0, successful: 0, contentCreated: 0 });
      const entry = typeMap.get(key)!;
      entry.scores.push(r.effectivenessScore);
      entry.total += 1;
      if (r.outcome === 'successful') entry.successful += 1;
      entry.contentCreated += r.contentCreated;
    }

    return Array.from(typeMap.entries()).map(([type, data]) => ({
      type: type as ContentSource,
      avgScore: Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length),
      totalOpportunities: data.total,
      successRate: Math.round((data.successful / data.total) * 100),
      totalContent: data.contentCreated,
    }));
  }

  private computeEffectiveness(outcome: OpportunityOutcome, metrics: Partial<IOpportunityPerformance['metrics']>): number {
    if (outcome === 'unsuccessful') return 0;
    if (outcome === 'pending') return 10;
    if (outcome === 'in_progress') return 30;
    if (outcome === 'irrelevant') return 5;

    let score = 60;
    if (metrics.engagement && metrics.engagement > 100) score += 15;
    if (metrics.followerGain && metrics.followerGain > 10) score += 10;
    if (metrics.authorityGain && metrics.authorityGain > 5) score += 10;
    if (metrics.impressions && metrics.impressions > 1000) score += 5;

    return Math.min(100, score);
  }
}

export const opportunityFeedbackEngine = new OpportunityFeedbackEngine();
