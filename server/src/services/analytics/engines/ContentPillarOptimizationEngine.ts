import mongoose from 'mongoose';
import pino from 'pino';
import { Post } from '../../../models/content-generation/Post';
import { Analytics } from '../../../models/analytics/Analytics';

const logger = pino();

export interface PillarPerformance {
  pillar: string;
  score: number;
  engagement: number;
  reach: number;
  growth: number;
  authority: number;
  posts: number;
  trend: 'up' | 'down' | 'stable';
  metrics: {
    avgEngagementRate: number;
    totalImpressions: number;
    totalEngagement: number;
    followerGain: number;
    profileVisits: number;
  };
  topPosts: Array<{ id: string; title: string; engagement: number }>;
  recommendation: {
    action: 'increase' | 'maintain' | 'decrease' | 'reassess';
    rationale: string;
    suggestedFrequency: string;
  };
}

export class ContentPillarOptimizationEngine {
  async evaluateAll(userId: string): Promise<PillarPerformance[]> {
    logger.info({ userId }, 'Evaluating content pillar performance');

    const posts = await Post.find({ userId: new mongoose.Types.ObjectId(userId), status: 'published' })
      .sort({ createdAt: -1 }).lean();

    const pillarMap = this.groupByPillar(posts);
    const pillarIds = new Map<string, mongoose.Types.ObjectId[]>();
    for (const [pillar, pillarPosts] of pillarMap.entries()) {
      pillarIds.set(pillar, pillarPosts.map(p => p._id));
    }

    const analytics = await Analytics.find({
      postId: { $in: Array.from(pillarIds.values()).flat() },
    }).lean();

    const performances: PillarPerformance[] = [];

    for (const [pillar, pillarPosts] of pillarMap.entries()) {
      const postIds = pillarPosts.map(p => p._id);
      const pillarAnalytics = analytics.filter(a => a.postId && postIds.find(id => id.toString() === a.postId!.toString()));

      const engagement = this.sumMetric(pillarAnalytics, ['like', 'comment', 'share', 'save']);
      const impressions = this.sumMetric(pillarAnalytics, ['impression']);
      const followerGain = this.sumMetric(pillarAnalytics, ['follower']);
      const profileVisits = this.sumMetric(pillarAnalytics, ['profile_visit']);

      const avgScores = pillarPosts.reduce((acc, p) => ({
        overall: acc.overall + (p.overallScore || 0),
        voice: acc.voice + (p.voiceMatchScore || 0),
        career: acc.career + (p.careerAlignmentScore || 0),
        quality: acc.quality + (p.qualityScore || 0),
      }), { overall: 0, voice: 0, career: 0, quality: 0 });

      const count = pillarPosts.length;
      const overallScore = count > 0 ? Math.round(avgScores.overall / count) : 0;
      const engagementScore = this.scoreEngagement(engagement, count);
      const growthScore = this.scoreGrowth(followerGain, count);
      const authorityScore = this.scoreAuthority(profileVisits, count);

      const score = Math.round((overallScore * 0.3 + engagementScore * 0.3 + growthScore * 0.2 + authorityScore * 0.2));

      const trend = this.determineTrend(pillarPosts, pillarAnalytics);

      const topPosts = pillarPosts
        .map(p => {
          const pa = pillarAnalytics.filter(a => a.postId?.toString() === p._id.toString());
          const eng = pa.reduce((sum, a) => sum + a.metrics.filter(m => ['like', 'comment', 'share', 'save'].includes(m.type)).reduce((s, m) => s + m.value, 0), 0);
          return { id: p._id.toString(), title: p.title, engagement: eng };
        })
        .sort((a, b) => b.engagement - a.engagement)
        .slice(0, 3);

      const recommendation = this.generateRecommendation(pillar, score, engagementScore, count, overallScore);

      performances.push({
        pillar,
        score,
        engagement: engagementScore,
        reach: impressions,
        growth: growthScore,
        authority: authorityScore,
        posts: count,
        trend,
        metrics: {
          avgEngagementRate: count > 0 ? Math.round(impressions > 0 ? (engagement / impressions) * 10000 / count : 0) : 0,
          totalImpressions: impressions,
          totalEngagement: engagement,
          followerGain,
          profileVisits,
        },
        topPosts,
        recommendation,
      });
    }

    return performances.sort((a, b) => b.score - a.score);
  }

