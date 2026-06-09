import mongoose from 'mongoose';
import pino from 'pino';
import { Post } from '../../../models/content-generation/Post';
import { Analytics } from '../../../models/analytics/Analytics';
import { StrategyRecommendation, IStrategyRecommendation } from '../../../models/analytics/StrategyRecommendation';

const logger = pino();

export interface StrategyChange {
  category: string;
  currentState: string;
  recommendedState: string;
  rationale: string;
  expectedImpact: string;
  confidence: number;
  autoApply: boolean;
  autoApplyScope?: 'calendar' | 'strategy' | 'publishing' | 'pillar_priorities';
}

export interface StrategyOptimizationResult {
  changes: StrategyChange[];
  summary: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
}

export class StrategyOptimizationEngine {
  async optimize(userId: string): Promise<StrategyOptimizationResult> {
    logger.info({ userId }, 'Optimizing content strategy');

    const posts = await Post.find({
      userId: new mongoose.Types.ObjectId(userId),
      status: 'published',
    }).sort({ createdAt: -1 }).limit(200).lean();

    if (posts.length < 3) {
      return {
        changes: [{
          category: 'content_volume',
          currentState: 'Insufficient data',
          recommendedState: 'Publish more content',
          rationale: 'Need at least 3 published posts for analysis',
          expectedImpact: 'Better performance insights',
          confidence: 90,
          autoApply: false,
        }],
        summary: 'Need more content before optimization',
        priority: 'low',
      };
    }

    const postIds = posts.map(p => p._id);
    const analytics = await Analytics.find({ postId: { $in: postIds } }).lean();

    const changes: StrategyChange[] = [];

    const contentTypeAnalysis = this.analyzeContentMix(posts, analytics);
    changes.push(...contentTypeAnalysis);

    const publishingAnalysis = this.analyzePublishingSchedule(posts, analytics);
    changes.push(...publishingAnalysis);

    const pillarAnalysis = this.analyzePillarPriorities(posts, analytics);
    changes.push(...pillarAnalysis);

    const qualityAnalysis = this.analyzeContentQuality(posts);
    changes.push(...qualityAnalysis);

    const priority = this.determinePriority(changes);

    const summary = this.generateSummary(changes, priority);

    return { changes, summary, priority };
  }

  async saveRecommendations(userId: string): Promise<IStrategyRecommendation[]> {
    const result = await this.optimize(userId);
    const recommendations: IStrategyRecommendation[] = [];

    for (const change of result.changes) {
      const rec = await StrategyRecommendation.create({
        userId: new mongoose.Types.ObjectId(userId),
        category: this.mapCategory(change.category),
        priority: result.priority,
        title: `${change.category}: ${change.recommendedState}`,
        description: change.rationale,
        reasoning: `Analysis suggests ${change.rationale.toLowerCase()}. Current: ${change.currentState}. Target: ${change.recommendedState}`,
        evidence: [`Strategy optimization analysis`],
        metrics: [],
        impact: {
          expected: change.expectedImpact,
          confidence: change.confidence,
          timeframe: '30 days',
        },
        action: {
          type: this.mapActionType(change.category),
          params: { change: change.recommendedState },
          autoApply: change.autoApply,
          autoApplyScope: change.autoApplyScope,
          explanation: change.rationale,
        },
        status: 'active',
      });
      recommendations.push(rec);
    }

    return recommendations;
  }

