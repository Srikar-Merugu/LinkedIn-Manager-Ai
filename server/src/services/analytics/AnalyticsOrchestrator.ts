import pino from 'pino';
import { performanceCollectionEngine, IngestInput, IngestResult } from './engines/PerformanceCollectionEngine';
import { contentPerformanceEngine, ContentPerformanceResult } from './engines/ContentPerformanceEngine';
import { successDetectionEngine, SuccessSummary, SuccessRanking } from './engines/SuccessDetectionEngine';
import { failureDetectionEngine, FailureAnalysis } from './engines/FailureDetectionEngine';
import { contentDNALearningEngine, LearningModel } from './engines/ContentDNALearningEngine';
import { audienceIntelligenceEngine, AudienceAnalysisResult } from './engines/AudienceIntelligenceEngine';
import { contentPillarOptimizationEngine, PillarPerformance } from './engines/ContentPillarOptimizationEngine';
import { strategyOptimizationEngine, StrategyOptimizationResult, StrategyChange } from './engines/StrategyOptimizationEngine';
import { opportunityFeedbackEngine, OpportunityFeedbackSummary } from './engines/OpportunityFeedbackEngine';
import { careerImpactEngine, CareerImpactResult } from './engines/CareerImpactEngine';
import { predictionEngine, ForecastResult } from './engines/PredictionEngine';
import { recommendationEngine, RecommendationSet, ActionableRecommendation } from './engines/RecommendationEngine';
import { selfImprovementLoop, LoopIteration } from './engines/SelfImprovementLoop';
import { aiDecisionEngine, Decision, DecisionInput } from './engines/AIDecisionEngine';
import { executiveInsightsEngine, ExecutiveReport } from './engines/ExecutiveInsightsEngine';
import { eventSystem, EventResult, AnalyticsEvent, EventPayload } from './engines/EventSystem';

const logger = pino();

export interface FullAnalysisReport {
  userId: string;
  generatedAt: Date;
  performance: ContentPerformanceResult[];
  successRankings: SuccessSummary;
  failures: FailureAnalysis[];
  dNALearning: LearningModel;
  audience: AudienceAnalysisResult;
  pillars: PillarPerformance[];
  strategy: StrategyOptimizationResult;
  opportunities: OpportunityFeedbackSummary;
  careerImpact: CareerImpactResult;
  forecast: ForecastResult;
  recommendations: RecommendationSet;
  executiveReport: ExecutiveReport;
}

export class AnalyticsOrchestrator {
  async fullAnalysis(userId: string): Promise<FullAnalysisReport> {
    logger.info({ userId }, 'Starting full analytics analysis');

    const [
      performance_results,
      successRankings,
      failures,
      dNALearning,
      audience,
      pillars,
      strategy,
      opportunities,
      careerImpact,
      forecast,
    ] = await Promise.all([
      contentPerformanceEngine.analyzeAll(userId),
      successDetectionEngine.findBestContent(userId),
      failureDetectionEngine.findUnderperforming(userId),
      contentDNALearningEngine.learn(userId),
      audienceIntelligenceEngine.analyze(userId),
      contentPillarOptimizationEngine.evaluateAll(userId),
      strategyOptimizationEngine.optimize(userId),
      opportunityFeedbackEngine.evaluate(userId),
      careerImpactEngine.measure(userId),
      predictionEngine.forecast(userId, '90_days'),
    ]);

    const recommendations = await recommendationEngine.generate(userId, {
      contentTypeRankings: dNALearning.contentTypeRankings,
      topicRankings: dNALearning.topicRankings,
      pillarPerformances: pillars,
      strategyChanges: strategy.changes,
      forecast,
      careerImpact,
      opportunities,
      audienceInsights: audience,
      failures,
    });

    const executiveReport = await executiveInsightsEngine.generate(userId, 'weekly');

    await eventSystem.triggerAnalyticsUpdated(userId, 'full_analysis');

    logger.info({ userId }, 'Full analysis complete');

    return {
      userId,
      generatedAt: new Date(),
      performance: performance_results,
      successRankings,
      failures,
      dNALearning,
      audience,
      pillars,
      strategy,
      opportunities,
      careerImpact,
      forecast,
      recommendations,
      executiveReport,
    };
  }

