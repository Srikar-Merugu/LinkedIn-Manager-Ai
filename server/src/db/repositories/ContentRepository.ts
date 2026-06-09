import { BaseRepository } from './BaseRepository';
import { Post, IPost } from '../../models/content/Post';
import { ContentCalendar, ICalendarEntry } from '../../models/strategy/ContentCalendar';
import { ContentIdea, IContentIdea } from '../../models/content/ContentIdea';
import { FilterQuery, UpdateQuery, PipelineStage } from 'mongoose';
import { PostStatus, PostFormat, ContentSource } from '../../types/database';

export class PostRepository extends BaseRepository<IPost> {
  constructor() {
    super(Post);
  }

  async findByStatus(
    userId: string,
    status: PostStatus,
    options?: { limit?: number; skip?: number }
  ): Promise<IPost[]> {
    return this.find(
      { userId: this.toObjectId(userId), status } as FilterQuery<IPost>,
      {
        sort: { createdAt: -1 },
        limit: options?.limit,
        skip: options?.skip,
      }
    );
  }

  async findByPillar(
    userId: string,
    pillarId: string,
    status?: PostStatus
  ): Promise<IPost[]> {
    const filter: FilterQuery<IPost> = {
      userId: this.toObjectId(userId),
      contentPillarId: this.toObjectId(pillarId),
    };
    if (status) filter.status = status;
    return this.find(filter, { sort: { createdAt: -1 } });
  }

  async getScheduledForToday(): Promise<IPost[]> {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    return this.find({
      status: 'scheduled',
      'schedule.scheduledAt': { $gte: start, $lte: end },
    } as FilterQuery<IPost>);
  }

  async getPendingReview(userId: string): Promise<IPost[]> {
    return this.find(
      {
        userId: this.toObjectId(userId),
        status: 'review',
      } as FilterQuery<IPost>,
      { sort: { createdAt: -1 } }
    );
  }

  async updatePerformance(
    postId: string,
    performance: Partial<IPost['performance']>
  ): Promise<IPost | null> {
    return this.updateById(postId, {
      $set: {
        performance,
        'performance.lastFetchedAt': new Date(),
      },
    } as UpdateQuery<IPost>);
  }

  async getTopPerforming(
    userId: string,
    limit = 10
  ): Promise<IPost[]> {
    return this.find(
      {
        userId: this.toObjectId(userId),
        status: 'published',
        'scores.overall': { $gte: 70 },
      } as FilterQuery<IPost>,
      {
        sort: { 'performance.engagementRate': -1 },
        limit,
      }
    );
  }

  async getContentMix(userId: string): Promise<Array<{ format: string; count: number; avgEngagement: number }>> {
    return this.aggregate([
      { $match: { userId: this.toObjectId(userId), status: 'published' } },
      {
        $group: {
          _id: '$format',
          count: { $sum: 1 },
          avgEngagement: { $avg: '$performance.engagementRate' },
        },
      },
      {
        $project: {
          format: '$_id',
          count: 1,
          avgEngagement: { $round: ['$avgEngagement', 2] },
        },
      },
      { $sort: { count: -1 } },
    ]);
  }

  async getPublishedCountBetween(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<number> {
    return this.count({
      userId: this.toObjectId(userId),
      status: 'published',
      'schedule.publishedAt': { $gte: startDate, $lte: endDate },
    } as FilterQuery<IPost>);
  }
}

export class CalendarRepository extends BaseRepository<ICalendarEntry> {
  constructor() {
    super(ContentCalendar);
  }

  async getUpcoming(
    userId: string,
    days = 14
  ): Promise<ICalendarEntry[]> {
    const start = new Date();
    const end = new Date();
    end.setDate(end.getDate() + days);

    return this.find(
      {
        userId: this.toObjectId(userId),
        date: { $gte: start, $lte: end },
        status: { $in: ['draft', 'review', 'approved', 'scheduled'] },
      } as FilterQuery<ICalendarEntry>,
      { sort: { date: 1 } }
    );
  }

  async getByStatus(
    userId: string,
    status: string
  ): Promise<ICalendarEntry[]> {
    return this.find(
      { userId: this.toObjectId(userId), status } as FilterQuery<ICalendarEntry>,
      { sort: { date: -1 } }
    );
  }

  async getByDateRange(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<ICalendarEntry[]> {
    return this.find(
      {
        userId: this.toObjectId(userId),
        date: { $gte: startDate, $lte: endDate },
      } as FilterQuery<ICalendarEntry>,
      { sort: { date: 1 } }
    );
  }

  async getPublishingVelocity(
    userId: string,
    days = 30
  ): Promise<Array<{ date: string; count: number }>> {
    const start = new Date();
    start.setDate(start.getDate() - days);

    return this.aggregate([
      {
        $match: {
          userId: this.toObjectId(userId),
          postedAt: { $gte: start },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$postedAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          date: '$_id',
          count: 1,
          _id: 0,
        },
      },
    ]);
  }
}

export class ContentIdeaRepository extends BaseRepository<IContentIdea> {
  constructor() {
    super(ContentIdea);
  }

  async getActiveIdeas(userId: string): Promise<IContentIdea[]> {
    return this.find(
      {
        userId: this.toObjectId(userId),
        status: 'active',
      } as FilterQuery<IContentIdea>,
      { sort: { confidence: -1 } }
    );
  }

  async getByPillar(
    pillarId: string,
    status = 'active'
  ): Promise<IContentIdea[]> {
    return this.find(
      {
        contentPillarId: this.toObjectId(pillarId),
        status,
      } as FilterQuery<IContentIdea>,
      { sort: { confidence: -1 } }
    );
  }

  async markExpired(): Promise<number> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const result = await this.model.updateMany(
      {
        status: 'active',
        createdAt: { $lt: thirtyDaysAgo },
      },
      { $set: { status: 'expired' } }
    ).exec();

    return result.modifiedCount;
  }
}