  private analyzeContentMix(posts: any[], analytics: any[]): StrategyChange[] {
    const changes: StrategyChange[] = [];
    const typeMap = new Map<string, { engagement: number; count: number; score: number }>();

    for (const post of posts) {
      const ct = post.contentType || 'unknown';
      if (!typeMap.has(ct)) typeMap.set(ct, { engagement: 0, count: 0, score: 0 });
      const entry = typeMap.get(ct)!;
      entry.count += 1;
      entry.score += post.overallScore || 0;

      const postAnalytics = analytics.filter(a => a.postId?.toString() === post._id.toString());
      for (const a of postAnalytics) {
        for (const m of a.metrics || []) {
          if (['like', 'comment', 'share', 'save'].includes(m.type)) entry.engagement += m.value;
        }
      }
    }

    const sorted = Array.from(typeMap.entries())
      .map(([type, data]) => ({ type, ...data, avgEng: data.count > 0 ? data.engagement / data.count : 0 }))
      .sort((a, b) => b.avgEng - a.avgEng);

    const totalPosts = posts.length;
    const best = sorted[0];
    const worst = sorted[sorted.length - 1];

    if (best && (best.count / totalPosts) < 0.3 && best.avgEng > (worst?.avgEng || 0) * 2) {
      const currentPercent = Math.round((best.count / totalPosts) * 100);
      changes.push({
        category: 'content_mix',
        currentState: `${best.type} is ${currentPercent}% of content`,
        recommendedState: `Increase ${best.type} to 40-50% of content`,
        rationale: `${best.type} outperforms other types (avg engagement: ${Math.round(best.avgEng)} vs ${Math.round(worst?.avgEng || 0)})`,
        expectedImpact: `Expected engagement increase of 20-40%`,
        confidence: 75,
        autoApply: true,
        autoApplyScope: 'strategy',
      });
    }

    if (worst && worst.count > 2 && worst.avgEng < (best?.avgEng || Infinity) * 0.3) {
      changes.push({
        category: 'content_mix',
        currentState: `${worst.type} is ${Math.round((worst.count / totalPosts) * 100)}% of content`,
        recommendedState: `Reduce ${worst.type} content`,
        rationale: `Lowest performing type with avg engagement of ${Math.round(worst.avgEng)}`,
        expectedImpact: `Better content mix efficiency`,
        confidence: 70,
        autoApply: true,
        autoApplyScope: 'strategy',
      });
    }

    return changes;
  }

  private analyzePublishingSchedule(posts: any[], analytics: any[]): StrategyChange[] {
    const changes: StrategyChange[] = [];
    const dayMap = new Map<string, { engagement: number; count: number }>();
    const hourMap = new Map<number, { engagement: number; count: number }>();

    for (const post of posts) {
      const date = new Date(post.createdAt);
      const day = date.toLocaleDateString('en-US', { weekday: 'long' });
      const hour = date.getHours();

      if (!dayMap.has(day)) dayMap.set(day, { engagement: 0, count: 0 });
      if (!hourMap.has(hour)) hourMap.set(hour, { engagement: 0, count: 0 });

      const postAnalytics = analytics.filter(a => a.postId?.toString() === post._id.toString());
      let eng = 0;
      for (const a of postAnalytics) {
        for (const m of a.metrics || []) {
          if (['like', 'comment', 'share', 'save'].includes(m.type)) eng += m.value;
        }
      }

      dayMap.get(day)!.engagement += eng;
      dayMap.get(day)!.count += 1;
      hourMap.get(hour)!.engagement += eng;
      hourMap.get(hour)!.count += 1;
    }

    const bestDay = Array.from(dayMap.entries())
      .map(([day, d]) => ({ day, avg: d.count > 0 ? d.engagement / d.count : 0 }))
      .sort((a, b) => b.avg - a.avg)[0];

    if (bestDay) {
      const worstDay = Array.from(dayMap.entries())
        .map(([day, d]) => ({ day, avg: d.count > 0 ? d.engagement / d.count : 0 }))
        .sort((a, b) => a.avg - b.avg)[0];

      changes.push({
        category: 'publishing',
        currentState: `Publishing across various days`,
        recommendedState: `Focus publishing on ${bestDay.day}`,
        rationale: `Content published on ${bestDay.day} gets ${Math.round(bestDay.avg)} avg engagement`,
        expectedImpact: `10-25% engagement improvement`,
        confidence: 65,
        autoApply: true,
        autoApplyScope: 'publishing',
      });
    }

    return changes;
  }

