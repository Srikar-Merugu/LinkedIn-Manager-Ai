import mongoose from 'mongoose';
import pino from 'pino';
import { Post } from '../../../models/content-generation/Post';
import { Analytics } from '../../../models/analytics/Analytics';
import { ContentScore } from '../../../models/content-generation/ContentScore';

const logger = pino();

export interface LearningModel {
  contentTypeRankings: Array<{ contentType: string; score: number; engagement: number; frequency: number; recommendation: 'increase' | 'maintain' | 'decrease' }>;
  topicRankings: Array<{ topic: string; score: number; posts: number; trend: 'rising' | 'stable' | 'declining'; recommendation: string }>;
  formatPreferences: {
    bestPerformingFormats: string[];
    worstPerformingFormats: string[];
    optimalPostLength: { min: number; max: number; avg: number };
    optimalHookType: string;
    optimalCtaType: string;
  };
  timingPreferences: {
    bestDay: string;
    bestTime: string;
    dayRankings: Array<{ day: string; score: number }>;
  };
  patterns: Array<{
    category: string;
    insight: string;
    confidence: number;
    evidence: string;
  }>;
}

export class ContentDNALearningEngine {
  async learn(userId: string): Promise<LearningModel> {
    logger.info({ userId }, 'Learning content DNA patterns');

    const posts = await Post.find({
      userId: new mongoose.Types.ObjectId(userId),
      status: 'published',
    }).sort({ createdAt: -1 }).limit(200).lean();

    if (posts.length === 0) {
      return {
        contentTypeRankings: [],
        topicRankings: [],
        formatPreferences: {
          bestPerformingFormats: [],
          worstPerformingFormats: [],
          optimalPostLength: { min: 0, max: 0, avg: 0 },
          optimalHookType: 'question',
          optimalCtaType: 'question',
        },
        timingPreferences: {
          bestDay: 'Tuesday',
          bestTime: '08:00',
          dayRankings: [],
        },
        patterns: [],
      };
    }

    const postIds = posts.map(p => p._id);
    const analytics = await Analytics.find({ postId: { $in: postIds } }).lean();
    const scores = await ContentScore.find({ postId: { $in: postIds } }).lean();

    const contentTypeRankings = this.analyzeContentTypes(posts, analytics, scores);
    const topicRankings = this.analyzeTopics(posts, analytics);
    const formatPreferences = this.analyzeFormats(posts, analytics);
    const timingPreferences = this.analyzeTiming(posts, analytics);
    const patterns = this.extractPatterns(contentTypeRankings, topicRankings, formatPreferences, timingPreferences);

    return { contentTypeRankings, topicRankings, formatPreferences, timingPreferences, patterns };
  }

  private analyzeContentTypes(posts: any[], analytics: any[], scores: any[]): LearningModel['contentTypeRankings'] {
    const typeMap = new Map<string, { totalEngagement: number; count: number; totalScore: number }>();

    for (const post of posts) {
      const ct = post.contentType || 'unknown';
      if (!typeMap.has(ct)) typeMap.set(ct, { totalEngagement: 0, count: 0, totalScore: 0 });

      const entry = typeMap.get(ct)!;
      entry.count += 1;
      entry.totalScore += post.overallScore || 0;

      const postAnalytics = analytics.filter(a => a.postId?.toString() === post._id.toString());
      for (const a of postAnalytics) {
        for (const m of a.metrics || []) {
          if (['like', 'comment', 'share', 'save'].includes(m.type)) {
            entry.totalEngagement += m.value;
          }
        }
      }
    }

    const maxEng = Math.max(...Array.from(typeMap.values()).map(v => v.totalEngagement), 1);
    const maxCount = Math.max(...Array.from(typeMap.values()).map(v => v.count), 1);

    return Array.from(typeMap.entries())
      .map(([contentType, data]) => {
        const engagementScore = Math.round((data.totalEngagement / maxEng) * 100);
        const frequencyScore = Math.round((data.count / maxCount) * 100);
        const score = Math.round((engagementScore * 0.6 + frequencyScore * 0.2 + (data.totalScore / data.count) * 0.2));

        let recommendation: 'increase' | 'maintain' | 'decrease';
        if (engagementScore > 70 && frequencyScore < 50) recommendation = 'increase';
        else if (engagementScore < 30) recommendation = 'decrease';
        else recommendation = 'maintain';

        return { contentType, score, engagement: engagementScore, frequency: data.count, recommendation };
      })
      .sort((a, b) => b.score - a.score);
  }

