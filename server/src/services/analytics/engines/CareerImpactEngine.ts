import mongoose from 'mongoose';
import pino from 'pino';
import { Post } from '../../../models/content-generation/Post';
import { Analytics } from '../../../models/analytics/Analytics';
import { CareerImpactReport, ICareerImpactReport } from '../../../models/analytics/CareerImpactReport';

const logger = pino();

export interface CareerImpactResult {
  overallScore: number;
  metrics: {
    totalOpportunities: number;
    recruiterInteractions: number;
    clientLeads: number;
    partnershipRequests: number;
    interviewRequests: number;
    jobOffers: number;
  };
  contentContribution: {
    totalPosts: number;
    careerAlignedPosts: number;
    avgCareerAlignmentScore: number;
  };
  goalProgress: Array<{
    title: string;
    progress: number;
    contribution: number;
    drivingContent: string[];
  }>;
  insights: Array<{
    category: string;
    title: string;
    impact: 'positive' | 'negative' | 'neutral';
    recommendation?: string;
  }>;
}

export class CareerImpactEngine {
  async measure(userId: string): Promise<CareerImpactResult> {
    logger.info({ userId }, 'Measuring career impact');

    const posts = await Post.find({
      userId: new mongoose.Types.ObjectId(userId),
      status: 'published',
    }).sort({ createdAt: -1 }).lean();

    const postIds = posts.map(p => p._id);
    const analytics = await Analytics.find({ postId: { $in: postIds } }).lean();

    const careerAlignedPosts = posts.filter(p => (p.careerAlignmentScore || 0) >= 60);
    const avgCareerAlignment = posts.length > 0
      ? Math.round(posts.reduce((sum, p) => sum + (p.careerAlignmentScore || 0), 0) / posts.length)
      : 0;

    const totalOpportunities = this.sumAnalyticsByType(analytics, ['opportunity_generated']);
    const recruiterInteractions = this.sumAnalyticsByType(analytics, ['recruiter_interaction']);
    const clientLeads = this.sumAnalyticsByType(analytics, ['client_lead']);

    const overallScore = this.computeOverallScore(posts, analytics, careerAlignedPosts);

    const highImpactPosts = posts
      .filter(p => (p.careerAlignmentScore || 0) >= 60)
      .sort((a, b) => (b.overallScore || 0) - (a.overallScore || 0))
      .slice(0, 5)
      .map(p => p.title);

    const insights = this.generateInsights(overallScore, careerAlignedPosts.length, posts.length, avgCareerAlignment);

    return {
      overallScore,
      metrics: {
        totalOpportunities,
        recruiterInteractions,
        clientLeads,
        partnershipRequests: 0,
        interviewRequests: 0,
        jobOffers: 0,
      },
      contentContribution: {
        totalPosts: posts.length,
        careerAlignedPosts: careerAlignedPosts.length,
        avgCareerAlignmentScore: avgCareerAlignment,
      },
      goalProgress: [{
        title: 'Career Growth',
        progress: overallScore,
        contribution: careerAlignedPosts.length > 0 ? Math.round((careerAlignedPosts.length / posts.length) * 100) : 0,
        drivingContent: highImpactPosts,
      }],
      insights,
    };
  }

  async saveReport(userId: string): Promise<ICareerImpactReport | null> {
    const result = await this.measure(userId);

    const report = await CareerImpactReport.create({
      userId: new mongoose.Types.ObjectId(userId),
      period: { start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), end: new Date() },
      goals: result.goalProgress.map(g => ({
        title: g.title,
        targetRole: '',
        progress: g.progress,
        contribution: g.contribution,
        contentDriving: g.drivingContent.map(title => ({ title, impact: 0 })),
      })),
      overallScore: result.overallScore,
      metrics: {
        ...result.metrics,
        speakingRequests: 0,
        authorityScore: 0,
      },
      contentContribution: {
        totalPosts: result.contentContribution.totalPosts,
        careerAlignedPosts: result.contentContribution.careerAlignedPosts,
        avgCareerAlignmentScore: result.contentContribution.avgCareerAlignmentScore,
        topCareerContent: [],
      },
      growth: { followers: 0, connections: 0, profileViews: 0, searchAppearances: 0 },
      insights: result.insights.map(i => ({
        category: i.category,
        title: i.title,
        description: i.title,
        impact: i.impact,
        recommendation: i.recommendation,
      })),
      recommendations: [],
    });

    return report;
  }

  private sumAnalyticsByType(analytics: any[], types: string[]): number {
    let total = 0;
    for (const a of analytics) {
      for (const m of a.metrics || []) {
        if (types.includes(m.type)) total += m.value;
      }
    }
    return total;
  }

  private computeOverallScore(posts: any[], analytics: any[], careerAlignedPosts: any[]): number {
    let score = 0;

    if (posts.length > 0) {
      score += Math.min(20, posts.length / 2);
    }

    const careerRatio = posts.length > 0 ? careerAlignedPosts.length / posts.length : 0;
    score += careerRatio * 30;

    const avgScore = posts.reduce((sum, p) => sum + (p.careerAlignmentScore || 0), 0) / Math.max(posts.length, 1);
    score += (avgScore / 100) * 30;

    const opportunities = this.sumAnalyticsByType(analytics, ['opportunity_generated']);
    score += Math.min(20, opportunities * 2);

    return Math.min(100, Math.round(score));
  }

  private generateInsights(score: number, alignedCount: number, totalCount: number, avgAlignment: number): CareerImpactResult['insights'] {
    const insights: CareerImpactResult['insights'] = [];

    if (score >= 80) {
      insights.push({
        category: 'career',
        title: 'Strong career alignment — content is working for your goals',
        impact: 'positive',
        recommendation: 'Continue current career-focused content strategy',
      });
    } else if (score < 40) {
      insights.push({
        category: 'career',
        title: 'Career alignment needs significant improvement',
        impact: 'negative',
        recommendation: 'Focus on creating content that directly supports your career goals',
      });
    }

    if (alignedCount < 3 && totalCount > 5) {
      insights.push({
        category: 'content',
        title: 'Most content is not career-aligned',
        impact: 'negative',
        recommendation: `Only ${alignedCount} of ${totalCount} posts directly support career goals`,
      });
    }

    if (avgAlignment >= 70) {
      insights.push({
        category: 'quality',
        title: `High career alignment scores (avg: ${avgAlignment}/100)`,
        impact: 'positive',
      });
    }

    return insights;
  }
}

export const careerImpactEngine = new CareerImpactEngine();
