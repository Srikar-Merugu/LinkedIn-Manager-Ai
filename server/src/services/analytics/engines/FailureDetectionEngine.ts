import mongoose from 'mongoose';
import pino from 'pino';
import { Post } from '../../../models/content-generation/Post';
import { Analytics } from '../../../models/analytics/Analytics';

const logger = pino();

export interface FailureReason {
  factor: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  evidence: string;
  recommendation: string;
}

export interface FailureAnalysis {
  postId: string;
  title: string;
  contentType: string;
  topic: string;
  failureScore: number;
  isUnderperforming: boolean;
  reasons: FailureReason[];
  metrics: { expected: number; actual: number; gap: number };
}

export class FailureDetectionEngine {
  async analyzePost(postId: string, userId: string): Promise<FailureAnalysis | null> {
    logger.info({ postId }, 'Analyzing content failure');

    const post = await Post.findById(postId).lean();
    if (!post) return null;

    const analytics = await Analytics.find({
      postId: new mongoose.Types.ObjectId(postId),
      userId: new mongoose.Types.ObjectId(userId),
    }).lean();

    const metrics = this.aggregateMetrics(analytics);
    const expected = this.computeExpectedPerformance(post);
    const gap = expected - metrics.engagement;

    const reasons: FailureReason[] = [];

    if (gap > 0) {
      reasons.push(...this.analyzeHook(post.hook, metrics));
      reasons.push(...this.analyzeTopic(post, metrics));
      reasons.push(...this.analyzeTiming(post.createdAt, metrics));
      reasons.push(...this.analyzeAuthority(post, metrics));
      reasons.push(...this.analyzeAudience(post, metrics));
    }

    const failureScore = Math.min(100, Math.round((gap / Math.max(expected, 1)) * 100));

    return {
      postId: post._id.toString(),
      title: post.title,
      contentType: post.contentType,
      topic: post.tags[0] || '',
      failureScore,
      isUnderperforming: gap > expected * 0.3,
      reasons,
      metrics: { expected, actual: metrics.engagement, gap: Math.max(0, gap) },
    };
  }

