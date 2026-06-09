import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import pino from 'pino';
import { analyticsOrchestrator } from '../services/analytics/AnalyticsOrchestrator';
import { performanceCollectionEngine } from '../services/analytics/engines/PerformanceCollectionEngine';
import { contentPerformanceEngine } from '../services/analytics/engines/ContentPerformanceEngine';
import { successDetectionEngine } from '../services/analytics/engines/SuccessDetectionEngine';
import { failureDetectionEngine } from '../services/analytics/engines/FailureDetectionEngine';
import { contentDNALearningEngine } from '../services/analytics/engines/ContentDNALearningEngine';
import { audienceIntelligenceEngine } from '../services/analytics/engines/AudienceIntelligenceEngine';
import { contentPillarOptimizationEngine } from '../services/analytics/engines/ContentPillarOptimizationEngine';
import { strategyOptimizationEngine } from '../services/analytics/engines/StrategyOptimizationEngine';
import { opportunityFeedbackEngine } from '../services/analytics/engines/OpportunityFeedbackEngine';
import { careerImpactEngine } from '../services/analytics/engines/CareerImpactEngine';
import { predictionEngine } from '../services/analytics/engines/PredictionEngine';
import { recommendationEngine } from '../services/analytics/engines/RecommendationEngine';
import { executiveInsightsEngine } from '../services/analytics/engines/ExecutiveInsightsEngine';
import { eventSystem } from '../services/analytics/engines/EventSystem';
import { Analytics } from '../models/analytics/Analytics';
import { PerformanceReport } from '../models/analytics/PerformanceReport';
import { AudienceInsight } from '../models/analytics/AudienceInsight';
import { GrowthForecast } from '../models/analytics/GrowthForecast';
import { StrategyRecommendation } from '../models/analytics/StrategyRecommendation';
import { OpportunityPerformance } from '../models/analytics/OpportunityPerformance';
import { CareerImpactReport } from '../models/analytics/CareerImpactReport';
import { OptimizationHistory } from '../models/analytics/OptimizationHistory';

const logger = pino();

function getClerkId(req: Request): string | null {
  return (req.headers['x-clerk-user-id'] as string) || null;
}

