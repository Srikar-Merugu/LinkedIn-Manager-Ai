import mongoose from 'mongoose';
import pino from 'pino';
import { StrategyRecommendation, IStrategyRecommendation, RecommendationCategory } from '../../../models/analytics/StrategyRecommendation';

const logger = pino();

export interface ActionableRecommendation {
  category: RecommendationCategory;
  priority: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  reasoning: string;
  evidence: string[];
  impact: { expected: string; confidence: number; timeframe: string };
  suggestedAction: {
    type: 'update_calendar' | 'update_strategy' | 'adjust_mix' | 'change_publishing' | 'update_priorities' | 'create_content' | 'archive_content' | 'notify_user';
    params: Record<string, any>;
    autoApply: boolean;
    explanation: string;
  };
}

export interface RecommendationSet {
  critical: ActionableRecommendation[];
  high: ActionableRecommendation[];
  medium: ActionableRecommendation[];
  low: ActionableRecommendation[];
  summary: string;
}

export class RecommendationEngine {
  async generate(userId: string, inputs: {
    contentTypeRankings?: any[];
    topicRankings?: any[];
    pillarPerformances?: any[];
    strategyChanges?: any[];
    forecast?: any;
    careerImpact?: any;
    opportunities?: any;
    audienceInsights?: any;
    failures?: any[];
  }): Promise<RecommendationSet> {
    logger.info({ userId }, 'Generating actionable recommendations');

    const recommendations: ActionableRecommendation[] = [];

    recommendations.push(...this.generateContentMixRecs(inputs.contentTypeRankings, inputs.pillarPerformances));
    recommendations.push(...this.generatePublishingRecs(inputs.strategyChanges));
    recommendations.push(...this.generateGrowthRecs(inputs.forecast));
    recommendations.push(...this.generateCareerRecs(inputs.careerImpact));
    recommendations.push(...this.generateOpportunityRecs(inputs.opportunities));
    recommendations.push(...this.generateAudienceRecs(inputs.audienceInsights));
    recommendations.push(...this.generateQualityRecs(inputs.failures));

    return this.categorize(recommendations);
  }

  async saveTopRecommendations(userId: string, recs: RecommendationSet, limit: number = 5): Promise<IStrategyRecommendation[]> {
    const allRecs = [...recs.critical, ...recs.high, ...recs.medium, ...recs.low];
    const top = allRecs.slice(0, limit);
    const saved: IStrategyRecommendation[] = [];

    for (const rec of top) {
      const savedRec = await StrategyRecommendation.create({
        userId: new mongoose.Types.ObjectId(userId),
        category: rec.category,
        priority: rec.priority,
        title: rec.title,
        description: rec.description,
        reasoning: rec.reasoning,
        evidence: rec.evidence,
        metrics: [],
        impact: rec.impact,
        action: {
          type: rec.suggestedAction.type,
          params: rec.suggestedAction.params,
          autoApply: rec.suggestedAction.autoApply,
          explanation: rec.suggestedAction.explanation,
        },
        status: 'active',
      });
      saved.push(savedRec);
    }

    return saved;
  }

  private generateContentMixRecs(contentTypeRankings?: any[], pillarPerformances?: any[]): ActionableRecommendation[] {
    const recs: ActionableRecommendation[] = [];

    if (contentTypeRankings && contentTypeRankings.length > 0) {
      const best = contentTypeRankings[0];
      const worst = contentTypeRankings[contentTypeRankings.length - 1];

      if (best && best.recommendation === 'increase') {
        recs.push({
          category: 'content_mix',
          priority: 'high',
          title: `Increase ${best.contentType} content production`,
          description: `${best.contentType} posts score ${best.score}/100 but represent only ${best.frequency} posts`,
          reasoning: 'Your audience engages most with this format. Doubling down will accelerate growth.',
          evidence: [`Score: ${best.score}/100`, `Engagement: ${best.engagement}`, `Frequency: ${best.frequency} posts`],
          impact: { expected: '20-40% increase in overall engagement', confidence: 75, timeframe: '30 days' },
          suggestedAction: {
            type: 'adjust_mix',
            params: { contentType: best.contentType, change: 'increase', targetPercent: 40 },
            autoApply: true,
            explanation: `Increase ${best.contentType} to improve engagement`,
          },
        });
      }

      if (worst && worst.recommendation === 'decrease') {
        recs.push({
          category: 'content_mix',
          priority: 'medium',
          title: `Reduce ${worst.contentType} content`,
          description: `Lowest performing type with score ${worst.score}/100`,
          reasoning: 'Resources spent on this format could be better allocated to higher-performing types.',
          evidence: [`Score: ${worst.score}/100`, `Engagement: ${worst.engagement}`],
          impact: { expected: 'Better content mix efficiency', confidence: 60, timeframe: '30 days' },
          suggestedAction: {
            type: 'adjust_mix',
            params: { contentType: worst.contentType, change: 'decrease' },
            autoApply: false,
            explanation: `Reduce ${worst.contentType} in favor of better performers`,
          },
        });
      }
    }

    if (pillarPerformances && pillarPerformances.length > 0) {
      const bestPillar = pillarPerformances.filter((p: any) => p.recommendation?.action === 'increase')[0];
      if (bestPillar) {
        recs.push({
          category: 'pillar',
          priority: 'high',
          title: `Prioritize ${bestPillar.pillar} content pillar`,
          description: `Score: ${bestPillar.score}/100 with recommendation to increase volume`,
          reasoning: bestPillar.recommendation?.rationale || 'High-performing pillar underutilized',
          evidence: [`Score: ${bestPillar.score}/100`, `Engagement: ${bestPillar.engagement}`, `Posts: ${bestPillar.posts}`],
          impact: { expected: 'Stronger pillar authority and engagement', confidence: 70, timeframe: '60 days' },
          suggestedAction: {
            type: 'update_priorities',
            params: { pillar: bestPillar.pillar, priority: 'high', frequency: bestPillar.recommendation?.suggestedFrequency },
            autoApply: true,
            explanation: `Increase ${bestPillar.pillar} priority based on performance`,
          },
        });
      }
    }

    return recs;
  }

