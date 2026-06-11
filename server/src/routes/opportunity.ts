import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import pino from 'pino';
import { opportunityMiningOrchestrator } from '../services/opportunity/OpportunityMiningOrchestrator';
import { OpportunitySignal } from '../models/opportunity/OpportunitySignal';
import { ContentOpportunity } from '../models/opportunity/ContentOpportunity';
import { OpportunityRecommendation } from '../models/opportunity/OpportunityRecommendation';
import { signalDetectionEngine } from '../services/opportunity/engines/SignalDetectionEngine';
import { signalClassificationEngine } from '../services/opportunity/engines/SignalClassificationEngine';
import { contentAngleEngine } from '../services/opportunity/engines/ContentAngleEngine';
import { opportunityScoringEngine } from '../services/opportunity/engines/OpportunityScoringEngine';
import { gitHubIntelligenceEngine } from '../services/opportunity/engines/GitHubIntelligenceEngine';
import { linkedInChangeDetectionEngine } from '../services/opportunity/engines/LinkedInChangeDetectionEngine';
import { portfolioIntelligenceEngine } from '../services/opportunity/engines/PortfolioIntelligenceEngine';
import { resumeChangeDetectionEngine } from '../services/opportunity/engines/ResumeChangeDetectionEngine';
import { projectOpportunityEngine } from '../services/opportunity/engines/ProjectOpportunityEngine';
import { getAuthenticatedUserId } from '../utils/auth';

const logger = pino();

function getUserId(req: Request): string | null {
  return getAuthenticatedUserId(req);
}

