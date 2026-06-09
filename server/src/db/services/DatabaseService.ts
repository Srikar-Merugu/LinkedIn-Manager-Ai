import mongoose from 'mongoose';
import pino from 'pino';
import {
  userRepo, postRepo, calendarRepo, contentIdeaRepo,
  analyticsEventRepo, analyticsAggRepo, opportunityRepo,
} from '../repositories';
import { AuditLog } from '../../models/system/AuditLog';
import { FeatureFlag } from '../../models/system/FeatureFlag';
import { Notification } from '../../models/system/Notification';
import { ChatSession } from '../../models/system/ChatSession';

const logger = pino();

export class DatabaseService {
  async healthCheck(): Promise<{
    status: string;
    latency: number;
    collections: Record<string, { count: number; status: string }>;
  }> {
    const start = Date.now();

    const collections = [
      'users', 'linkedin_profiles', 'brand_dnas', 'voice_profiles',
      'career_goals', 'content_pillars', 'content_strategies',
      'content_calendars', 'content_ideas', 'posts',
      'opportunities', 'analytics_events', 'analytics_aggregations',
      'notifications', 'chat_sessions', 'audit_logs',
    ];

    const results: Record<string, { count: number; status: string }> = {};
    for (const name of collections) {
      try {
        const count = await mongoose.connection.db
          ?.collection(name)
          .countDocuments() || 0;
        results[name] = { count, status: 'ok' };
      } catch {
        results[name] = { count: 0, status: 'error' };
      }
    }

    return {
      status: 'healthy',
      latency: Date.now() - start,
      collections: results,
    };
  }

  async getDashboardData(userId: string): Promise<{
    user: unknown;
    recentPosts: unknown[];
    upcomingContent: unknown[];
    newOpportunities: unknown[];
    latestAnalytics: unknown;
    notifications: unknown[];
    progress: {
      onboardingComplete: boolean;
      brandDnaReady: boolean;
      strategyActive: boolean;
      contentPipeline: number;
    };
  }> {
    const userObjId = new mongoose.Types.ObjectId(userId);

    const [
      user,
      recentPosts,
      upcomingContent,
      newOpportunities,
      latestAnalytics,
      unreadNotifications,
      brandDnaCount,
      strategyCount,
      pendingReview,
    ] = await Promise.all([
      userRepo.findById(userId).catch(() => null),
      postRepo.find(
        { userId: userObjId } as any,
        { sort: { createdAt: -1 }, limit: 5 }
      ).catch(() => []),
      calendarRepo.getUpcoming(userId, 14).catch(() => []),
      opportunityRepo.getNew(userId, 5).catch(() => []),
      analyticsAggRepo.getLatestForUser(userId, 'weekly').catch(() => null),
      Notification.find({ userId: userObjId, status: { $in: ['sent', 'delivered'] } })
        .sort({ createdAt: -1 })
        .limit(10)
        .exec()
        .catch(() => []),
      mongoose.model('BrandDNA').countDocuments({ userId: userObjId, isActive: true }).exec().catch(() => 0),
      mongoose.model('ContentStrategy').countDocuments({ userId: userObjId, isActive: true }).exec().catch(() => 0),
      postRepo.find(
        { userId: userObjId, status: 'review' } as any,
        { sort: { createdAt: -1 }, limit: 1 }
      ).catch(() => []),
    ]);

    return {
      user,
      recentPosts,
      upcomingContent,
      newOpportunities,
      latestAnalytics,
      notifications: unreadNotifications,
      progress: {
        onboardingComplete: user?.onboardingStatus === 'complete',
        brandDnaReady: brandDnaCount > 0,
        strategyActive: strategyCount > 0,
        contentPipeline: pendingReview.length,
      },
    };
  }

