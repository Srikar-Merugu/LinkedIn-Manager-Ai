import mongoose from 'mongoose';
import pino from 'pino';
import { Post } from '../../../models/content-generation/Post';
import { Analytics } from '../../../models/analytics/Analytics';

const logger = pino();

export interface SuccessRanking {
  postId: string;
  title: string;
  contentType: string;
  metrics: { engagement: number; reach: number; growth: number; authority: number };
  scores: { overall: number; voice: number; career: number; quality: number };
  compositeScore: number;
  rank: number;
}

export interface SuccessSummary {
  bestOverall: SuccessRanking[];
  bestEngagement: SuccessRanking[];
  bestAuthority: SuccessRanking[];
  bestCareer: SuccessRanking[];
  bestOpportunity: SuccessRanking[];
}

export class SuccessDetectionEngine {
  async findBestContent(userId: string, period?: { start: Date; end: Date }, limit: number = 10): Promise<SuccessSummary> {
    logger.info({ userId }, 'Finding best performing content');

    const match: any = { userId: new mongoose.Types.ObjectId(userId) };
    if (period) match.createdAt = { $gte: period.start, $lte: period.end };

    const posts = await Post.find(match).sort({ createdAt: -1 }).lean();
    const postIds = posts.map(p => p._id);

    const analyticsMap = new Map<string, any[]>();
    const allAnalytics = await Analytics.find({ postId: { $in: postIds } }).lean();
    for (const a of allAnalytics) {
      const key = a.postId?.toString() || '';
      if (!analyticsMap.has(key)) analyticsMap.set(key, []);
      analyticsMap.get(key)!.push(a);
    }

    const rankings: SuccessRanking[] = [];

    for (const post of posts) {
      const postAnalytics = analyticsMap.get(post._id.toString()) || [];
      const metrics = this.aggregateMetrics(postAnalytics);

      const compositeScore = Math.round(
        (metrics.engagement / Math.max(...rankings.map(r => r.metrics.engagement), 1)) * 25 +
        (metrics.impressions / Math.max(...rankings.map(r => r.metrics.reach), 1)) * 25 +
        (metrics.followerGain / Math.max(...rankings.map(r => r.metrics.growth), 1)) * 25 +
        (metrics.authority / Math.max(...rankings.map(r => r.metrics.authority), 1)) * 25 +
        post.overallScore * 0.5 +
        post.voiceMatchScore * 0.3 +
        post.careerAlignmentScore * 0.2
      );

      rankings.push({
        postId: post._id.toString(),
        title: post.title,
        contentType: post.contentType,
        metrics: {
          engagement: metrics.engagement,
          reach: metrics.impressions,
          growth: metrics.followerGain,
          authority: 0,
        },
        scores: {
          overall: post.overallScore || 0,
          voice: post.voiceMatchScore || 0,
          career: post.careerAlignmentScore || 0,
          quality: post.qualityScore || 0,
        },
        compositeScore: Math.min(100, compositeScore),
        rank: 0,
      });
    }

    rankings.sort((a, b) => b.compositeScore - a.compositeScore);
    rankings.forEach((r, i) => { r.rank = i + 1; });

    const rankedByMetric = (metric: keyof SuccessRanking['metrics']) =>
      [...rankings].sort((a, b) => b.metrics[metric] - a.metrics[metric]).slice(0, limit);

    return {
      bestOverall: rankings.slice(0, limit),
      bestEngagement: rankedByMetric('engagement'),
      bestAuthority: rankedByMetric('authority'),
      bestCareer: [...rankings].sort((a, b) => b.scores.career - a.scores.career).slice(0, limit),
      bestOpportunity: rankedByMetric('growth'),
    };
  }

  async findBreakoutContent(userId: string): Promise<SuccessRanking[]> {
    const recent = await Post.find({
      userId: new mongoose.Types.ObjectId(userId),
      createdAt: { $gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) },
    }).sort({ createdAt: -1 }).lean();

    const previous = await Post.find({
      userId: new mongoose.Types.ObjectId(userId),
      createdAt: {
        $lt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
        $gte: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
      },
    }).lean();

    const recentAvg = await this.averageEngagement(recent.map(p => p._id));
    const prevAvg = await this.averageEngagement(previous.map(p => p._id));

    const breakoutPosts: SuccessRanking[] = [];
    for (const post of recent) {
      const postAnalytics = await Analytics.find({ postId: post._id }).lean();
      const metrics = this.aggregateMetrics(postAnalytics);
      const breakoutScore = prevAvg > 0 ? Math.round((metrics.engagement / prevAvg) * 100) : 50;

      if (breakoutScore > 150) {
        breakoutPosts.push({
          postId: post._id.toString(),
          title: post.title,
          contentType: post.contentType,
          metrics: { engagement: metrics.engagement, reach: metrics.impressions, growth: metrics.followerGain, authority: 0 },
          scores: { overall: post.overallScore || 0, voice: post.voiceMatchScore || 0, career: post.careerAlignmentScore || 0, quality: post.qualityScore || 0 },
          compositeScore: breakoutScore,
          rank: 0,
        });
      }
    }

    return breakoutPosts.sort((a, b) => b.compositeScore - a.compositeScore);
  }

  private async averageEngagement(postIds: mongoose.Types.ObjectId[]): Promise<number> {
    if (postIds.length === 0) return 0;
    const analytics = await Analytics.find({ postId: { $in: postIds } }).lean();
    let total = 0;
    for (const a of analytics) {
      for (const m of a.metrics) {
        if (['like', 'comment', 'share', 'save'].includes(m.type)) total += m.value;
      }
    }
    return postIds.length > 0 ? Math.round(total / postIds.length) : 0;
  }

  private aggregateMetrics(analytics: any[]) {
    let engagement = 0;
    let impressions = 0;
    let followerGain = 0;

    for (const a of analytics) {
      for (const m of a.metrics || []) {
        switch (m.type) {
          case 'like': engagement += m.value; break;
          case 'comment': engagement += m.value * 2; break;
          case 'share': engagement += m.value * 3; break;
          case 'save': engagement += m.value * 2; break;
          case 'impression': impressions += m.value; break;
          case 'follower': followerGain += m.value; break;
        }
      }
    }

    return { engagement, impressions, followerGain, authority: 0 };
  }
}

export const successDetectionEngine = new SuccessDetectionEngine();