  private generatePublishingRecs(strategyChanges?: any[]): ActionableRecommendation[] {
    const recs: ActionableRecommendation[] = [];

    if (strategyChanges) {
      for (const change of strategyChanges) {
        if (change.category === 'publishing') {
          recs.push({
            category: 'publishing',
            priority: 'medium',
            title: change.recommendedState,
            description: change.rationale,
            reasoning: change.rationale,
            evidence: [],
            impact: { expected: change.expectedImpact, confidence: change.confidence, timeframe: '14 days' },
            suggestedAction: {
              type: 'change_publishing',
              params: { schedule: change.recommendedState },
              autoApply: change.autoApply || false,
              explanation: change.rationale,
            },
          });
        }
      }
    }

    return recs;
  }

  private generateGrowthRecs(forecast?: any): ActionableRecommendation[] {
    const recs: ActionableRecommendation[] = [];

    if (forecast?.risks) {
      for (const risk of forecast.risks) {
        if (risk.probability > 50 && risk.impact > 60) {
          recs.push({
            category: 'growth',
            priority: 'high',
            title: `Mitigation: ${risk.risk}`,
            description: risk.mitigation,
            reasoning: `${risk.probability}% probability with ${risk.impact}/100 impact`,
            evidence: [`Probability: ${risk.probability}%`, `Impact: ${risk.impact}/100`],
            impact: { expected: 'Risk reduction', confidence: 50, timeframe: '60 days' },
            suggestedAction: {
              type: 'update_strategy',
              params: { risk: risk.risk, mitigation: risk.mitigation },
              autoApply: false,
              explanation: risk.mitigation,
            },
          });
        }
      }
    }

    if (forecast?.projections) {
      const slowest = Object.entries(forecast.projections)
        .sort(([, a]: any, [, b]: any) => a.growthRate - b.growthRate)[0];

      if (slowest) {
        const [metric, data] = slowest as [string, any];
        recs.push({
          category: 'growth',
          priority: 'medium',
          title: `Boost ${metric} growth rate`,
          description: `Current growth: ${data.growthRate}%. Target: ${data.projected} in next period`,
          reasoning: `${metric} growth is the slowest metric and needs strategic focus`,
          evidence: [`Growth rate: ${data.growthRate}%`, `Current: ${data.current}`, `Projected: ${data.projected}`],
          impact: { expected: `${Math.abs(data.growthRate) + 10}% growth improvement`, confidence: 55, timeframe: '90 days' },
          suggestedAction: {
            type: 'notify_user',
            params: { metric, focusArea: metric },
            autoApply: false,
            explanation: `Focus on improving ${metric} growth through targeted content`,
          },
        });
      }
    }

    return recs;
  }

  private generateCareerRecs(careerImpact?: any): ActionableRecommendation[] {
    const recs: ActionableRecommendation[] = [];

    if (careerImpact) {
      if (careerImpact.overallScore < 50) {
        recs.push({
          category: 'strategy',
          priority: 'critical',
          title: 'Improve career alignment of content',
          description: `Current career impact score: ${careerImpact.overallScore}/100`,
          reasoning: 'Content is not effectively supporting career goals',
          evidence: [`Score: ${careerImpact.overallScore}/100`, `Aligned posts: ${careerImpact.contentContribution?.careerAlignedPosts || 0}/${careerImpact.contentContribution?.totalPosts || 0}`],
          impact: { expected: 'Increased career opportunities and recruiter interest', confidence: 80, timeframe: '90 days' },
          suggestedAction: {
            type: 'update_strategy',
            params: { focus: 'career_alignment' },
            autoApply: false,
            explanation: 'Redesign content strategy around career goals',
          },
        });
      }
    }

    return recs;
  }