  private groupByPillar(posts: any[]): Map<string, any[]> {
    const pillarMap = new Map<string, any[]>();
    for (const post of posts) {
      const pillar = post.contentType || 'uncategorized';
      if (!pillarMap.has(pillar)) pillarMap.set(pillar, []);
      pillarMap.get(pillar)!.push(post);
    }
    return pillarMap;
  }

  private sumMetric(analytics: any[], types: string[]): number {
    let total = 0;
    for (const a of analytics) {
      for (const m of a.metrics || []) {
        if (types.includes(m.type)) total += m.value;
      }
    }
    return total;
  }

  private scoreEngagement(engagement: number, count: number): number {
    if (count === 0) return 0;
    const avg = engagement / count;
    if (avg > 500) return 95;
    if (avg > 200) return 85;
    if (avg > 100) return 75;
    if (avg > 50) return 60;
    if (avg > 20) return 45;
    if (avg > 10) return 30;
    return 15;
  }

  private scoreGrowth(followerGain: number, count: number): number {
    if (count === 0) return 0;
    const avg = followerGain / count;
    if (avg > 10) return 95;
    if (avg > 5) return 80;
    if (avg > 2) return 65;
    if (avg > 1) return 50;
    if (avg > 0) return 35;
    return 20;
  }

  private scoreAuthority(profileVisits: number, count: number): number {
    if (count === 0) return 0;
    const avg = profileVisits / count;
    if (avg > 100) return 95;
    if (avg > 50) return 80;
    if (avg > 20) return 65;
    if (avg > 10) return 50;
    if (avg > 5) return 35;
    return 20;
  }

  private determineTrend(posts: any[], analytics: any[]): 'up' | 'down' | 'stable' {
    if (posts.length < 4) return 'stable';

    const mid = Math.floor(posts.length / 2);
    const recent = posts.slice(0, mid);
    const older = posts.slice(mid);

    const recentEng = this.calculateAvgEngagement(recent, analytics);
    const olderEng = this.calculateAvgEngagement(older, analytics);

    if (recentEng > olderEng * 1.2) return 'up';
    if (recentEng < olderEng * 0.8) return 'down';
    return 'stable';
  }

  private calculateAvgEngagement(posts: any[], analytics: any[]): number {
    if (posts.length === 0) return 0;
    let total = 0;
    for (const post of posts) {
      const pa = analytics.filter(a => a.postId?.toString() === post._id.toString());
      for (const a of pa) {
        for (const m of a.metrics || []) {
          if (['like', 'comment', 'share', 'save'].includes(m.type)) total += m.value;
        }
      }
    }
    return total / posts.length;
  }

  private generateRecommendation(pillar: string, score: number, engagement: number, count: number, overallScore: number): PillarPerformance['recommendation'] {
    if (engagement > 70 && count < 5) {
      return {
        action: 'increase',
        rationale: `High engagement (${engagement}/100) but low volume (${count} posts)`,
        suggestedFrequency: `2-3 posts per week`,
      };
    }
    if (score < 40 && count > 3) {
      return {
        action: 'reassess',
        rationale: `Consistently low performance (score: ${score}/100) across ${count} posts`,
        suggestedFrequency: `Reduce and reformat approach`,
      };
    }
    if (score > 70) {
      return {
        action: 'maintain',
        rationale: `Strong performance (score: ${score}/100) with ${count} posts`,
        suggestedFrequency: `Continue current cadence`,
      };
    }
    if (overallScore < 50) {
      return {
        action: 'decrease',
        rationale: `Quality concerns (avg score: ${overallScore}/100)`,
        suggestedFrequency: `Reduce until quality improves`,
      };
    }
    return {
      action: 'maintain',
      rationale: `Stable performance at current cadence`,
      suggestedFrequency: `Current frequency is appropriate`,
    };
  }
}

export const contentPillarOptimizationEngine = new ContentPillarOptimizationEngine();
