import mongoose from 'mongoose';
import pino from 'pino';
import { PerformanceReport, IPerformanceReport, ReportType } from '../../../models/analytics/PerformanceReport';
import { Post } from '../../../models/content-generation/Post';
import { Analytics } from '../../../models/analytics/Analytics';

const logger = pino();

export interface ExecutiveReport {
  type: ReportType;
  period: { start: Date; end: Date };
  summary: {
    score: number;
    totalEngagement: number;
    followerGrowth: number;
    topPost: string;
    insightCount: number;
  };
  highlights: string[];
  growth: {
    followers: { start: number; end: number; percent: number };
    engagement: { start: number; end: number; percent: number };
    reach: { start: number; end: number; percent: number };
  };
  topContent: Array<{ title: string; contentType: string; engagement: number; score: number }>;
  bottomContent: Array<{ title: string; contentType: string; engagement: number; issues: string[] }>;
  recommendations: string[];
}

export class ExecutiveInsightsEngine {
  async generate(userId: string, type: ReportType = 'weekly'): Promise<ExecutiveReport> {
    logger.info({ userId, type }, 'Generating executive insights report');

    const days = type === 'weekly' ? 7 : type === 'monthly' ? 30 : 90;
    const period = {
      start: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
      end: new Date(),
    };

    const posts = await Post.find({
      userId: new mongoose.Types.ObjectId(userId),
      status: 'published',
      createdAt: { $gte: period.start, $lte: period.end },
    }).sort({ createdAt: -1 }).lean();

    const postIds = posts.map(p => p._id);
    const analytics = await Analytics.find({ postId: { $in: postIds } }).lean();

    const totalEngagement = this.sumMetrics(analytics, ['like', 'comment', 'share', 'save']);
    const totalImpressions = this.sumMetrics(analytics, ['impression']);
    const followerGrowth = this.sumMetrics(analytics, ['follower']);

    const scored = posts.map(p => {
      const pa = analytics.filter(a => a.postId?.toString() === p._id.toString());
      const eng = pa.reduce((sum, a) => sum + a.metrics.filter(m => ['like', 'comment', 'share', 'save'].includes(m.type)).reduce((s, m) => s + m.value, 0), 0);
      return { ...p, engagement: eng, score: (p.overallScore || 0) * 0.4 + Math.min(60, eng) };
    }).sort((a, b) => b.score - a.score);

    const topContent = scored.slice(0, 5).map(p => ({
      title: p.title,
      contentType: p.contentType,
      engagement: p.engagement,
      score: Math.round(p.score),
    }));

    const bottomContent = scored.slice(-3).reverse().map(p => ({
      title: p.title,
      contentType: p.contentType,
      engagement: p.engagement,
      issues: [p.contentType === 'story' ? 'Consider more specific hook' : `Low ${p.contentType} engagement`],
    }));

    const growth = this.computeGrowth(analytics, period);
    const summary = {
      score: Math.round((totalEngagement / Math.max(posts.length, 1)) * 10 + (posts.length > 0 ? 20 : 0)),
      totalEngagement,
      followerGrowth: Math.abs(followerGrowth),
      topPost: topContent[0]?.title || 'No content yet',
      insightCount: topContent.length + bottomContent.length,
    };

    const highlights = this.generateHighlights(summary, growth, posts.length);
    const recommendations = this.generateRecommendations(summary, topContent, bottomContent);

    return {
      type,
      period,
      summary,
      highlights,
      growth,
      topContent,
      bottomContent,
      recommendations,
    };
  }

