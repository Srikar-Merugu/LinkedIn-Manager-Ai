import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import pino from 'pino';
import { careerIntelligenceOrchestrator } from '../services/career/CareerIntelligenceOrchestrator';
import { careerGoalEngine } from '../services/career/engines/CareerGoalEngine';
import { careerStageDetectionEngine } from '../services/career/engines/CareerStageDetectionEngine';
import { opportunityMappingEngine } from '../services/career/engines/OpportunityMappingEngine';
import { skillGapEngine } from '../services/career/engines/SkillGapEngine';
import { contentToCareerEngine } from '../services/career/engines/ContentToCareerEngine';
import { opportunityForecastingEngine } from '../services/career/engines/OpportunityForecastingEngine';
import { CareerGoal } from '../models/brand/CareerGoal';
import { CareerBlueprint } from '../models/career/CareerBlueprint';
import { SkillGapReport } from '../models/career/SkillGapReport';
import { OpportunityForecast } from '../models/career/OpportunityForecast';
import { AuthorityMap } from '../models/career/AuthorityMap';
import { NetworkingRecommendation } from '../models/career/NetworkingRecommendation';
import { CareerMilestone } from '../models/career/CareerMilestone';
import { getAuthenticatedUserId } from '../utils/auth';

const logger = pino();

function getUserId(req: Request): string | null {
  return getAuthenticatedUserId(req);
}