  private analyzePillarPriorities(posts: any[], analytics: any[]): StrategyChange[] {
    const changes: StrategyChange[] = [];
    const pillarMap = new Map<string, { engagement: number; count: number }>();

    for (const post of posts) {
      const pillar = post.contentType || 'uncategorized';
      if (!pillarMap.has(pillar)) pillarMap.set(pillar, { engagement: 0, count: 0 });
      const entry = pillarMap.get(pillar)!;
      entry.count += 1;

      const postAnalytics = analytics.filter(a => a.postId?.toString() === post._id.toString());
      for (const a of postAnalytics) {
        for (const m of a.metrics || []) {
          if (['like', 'comment', 'share', 'save'].includes(m.type)) entry.engagement += m.value;
        }
      }
    }

    const sortedPillars = Array.from(pillarMap.entries())
      .map(([pillar, data]) => ({ pillar, avgEng: data.count > 0 ? data.engagement / data.count : 0, count: data.count }))
      .sort((a, b) => b.avgEng - a.avgEng);

    if (sortedPillars.length > 2) {
      const top3 = sortedPillars.slice(0, 3).map(s => s.pillar).join(', ');
      changes.push({
        category: 'pillar_priorities',
        currentState: `All pillars equal priority`,
        recommendedState: `Prioritize top pillars: ${top3}`,
        rationale: `Top 3 pillars drive most engagement`,
        expectedImpact: `More focused growth strategy`,
        confidence: 70,
        autoApply: true,
        autoApplyScope: 'pillar_priorities',
      });
    }

    return changes;
  }

  private analyzeContentQuality(posts: any[]): StrategyChange[] {
    const changes: StrategyChange[] = [];
    const avgScore = posts.reduce((sum, p) => sum + (p.overallScore || 0), 0) / posts.length;

    if (avgScore < 60) {
      changes.push({
        category: 'content_quality',
        currentState: `Average content score: ${Math.round(avgScore)}/100`,
        recommendedState: `Improve content quality to score 70+`,
        rationale: `Content quality directly impacts engagement and growth`,
        expectedImpact: `Higher engagement rates and follower growth`,
        confidence: 80,
        autoApply: false,
      });
    }

    return changes;
  }

  private determinePriority(changes: StrategyChange[]): 'critical' | 'high' | 'medium' | 'low' {
    if (changes.some(c => c.category === 'content_quality' && c.confidence > 75)) return 'critical';
    if (changes.length > 2) return 'high';
    if (changes.length > 0) return 'medium';
    return 'low';
  }

  private generateSummary(changes: StrategyChange[], priority: string): string {
    if (changes.length === 0) return 'Strategy is well-optimized. No changes needed.';
    return `${changes.length} strategic ${priority === 'critical' ? 'critical ' : ''}optimization${changes.length > 1 ? 's' : ''} identified: ${changes.map(c => c.category.replace(/_/g, ' ')).join(', ')}`;
  }

  private mapCategory(category: string): 'content_mix' | 'publishing' | 'strategy' | 'pillar' | 'growth' | 'authority' | 'opportunity' | 'engagement' | 'audience' {
    const map: Record<string, any> = {
      content_mix: 'content_mix',
      publishing: 'publishing',
      pillar_priorities: 'pillar',
      content_quality: 'strategy',
    };
    return map[category] || 'strategy';
  }

  private mapActionType(category: string): 'update_calendar' | 'update_strategy' | 'adjust_mix' | 'change_publishing' | 'update_priorities' | 'create_content' | 'archive_content' | 'notify_user' {
    const map: Record<string, any> = {
      content_mix: 'adjust_mix',
      publishing: 'change_publishing',
      pillar_priorities: 'update_priorities',
      content_quality: 'notify_user',
    };
    return map[category] || 'notify_user';
  }
}

export const strategyOptimizationEngine = new StrategyOptimizationEngine();