  private analyzeTopics(posts: any[], analytics: any[]): LearningModel['topicRankings'] {
    const topicMap = new Map<string, { totalEngagement: number; count: number; recentEngagement: number }>();

    for (const post of posts) {
      for (const tag of post.tags || []) {
        if (!topicMap.has(tag)) topicMap.set(tag, { totalEngagement: 0, count: 0, recentEngagement: 0 });

        const entry = topicMap.get(tag)!;
        entry.count += 1;

        const postAnalytics = analytics.filter(a => a.postId?.toString() === post._id.toString());
        let engagement = 0;
        for (const a of postAnalytics) {
          for (const m of a.metrics || []) {
            if (['like', 'comment', 'share', 'save'].includes(m.type)) engagement += m.value;
          }
        }
        entry.totalEngagement += engagement;

        const postAge = Date.now() - new Date(post.createdAt).getTime();
        if (postAge < 30 * 24 * 60 * 60 * 1000) entry.recentEngagement += engagement;
      }
    }

    const maxEng = Math.max(...Array.from(topicMap.values()).map(v => v.totalEngagement), 1);

    return Array.from(topicMap.entries())
      .map(([topic, data]) => {
        const score = Math.round((data.totalEngagement / maxEng) * 100);
        const avgEngPerPost = data.count > 0 ? data.totalEngagement / data.count : 0;
        const avgRecentEng = data.count > 0 ? data.recentEngagement / data.count : 0;
        const trend: 'rising' | 'stable' | 'declining' = avgRecentEng > avgEngPerPost * 1.2 ? 'rising' : avgRecentEng < avgEngPerPost * 0.8 ? 'declining' : 'stable';

        const recommendation = trend === 'rising' ? 'Increase frequency' : trend === 'declining' ? 'Revisit approach' : 'Maintain current';

        const entryVal: { topic: string; score: number; posts: number; trend: 'rising' | 'stable' | 'declining'; recommendation: string } = { topic, score, posts: data.count, trend, recommendation };
        return entryVal;
      })
      .sort((a, b) => b.score - a.score);
  }

  private analyzeFormats(posts: any[], analytics: any[]): LearningModel['formatPreferences'] {
    const typeEngagement = new Map<string, number>();
    const typeCount = new Map<string, number>();
    let totalLength = 0;
    let totalLengthCount = 0;
    let minLength = Infinity;
    let maxLength = 0;

    const hookTypeScores = new Map<string, { total: number; count: number }>();
    const ctaTypeScores = new Map<string, { total: number; count: number }>();

    for (const post of posts) {
      const ct = post.contentType || 'unknown';
      if (!typeEngagement.has(ct)) { typeEngagement.set(ct, 0); typeCount.set(ct, 0); }

      const postAnalytics = analytics.filter(a => a.postId?.toString() === post._id.toString());
      let engagement = 0;
      for (const a of postAnalytics) {
        for (const m of a.metrics || []) {
          if (['like', 'comment', 'share', 'save'].includes(m.type)) engagement += m.value;
        }
      }
      typeEngagement.set(ct, (typeEngagement.get(ct) || 0) + engagement);
      typeCount.set(ct, (typeCount.get(ct) || 0) + 1);

      const wc = post.wordCount || 0;
      if (wc > 0) {
        totalLength += wc;
        totalLengthCount += 1;
        if (wc < minLength) minLength = wc;
        if (wc > maxLength) maxLength = wc;
      }

      const hookType = post.hook?.includes('?') ? 'question' : post.hook?.match(/^\d+/) ? 'statistic' : /^[A-Z]/.test(post.hook || '') ? 'statement' : 'story';
      if (!hookTypeScores.has(hookType)) hookTypeScores.set(hookType, { total: 0, count: 0 });
      hookTypeScores.get(hookType)!.total += engagement;
      hookTypeScores.get(hookType)!.count += 1;

      const ctaType = post.cta?.includes('?') ? 'question' : /(share|comment|tag|follow|save)/i.test(post.cta || '') ? 'direct' : 'soft';
      if (!ctaTypeScores.has(ctaType)) ctaTypeScores.set(ctaType, { total: 0, count: 0 });
      ctaTypeScores.get(ctaType)!.total += engagement;
      ctaTypeScores.get(ctaType)!.count += 1;
    }

    const sortedByEngagement = Array.from(typeEngagement.entries())
      .map(([type, eng]) => ({ type, avg: typeCount.get(type) || 1 > 0 ? eng / (typeCount.get(type) || 1) : 0 }))
      .sort((a, b) => b.avg - a.avg);

    const bestHookType = Array.from(hookTypeScores.entries())
      .sort((a, b) => (b[1].total / b[1].count) - (a[1].total / a[1].count))[0]?.[0] || 'question';

    const bestCtaType = Array.from(ctaTypeScores.entries())
      .sort((a, b) => (b[1].total / b[1].count) - (a[1].total / a[1].count))[0]?.[0] || 'question';

    return {
      bestPerformingFormats: sortedByEngagement.slice(0, 3).map(s => s.type),
      worstPerformingFormats: sortedByEngagement.slice(-3).map(s => s.type),
      optimalPostLength: {
        min: minLength === Infinity ? 0 : minLength,
        max: maxLength,
        avg: totalLengthCount > 0 ? Math.round(totalLength / totalLengthCount) : 0,
      },
      optimalHookType: bestHookType,
      optimalCtaType: bestCtaType,
    };
  }

