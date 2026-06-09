import mongoose from 'mongoose';
import pino from 'pino';
import { Post } from '../../../models/content-generation/Post';
import { Analytics } from '../../../models/analytics/Analytics';

const logger = pino();

export interface ContentPerformanceResult {
  postId: string;
  title: string;
  contentType: string;
  topic: string;
  metrics: {
    impressions: number;
    engagement: number;
    engagementRate: number;
    shares: number;
    saves: number;
    comments: number;
    followerGain: number;
  };
  hook: { text: string; performance: number };
  cta: { text: string; performance: number };
  publishing: {
    time: string;
    day: string;
    performance: number;
  };
  quality: { overall: number; voice: number; career: number; content: number };
  performanceScore: number;
  drivers: Array<{ factor: string; impact: 'high' | 'medium' | 'low'; description: string }>;
}

export class ContentPerformanceEngine {
  async analyzePost(postId: string, userId: string): Promise<ContentPerformanceResult | null> {
    logger.info({ postId }, 'Analyzing content performance');

    const post = await Post.findById(postId).lean();
    if (!post) return null;

    const analytics = await Analytics.find({
      postId: new mongoose.Types.ObjectId(postId),
      userId: new mongoose.Types.ObjectId(userId),
    }).lean();

    const metrics = this.aggregateMetrics(analytics);
    const hookPerf = this.analyzeHook(post.hook, metrics);
    const ctaPerf = this.analyzeCTA(post.cta, metrics);
    const pubPerf = this.analyzePublishing(post.createdAt, metrics);
    const performanceScore = this.computePerformanceScore(metrics, post);

    const drivers = this.identifyDrivers(metrics, post, hookPerf, ctaPerf, pubPerf);

    return {
      postId: post._id.toString(),
      title: post.title,
      contentType: post.contentType,
      topic: post.tags[0] || '',
      metrics: {
        impressions: metrics.impressions,
        engagement: metrics.engagement,
        engagementRate: metrics.engagementRate,
        shares: metrics.shares,
        saves: metrics.saves,
        comments: metrics.comments,
        followerGain: metrics.followerGain,
      },
      hook: hookPerf,
      cta: ctaPerf,
      publishing: pubPerf,
      quality: {
        overall: post.overallScore || 0,
        voice: post.voiceMatchScore || 0,
        career: post.careerAlignmentScore || 0,
        content: post.qualityScore || 0,
      },
      performanceScore,
      drivers,
    };
  }

  async analyzeAll(userId: string, period?: { start: Date; end: Date }): Promise<ContentPerformanceResult[]> {
    logger.info({ userId }, 'Analyzing all content performance');

    const match: any = { userId: new mongoose.Types.ObjectId(userId) };
    if (period) match.createdAt = { $gte: period.start, $lte: period.end };

    const posts = await Post.find(match).sort({ createdAt: -1 }).lean();
    const results: ContentPerformanceResult[] = [];

    for (const post of posts) {
      const result = await this.analyzePost(post._id.toString(), userId);
      if (result) results.push(result);
    }

    return results;
  }

  async getPerformanceDrivers(userId: string): Promise<{
    contentType: Array<{ type: string; avgEngagement: number; count: number }>;
    dayOfWeek: Array<{ day: string; avgEngagement: number; count: number }>;
    hourOfDay: Array<{ hour: number; avgEngagement: number; count: number }>;
    topTopics: Array<{ topic: string; avgEngagement: number; count: number }>;
  }> {
    const posts = await Post.find({ userId: new mongoose.Types.ObjectId(userId) }).lean();
    const postIds = posts.map(p => p._id);
    const analytics = await Analytics.find({ postId: { $in: postIds } }).lean();

    const contentTypeMap = new Map<string, { total: number; count: number }>();
    const dayMap = new Map<string, { total: number; count: number }>();
    const hourMap = new Map<number, { total: number; count: number }>();
    const topicMap = new Map<string, { total: number; count: number }>();

    for (const post of posts) {
      const postAnalytics = analytics.filter(a => a.postId?.toString() === post._id.toString());
      const metrics = this.aggregateMetrics(postAnalytics);
      const eng = metrics.engagement;

      const ctKey = post.contentType || 'unknown';
      if (!contentTypeMap.has(ctKey)) contentTypeMap.set(ctKey, { total: 0, count: 0 });
      const ct = contentTypeMap.get(ctKey)!;
      ct.total += eng;
      ct.count += 1;

      const day = new Date(post.createdAt).toLocaleDateString('en-US', { weekday: 'long' });
      if (!dayMap.has(day)) dayMap.set(day, { total: 0, count: 0 });
      const d = dayMap.get(day)!;
      d.total += eng;
      d.count += 1;

      const hour = new Date(post.createdAt).getHours();
      if (!hourMap.has(hour)) hourMap.set(hour, { total: 0, count: 0 });
      const h = hourMap.get(hour)!;
      h.total += eng;
      h.count += 1;

      for (const tag of post.tags || []) {
        if (!topicMap.has(tag)) topicMap.set(tag, { total: 0, count: 0 });
        const t = topicMap.get(tag)!;
        t.total += eng;
        t.count += 1;
      }
    }

    return {
      contentType: Array.from(contentTypeMap.entries()).map(([type, data]) => ({ type, avgEngagement: Math.round(data.total / data.count), count: data.count })),
      dayOfWeek: Array.from(dayMap.entries()).map(([day, data]) => ({ day, avgEngagement: Math.round(data.total / data.count), count: data.count })),
      hourOfDay: Array.from(hourMap.entries()).map(([hour, data]) => ({ hour, avgEngagement: Math.round(data.total / data.count), count: data.count })),
      topTopics: Array.from(topicMap.entries()).map(([topic, data]) => ({ topic, avgEngagement: Math.round(data.total / data.count), count: data.count })),
    };
  }