  async getFullUserReport(userId: string): Promise<{
    user: unknown;
    profile: unknown;
    brandDNA: unknown;
    voiceProfile: unknown;
    careerGoal: unknown;
    pillars: unknown[];
    strategy: unknown;
    calendar: unknown[];
    posts: unknown[];
    opportunities: unknown[];
    analytics: unknown[];
  }> {
    const objId = new mongoose.Types.ObjectId(userId);

    const [
      user,
      brandDNA,
      voiceProfile,
      careerGoal,
      pillars,
      strategy,
      calendar,
      posts,
      opportunities,
      analytics,
    ] = await Promise.all([
      userRepo.findById(userId),
      mongoose.model('BrandDNA').findOne({ userId: objId, isActive: true }).exec(),
      mongoose.model('VoiceProfile').findOne({ userId: objId, isActive: true }).exec(),
      mongoose.model('CareerGoal').findOne({ userId: objId, isActive: true }).exec(),
      mongoose.model('ContentPillar').find({ userId: objId, isActive: true }).sort({ rank: 1 }).exec(),
      mongoose.model('ContentStrategy').findOne({ userId: objId, isActive: true }).exec(),
      mongoose.model('ContentCalendar').find({ userId: objId }).sort({ date: -1 }).limit(30).exec(),
      mongoose.model('Post').find({ userId: objId }).sort({ createdAt: -1 }).limit(20).exec(),
      mongoose.model('Opportunity').find({ userId: objId, status: { $ne: 'expired' } }).sort({ score: -1 }).limit(10).exec(),
      mongoose.model('AnalyticsAggregation').find({ userId: objId }).sort({ periodStart: -1 }).limit(6).exec(),
    ]);

    return {
      user,
      profile: null,
      brandDNA,
      voiceProfile,
      careerGoal,
      pillars,
      strategy,
      calendar,
      posts,
      opportunities,
      analytics,
    };
  }

  async cleanupExpiredData(): Promise<{
    expiredOpportunities: number;
    expiredIdeas: number;
    deletedOldEvents: number;
  }> {
    const [expiredOpportunities, expiredIdeas] = await Promise.all([
      opportunityRepo.markExpired(),
      contentIdeaRepo.markExpired(),
    ]);

    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const oldEvents = await mongoose.model('AnalyticsEvent')
      .deleteMany({ timestamp: { $lt: ninetyDaysAgo } })
      .exec();

    return {
      expiredOpportunities,
      expiredIdeas,
      deletedOldEvents: oldEvents.deletedCount || 0,
    };
  }

  async getStorageStats(): Promise<{
    totalDocuments: number;
    collections: Array<{ name: string; count: number; size: string }>;
  }> {
    const collections = await mongoose.connection.db?.listCollections().toArray() || [];
    const stats: Array<{ name: string; count: number; size: string }> = [];

    for (const col of collections) {
      try {
        const collection = mongoose.connection.db!.collection(col.name);
        const count = await collection.countDocuments();
        const size = await collection
          .aggregate([
            { $collStats: { storageStats: {} } },
            { $project: { size: '$storageStats.storageSize' } },
          ])
          .toArray()
          .then((result: any[]) => {
            const bytes = result[0]?.size || 0;
            return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
          })
          .catch(() => 'N/A');
        stats.push({ name: col.name, count, size });
      } catch {
        // skip
      }
    }

    const totalDocuments = stats.reduce((sum, s) => sum + s.count, 0);
    return { totalDocuments, collections: stats };
  }

  async auditAction(params: {
    userId: string;
    action: any;
    resourceType: string;
    resourceId: string;
    before?: Record<string, unknown>;
    after?: Record<string, unknown>;
    actor: { type: 'user' | 'system' | 'ai_agent'; id: string; agentVersion?: string };
    metadata?: Record<string, unknown>;
    context?: Record<string, unknown>;
  }): Promise<void> {
    await (AuditLog as any).logAction({
      userId: params.userId,
      action: params.action,
      resourceType: params.resourceType,
      resourceId: params.resourceId,
      before: params.before,
      after: params.after,
      actor: params.actor,
      metadata: params.metadata as any,
      context: params.context as any,
    });
  }
}

export const dbService = new DatabaseService();
export default dbService;