export function createCareerRouter(): Router {
  const router = Router();

  /* ───────── Full Report ───────── */

  router.post('/full-report', async (req: Request, res: Response) => {
    try {
      const authUserId = getUserId(req);
      if (!authUserId) return res.status(401).json({ error: 'Authentication required' });

      const { userId, profileData } = req.body;
      if (!userId || !profileData) return res.status(400).json({ error: 'userId and profileData required' });

      const report = await careerIntelligenceOrchestrator.generateFullReport(userId, profileData);
      res.json(report);
    } catch (error: any) {
      logger.error({ error }, 'Failed to generate career intelligence report');
      res.status(500).json({ error: error.message || 'Failed to generate career intelligence report' });
    }
  });

  /* ───────── Career Goals ───────── */

  router.get('/goals', async (req: Request, res: Response) => {
    try {
      const authUserId = getUserId(req);
      if (!authUserId) return res.status(401).json({ error: 'Authentication required' });

      const userId = req.query.userId as string;
      if (!userId) return res.status(400).json({ error: 'userId required' });

      const goals = await CareerGoal.findOne({
        userId: new mongoose.Types.ObjectId(userId),
        isActive: true,
      });
      if (!goals) return res.status(404).json({ error: 'No career goals found' });

      res.json(goals);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.put('/goals', async (req: Request, res: Response) => {
    try {
      const authUserId = getUserId(req);
      if (!authUserId) return res.status(401).json({ error: 'Authentication required' });

      const { userId, updates } = req.body;
      if (!userId || !updates) return res.status(400).json({ error: 'userId and updates required' });

      const goal = await CareerGoal.findOne({
        userId: new mongoose.Types.ObjectId(userId),
        isActive: true,
      });
      if (!goal) return res.status(404).json({ error: 'Career goal not found' });

      const allowedFields = [
        'primaryGoal', 'secondaryGoals', 'customGoalDescription',
        'targetRole', 'targetRoleLevel', 'targetCompanies',
        'targetIndustries', 'targetLocations', 'timeline',
        'growthObjectives', 'gapAnalysis',
      ];

      for (const field of allowedFields) {
        if (updates[field] !== undefined) {
          (goal as any)[field] = updates[field];
        }
      }

      goal.lastReviewedAt = new Date();
      goal.version += 1;
      await goal.save();
      res.json(goal);
    } catch (error: any) {
      logger.error({ error }, 'Failed to update career goals');
      res.status(500).json({ error: error.message || 'Failed to update career goals' });
    }
  });

  router.post('/goals/suggest', async (req: Request, res: Response) => {
    try {
      const authUserId = getUserId(req);
      if (!authUserId) return res.status(401).json({ error: 'Authentication required' });

      const { profileData } = req.body;
      if (!profileData) return res.status(400).json({ error: 'profileData required' });

      const suggestions = careerGoalEngine.suggest(profileData);
      res.json(suggestions);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /* ───────── Career Stage ───────── */

  router.post('/stage', async (req: Request, res: Response) => {
    try {
      const authUserId = getUserId(req);
      if (!authUserId) return res.status(401).json({ error: 'Authentication required' });

      const { profileData } = req.body;
      if (!profileData) return res.status(400).json({ error: 'profileData required' });

      const stage = careerStageDetectionEngine.detect(profileData);
      res.json(stage);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /* ───────── Opportunity Map ───────── */

  router.post('/opportunity-map', async (req: Request, res: Response) => {
    try {
      const authUserId = getUserId(req);
      if (!authUserId) return res.status(401).json({ error: 'Authentication required' });

      const { profileData, targetRole } = req.body;
      if (!profileData) return res.status(400).json({ error: 'profileData required' });

      const map = opportunityMappingEngine.map(profileData, targetRole);
      res.json(map);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /* ───────── Skill Gap ───────── */

  router.post('/skill-gaps', async (req: Request, res: Response) => {
    try {
      const authUserId = getUserId(req);
      if (!authUserId) return res.status(401).json({ error: 'Authentication required' });

      const { profileData } = req.body;
      if (!profileData) return res.status(400).json({ error: 'profileData required' });

      const gaps = skillGapEngine.analyze(profileData);
      res.json(gaps);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /* ───────── Content to Career ───────── */

  router.post('/content-map', async (req: Request, res: Response) => {
    try {
      const authUserId = getUserId(req);
      if (!authUserId) return res.status(401).json({ error: 'Authentication required' });

      const { goal } = req.body;
      if (!goal) return res.status(400).json({ error: 'goal required' });

      const map = contentToCareerEngine.map(goal);
      res.json(map);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /* ───────── Blueprint ───────── */

  router.get('/blueprint/:userId', async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const blueprint = await CareerBlueprint.findOne({
        userId: new mongoose.Types.ObjectId(userId),
        isActive: true,
      });
      if (!blueprint) return res.status(404).json({ error: 'No career blueprint found' });
      res.json(blueprint);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.put('/blueprint/:userId/progress', async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const { milestoneIndex, taskPath } = req.body;

      const blueprint = await CareerBlueprint.findOne({
        userId: new mongoose.Types.ObjectId(userId),
        isActive: true,
      });
      if (!blueprint) return res.status(404).json({ error: 'No career blueprint found' });

      if (milestoneIndex !== undefined && blueprint.milestones[milestoneIndex]) {
        blueprint.milestones[milestoneIndex].status = 'completed';
      }

      if (taskPath) {
        const [section, taskIndex] = taskPath.split('.');
        const sectionKey = section as keyof typeof blueprint.sections;
        if (blueprint.sections[sectionKey]?.tasks?.[parseInt(taskIndex)]) {
          blueprint.sections[sectionKey].tasks[parseInt(taskIndex)].completed = true;
        }
      }

      await blueprint.save();
      res.json(blueprint);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /* ───────── Authority Map ───────── */

  router.get('/authority/:userId', async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const authority = await AuthorityMap.findOne({
        userId: new mongoose.Types.ObjectId(userId),
        isActive: true,
      });
      if (!authority) return res.status(404).json({ error: 'No authority map found' });
      res.json(authority);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /* ───────── Networking ───────── */

  router.get('/networking/:userId', async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const networking = await NetworkingRecommendation.findOne({
        userId: new mongoose.Types.ObjectId(userId),
        isActive: true,
      });
      if (!networking) return res.status(404).json({ error: 'No networking recommendations found' });
      res.json(networking);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /* ───────── Opportunity Forecast ───────── */

  router.get('/forecast/:userId', async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const forecast = await OpportunityForecast.findOne({
        userId: new mongoose.Types.ObjectId(userId),
        isActive: true,
      });
      if (!forecast) return res.status(404).json({ error: 'No opportunity forecast found' });
      res.json(forecast);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /* ───────── Milestones ───────── */

  router.get('/milestones/:userId', async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const status = req.query.status as string;
      const query: any = { userId: new mongoose.Types.ObjectId(userId), isActive: true };
      if (status) query.status = status;

      const milestones = await CareerMilestone.find(query)
        .sort({ createdAt: -1 })
        .limit(50)
        .lean();
      res.json(milestones);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post('/milestones', async (req: Request, res: Response) => {
    try {
      const authUserId = getUserId(req);
      if (!authUserId) return res.status(401).json({ error: 'Authentication required' });

      const { userId, ...milestoneData } = req.body;
      if (!userId) return res.status(400).json({ error: 'userId required' });

      const milestone = await CareerMilestone.create({
        ...milestoneData,
        userId: new mongoose.Types.ObjectId(userId),
      });
      res.status(201).json(milestone);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.put('/milestones/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      delete updates.userId;

      const milestone = await CareerMilestone.findByIdAndUpdate(
        id,
        { ...updates, $inc: { version: 1 } },
        { new: true }
      );
      if (!milestone) return res.status(404).json({ error: 'Milestone not found' });
      res.json(milestone);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /* ───────── Status ───────── */

  router.get('/status/:userId', async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const oid = new mongoose.Types.ObjectId(userId);

      const [goal, blueprint, skillGap, forecast, authority, networking, milestones] = await Promise.all([
        CareerGoal.findOne({ userId: oid, isActive: true }),
        CareerBlueprint.findOne({ userId: oid, isActive: true }),
        SkillGapReport.findOne({ userId: oid, isActive: true }),
        OpportunityForecast.findOne({ userId: oid, isActive: true }),
        AuthorityMap.findOne({ userId: oid, isActive: true }),
        NetworkingRecommendation.findOne({ userId: oid, isActive: true }),
        CareerMilestone.countDocuments({ userId: oid, isActive: true }),
      ]);

      res.json({
        careerGoal: {
          exists: !!goal,
          primaryGoal: goal?.primaryGoal || null,
          targetRole: goal?.targetRole || null,
          version: goal?.version || 0,
          status: goal?.status || null,
        },
        careerBlueprint: {
          exists: !!blueprint,
          currentPosition: blueprint?.currentPosition || null,
          targetPosition: blueprint?.targetPosition || null,
          progress: blueprint?.progress?.overall || 0,
          milestones: blueprint?.milestones?.length || 0,
        },
        skillGap: {
          exists: !!skillGap,
          totalGaps: skillGap?.summary?.totalGaps || 0,
          criticalGaps: skillGap?.summary?.criticalGaps || 0,
          readinessScore: skillGap?.summary?.readinessScore || 0,
        },
        opportunityForecast: {
          exists: !!forecast,
          avgProbability: forecast?.summary?.averageProbability || 0,
          readinessScore: forecast?.summary?.readinessScore || 0,
        },
        authorityMap: {
          exists: !!authority,
          ownedTopics: authority?.summary?.ownedTopics || 0,
        },
        networking: {
          exists: !!networking,
          totalTargets: networking?.summary?.totalTargets || 0,
        },
        milestones: {
          total: milestones,
        },
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}
