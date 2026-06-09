import mongoose, { PipelineStage } from 'mongoose';
import { Post, IPost } from '../../models/content/Post';
import { ContentCalendar, ICalendarEntry } from '../../models/strategy/ContentCalendar';
import { AnalyticsAggregation, IAnalyticsAggregation } from '../../models/analytics/AnalyticsAggregation';
import { AnalyticsEvent } from '../../models/analytics/AnalyticsEvent';
import { Opportunity } from '../../models/content/Opportunity';
import { AnalyticsPeriod } from '../../types/database';

export class QueryService {
  async getContentStrategyDashboard(userId: string): Promise<{
    weeklyProgress: Array<{ week: number; published: number; engagement: number }>;
    pillarPerformance: Array<{ name: string; posts: number; avgEngagement: number }>;
    formatMix: Array<{ format: string; count: number; percentage: number }>;
    velocity: Array<{ date: string; count: number }>;
    pipeline: { draft: number; review: number; approved: number; scheduled: number };
  }> {
    const objId = new mongoose.Types.ObjectId(userId);

    const [weeklyAgg, pillarAgg, formatAgg, velocity, pipeline] = await Promise.all([
      Post.aggregate([
        { $match: { userId: objId, status: 'published' } },
        {
          $group: {
            _id: { $week: '$schedule.publishedAt' },
            count: { $sum: 1 },
            totalEngagement: { $sum: { $ifNull: ['$performance.engagementRate', 0] } },
          },
        },
        { $sort: { _id: -1 } },
        { $limit: 12 },
        {
          $project: {
            week: '$_id',
            published: '$count',
            engagement: { $round: [{ $divide: ['$totalEngagement', '$count'] }, 2] },
            _id: 0,
          },
        },
      ]),

      Post.aggregate([
        { $match: { userId: objId, status: 'published' } },
        {
          $group: {
            _id: '$contentPillarId',
            count: { $sum: 1 },
            totalEngagement: { $avg: '$performance.engagementRate' },
          },
        },
        {
          $lookup: {
            from: 'content_pillars',
            localField: '_id',
            foreignField: '_id',
            as: 'pillar',
          },
        },
        { $unwind: { path: '$pillar', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            name: { $ifNull: ['$pillar.name', 'Uncategorized'] },
            posts: '$count',
            avgEngagement: { $round: [{ $ifNull: ['$totalEngagement', 0] }, 2] },
            _id: 0,
          },
        },
        { $sort: { posts: -1 } },
      ]),

      Post.aggregate([
        { $match: { userId: objId } },
        { $group: { _id: '$format', count: { $sum: 1 } } },
        {
          $project: {
            format: '$_id',
            count: 1,
            _id: 0,
          },
        },
        { $sort: { count: -1 } },
      ]),

      ContentCalendar.aggregate([
        {
          $match: {
            userId: objId,
            postedAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$postedAt' } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
        { $project: { date: '$_id', count: 1, _id: 0 } },
      ]),

      Post.aggregate([
        { $match: { userId: objId } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
        {
          $group: {
            _id: null,
            statuses: { $push: { k: '$_id', v: '$count' } },
          },
        },
        {
          $project: {
            _id: 0,
            statuses: { $arrayToObject: '$statuses' },
          },
        },
      ]),
    ]);

    const totalFormats = formatAgg.reduce((s, f) => s + f.count, 0);

    return {
      weeklyProgress: weeklyAgg,
      pillarPerformance: pillarAgg,
      formatMix: formatAgg.map((f) => ({
        ...f,
        percentage: totalFormats > 0 ? Math.round((f.count / totalFormats) * 100) : 0,
      })),
      velocity,
      pipeline: pipeline[0]?.statuses || { draft: 0, review: 0, approved: 0, scheduled: 0 },
    };
  }

  async getAnalyticsOverview(userId: string): Promise<{
    current: IAnalyticsAggregation | null;
    trend: IAnalyticsAggregation[];
    comparison: { engagement: number; followers: number; posts: number };
  }> {
    const objId = new mongoose.Types.ObjectId(userId);

    const [current, trend] = await Promise.all([
      AnalyticsAggregation.findOne({ userId: objId, period: 'weekly' })
        .sort({ periodStart: -1 })
        .exec(),
      AnalyticsAggregation.find({ userId: objId, period: 'weekly' })
        .sort({ periodStart: -1 })
        .limit(12)
        .exec(),
    ]);

    const comparison = {
      engagement: current?.overview?.totalEngagement || 0,
      followers: current?.overview?.totalFollowers || 0,
      posts: current?.overview?.totalPosts || 0,
    };

    return { current, trend, comparison };
  }

  async getTopContentByFormat(
    userId: string,
    format: string,
    limit = 10
  ): Promise<IPost[]> {
    const objId = new mongoose.Types.ObjectId(userId);
    return Post.find({
      userId: objId,
      format: format as any,
      status: 'published',
      'performance.engagementRate': { $exists: true },
    })
      .sort({ 'performance.engagementRate': -1 })
      .limit(limit)
      .exec();
  }

  async getOpportunityHeatmap(
    userId: string,
    days = 30
  ): Promise<Array<{ date: string; type: string; count: number; avgScore: number }>> {
    const start = new Date();
    start.setDate(start.getDate() - days);

    return Opportunity.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          createdAt: { $gte: start },
        },
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            type: '$type',
          },
          count: { $sum: 1 },
          avgScore: { $avg: '$score' },
        },
      },
      { $sort: { '_id.date': 1 } },
      {
        $project: {
          date: '$_id.date',
          type: '$_id.type',
          count: 1,
          avgScore: { $round: ['$avgScore', 1] },
          _id: 0,
        },
      },
    ]);
  }

  async getUserSegmentation(): Promise<
    Array<{
      automationMode: string;
      plan: string;
      count: number;
      avgContentGenerated: number;
      avgEngagement: number;
    }>
  > {
    return mongoose.model('User').aggregate([
      {
        $match: { isDeleted: false, isActive: true },
      },
      {
        $lookup: {
          from: 'posts',
          localField: '_id',
          foreignField: 'userId',
          as: 'posts',
        },
      },
      {
        $group: {
          _id: {
            automationMode: '$automationMode',
            plan: '$subscriptionPlan',
          },
          count: { $sum: 1 },
          avgContentGenerated: { $avg: { $size: '$posts' } },
          avgEngagement: {
            $avg: {
              $avg: '$posts.performance.engagementRate',
            },
          },
        },
      },
      {
        $project: {
          automationMode: '$_id.automationMode',
          plan: '$_id.plan',
          count: 1,
          avgContentGenerated: { $round: ['$avgContentGenerated', 1] },
          avgEngagement: { $round: [{ $ifNull: ['$avgEngagement', 0] }, 2] },
          _id: 0,
        },
      },
      { $sort: { count: -1 } },
    ]);
  }
}

export const queryService = new QueryService();
export default queryService;
