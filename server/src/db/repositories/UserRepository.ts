import { BaseRepository } from './BaseRepository';
import { User, IUser } from '../../models/identity/User';
import { FilterQuery, UpdateQuery } from 'mongoose';
import { AutomationMode, OnboardingStatus, SubscriptionPlan } from '../../types/database';

export class UserRepository extends BaseRepository<IUser> {
  constructor() {
    super(User);
  }

  async findByClerkId(clerkId: string): Promise<IUser | null> {
    return this.findOne({ clerkId } as FilterQuery<IUser>);
  }

  async findByEmail(email: string): Promise<IUser | null> {
    return this.findOne({ email: email.toLowerCase() } as FilterQuery<IUser>);
  }

  async updateOnboardingStep(
    userId: string,
    step: number,
    status: OnboardingStatus
  ): Promise<IUser | null> {
    return this.updateById(userId, {
      $set: {
        onboardingStep: step,
        onboardingStatus: status,
      },
    } as UpdateQuery<IUser>);
  }

  async updateSubscriptionPlan(
    userId: string,
    plan: SubscriptionPlan,
    subscriptionId: string
  ): Promise<IUser | null> {
    return this.updateById(userId, {
      $set: {
        subscriptionPlan: plan,
        subscriptionId: this.toObjectId(subscriptionId),
      },
    } as UpdateQuery<IUser>);
  }

  async updateAutomationMode(
    userId: string,
    mode: AutomationMode
  ): Promise<IUser | null> {
    return this.updateById(userId, {
      $set: {
        automationMode: mode,
      },
    } as UpdateQuery<IUser>);
  }

  async updateLastActive(userId: string): Promise<void> {
    await this.updateById(userId, {
      $set: { lastActiveAt: new Date() },
    } as UpdateQuery<IUser>);
  }

  async getByPlan(plan: SubscriptionPlan, limit = 100): Promise<IUser[]> {
    return this.find(
      { subscriptionPlan: plan, isActive: true, isDeleted: false } as FilterQuery<IUser>,
      { limit, sort: { createdAt: -1 } }
    );
  }

  async getByAutomationMode(mode: AutomationMode, limit = 100): Promise<IUser[]> {
    return this.find(
      { automationMode: mode, isActive: true } as FilterQuery<IUser>,
      { limit, sort: { lastActiveAt: -1 } }
    );
  }

  async markDeleted(userId: string): Promise<IUser | null> {
    return this.updateById(userId, {
      $set: {
        isDeleted: true,
        deletedAt: new Date(),
        isActive: false,
      },
    } as UpdateQuery<IUser>);
  }

  async getOnboardingFunnel(): Promise<
    Array<{ status: string; count: number; percentage: number }>
  > {
    const total = await this.count({ isDeleted: false } as FilterQuery<IUser>);
    const results = await this.aggregate([
      {
        $match: { isDeleted: false },
      },
      {
        $group: {
          _id: '$onboardingStatus',
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          status: '$_id',
          count: 1,
          percentage: {
            $cond: {
              if: { $gt: [total, 0] },
              then: { $multiply: [{ $divide: ['$count', total] }, 100] },
              else: 0,
            },
          },
        },
      },
    ]);
    return results;
  }

  async getActiveUsersSince(date: Date): Promise<number> {
    return this.count({
      lastActiveAt: { $gte: date },
      isActive: true,
    } as FilterQuery<IUser>);
  }

  async getChurnedUsersSince(date: Date): Promise<number> {
    return this.count({
      lastActiveAt: { $lt: date },
      isActive: false,
      isDeleted: false,
    } as FilterQuery<IUser>);
  }
}