  private analyzeTiming(posts: any[], analytics: any[]): LearningModel['timingPreferences'] {
    const dayMap = new Map<string, { totalEngagement: number; count: number }>();
    const hourMap = new Map<number, { totalEngagement: number; count: number }>();

    for (const post of posts) {
      const date = new Date(post.createdAt);
      const day = date.toLocaleDateString('en-US', { weekday: 'long' });
      const hour = date.getHours();

      if (!dayMap.has(day)) dayMap.set(day, { totalEngagement: 0, count: 0 });
      if (!hourMap.has(hour)) hourMap.set(hour, { totalEngagement: 0, count: 0 });

      const postAnalytics = analytics.filter(a => a.postId?.toString() === post._id.toString());
      let engagement = 0;
      for (const a of postAnalytics) {
        for (const m of a.metrics || []) {
          if (['like', 'comment', 'share', 'save'].includes(m.type)) engagement += m.value;
        }
      }

      dayMap.get(day)!.totalEngagement += engagement;
      dayMap.get(day)!.count += 1;
      hourMap.get(hour)!.totalEngagement += engagement;
      hourMap.get(hour)!.count += 1;
    }

    const dayRankings = Array.from(dayMap.entries())
      .map(([day, data]) => ({ day, score: data.count > 0 ? Math.round(data.totalEngagement / data.count) : 0 }))
      .sort((a, b) => b.score - a.score);

    const bestDay = dayRankings[0]?.day || 'Tuesday';
    const bestHour = Array.from(hourMap.entries())
      .sort((a, b) => (b[1].totalEngagement / b[1].count) - (a[1].totalEngagement / a[1].count))[0]?.[0] || 8;

    return {
      bestDay,
      bestTime: `${bestHour.toString().padStart(2, '0')}:00`,
      dayRankings,
    };
  }

  private extractPatterns(
    contentTypeRankings: LearningModel['contentTypeRankings'],
    topicRankings: LearningModel['topicRankings'],
    formatPreferences: LearningModel['formatPreferences'],
    timingPreferences: LearningModel['timingPreferences']
  ): LearningModel['patterns'] {
    const patterns: LearningModel['patterns'] = [];

    const bestType = contentTypeRankings[0];
    if (bestType) {
      patterns.push({
        category: 'content_type',
        insight: `${bestType.contentType} posts perform best with a score of ${bestType.score}/100`,
        confidence: 75,
        evidence: `${bestType.frequency} posts analyzed with ${bestType.engagement} total engagement`,
      });

      if (bestType.recommendation === 'increase') {
        patterns.push({
          category: 'strategy',
          insight: `Should increase ${bestType.contentType} content production`,
          confidence: 70,
          evidence: `High engagement (${bestType.engagement}) but low frequency (${bestType.frequency} posts)`,
        });
      }

      const worstType = contentTypeRankings[contentTypeRankings.length - 1];
      if (worstType && worstType.recommendation === 'decrease') {
        patterns.push({
          category: 'strategy',
          insight: `Should decrease or reformat ${worstType.contentType} content`,
          confidence: 60,
          evidence: `Low engagement score: ${worstType.score}/100`,
        });
      }
    }

    if (formatPreferences.optimalPostLength.avg > 0) {
      patterns.push({
        category: 'format',
        insight: `Optimal post length: ${formatPreferences.optimalPostLength.avg} words (range: ${formatPreferences.optimalPostLength.min}-${formatPreferences.optimalPostLength.max})`,
        confidence: 80,
        evidence: `Based on ${formatPreferences.bestPerformingFormats.length} best-performing formats`,
      });
    }

    patterns.push({
      category: 'timing',
      insight: `Best publishing time: ${timingPreferences.bestTime} on ${timingPreferences.bestDay}`,
      confidence: 65,
      evidence: `Day ranking: ${timingPreferences.dayRankings.slice(0, 3).map(d => `${d.day} (${d.score})`).join(', ')}`,
    });

    return patterns;
  }
}

export const contentDNALearningEngine = new ContentDNALearningEngine();