export function createAnalyticsRouter(): Router {
  const router = Router();

  /* ─────── Ingest Analytics Data ─────── */

  router.post('/ingest', async (req: Request, res: Response) => {
    try {
      const clerkId = getClerkId(req);
      if (!clerkId) return res.status(401).json({ error: 'Authentication required' });

      const result = await analyticsOrchestrator.ingestAnalytics(req.body);
      res.json(result);
    } catch (error: any) {
      logger.error({ error }, 'Ingest failed');
      res.status(500).json({ error: error.message || 'Ingest failed' });
    }
  });

  /* ─────── Full Analysis ─────── */

  router.post('/analyze', async (req: Request, res: Response) => {
    try {
      const clerkId = getClerkId(req);
      if (!clerkId) return res.status(401).json({ error: 'Authentication required' });

      const { userId } = req.body;
      if (!userId) return res.status(400).json({ error: 'userId required' });

      const report = await analyticsOrchestrator.fullAnalysis(userId);
      res.json(report);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /* ─────── Performance Overview ─────── */

  router.get('/performance/:userId', async (req: Request, res: Response) => {
    try {
      const clerkId = getClerkId(req);
      if (!clerkId) return res.status(401).json({ error: 'Authentication required' });

      const { userId } = req.params;
      const summary = await analyticsOrchestrator.performanceSummary(userId);
      const drivers = await contentPerformanceEngine.getPerformanceDrivers(userId);
      res.json({ summary, drivers });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /* ─────── Content Analysis ─────── */

  router.get('/content/:userId', async (req: Request, res: Response) => {
    try {
      const clerkId = getClerkId(req);
      if (!clerkId) return res.status(401).json({ error: 'Authentication required' });

      const { userId } = req.params;
      const [learningModel, success, failures] = await Promise.all([
        contentDNALearningEngine.learn(userId),
        successDetectionEngine.findBestContent(userId),
        failureDetectionEngine.findUnderperforming(userId),
      ]);
      res.json({ learningModel, successRankings: success, failures });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /* ─────── Post Performance ─────── */

  router.get('/content/post/:postId', async (req: Request, res: Response) => {
    try {
      const clerkId = getClerkId(req);
      if (!clerkId) return res.status(401).json({ error: 'Authentication required' });

      const { postId } = req.params;
      const result = await contentPerformanceEngine.analyzePost(postId, req.query.userId as string);
      if (!result) return res.status(404).json({ error: 'Post not found' });
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /* ─────── Audience Insights ─────── */

  router.get('/audience/:userId', async (req: Request, res: Response) => {
    try {
      const clerkId = getClerkId(req);
      if (!clerkId) return res.status(401).json({ error: 'Authentication required' });

      const { userId } = req.params;
      const analysis = await audienceIntelligenceEngine.analyze(userId);
      const saved = await audienceIntelligenceEngine.saveInsights(userId);
      res.json({ analysis, saved });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /* ─────── Pillar Performance ─────── */

  router.get('/pillars/:userId', async (req: Request, res: Response) => {
    try {
      const clerkId = getClerkId(req);
      if (!clerkId) return res.status(401).json({ error: 'Authentication required' });

      const { userId } = req.params;
      const pillars = await contentPillarOptimizationEngine.evaluateAll(userId);
      res.json(pillars);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /* ─────── Strategy Optimization ─────── */

  router.get('/strategy/:userId', async (req: Request, res: Response) => {
    try {
      const clerkId = getClerkId(req);
      if (!clerkId) return res.status(401).json({ error: 'Authentication required' });

      const { userId } = req.params;
      const result = await strategyOptimizationEngine.optimize(userId);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /* ─────── Opportunity Performance ─────── */

  router.get('/opportunities/:userId', async (req: Request, res: Response) => {
    try {
      const clerkId = getClerkId(req);
      if (!clerkId) return res.status(401).json({ error: 'Authentication required' });

      const { userId } = req.params;
      const [ranking, byType] = await Promise.all([
        opportunityFeedbackEngine.evaluate(userId),
        opportunityFeedbackEngine.getPerformanceByType(userId),
      ]);
      res.json({ ranking, byType });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /* ─────── Career Impact ─────── */

  router.get('/career/:userId', async (req: Request, res: Response) => {
    try {
      const clerkId = getClerkId(req);
      if (!clerkId) return res.status(401).json({ error: 'Authentication required' });

      const { userId } = req.params;
      const impact = await careerImpactEngine.measure(userId);
      const report = await careerImpactEngine.saveReport(userId);
      res.json({ impact, report });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /* ─────── Growth Forecasts ─────── */

  router.get('/forecasts/:userId', async (req: Request, res: Response) => {
    try {
      const clerkId = getClerkId(req);
      if (!clerkId) return res.status(401).json({ error: 'Authentication required' });

      const { userId } = req.params;
      const period = (req.query.period as '30_days' | '90_days' | '12_months') || '90_days';
      const forecast = await predictionEngine.forecast(userId, period);
      const saved = await predictionEngine.saveForecast(userId, period);
      res.json({ forecast, saved });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /* ─────── Recommendations ─────── */

  router.get('/recommendations/:userId', async (req: Request, res: Response) => {
    try {
      const clerkId = getClerkId(req);
      if (!clerkId) return res.status(401).json({ error: 'Authentication required' });

      const { userId } = req.params;
      const recs = await analyticsOrchestrator.saveRecommendations(userId);
      res.json(recs);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /* ─────── Generated Reports ─────── */

  router.get('/reports/:userId', async (req: Request, res: Response) => {
    try {
      const clerkId = getClerkId(req);
      if (!clerkId) return res.status(401).json({ error: 'Authentication required' });

      const { userId } = req.params;
      const type = (req.query.type as 'weekly' | 'monthly' | 'quarterly') || 'weekly';
      const report = await analyticsOrchestrator.generateReport(userId, type);
      res.json(report);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /* ─────── Trigger Optimization ─────── */

  router.post('/optimize', async (req: Request, res: Response) => {
    try {
      const clerkId = getClerkId(req);
      if (!clerkId) return res.status(401).json({ error: 'Authentication required' });

      const { userId } = req.body;
      if (!userId) return res.status(400).json({ error: 'userId required' });

      const result = await analyticsOrchestrator.triggerOptimization(userId);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /* ─────── AI Decision ─────── */

  router.post('/decide', async (req: Request, res: Response) => {
    try {
      const clerkId = getClerkId(req);
      if (!clerkId) return res.status(401).json({ error: 'Authentication required' });

      const decision = await analyticsOrchestrator.makeDecision(req.body);
      res.json(decision);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /* ─────── Dashboard Data ─────── */

  router.get('/dashboard/:userId', async (req: Request, res: Response) => {
    try {
      const clerkId = getClerkId(req);
      if (!clerkId) return res.status(401).json({ error: 'Authentication required' });

      const { userId } = req.params;
      const data = await analyticsOrchestrator.getDashboard(userId);
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /* ─────── Trigger Event ─────── */

  router.post('/events', async (req: Request, res: Response) => {
    try {
      const clerkId = getClerkId(req);
      if (!clerkId) return res.status(401).json({ error: 'Authentication required' });

      const { type, userId, data } = req.body;
      const result = await analyticsOrchestrator.triggerEvent(type, userId, data);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /* ─────── Trend Data ─────── */

  router.get('/trends/:userId', async (req: Request, res: Response) => {
    try {
      const clerkId = getClerkId(req);
      if (!clerkId) return res.status(401).json({ error: 'Authentication required' });

      const { userId } = req.params;
      const metric = (req.query.metric as string) || 'engagement';
      const days = parseInt(req.query.days as string) || 30;

      const metricType = metric === 'engagement' ? 'like' : metric as any;
      const trend = await performanceCollectionEngine.getTrend(userId, metricType, days);

      const [contentTrend, growthTrend] = await Promise.all([
        contentPerformanceEngine.getPerformanceDrivers(userId),
        predictionEngine.forecast(userId, days <= 30 ? '30_days' : '90_days'),
      ]);

      res.json({ trend, contentTrend, forecast: growthTrend });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /* ─────── Status ─────── */

  router.get('/status/:userId', async (req: Request, res: Response) => {
    try {
      const clerkId = getClerkId(req);
      if (!clerkId) return res.status(401).json({ error: 'Authentication required' });

      const { userId } = req.params;
      const uid = new mongoose.Types.ObjectId(userId);

      const [analyticsCount, reportCount, insightCount, forecastCount, recCount, oppCount, careerCount, optCount] = await Promise.all([
        Analytics.countDocuments({ userId: uid }),
        PerformanceReport.countDocuments({ userId: uid }),
        AudienceInsight.countDocuments({ userId: uid }),
        GrowthForecast.countDocuments({ userId: uid }),
        StrategyRecommendation.countDocuments({ userId: uid }),
        OpportunityPerformance.countDocuments({ userId: uid }),
        CareerImpactReport.countDocuments({ userId: uid }),
        OptimizationHistory.countDocuments({ userId: uid }),
      ]);

      res.json({
        analytics: analyticsCount,
        reports: reportCount,
        audienceInsights: insightCount,
        forecasts: forecastCount,
        recommendations: recCount,
        opportunityPerformance: oppCount,
        careerImpactReports: careerCount,
        optimizationHistory: optCount,
        total: analyticsCount + reportCount + insightCount + forecastCount + recCount + oppCount + careerCount + optCount,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}