  async findUnderperforming(userId: string, limit: number = 10): Promise<FailureAnalysis[]> {
    const posts = await Post.find({ userId: new mongoose.Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    const results: FailureAnalysis[] = [];
    for (const post of posts) {
      const analysis = await this.analyzePost(post._id.toString(), userId);
      if (analysis && analysis.isUnderperforming) {
        results.push(analysis);
      }
    }

    return results.sort((a, b) => b.failureScore - a.failureScore).slice(0, limit);
  }

  async getCommonFailurePatterns(userId: string): Promise<Array<{ pattern: string; frequency: number; avgFailureScore: number; recommendation: string }>> {
    const failures = await this.findUnderperforming(userId, 50);
    const patternMap = new Map<string, { count: number; totalScore: number; recommendations: string[] }>();

    for (const f of failures) {
      for (const r of f.reasons) {
        if (!patternMap.has(r.factor)) {
          patternMap.set(r.factor, { count: 0, totalScore: 0, recommendations: [] });
        }
        const p = patternMap.get(r.factor)!;
        p.count += 1;
        p.totalScore += f.failureScore;
        p.recommendations.push(r.recommendation);
      }
    }

    return Array.from(patternMap.entries())
      .map(([pattern, data]) => ({
        pattern,
        frequency: data.count,
        avgFailureScore: Math.round(data.totalScore / data.count),
        recommendation: data.recommendations[0] || 'Review content approach',
      }))
      .sort((a, b) => b.frequency - a.frequency);
  }

  private analyzeHook(hook: string, metrics: any): FailureReason[] {
    const reasons: FailureReason[] = [];
    const hookLength = hook.length;

    if (hookLength > 120) {
      reasons.push({
        factor: 'Weak Hook',
        severity: 'high',
        description: 'Hook is too long and may not capture attention',
        evidence: `Hook length: ${hookLength} characters (recommended: 20-80)`,
        recommendation: 'Shorten hook to 20-80 characters for higher engagement',
      });
    }

    if (!hook.includes('?') && !/\d+/.test(hook) && !/(the |this |here'?s|what if|how to)/i.test(hook)) {
      reasons.push({
        factor: 'Weak Hook',
        severity: 'medium',
        description: 'Hook lacks engagement triggers (questions, numbers, bold claims)',
        evidence: 'No question mark, numbers, or pattern-interrupt phrases detected',
        recommendation: 'Add a question, statistic, or bold claim to the hook',
      });
    }

    return reasons;
  }

  private analyzeTopic(post: any, metrics: any): FailureReason[] {
    const reasons: FailureReason[] = [];

    if (post.careerAlignmentScore < 40) {
      reasons.push({
        factor: 'Weak Topics',
        severity: 'medium',
        description: 'Topic does not align with career goals',
        evidence: `Career alignment score: ${post.careerAlignmentScore}/100`,
        recommendation: 'Choose topics that directly support your career targets',
      });
    }

    if (post.voiceMatchScore < 40) {
      reasons.push({
        factor: 'Weak Topics',
        severity: 'medium',
        description: 'Topic does not match personal voice DNA',
        evidence: `Voice match score: ${post.voiceMatchScore}/100`,
        recommendation: 'Select topics that align with your expertise and authentic voice',
      });
    }

    return reasons;
  }

  private analyzeTiming(date: Date, metrics: any): FailureReason[] {
    const reasons: FailureReason[] = [];
    const hour = date.getHours();
    const day = date.getDay();

    const optimalHours = [7, 8, 9, 12, 13, 17, 18, 19, 20];
    const optimalDays = [1, 2, 3, 4];

    if (!optimalHours.includes(hour)) {
      reasons.push({
        factor: 'Poor Timing',
        severity: 'medium',
        description: `Published at suboptimal hour (${hour}:00)`,
        evidence: `Best engagement hours: 7-9 AM, 12-1 PM, 5-8 PM`,
        recommendation: `Schedule posts for peak engagement hours`,
      });
    }

    if (!optimalDays.includes(day)) {
      reasons.push({
        factor: 'Poor Timing',
        severity: 'low',
        description: 'Published on suboptimal day',
        evidence: 'Best days: Tuesday-Thursday',
        recommendation: 'Focus publishing on Tuesday-Thursday for higher engagement',
      });
    }

    return reasons;
  }

  private analyzeAuthority(post: any, metrics: any): FailureReason[] {
    const reasons: FailureReason[] = [];
    if (post.qualityScore < 40) {
      reasons.push({
        factor: 'Low Authority Areas',
        severity: 'high',
        description: 'Content lacks depth and authority signals',
        evidence: `Quality score: ${post.qualityScore}/100`,
        recommendation: 'Add more specific examples, data, and personal experience',
      });
    }
    return reasons;
  }

  private analyzeAudience(post: any, metrics: any): FailureReason[] {
    const reasons: FailureReason[] = [];
    if (metrics.engagement > 0 && metrics.impressions > 100 && metrics.engagementRate < 1) {
      reasons.push({
        factor: 'Audience Misalignment',
        severity: 'high',
        description: 'Content reached audience but failed to engage',
        evidence: `Engagement rate: ${metrics.engagementRate}% (benchmark: 2%+)`,
        recommendation: 'Review content format and messaging for audience alignment',
      });
    }
    return reasons;
  }

  private computeExpectedPerformance(post: any): number {
    let expected = 100;
    if (post.voiceMatchScore > 70) expected += 100;
    if (post.careerAlignmentScore > 70) expected += 50;
    if (post.qualityScore > 70) expected += 50;
    if (post.overallScore > 80) expected += 100;
    return expected;
  }

  private aggregateMetrics(analytics: any[]) {
    let engagement = 0;
    let impressions = 0;
    let engagementRate = 0;

    for (const a of analytics) {
      for (const m of a.metrics || []) {
        switch (m.type) {
          case 'like': engagement += m.value; break;
          case 'comment': engagement += m.value * 2; break;
          case 'share': engagement += m.value * 3; break;
          case 'save': engagement += m.value * 2; break;
          case 'impression': impressions += m.value; break;
        }
      }
    }

    engagementRate = impressions > 0 ? (engagement / impressions) * 100 : 0;

    return { engagement, impressions, engagementRate };
  }
}

export const failureDetectionEngine = new FailureDetectionEngine();
