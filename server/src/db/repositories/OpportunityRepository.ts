import { BaseRepository } from './BaseRepository';
import { Opportunity, IOpportunity } from '../../models/content/Opportunity';
import { FilterQuery, UpdateQuery } from 'mongoose';
import { OpportunityStatus, OpportunityType } from '../../types/database';

export class OpportunityRepository extends BaseRepository<IOpportunity> {
  constructor() {
    super(Opportunity);
  }

  async getNew(userId: string, limit = 20): Promise<IOpportunity[]> {
    return this.find(
      {
        userId: this.toObjectId(userId),
        status: 'new',
      } as FilterQuery<IOpportunity>,
      { sort: { score: -1 }, limit }
    );
  }

  async getByPriority(
    userId: string,
    priority: 'critical' | 'high' | 'medium' | 'low',
    limit = 10
  ): Promise<IOpportunity[]> {
    return this.find(
      {
        userId: this.toObjectId(userId),
        priority,
        status: { $in: ['new', 'analyzed'] },
      } as FilterQuery<IOpportunity>,
      { sort: { score: -1 }, limit }
    );
  }

  async getByType(
    userId: string,
    type: OpportunityType,
    status?: OpportunityStatus
  ): Promise<IOpportunity[]> {
    const filter: FilterQuery<IOpportunity> = {
      userId: this.toObjectId(userId),
      type,
    };
    if (status) filter.status = status;
    return this.find(filter, { sort: { score: -1 } });
  }

  async markActioned(
    opportunityId: string,
    contentId: string
  ): Promise<IOpportunity | null> {
    return this.updateById(opportunityId, {
      $set: {
        status: 'actioned',
        generatedContentId: this.toObjectId(contentId),
        actionedAt: new Date(),
      },
    } as UpdateQuery<IOpportunity>);
  }

  async markExpired(): Promise<number> {
    const result = await this.model.updateMany(
      {
        status: { $in: ['new', 'analyzed'] },
        expiresAt: { $lt: new Date() },
      },
      { $set: { status: 'expired' } }
    ).exec();
    return result.modifiedCount;
  }

  async dismiss(opportunityId: string): Promise<IOpportunity | null> {
    return this.updateById(opportunityId, {
      $set: {
        status: 'dismissed',
        dismissedAt: new Date(),
      },
    } as UpdateQuery<IOpportunity>);
  }

  async getOpportunityScore(
    userId: string,
    days = 7
  ): Promise<{ total: number; byType: Record<string, number>; avgScore: number }> {
    const start = new Date();
    start.setDate(start.getDate() - days);

    const results = await this.aggregate([
      {
        $match: {
          userId: this.toObjectId(userId),
          createdAt: { $gte: start },
          status: { $ne: 'expired' },
        },
      },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          avgScore: { $avg: '$score' },
        },
      },
    ]);

    const byType: Record<string, number> = {};
    let total = 0;
    let totalScore = 0;

    for (const r of results) {
      byType[r._id] = r.count;
      total += r.count;
      totalScore += r.avgScore * r.count;
    }

    return {
      total,
      byType,
      avgScore: total > 0 ? Math.round((totalScore / total) * 100) / 100 : 0,
    };
  }
}
