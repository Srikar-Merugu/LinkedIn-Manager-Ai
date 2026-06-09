import { BaseRepository } from './BaseRepository';
import { AnalyticsEvent, IAnalyticsEvent } from '../../models/analytics/AnalyticsEvent';
import { AnalyticsAggregation, IAnalyticsAggregation } from '../../models/analytics/AnalyticsAggregation';
import { FilterQuery } from 'mongoose';
import { AnalyticsPeriod } from '../../types/database';

export class AnalyticsEventRepository extends BaseRepository<IAnalyticsEvent> {
  constructor() {
    super(AnalyticsEvent);
  }

  async getEventsBetween(
    userId: string,
    startDate: Date,
    endDate: Date,
    eventType?: string
  ): Promise<IAnalyticsEvent[]> {
    const filter: FilterQuery<IAnalyticsEvent> = {
      userId: this.toObjectId(userId),
      timestamp: { $gte: startDate, $lte: endDate },
    };
    if (eventType) filter.eventType = eventType;
    return this.find(filter, { sort: { timestamp: -1 } });
  }

  async getEventCountByType(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Array<{ eventType: string; count: number; totalValue: number }>> {
    return this.aggregate([
      {
        $match: {
          userId: this.toObjectId(userId),
          timestamp: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: '$eventType',
          count: { $sum: 1 },
          totalValue: { $sum: '$value' },
        },
      },
      {
        $project: {
          eventType: '$_id',
          count: 1,
          totalValue: 1,
          _id: 0,
        },
      },
      { $sort: { count: -1 } },
    ]);
  }

  async getDailyEngagement(
    userId: string,
    days = 30
  ): Promise<Array<{ date: string; likes: number; comments: number; shares: number }>> {
    const start = new Date();
    start.setDate(start.getDate() - days);

    return this.aggregate([
      {
        $match: {
          userId: this.toObjectId(userId),
          timestamp: { $gte: start },
          eventType: { $in: ['like', 'comment', 'share'] },
        },
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
            type: '$eventType',
          },
          count: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: '$_id.date',
          likes: {
            $sum: { $cond: [{ $eq: ['$_id.type', 'like'] }, '$count', 0] },
          },
          comments: {
            $sum: { $cond: [{ $eq: ['$_id.type', 'comment'] }, '$count', 0] },
          },
          shares: {
            $sum: { $cond: [{ $eq: ['$_id.type', 'share'] }, '$count', 0] },
          },
        },
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          date: '$_id',
          likes: 1,
          comments: 1,
          shares: 1,
          _id: 0,
        },
      },
    ]);
  }

  async recordEvent(params: {
    userId: string;
    postId?: string;
    eventType: string;
    value?: number;
    metadata?: Record<string, unknown>;
    platform?: string;
  }): Promise<IAnalyticsEvent> {
    return this.create({
      userId: this.toObjectId(params.userId),
      postId: params.postId ? this.toObjectId(params.postId) : undefined,
      eventType: params.eventType,
      value: params.value || 0,
      metadata: params.metadata || {},
      platform: params.platform || 'linkedin',
      source: 'api',
      timestamp: new Date(),
    } as Partial<IAnalyticsEvent>);
  }
}

export class AnalyticsAggregationRepository extends BaseRepository<IAnalyticsAggregation> {
  constructor() {
    super(AnalyticsAggregation);
  }

  async getLatestForUser(userId: string, period: AnalyticsPeriod): Promise<IAnalyticsAggregation | null> {
    return this.findOne(
      { userId: this.toObjectId(userId), period } as FilterQuery<IAnalyticsAggregation>,
      { sort: { periodStart: -1 } }
    );
  }

  async getTrend(
    userId: string,
    period: AnalyticsPeriod,
    limit = 12
  ): Promise<IAnalyticsAggregation[]> {
    return this.find(
      { userId: this.toObjectId(userId), period } as FilterQuery<IAnalyticsAggregation>,
      {
        sort: { periodStart: -1 },
        limit,
      }
    );
  }

  async getOverview(
    userId: string,
    period: AnalyticsPeriod
  ): Promise<IAnalyticsAggregation | null> {
    return this.getLatestForUser(userId, period);
  }

  async comparePeriods(
    userId: string,
    period: AnalyticsPeriod,
    currentStart: Date,
    previousStart: Date
  ): Promise<{
    current: IAnalyticsAggregation | null;
    previous: IAnalyticsAggregation | null;
  }> {
    const currentEnd = new Date(currentStart);
    const previousEnd = new Date(previousStart);

    switch (period) {
      case 'weekly':
        currentEnd.setDate(currentEnd.getDate() + 7);
        previousEnd.setDate(previousEnd.getDate() + 7);
        break;
      case 'monthly':
        currentEnd.setMonth(currentEnd.getMonth() + 1);
        previousEnd.setMonth(previousEnd.getMonth() + 1);
        break;
    }

    const [current, previous] = await Promise.all([
      this.findOne({
        userId: this.toObjectId(userId),
        period,
        periodStart: currentStart,
      } as FilterQuery<IAnalyticsAggregation>),
      this.findOne({
        userId: this.toObjectId(userId),
        period,
        periodStart: previousStart,
      } as FilterQuery<IAnalyticsAggregation>),
    ]);

    return { current, previous };
  }
}