export function createOpportunityRouter(): Router {
  const router = Router();

  /* ───────── Full Mining Pipeline ───────── */

  router.post('/mine', async (req: Request, res: Response) => {
    try {
      const authUserId = getUserId(req);
      if (!authUserId) return res.status(401).json({ error: 'Authentication required' });

      const { userId, sourceData } = req.body;
      if (!userId || !sourceData) return res.status(400).json({ error: 'userId and sourceData required' });

      const report = await opportunityMiningOrchestrator.mine(userId, sourceData);
      res.json(report);
    } catch (error: any) {
      logger.error({ error }, 'Failed to run opportunity mining pipeline');
      res.status(500).json({ error: error.message || 'Failed to run opportunity mining pipeline' });
    }
  });

  /* ───────── Signals ───────── */

  router.get('/signals/:userId', async (req: Request, res: Response) => {
    try {
      const authUserId = getUserId(req);
      if (!authUserId) return res.status(401).json({ error: 'Authentication required' });

      const { userId } = req.params;
      const { status, source, limit } = req.query;
      const filter: any = { userId: new mongoose.Types.ObjectId(userId) };
      if (status) filter.status = status;
      if (source) filter.source = source;

      let query = OpportunitySignal.find(filter).sort({ detectedAt: -1 });
      if (limit) query = query.limit(parseInt(limit as string));

      const signals = await query.lean();
      res.json(signals);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.put('/signals/:id', async (req: Request, res: Response) => {
    try {
      const authUserId = getUserId(req);
      if (!authUserId) return res.status(401).json({ error: 'Authentication required' });

      const { id } = req.params;
      const signal = await OpportunitySignal.findByIdAndUpdate(id, { $set: req.body }, { new: true });
      if (!signal) return res.status(404).json({ error: 'Signal not found' });
      res.json(signal);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /* ───────── Detect Signals ───────── */

  router.post('/detect', async (req: Request, res: Response) => {
    try {
      const authUserId = getUserId(req);
      if (!authUserId) return res.status(401).json({ error: 'Authentication required' });

      const { userId, sourceData } = req.body;
      if (!userId || !sourceData) return res.status(400).json({ error: 'userId and sourceData required' });

      const signals = await signalDetectionEngine.detectFromAll(new mongoose.Types.ObjectId(userId), sourceData);

      const classified = signals.map(s => ({
        signal: s,
        classification: signalClassificationEngine.classify({
          source: s.source, type: s.type, title: s.title,
          description: s.description, metadata: s.metadata || {},
        }),
      }));

      res.json({ detected: signals.length, signals: classified });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /* ───────── Opportunities ───────── */

  router.get('/opportunities/:userId', async (req: Request, res: Response) => {
    try {
      const authUserId = getUserId(req);
      if (!authUserId) return res.status(401).json({ error: 'Authentication required' });

      const { userId } = req.params;
      const { status, priority, limit } = req.query;
      const filter: any = { userId: new mongoose.Types.ObjectId(userId) };
      if (status) filter.status = status;
      if (priority) filter.priority = priority;

      let query = ContentOpportunity.find(filter).sort({ priorityRank: 1, 'scores.overall': -1 });
      if (limit) query = query.limit(parseInt(limit as string));

      const opportunities = await query.lean();
      res.json(opportunities);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.put('/opportunities/:id', async (req: Request, res: Response) => {
    try {
      const authUserId = getUserId(req);
      if (!authUserId) return res.status(401).json({ error: 'Authentication required' });

      const { id } = req.params;
      const opp = await ContentOpportunity.findByIdAndUpdate(id, { $set: req.body }, { new: true });
      if (!opp) return res.status(404).json({ error: 'Opportunity not found' });
      res.json(opp);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /* ───────── Recommendations ───────── */

  router.get('/recommendations/:userId', async (req: Request, res: Response) => {
    try {
      const authUserId = getUserId(req);
      if (!authUserId) return res.status(401).json({ error: 'Authentication required' });

      const { userId } = req.params;
      const { status, limit } = req.query;
      const filter: any = { userId: new mongoose.Types.ObjectId(userId) };
      if (status) filter.status = status;

      let query = OpportunityRecommendation.find(filter).sort({ priority: 1, confidence: -1 });
      if (limit) query = query.limit(parseInt(limit as string));

      const recommendations = await query.lean();
      res.json(recommendations);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.put('/recommendations/:id', async (req: Request, res: Response) => {
    try {
      const authUserId = getUserId(req);
      if (!authUserId) return res.status(401).json({ error: 'Authentication required' });

      const { id } = req.params;
      const rec = await OpportunityRecommendation.findByIdAndUpdate(id, { $set: req.body }, { new: true });
      if (!rec) return res.status(404).json({ error: 'Recommendation not found' });
      res.json(rec);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /* ───────── Specialized Engines ───────── */

  router.post('/analyze/github', async (req: Request, res: Response) => {
    try {
      const authUserId = getUserId(req);
      if (!authUserId) return res.status(401).json({ error: 'Authentication required' });

      const { data } = req.body;
      const milestones = gitHubIntelligenceEngine.detectMilestones(data || {});
      const repos = (data?.repos || []).map((r: any) => gitHubIntelligenceEngine.analyzeRepository(r)).filter(Boolean);
      res.json({ milestones, repos });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post('/analyze/linkedin', async (req: Request, res: Response) => {
    try {
      const authUserId = getUserId(req);
      if (!authUserId) return res.status(401).json({ error: 'Authentication required' });

      const { current, previous } = req.body;
      const changes = linkedInChangeDetectionEngine.detectChanges(current, previous);
      res.json({ changes });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post('/analyze/portfolio', async (req: Request, res: Response) => {
    try {
      const authUserId = getUserId(req);
      if (!authUserId) return res.status(401).json({ error: 'Authentication required' });

      const { current, previous } = req.body;
      const changes = portfolioIntelligenceEngine.detectNewEntries(current, previous);
      res.json({ changes });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post('/analyze/resume', async (req: Request, res: Response) => {
    try {
      const authUserId = getUserId(req);
      if (!authUserId) return res.status(401).json({ error: 'Authentication required' });

      const { current, previous } = req.body;
      const changes = resumeChangeDetectionEngine.detectChanges(current, previous);
      res.json({ changes });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post('/analyze/project', async (req: Request, res: Response) => {
    try {
      const authUserId = getUserId(req);
      if (!authUserId) return res.status(401).json({ error: 'Authentication required' });

      const { project } = req.body;
      const result = projectOpportunityEngine.analyze(project);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post('/analyze/angles', async (req: Request, res: Response) => {
    try {
      const authUserId = getUserId(req);
      if (!authUserId) return res.status(401).json({ error: 'Authentication required' });

      const { request } = req.body;
      const angles = contentAngleEngine.generate(request);
      res.json({ angles });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /* ───────── Status ───────── */

  router.get('/status/:userId', async (req: Request, res: Response) => {
    try {
      const authUserId = getUserId(req);
      if (!authUserId) return res.status(401).json({ error: 'Authentication required' });

      const { userId } = req.params;
      const uid = new mongoose.Types.ObjectId(userId);

      const [signalCount, oppCount, recCount] = await Promise.all([
        OpportunitySignal.countDocuments({ userId: uid }),
        ContentOpportunity.countDocuments({ userId: uid }),
        OpportunityRecommendation.countDocuments({ userId: uid }),
      ]);

      const topOpportunities = await ContentOpportunity.find({ userId: uid })
        .sort({ priorityRank: 1 })
        .limit(5)
        .lean();

      const recentSignals = await OpportunitySignal.find({ userId: uid })
        .sort({ detectedAt: -1 })
        .limit(5)
        .lean();

      const pipeline = await ContentOpportunity.aggregate([
        { $match: { userId: uid } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]);

      const byPriority = await ContentOpportunity.aggregate([
        { $match: { userId: uid } },
        { $group: { _id: '$priority', count: { $sum: 1 } } },
      ]);

      const pipelineMap: Record<string, number> = {};
      pipeline.forEach((s: any) => { pipelineMap[s._id] = s.count; });

      const priorityMap: Record<string, number> = {};
      byPriority.forEach((s: any) => { priorityMap[s._id] = s.count; });

      res.json({
        signals: { total: signalCount, recent: recentSignals },
        opportunities: { total: oppCount, top: topOpportunities, byStatus: pipelineMap, byPriority: priorityMap },
        recommendations: { total: recCount },
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}