  private aggregateMetrics(analytics: any[]) {
    let impressions = 0;
    let engagement = 0;
    let shares = 0;
    let saves = 0;
    let comments = 0;
    let followerGain = 0;

    for (const a of analytics) {
      for (const m of a.metrics || []) {
        switch (m.type) {
          case 'impression': impressions += m.value; break;
          case 'like': engagement += m.value; break;
          case 'comment': engagement += m.value * 2; comments += m.value; break;
          case 'share': engagement += m.value * 3; shares += m.value; break;
          case 'save': engagement += m.value * 2; saves += m.value; break;
          case 'follower': followerGain += m.value; break;
        }
      }
    }

    return {
      impressions,
      engagement,
      engagementRate: impressions > 0 ? Math.round((engagement / impressions) * 10000) / 100 : 0,
      shares,
      saves,
      comments,
      followerGain,
    };
  }

  private analyzeHook(hook: string, metrics: any): { text: string; performance: number } {
    const hookLength = hook.length;
    const hasQuestion = hook.includes('?');
    const hasNumber = /\d+/.test(hook);
    const hasBoldClaim = /(the |this |here'?s|what if|how to|why|the truth)/i.test(hook);

    let score = 50;
    if (hookLength < 80 && hookLength > 20) score += 15;
    if (hasQuestion) score += 10;
    if (hasNumber) score += 10;
    if (hasBoldClaim) score += 15;
    if (metrics.engagementRate > 3) score += 15;
    else if (metrics.engagementRate > 1) score += 5;
    else score -= 10;

    return { text: hook.substring(0, 60), performance: Math.min(100, score) };
  }

  private analyzeCTA(cta: string, metrics: any): { text: string; performance: number } {
    const hasQuestion = cta.includes('?');
    const hasCallToAction = /(comment|share|follow|tag|save|like|drop|let me know)/i.test(cta);
    const hasEmoji = /[\u{1F600}-\u{1F64F}]/u.test(cta);

    let score = 50;
    if (hasQuestion) score += 15;
    if (hasCallToAction) score += 15;
    if (hasEmoji) score += 10;
    if (metrics.comments > 5) score += 10;
    else if (metrics.comments > 0) score += 5;

    return { text: cta.substring(0, 40), performance: Math.min(100, score) };
  }

  private analyzePublishing(date: Date, metrics: any): { time: string; day: string; performance: number } {
    const hour = date.getHours();
    const day = date.toLocaleDateString('en-US', { weekday: 'long' });
    const hourStr = `${hour.toString().padStart(2, '0')}:00`;

    let score = 50;
    const peakHours = [7, 8, 9, 12, 13, 17, 18, 19, 20];
    const peakDays = ['Tuesday', 'Wednesday', 'Thursday'];

    if (peakHours.includes(hour)) score += 20;
    if (peakDays.includes(day)) score += 15;
    if (metrics.engagementRate > 3) score += 15;

    return { time: hourStr, day, performance: Math.min(100, score) };
  }

  private computePerformanceScore(metrics: any, post: any): number {
    let score = 0;
    if (metrics.impressions > 1000) score += 20;
    else if (metrics.impressions > 500) score += 10;
    if (metrics.engagementRate > 5) score += 25;
    else if (metrics.engagementRate > 2) score += 15;
    if (metrics.shares > 10) score += 15;
    if (metrics.saves > 10) score += 15;
    if (metrics.followerGain > 5) score += 15;
    if (post.overallScore > 80) score += 10;
    return Math.min(100, score);
  }

  private identifyDrivers(metrics: any, post: any, hook: any, cta: any, pub: any): Array<{ factor: string; impact: 'high' | 'medium' | 'low'; description: string }> {
    const drivers: Array<{ factor: string; impact: 'high' | 'medium' | 'low'; description: string }> = [];

    if (hook.performance >= 70) drivers.push({ factor: 'Hook', impact: 'high', description: 'Strong hook captured attention' });
    else drivers.push({ factor: 'Hook', impact: 'low', description: 'Hook could be stronger' });

    if (cta.performance >= 70) drivers.push({ factor: 'CTA', impact: 'high', description: 'Effective call-to-action drove engagement' });
    else drivers.push({ factor: 'CTA', impact: 'low', description: 'CTA needs improvement' });

    if (pub.performance >= 70) drivers.push({ factor: 'Timing', impact: 'high', description: `Published at optimal time (${pub.time} on ${pub.day})` });
    else drivers.push({ factor: 'Timing', impact: 'medium', description: `Consider different publishing time` });

    if (post.voiceMatchScore >= 70) drivers.push({ factor: 'Voice Match', impact: 'high', description: 'Content matches personal voice DNA' });
    if (post.careerAlignmentScore >= 70) drivers.push({ factor: 'Career Alignment', impact: 'high', description: 'Strong career goal alignment' });

    return drivers;
  }
}

export const contentPerformanceEngine = new ContentPerformanceEngine();