  private generateOpportunityRecs(opportunities?: any): ActionableRecommendation[] {
    const recs: ActionableRecommendation[] = [];

    if (opportunities?.bestType && opportunities?.worstType) {
      if (opportunities.bestType.avgScore > opportunities.worstType.avgScore + 20) {
        recs.push({
          category: 'opportunity',
          priority: 'medium',
          title: `Focus on ${opportunities.bestType.type} opportunities`,
          description: `${opportunities.bestType.type} opportunities score ${opportunities.bestType.avgScore}/100 vs ${opportunities.worstType.type} at ${opportunities.worstType.avgScore}/100`,
          reasoning: 'Certain opportunity types generate significantly better results',
          evidence: [`Best: ${opportunities.bestType.type} (${opportunities.bestType.avgScore})`, `Worst: ${opportunities.worstType.type} (${opportunities.worstType.avgScore})`],
          impact: { expected: 'Higher ROI on opportunity efforts', confidence: 65, timeframe: '60 days' },
          suggestedAction: {
            type: 'update_priorities',
            params: { opportunityType: opportunities.bestType.type, priority: 'high' },
            autoApply: true,
            explanation: `Prioritize ${opportunities.bestType.type} opportunities for better results`,
          },
        });
      }
    }

    return recs;
  }

  private generateAudienceRecs(audienceInsights?: any): ActionableRecommendation[] {
    const recs: ActionableRecommendation[] = [];

    if (audienceInsights?.insights) {
      for (const insight of audienceInsights.insights) {
        if (insight.impact === 'positive' && insight.recommendation) {
          recs.push({
            category: 'audience',
            priority: 'medium',
            title: insight.title,
            description: insight.description,
            reasoning: insight.description,
            evidence: [],
            impact: { expected: 'Improved audience engagement', confidence: 60, timeframe: '30 days' },
            suggestedAction: {
              type: 'notify_user',
              params: { insight: insight.title },
              autoApply: false,
              explanation: insight.recommendation || insight.description,
            },
          });
        }
      }
    }

    return recs;
  }

  private generateQualityRecs(failures?: any[]): ActionableRecommendation[] {
    const recs: ActionableRecommendation[] = [];

    if (failures && failures.length > 0) {
      const patterns = new Map<string, { count: number; severity: string }>();
      for (const f of failures) {
        for (const r of f.reasons || []) {
          if (!patterns.has(r.factor)) patterns.set(r.factor, { count: 0, severity: r.severity });
          patterns.get(r.factor)!.count += 1;
        }
      }

      const worstPattern = Array.from(patterns.entries()).sort((a, b) => b[1].count - a[1].count)[0];
      if (worstPattern && worstPattern[1].count > 2) {
        recs.push({
          category: 'strategy',
          priority: worstPattern[1].severity === 'critical' ? 'critical' : 'high',
          title: `Address recurring issue: ${worstPattern[0]}`,
          description: `This issue appeared in ${worstPattern[1].count} underperforming posts`,
          reasoning: 'Recurring failure patterns indicate systematic content quality issues',
          evidence: [`Affected posts: ${worstPattern[1].count}`],
          impact: { expected: 'Improved content quality and performance', confidence: 75, timeframe: '14 days' },
          suggestedAction: {
            type: 'notify_user',
            params: { issue: worstPattern[0] },
            autoApply: false,
            explanation: `Focus on fixing ${worstPattern[0]} in future content`,
          },
        });
      }
    }

    return recs;
  }

  private categorize(recommendations: ActionableRecommendation[]): RecommendationSet {
    const set: RecommendationSet = { critical: [], high: [], medium: [], low: [], summary: '' };

    for (const rec of recommendations) {
      set[rec.priority].push(rec);
    }

    const allCount = recommendations.length;
    const criticalCount = set.critical.length;
    const highCount = set.high.length;

    if (criticalCount > 0) {
      set.summary = `${criticalCount} critical and ${highCount} high-priority recommendations require attention`;
    } else if (highCount > 0) {
      set.summary = `${highCount} recommendations to improve content performance`;
    } else if (allCount > 0) {
      set.summary = `${allCount} minor optimization opportunities identified`;
    } else {
      set.summary = 'Your content strategy is well-optimized';
    }

    return set;
  }
}

export const recommendationEngine = new RecommendationEngine();
