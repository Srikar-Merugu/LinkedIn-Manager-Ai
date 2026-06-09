import mongoose from 'mongoose';
import pino from 'pino';
import { Post } from '../../../models/content-generation/Post';
import { Analytics } from '../../../models/analytics/Analytics';
import { AudienceInsight, IAudienceInsight, AudienceSegment } from '../../../models/analytics/AudienceInsight';

const logger = pino();

export interface AudienceAnalysisResult {
  segments: Array<{
    segment: string;
    size: number;
    engagement: number;
    growth: number;
    characteristics: string[];
  }>;
  topContentTypes: Array<{ contentType: string; segment: string; engagementRate: number }>;
  engagementPatterns: {
    peakHours: number[];
    peakDays: string[];
    responseTime: number;
    sentiment: number;
  };
  insights: Array<{
    category: string;
    title: string;
    description: string;
    impact: 'positive' | 'negative' | 'neutral';
    recommendation?: string;
  }>;
}

export class AudienceIntelligenceEngine {
  async analyze(userId: string): Promise<AudienceAnalysisResult> {
    logger.info({ userId }, 'Analyzing audience intelligence');

    const userPosts = await Post.find({ userId: new mongoose.Types.ObjectId(userId), status: 'published' })
      .sort({ createdAt: -1 }).limit(100).lean();

    const postIds = userPosts.map((p: any) => p._id);
    const analytics = await Analytics.find({ postId: { $in: postIds } }).lean();

    const segments = this.identifySegments(userPosts, analytics);
    const topContentTypes = this.analyzeContentTypeBySegment(userPosts, analytics);
    const engagementPatterns = this.analyzeEngagementPatterns(userPosts, analytics);
    const insights = this.generateInsights(segments, topContentTypes, engagementPatterns);

    return { segments, topContentTypes, engagementPatterns, insights };
  }

  async saveInsights(userId: string): Promise<IAudienceInsight | null> {
    const analysis = await this.analyze(userId);
    const period = {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      end: new Date(),
    };

    const userPosts = await Post.find({ userId: new mongoose.Types.ObjectId(userId), status: 'published' })
      .sort({ createdAt: -1 }).limit(100).lean();

    const insight = await AudienceInsight.create({
      userId: new mongoose.Types.ObjectId(userId),
      segment: 'engaged',
      period,
      demographics: [],
      behaviors: {
        activeHours: analysis.engagementPatterns.peakHours,
        activeDays: analysis.engagementPatterns.peakDays,
        bestTimeToPost: `${analysis.engagementPatterns.peakHours[0] || 8}:00`,
        bestDayToPost: analysis.engagementPatterns.peakDays[0] || 'Tuesday',
        averageReadTime: 0,
        scrollThroughRate: 0,
        commentSentiment: analysis.engagementPatterns.sentiment,
      },
      topContentTypes: analysis.topContentTypes.map(t => ({ contentType: t.contentType, engagementRate: t.engagementRate, posts: 0 })),
      topTopics: [],
      interests: [],
      engagement: { total: 0, unique: 0, returning: 0, conversion: 0, byType: { likes: 0, comments: 0, shares: 0, saves: 0 } },
      growth: { newFollowers: 0, lostFollowers: 0, netGrowth: 0, growthRate: 0 },
      insights: analysis.insights.map(i => ({ title: i.title, description: i.description, impact: i.impact, recommendation: i.recommendation })),
      metadata: { generatedAt: new Date(), dataPoints: userPosts.length, confidence: 70 },
    });

    return insight;
  }

  private identifySegments(userPosts: any[], analytics: any[]): AudienceAnalysisResult['segments'] {
    const segmentMap = new Map<string, { count: number; totalEngagement: number; totalGrowth: number; types: Set<string> }>();

    for (const post of userPosts) {
      const ct = post.contentType || 'unknown';
      const segment = this.classifySegment(ct);
      if (!segmentMap.has(segment)) {
        segmentMap.set(segment, { count: 0, totalEngagement: 0, totalGrowth: 0, types: new Set() });
      }
      const entry = segmentMap.get(segment)!;
      entry.count += 1;
      entry.types.add(ct);

      const postAnalytics = analytics.filter((a: any) => a.postId?.toString() === post._id.toString());
      for (const a of postAnalytics) {
        for (const m of a.metrics || []) {
          if (['like', 'comment', 'share', 'save'].includes(m.type)) entry.totalEngagement += m.value;
          if (m.type === 'follower') entry.totalGrowth += m.value;
        }
      }
    }

    return Array.from(segmentMap.entries()).map(([segment, data]) => ({
      segment,
      size: data.count,
      engagement: Math.round(data.totalEngagement / Math.max(data.count, 1)),
      growth: data.totalGrowth,
      characteristics: Array.from(data.types),
    }));
  }

  private classifySegment(contentType: string): string {
    if (['story', 'journey', 'career_lesson'].includes(contentType)) return 'story_seekers';
    if (['educational', 'framework'].includes(contentType)) return 'knowledge_seekers';
    if (['project_breakdown', 'build_in_public', 'founder_update'].includes(contentType)) return 'builders';
    if (['contrarian', 'industry_commentary', 'thought_leadership'].includes(contentType)) return 'thinkers';
    if (['case_study'].includes(contentType)) return 'researchers';
    return 'general';
  }

