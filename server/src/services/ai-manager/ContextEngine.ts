import mongoose from 'mongoose';
import pino from 'pino';
import { ContentStrategyIntelligence } from '../../models/content-strategy/ContentStrategyIntelligence';
import { ContentCalendar } from '../../models/strategy/ContentCalendar';
import { Post } from '../../models/content-generation/Post';
import { ContentOpportunity } from '../../models/opportunity/ContentOpportunity';
import { GeneratedDraft } from '../../models/content-generation/GeneratedDraft';
import { QueueItem } from '../../models/content-operations/QueueItem';
import { CopilotMemory } from '../../models/ai-manager/CopilotMemory';

const logger = pino();

export interface UserContext {
  userId: string;
  careerGoals: any[];
  careerBlueprint: any;
  contentStrategy: any;
  contentPillars: any[];
  brandDNA: any;
  voiceProfile: any;
  linkedinProfile: any;
  calendar: any[];
  opportunities: any[];
  analytics: any;
  publishingQueue: any[];
  recentPosts: any[];
  automationMode: string;
  recentDrafts: any[];
  memory: any[];
  targetRole?: string;
  dataFreshness: Record<string, string>;
}

export class ContextEngine {
  async load(userId: string): Promise<UserContext> {
    logger.info({ userId }, 'Loading user context');
    const uid = new mongoose.Types.ObjectId(userId);

    const [
      strategyDocs,
      calendar,
      opportunities,
      recentPosts,
      recentDrafts,
      queue,
      memory,
    ] = await Promise.all([
      ContentStrategyIntelligence.find({ userId: uid }).sort({ createdAt: -1 }).limit(1).lean(),
      ContentCalendar.find({ userId: uid }).sort({ date: -1 }).limit(20).lean(),
      ContentOpportunity.find({ userId: uid }).sort({ priorityRank: 1 }).limit(10).lean(),
      Post.find({ userId: uid }).sort({ createdAt: -1 }).limit(10).lean(),
      GeneratedDraft.find({ userId: uid, status: 'completed' }).sort({ createdAt: -1 }).limit(5).lean(),
      QueueItem.find({ userId: uid }).sort({ priority: 1 }).limit(10).lean(),
      CopilotMemory.find({ userId: uid, isActive: true }).sort({ lastReferenced: -1 }).limit(20).lean(),
    ]);

    const strategy: any = strategyDocs[0] || null;

    const analyticsData = recentPosts.length > 0 ? this.computeAnalytics(recentPosts) : null;

    return {
      userId,
      careerGoals: [],
      careerBlueprint: null,
      contentStrategy: strategy ? {
        overallStrategy: strategy.overallStrategy,
        scores: strategy.scores,
        growthGoals: strategy.growthGoals,
        monthlyPlans: strategy.overallStrategy?.monthlyPlans || [],
        contentMix: strategy.overallStrategy?.monthlyPlans?.[0]?.contentMix || [],
      } : null,
      contentPillars: [],
      brandDNA: null,
      voiceProfile: null,
      linkedinProfile: null,
      calendar,
      opportunities,
      analytics: analyticsData,
      publishingQueue: queue,
      recentPosts,
      automationMode: 'manual',
      recentDrafts,
      memory,
      dataFreshness: {
        strategy: strategy?.createdAt?.toISOString() || 'never',
        calendar: calendar[0]?.createdAt?.toISOString() || 'never',
        opportunities: opportunities[0]?.createdAt?.toISOString() || 'never',
        posts: recentPosts[0]?.createdAt?.toISOString() || 'never',
      },
    };
  }

  private computeAnalytics(posts: any[]): any {
    if (posts.length < 3) return null;

    const contentTypes: Record<string, number[]> = {};
    posts.forEach((p: any) => {
      if (!contentTypes[p.contentType]) contentTypes[p.contentType] = [];
      contentTypes[p.contentType].push(p.overallScore || 0);
    });

    const bestContentTypes = Object.entries(contentTypes)
      .map(([type, scores]) => ({ type, avg: scores.reduce((a, b) => a + b, 0) / scores.length }))
      .sort((a, b) => b.avg - a.avg)
      .map(t => t.type);

    return {
      totalPosts: posts.length,
      bestContentTypes,
      averageEngagement: posts.reduce((sum, p) => sum + (p.overallScore || 0), 0) / posts.length / 100,
      topPillars: [],
    };
  }

  async getContextSummary(context: UserContext): Promise<string> {
    const parts: string[] = [];

    if (context.careerGoals.length > 0) {
      parts.push(`Career goals: ${context.careerGoals.map(g => g.type).join(', ')}`);
    }
    if (context.contentStrategy) {
      parts.push('Content strategy: active');
    }
    if (context.calendar.length > 0) {
      const scheduled = context.calendar.filter(c => c.status === 'scheduled').length;
      const drafts = context.calendar.filter(c => c.status === 'draft').length;
      parts.push(`Calendar: ${scheduled} scheduled, ${drafts} drafts`);
    }
    if (context.opportunities.length > 0) {
      parts.push(`Opportunities: ${context.opportunities.length} available`);
    }
    if (context.analytics?.totalPosts) {
      parts.push(`Posts published: ${context.analytics.totalPosts}`);
    }
    if (context.publishingQueue.length > 0) {
      parts.push(`Queue: ${context.publishingQueue.length} items`);
    }

    return parts.length > 0
      ? `Current context for user ${context.userId}:\n${parts.join('\n')}`
      : 'Limited context available. Some data sources have not been configured yet.';
  }
}

export const contextEngine = new ContextEngine();
