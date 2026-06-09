import mongoose from 'mongoose';
import pino from 'pino';
import { Analytics, IAnalytics, MetricType, AnalyticsCategory } from '../../../models/analytics/Analytics';
import { Post } from '../../../models/content-generation/Post';

const logger = pino();

export interface IngestInput {
  userId: string;
  postId?: string;
  source: 'linkedin' | 'manual' | 'system';
  period: { start: Date; end: Date };
  metrics: Array<{ type: MetricType; value: number }>;
  rawData?: Record<string, any>;
}

export interface IngestResult {
  success: boolean;
  analyticsId?: string;
  metricsAdded: number;
}

export class PerformanceCollectionEngine {
  async ingest(input: IngestInput): Promise<IngestResult> {
    logger.info({ userId: input.userId }, 'Ingesting analytics data');

    const userId = new mongoose.Types.ObjectId(input.userId);
    const postId = input.postId ? new mongoose.Types.ObjectId(input.postId) : undefined;

    const metrics = input.metrics.map(m => ({
      type: m.type,
      value: m.value,
      previousValue: 0,
      change: 0,
      changePercent: 0,
    }));

    const engagement = this.computeEngagement(metrics);
    const reach = this.computeReach(metrics);
    const growth = this.computeGrowth(metrics);
    const opportunity = this.computeOpportunity(metrics);
    const authority = this.computeAuthority(metrics);
    const career = this.computeCareer(metrics);

    const categories = this.detectCategories(metrics);

    const records: IAnalytics[] = [];

    for (const category of categories) {
      const record = await Analytics.create({
        userId,
        postId,
        category,
        source: input.source,
        period: input.period,
        metrics: metrics.filter(m => this.metricBelongsToCategory(m.type, category)),
        engagement,
        reach,
        growth,
        opportunity,
        authority,
        career,
        rawData: input.rawData || {},
        metadata: {
          fetchedAt: new Date(),
          dataVersion: '1.0',
          isEstimated: false,
        },
      });
      records.push(record);
    }

    logger.info({ count: records.length }, 'Analytics data ingested');

    return {
      success: true,
      analyticsId: records[0]?._id?.toString(),
      metricsAdded: metrics.length,
    };
  }

  async getAggregated(userId: string, period?: { start: Date; end: Date }): Promise<IAnalytics | null> {
    const match: any = { userId: new mongoose.Types.ObjectId(userId) };
    if (period) {
      match['period.start'] = { $gte: period.start };
      match['period.end'] = { $lte: period.end };
    }

    const results = await Analytics.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$userId',
          totalEngagement: { $sum: '$engagement.engagementRate' },
          totalReach: { $sum: '$reach.reachRate' },
          totalGrowth: { $sum: '$growth.netGrowth' },
          totalOpportunities: { $sum: '$opportunity.opportunitiesGenerated' },
          totalAuthority: { $sum: '$authority.profileVisits' },
          totalCareer: { $sum: '$career.jobOffers' },
          avgEngagementRate: { $avg: '$engagement.engagementRate' },
          maxReach: { $max: '$reach.reachRate' },
        },
      },
    ]);

    if (results.length === 0) return null;
    return results[0] as any;
  }

  async getByPost(postId: string, userId: string): Promise<any[]> {
    return Analytics.find({
      postId: new mongoose.Types.ObjectId(postId),
      userId: new mongoose.Types.ObjectId(userId),
    }).sort({ 'period.start': -1 }).lean();
  }

  async getTrend(userId: string, metric: MetricType, days: number = 30): Promise<Array<{ date: string; value: number }>> {
    const start = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const results = await Analytics.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          'period.start': { $gte: start },
        },
      },
      { $unwind: '$metrics' },
      { $match: { 'metrics.type': metric } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$period.start' } },
          value: { $avg: '$metrics.value' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    return results.map(r => ({ date: r._id, value: Math.round(r.value) }));
  }

  private computeEngagement(metrics: any[]) {
    const likes = metrics.find(m => m.type === 'like')?.value || 0;
    const comments = metrics.find(m => m.type === 'comment')?.value || 0;
    const shares = metrics.find(m => m.type === 'share')?.value || 0;
    const saves = metrics.find(m => m.type === 'save')?.value || 0;
    const impressions = metrics.find(m => m.type === 'impression')?.value || 1;
    return {
      likes, comments, shares, saves,
      engagementRate: Math.round(((likes + comments * 2 + shares * 3 + saves * 2) / impressions) * 10000) / 100,
    };
  }

  private computeReach(metrics: any[]) {
    const impressions = metrics.find(m => m.type === 'impression')?.value || 0;
    const uniqueViews = metrics.find(m => m.type === 'reach')?.value || 0;
    return {
      impressions,
      uniqueViews,
      reachRate: uniqueViews > 0 ? Math.round((uniqueViews / impressions) * 10000) / 100 : 0,
    };
  }

  private computeGrowth(metrics: any[]) {
    return {
      followerGain: metrics.find(m => m.type === 'follower' && m.value > 0)?.value || 0,
      followerLoss: Math.abs(metrics.find(m => m.type === 'follower' && m.value < 0)?.value || 0),
      netGrowth: (metrics.find(m => m.type === 'follower')?.value || 0),
      connectionRequests: metrics.find(m => m.type === 'connection')?.value || 0,
    };
  }

  private computeOpportunity(metrics: any[]) {
    return {
      recruiterInteractions: metrics.find(m => m.type === 'recruiter_interaction')?.value || 0,
      clientLeads: metrics.find(m => m.type === 'client_lead')?.value || 0,
      opportunitiesGenerated: metrics.find(m => m.type === 'opportunity_generated')?.value || 0,
      messagesReceived: metrics.find(m => m.type === 'recruiter_interaction')?.value || 0,
    };
  }

  private computeAuthority(metrics: any[]) {
    return {
      profileVisits: metrics.find(m => m.type === 'profile_visit')?.value || 0,
      searchAppearances: 0,
      articleViews: 0,
      hashtagMentions: 0,
    };
  }

  private computeCareer(metrics: any[]) {
    return {
      jobOffers: 0,
      interviewRequests: 0,
      partnershipRequests: 0,
      speakingRequests: 0,
    };
  }

  private detectCategories(metrics: any[]): AnalyticsCategory[] {
    const cats = new Set<AnalyticsCategory>();
    for (const m of metrics) {
      if (['like', 'comment', 'share', 'save'].includes(m.type)) cats.add('engagement');
      if (['impression', 'reach'].includes(m.type)) cats.add('reach');
      if (['follower', 'connection'].includes(m.type)) cats.add('growth');
      if (['recruiter_interaction', 'client_lead', 'opportunity_generated'].includes(m.type)) cats.add('opportunity');
      if (['profile_visit'].includes(m.type)) cats.add('authority');
    }
    return Array.from(cats);
  }

  private metricBelongsToCategory(type: string, category: string): boolean {
    const map: Record<string, string[]> = {
      engagement: ['like', 'comment', 'share', 'save'],
      reach: ['impression', 'reach'],
      growth: ['follower', 'connection'],
      opportunity: ['recruiter_interaction', 'client_lead', 'opportunity_generated'],
      authority: ['profile_visit'],
      career: [],
    };
    return map[category]?.includes(type) || false;
  }
}

export const performanceCollectionEngine = new PerformanceCollectionEngine();
