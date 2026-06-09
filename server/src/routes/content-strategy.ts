import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import pino from 'pino';
import { contentStrategyOrchestrator } from '../services/content-strategy/ContentStrategyOrchestrator';
import { ContentStrategyIntelligence } from '../models/content-strategy/ContentStrategyIntelligence';
import { MonthlyStrategy } from '../models/content-strategy/MonthlyStrategy';
import { WeeklyTheme } from '../models/content-strategy/WeeklyTheme';
import { StrategyScore } from '../models/content-strategy/StrategyScore';
import { GrowthGoal } from '../models/content-strategy/GrowthGoal';
import { AuthorityRoadmap } from '../models/content-strategy/AuthorityRoadmap';
import { NetworkingPlan } from '../models/content-strategy/NetworkingPlan';
import { OpportunityPlan } from '../models/content-strategy/OpportunityPlan';
import { regenerationEngine } from '../services/content-strategy/engines/RegenerationEngine';

const logger = pino();

function getClerkId(req: Request): string | null {
  return (req.headers['x-clerk-user-id'] as string) || null;
}

export function createContentStrategyRouter(): Router {
  const router = Router();

  /* ───────── Full Report ───────── */

  router.post('/full-report', async (req: Request, res: Response) => {
    try {
      const clerkId = getClerkId(req);
      if (!clerkId) return res.status(401).json({ error: 'Authentication required' });

      const { userId, profileData } = req.body;
      if (!userId || !profileData) return res.status(400).json({ error: 'userId and profileData required' });

      const report = await contentStrategyOrchestrator.generateFullReport(userId, profileData);
      res.json(report);
    } catch (error: any) {
      logger.error({ error }, 'Failed to generate content strategy report');
      res.status(500).json({ error: error.message || 'Failed to generate content strategy report' });
    }
  });

  /* ───────── Strategy ───────── */

  router.get('/:userId', async (req: Request, res: Response) => {
    try {
      const clerkId = getClerkId(req);
      if (!clerkId) return res.status(401).json({ error: 'Authentication required' });

      const { userId } = req.params;
      const strategy = await ContentStrategyIntelligence.findOne({
        userId: new mongoose.Types.ObjectId(userId),
        isActive: true,
      }).sort({ version: -1 }).lean();

      if (!strategy) return res.status(404).json({ error: 'No active strategy found' });
      res.json(strategy);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /* ───────── Monthly Plans ───────── */

  router.get('/:userId/months', async (req: Request, res: Response) => {
    try {
      const clerkId = getClerkId(req);
      if (!clerkId) return res.status(401).json({ error: 'Authentication required' });

      const { userId } = req.params;
      const months = await MonthlyStrategy.find({
        userId: new mongoose.Types.ObjectId(userId),
      }).sort({ monthNumber: 1 }).lean();

      res.json(months);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /* ───────── Weekly Themes ───────── */

  router.get('/:userId/themes', async (req: Request, res: Response) => {
    try {
      const clerkId = getClerkId(req);
      if (!clerkId) return res.status(401).json({ error: 'Authentication required' });

      const { userId } = req.params;
      const month = req.query.month ? parseInt(req.query.month as string) : undefined;
      const filter: any = { userId: new mongoose.Types.ObjectId(userId) };
      if (month) filter.monthNumber = month;

      const themes = await WeeklyTheme.find(filter).sort({ globalWeekNumber: 1 }).lean();
      res.json(themes);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /* ───────── Growth Goals ───────── */

  router.get('/:userId/goals', async (req: Request, res: Response) => {
    try {
      const clerkId = getClerkId(req);
      if (!clerkId) return res.status(401).json({ error: 'Authentication required' });

      const { userId } = req.params;
      const goals = await GrowthGoal.find({
        userId: new mongoose.Types.ObjectId(userId),
        status: { $in: ['active', 'in_progress'] },
      }).sort({ priority: 1 }).lean();

      res.json(goals);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.put('/goals/:id', async (req: Request, res: Response) => {
    try {
      const clerkId = getClerkId(req);
      if (!clerkId) return res.status(401).json({ error: 'Authentication required' });

      const { id } = req.params;
      const goal = await GrowthGoal.findByIdAndUpdate(id, { $set: req.body }, { new: true });
      if (!goal) return res.status(404).json({ error: 'Goal not found' });
      res.json(goal);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /* ───────── Authority Roadmap ───────── */

  router.get('/:userId/authority', async (req: Request, res: Response) => {
    try {
      const clerkId = getClerkId(req);
      if (!clerkId) return res.status(401).json({ error: 'Authentication required' });

      const { userId } = req.params;
      const roadmap = await AuthorityRoadmap.findOne({
        userId: new mongoose.Types.ObjectId(userId),
      }).sort({ version: -1 }).lean();

      if (!roadmap) return res.status(404).json({ error: 'No authority roadmap found' });
      res.json(roadmap);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /* ───────── Networking Plan ───────── */

  router.get('/:userId/networking', async (req: Request, res: Response) => {
    try {
      const clerkId = getClerkId(req);
      if (!clerkId) return res.status(401).json({ error: 'Authentication required' });

      const { userId } = req.params;
      const plan = await NetworkingPlan.findOne({
        userId: new mongoose.Types.ObjectId(userId),
      }).sort({ version: -1 }).lean();

      if (!plan) return res.status(404).json({ error: 'No networking plan found' });
      res.json(plan);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /* ───────── Opportunity Plan ───────── */

  router.get('/:userId/opportunities', async (req: Request, res: Response) => {
    try {
      const clerkId = getClerkId(req);
      if (!clerkId) return res.status(401).json({ error: 'Authentication required' });

      const { userId } = req.params;
      const plan = await OpportunityPlan.findOne({
        userId: new mongoose.Types.ObjectId(userId),
      }).sort({ version: -1 }).lean();

      if (!plan) return res.status(404).json({ error: 'No opportunity plan found' });
      res.json(plan);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /* ───────── Strategy Scores ───────── */

  router.get('/:userId/scores', async (req: Request, res: Response) => {
    try {
      const clerkId = getClerkId(req);
      if (!clerkId) return res.status(401).json({ error: 'Authentication required' });

      const { userId } = req.params;
      const score = await StrategyScore.findOne({
        userId: new mongoose.Types.ObjectId(userId),
      }).sort({ version: -1 }).lean();

      if (!score) return res.status(404).json({ error: 'No strategy scores found' });
      res.json(score);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /* ───────── Regeneration ───────── */

  router.post('/regenerate', async (req: Request, res: Response) => {
    try {
      const clerkId = getClerkId(req);
      if (!clerkId) return res.status(401).json({ error: 'Authentication required' });

      const { userId, signals, profileData } = req.body;
      if (!userId || !signals) return res.status(400).json({ error: 'userId and signals required' });

      const decision = regenerationEngine.evaluate(signals);
      if (!decision.shouldRegenerate) {
        return res.json({ regenerated: false, decision });
      }

      const report = await contentStrategyOrchestrator.generateFullReport(userId, profileData);
      res.json({ regenerated: true, decision, report });
    } catch (error: any) {
      logger.error({ error }, 'Failed to regenerate strategy');
      res.status(500).json({ error: error.message || 'Failed to regenerate strategy' });
    }
  });

  /* ───────── Status ───────── */

  router.get('/:userId/status', async (req: Request, res: Response) => {
    try {
      const clerkId = getClerkId(req);
      if (!clerkId) return res.status(401).json({ error: 'Authentication required' });

      const { userId } = req.params;
      const uid = new mongoose.Types.ObjectId(userId);

      const [strategy, months, themes, scores, goals, auth, networking, opp] = await Promise.all([
        ContentStrategyIntelligence.findOne({ userId: uid, isActive: true }).sort({ version: -1 }).lean(),
        MonthlyStrategy.find({ userId: uid }).sort({ monthNumber: 1 }).lean(),
        WeeklyTheme.find({ userId: uid }).sort({ globalWeekNumber: 1 }).lean(),
        StrategyScore.findOne({ userId: uid }).sort({ version: -1 }).lean(),
        GrowthGoal.find({ userId: uid, status: { $in: ['active', 'in_progress'] } }).lean(),
        AuthorityRoadmap.findOne({ userId: uid }).sort({ version: -1 }).lean(),
        NetworkingPlan.findOne({ userId: uid }).sort({ version: -1 }).lean(),
        OpportunityPlan.findOne({ userId: uid }).sort({ version: -1 }).lean(),
      ]);

      res.json({
        strategy: {
          exists: !!strategy,
          version: strategy?.version || 0,
          status: strategy?.status || null,
          overallScore: strategy?.scores?.overallScore || 0,
          recommendedFrequency: strategy?.overallStrategy?.recommendedFrequency || 0,
        },
        months: {
          total: months.length,
          active: months.filter(m => m.status === 'active').length,
          completed: months.filter(m => m.status === 'completed').length,
          currentPhase: months.find(m => m.status === 'active')?.phase || null,
        },
        themes: {
          total: themes.length,
          active: themes.filter(t => t.status === 'active').length,
          completed: themes.filter(t => t.status === 'completed').length,
        },
        scores: scores ? {
          overallScore: scores.overallScore,
          authorityScore: scores.authorityScore.overall,
          opportunityScore: scores.opportunityScore.overall,
          careerAlignmentScore: scores.careerAlignmentScore.overall,
          audienceFitScore: scores.audienceFitScore.overall,
          executionScore: scores.executionScore.overall,
        } : null,
        goals: {
          total: goals.length,
          byCategory: {
            audience: goals.filter(g => g.category === 'audience').length,
            authority: goals.filter(g => g.category === 'authority').length,
            career: goals.filter(g => g.category === 'career').length,
            networking: goals.filter(g => g.category === 'networking').length,
            content: goals.filter(g => g.category === 'content').length,
            growth: goals.filter(g => g.category === 'growth').length,
          },
        },
        authorityRoadmap: {
          exists: !!auth,
          dominateTopics: auth?.topics.filter((t: any) => t.category === 'dominate').length || 0,
          overallProjection: auth?.overallAuthorityProjection || 0,
        },
        networkingPlan: {
          exists: !!networking,
          totalTargets: networking?.targets?.length || 0,
          projectedConnections: networking?.reach?.projectedNewConnections || 0,
        },
        opportunityPlan: {
          exists: !!opp,
          highImpactCount: opp?.highImpactContent?.length || 0,
        },
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}