  async performanceSummary(userId: string): Promise<{
    totalPosts: number;
    totalEngagement: number;
    avgEngagementRate: number;
    followerGrowth: number;
    topPostType: string;
    bestDay: string;
    score: number;
  }> {
    const results = await contentPerformanceEngine.analyzeAll(userId);
    const drivers = await contentPerformanceEngine.getPerformanceDrivers(userId);
    const success = await successDetectionEngine.findBestContent(userId);

    const totalEngagement = results.reduce((sum, r) => sum + r.metrics.engagement, 0);
    const avgRate = results.length > 0
      ? Math.round(results.reduce((sum, r) => sum + r.metrics.engagementRate, 0) / results.length * 100) / 100
      : 0;
    const followerGrowth = results.reduce((sum, r) => sum + r.metrics.followerGain, 0);
    const totalPosts = results.length;

    const bestType = drivers.contentType.sort((a, b) => b.avgEngagement - a.avgEngagement)[0];
    const bestDay = drivers.dayOfWeek.sort((a, b) => b.avgEngagement - a.avgEngagement)[0];
    const topScore = success.bestOverall[0]?.compositeScore || 0;

    return {
      totalPosts,
      totalEngagement,
      avgEngagementRate: avgRate,
      followerGrowth,
      topPostType: bestType?.type || 'N/A',
      bestDay: bestDay?.day || 'N/A',
      score: topScore,
    };
  }

  async ingestAnalytics(input: IngestInput): Promise<IngestResult> {
    const result = await performanceCollectionEngine.ingest(input);
    await eventSystem.triggerAnalyticsUpdated(input.userId, input.source);
    return result;
  }

  async triggerOptimization(userId: string): Promise<LoopIteration> {
    return selfImprovementLoop.execute(userId);
  }

  async makeDecision(input: DecisionInput): Promise<Decision> {
    const decision = await aiDecisionEngine.decide(input);
    if (decision.made) {
      await aiDecisionEngine.applyDecision(input.userId, decision);
    }
    return decision;
  }

  async generateReport(userId: string, type: 'weekly' | 'monthly' | 'quarterly' = 'weekly'): Promise<ExecutiveReport> {
    const report = await executiveInsightsEngine.generate(userId, type);
    await executiveInsightsEngine.saveReport(userId, type);
    return report;
  }

  async saveRecommendations(userId: string): Promise<any> {
    const result = await strategyOptimizationEngine.saveRecommendations(userId);
    const dna = await contentDNALearningEngine.learn(userId);
    const pillars = await contentPillarOptimizationEngine.evaluateAll(userId);
    const opps = await opportunityFeedbackEngine.evaluate(userId);
    const career = await careerImpactEngine.measure(userId);
    const forecast = await predictionEngine.forecast(userId);
    const audience = await audienceIntelligenceEngine.analyze(userId);
    const failures = await failureDetectionEngine.findUnderperforming(userId);

    const recs = await recommendationEngine.generate(userId, {
      contentTypeRankings: dna.contentTypeRankings,
      pillarPerformances: pillars,
      opportunities: opps,
      careerImpact: career,
      forecast,
      audienceInsights: audience,
      failures,
    });

    await recommendationEngine.saveTopRecommendations(userId, recs);
    return recs;
  }

  async triggerEvent(type: AnalyticsEvent, userId: string, data: Record<string, any> = {}): Promise<EventResult> {
    return eventSystem.trigger(type, userId, data);
  }

  async getDashboard(userId: string): Promise<any> {
    const [summary, performance, pillars, forecast, recommendations, report] = await Promise.all([
      this.performanceSummary(userId),
      contentPerformanceEngine.getPerformanceDrivers(userId),
      contentPillarOptimizationEngine.evaluateAll(userId),
      predictionEngine.forecast(userId, '30_days'),
      recommendationEngine.generate(userId, {}),
      executiveInsightsEngine.generate(userId, 'weekly'),
    ]);

    return {
      summary,
      performanceDrivers: performance,
      pillars,
      forecast,
      recommendations,
      report,
      generatedAt: new Date(),
    };
  }
}

export const analyticsOrchestrator = new AnalyticsOrchestrator();