  async saveReport(userId: string, type: ReportType = 'weekly'): Promise<IPerformanceReport | null> {
    const report = await this.generate(userId, type);

    const saved = await PerformanceReport.create({
      userId: new mongoose.Types.ObjectId(userId),
      type,
      status: 'completed',
      period: report.period,
      summary: {
        totalPosts: report.topContent.length + report.bottomContent.length,
        totalEngagement: report.summary.totalEngagement,
        totalReach: 0,
        followerGrowth: report.summary.followerGrowth,
        avgEngagementRate: 0,
        topPost: report.summary.topPost ? { title: report.summary.topPost, engagement: report.topContent[0]?.engagement || 0 } : null,
        score: report.summary.score,
      },
      topContent: report.topContent.map((t, i) => ({
        title: t.title,
        contentType: t.contentType,
        score: t.score,
        metrics: { impressions: 0, engagement: t.engagement, growth: 0 },
        rank: i + 1,
      })),
      bottomContent: report.bottomContent.map((t, i) => ({
        title: t.title,
        contentType: t.contentType,
        score: 0,
        metrics: { impressions: 0, engagement: t.engagement, growth: 0 },
        rank: i + 1,
      })),
      insights: report.highlights.map(h => ({
        category: 'performance',
        title: h,
        description: h,
        impact: 'positive' as const,
        severity: 'medium' as const,
        metric: '',
        value: 0,
        previousValue: 0,
        change: 0,
      })),
      growth: {
        followers: { start: 0, end: 0, net: report.growth.followers.percent, percent: report.growth.followers.percent },
        engagement: { start: 0, end: 0, net: report.growth.engagement.percent, percent: report.growth.engagement.percent },
        reach: { start: 0, end: 0, net: report.growth.reach.percent, percent: report.growth.reach.percent },
        authority: { start: 0, end: 0, net: 0, percent: 0 },
      },
      pillarPerformance: [],
      recommendations: report.recommendations,
      generatedAt: new Date(),
    });

    return saved;
  }

  private sumMetrics(analytics: any[], types: string[]): number {
    let total = 0;
    for (const a of analytics) {
      for (const m of a.metrics || []) {
        if (types.includes(m.type)) total += m.value;
      }
    }
    return total;
  }

  private computeGrowth(analytics: any[], period: { start: Date; end: Date }): ExecutiveReport['growth'] {
    const mid = new Date(period.start.getTime() + (period.end.getTime() - period.start.getTime()) / 2);

    const firstHalf = analytics.filter(a => new Date(a.period.start) < mid);
    const secondHalf = analytics.filter(a => new Date(a.period.start) >= mid);

    const sumMetrics = (data: typeof analytics, types: string[]) =>
      data.reduce((sum, a) => sum + a.metrics.filter((m: any) => types.includes(m.type)).reduce((s: number, m: any) => s + m.value, 0), 0);

    const followersStart = sumMetrics(firstHalf, ['follower']);
    const followersEnd = sumMetrics(secondHalf, ['follower']);
    const engagementStart = sumMetrics(firstHalf, ['like', 'comment', 'share', 'save']);
    const engagementEnd = sumMetrics(secondHalf, ['like', 'comment', 'share', 'save']);
    const reachStart = sumMetrics(firstHalf, ['impression']);
    const reachEnd = sumMetrics(secondHalf, ['impression']);

    return {
      followers: { start: followersStart, end: followersEnd, percent: followersStart > 0 ? Math.round(((followersEnd - followersStart) / followersStart) * 100) : 0 },
      engagement: { start: engagementStart, end: engagementEnd, percent: engagementStart > 0 ? Math.round(((engagementEnd - engagementStart) / engagementStart) * 100) : 0 },
      reach: { start: reachStart, end: reachEnd, percent: reachStart > 0 ? Math.round(((reachEnd - reachStart) / reachStart) * 100) : 0 },
    };
  }

  private generateHighlights(summary: any, growth: any, postCount: number): string[] {
    const highlights: string[] = [];

    if (postCount > 0) highlights.push(`Published ${postCount} posts this period`);
    if (summary.totalEngagement > 0) highlights.push(`Total engagement: ${summary.totalEngagement}`);
    if (growth.followers.percent !== 0) highlights.push(`Follower growth: ${growth.followers.percent > 0 ? '+' : ''}${growth.followers.percent}%`);
    if (growth.engagement.percent !== 0) highlights.push(`Engagement ${growth.engagement.percent > 0 ? 'increased' : 'decreased'} by ${Math.abs(growth.engagement.percent)}%`);
    if (summary.topPost) highlights.push(`Top post: ${summary.topPost}`);

    return highlights;
  }

  private generateRecommendations(summary: any, topContent: any[], bottomContent: any[]): string[] {
    const recommendations: string[] = [];

    if (bottomContent.length > 0) {
      recommendations.push(`Review underperforming content: "${bottomContent[0]?.title}"`);
    }
    if (topContent.length > 0) {
      recommendations.push(`Create more content similar to "${topContent[0]?.title}"`);
    }
    if (summary.score < 50) {
      recommendations.push('Focus on content quality over quantity');
    }

    return recommendations;
  }
}

export const executiveInsightsEngine = new ExecutiveInsightsEngine();