  private analyzeContentTypeBySegment(userPosts: any[], analytics: any[]): AudienceAnalysisResult['topContentTypes'] {
    const ctSegmentMap = new Map<string, Map<string, { total: number; count: number }>>();

    for (const post of userPosts) {
      const ct = post.contentType || 'unknown';
      const segment = this.classifySegment(ct);

      if (!ctSegmentMap.has(ct)) ctSegmentMap.set(ct, new Map());
      const segMap = ctSegmentMap.get(ct)!;
      if (!segMap.has(segment)) segMap.set(segment, { total: 0, count: 0 });

      const entry = segMap.get(segment)!;
      entry.count += 1;

      const postAnalytics = analytics.filter((a: any) => a.postId?.toString() === post._id.toString());
      for (const a of postAnalytics) {
        for (const m of a.metrics || []) {
          if (['like', 'comment', 'share', 'save'].includes(m.type)) entry.total += m.value;
        }
      }
    }

    const results: Array<{ contentType: string; segment: string; engagementRate: number }> = [];
    for (const [ct, segMap] of ctSegmentMap.entries()) {
      for (const [segment, data] of segMap.entries()) {
        results.push({
          contentType: ct,
          segment,
          engagementRate: Math.round((data.total / Math.max(data.count, 1))),
        });
      }
    }

    return results.sort((a, b) => b.engagementRate - a.engagementRate);
  }

  private analyzeEngagementPatterns(userPosts: any[], analytics: any[]): AudienceAnalysisResult['engagementPatterns'] {
    const hourMap = new Map<number, { total: number; count: number }>();
    const dayMap = new Map<string, { total: number; count: number }>();
    let totalSentiment = 0;
    let sentimentCount = 0;

    for (const post of userPosts) {
      const date = new Date(post.createdAt);
      const hour = date.getHours();
      const day = date.toLocaleDateString('en-US', { weekday: 'long' });

      if (!hourMap.has(hour)) hourMap.set(hour, { total: 0, count: 0 });
      if (!dayMap.has(day)) dayMap.set(day, { total: 0, count: 0 });

      const postAnalytics = analytics.filter((a: any) => a.postId?.toString() === post._id.toString());
      let engagement = 0;
      for (const a of postAnalytics) {
        for (const m of a.metrics || []) {
          if (['like', 'comment', 'share', 'save'].includes(m.type)) {
            engagement += m.value;
            if (m.type === 'comment') {
              totalSentiment += m.value > 0 ? 1 : -1;
              sentimentCount += 1;
            }
          }
        }
      }

      hourMap.get(hour)!.total += engagement;
      hourMap.get(hour)!.count += 1;
      dayMap.get(day)!.total += engagement;
      dayMap.get(day)!.count += 1;
    }

    const peakHours = Array.from(hourMap.entries())
      .sort((a, b) => (b[1].total / b[1].count) - (a[1].total / a[1].count))
      .slice(0, 5)
      .map(([hour]) => hour)
      .sort();

    const peakDays = Array.from(dayMap.entries())
      .sort((a, b) => (b[1].total / b[1].count) - (a[1].total / a[1].count))
      .slice(0, 3)
      .map(([day]) => day);

    return {
      peakHours,
      peakDays,
      responseTime: 0,
      sentiment: sentimentCount > 0 ? Math.round((totalSentiment / sentimentCount) * 100) : 0,
    };
  }

  private generateInsights(
    segments: AudienceAnalysisResult['segments'],
    topContentTypes: AudienceAnalysisResult['topContentTypes'],
    engagementPatterns: AudienceAnalysisResult['engagementPatterns']
  ): AudienceAnalysisResult['insights'] {
    const insights: AudienceAnalysisResult['insights'] = [];

    const topSegment = segments.sort((a, b) => b.engagement - a.engagement)[0];
    if (topSegment) {
      insights.push({
        category: 'audience',
        title: `Core audience: ${topSegment.segment}`,
        description: `Your highest-engaged segment with ${topSegment.size} interactions and average engagement of ${topSegment.engagement}`,
        impact: 'positive',
        recommendation: `Create more content targeting ${topSegment.segment.replace('_', ' ')}`,
      });
    }

    const bestContentType = topContentTypes[0];
    if (bestContentType) {
      insights.push({
        category: 'content',
        title: `Best content type: ${bestContentType.contentType}`,
        description: `Engagement rate of ${bestContentType.engagementRate} in ${bestContentType.segment} segment`,
        impact: 'positive',
        recommendation: `Increase ${bestContentType.contentType} production`,
      });
    }

    if (engagementPatterns.peakHours.length > 0) {
      insights.push({
        category: 'timing',
        title: `Peak engagement hours: ${engagementPatterns.peakHours.join(', ')}:00`,
        description: 'These hours show highest audience activity',
        impact: 'positive',
        recommendation: `Schedule posts around ${engagementPatterns.peakHours[0]}:00`,
      });
    }

    return insights;
  }
}

export const audienceIntelligenceEngine = new AudienceIntelligenceEngine();
