import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import pino from 'pino';
import { contentPillarOrchestrator } from '../services/content-pillars/ContentPillarOrchestrator';
import { ContentPillar } from '../models/strategy/ContentPillar';
import { PillarScore } from '../models/content-pillars/PillarScore';
import { TopicCluster } from '../models/content-pillars/TopicCluster';
import { AuthorityMap } from '../models/content-pillars/AuthorityMap';
import { ContentDistribution } from '../models/content-pillars/ContentDistribution';
import { PillarSnapshot } from '../models/content-pillars/PillarSnapshot';

const logger = pino();

function getClerkId(req: Request): string | null {
  return (req.headers['x-clerk-user-id'] as string) || null;
}

export function createContentPillarRouter(): Router {
  const router = Router();

  /* ───────── Full Report ───────── */

  router.post('/full-report', async (req: Request, res: Response) => {
    try {
      const clerkId = getClerkId(req);
      if (!clerkId) return res.status(401).json({ error: 'Authentication required' });

      const { userId, profileData } = req.body;
      if (!userId || !profileData) return res.status(400).json({ error: 'userId and profileData required' });

      const report = await contentPillarOrchestrator.generateFullReport(userId, profileData);
      res.json(report);
    } catch (error: any) {
      logger.error({ error }, 'Failed to generate content pillar report');
      res.status(500).json({ error: error.message || 'Failed to generate content pillar report' });
    }
  });

  /* ───────── Pillars CRUD ───────── */

  router.get('/', async (req: Request, res: Response) => {
    try {
      const clerkId = getClerkId(req);
      if (!clerkId) return res.status(401).json({ error: 'Authentication required' });

      const userId = req.query.userId as string;
      if (!userId) return res.status(400).json({ error: 'userId required' });

      const pillars = await ContentPillar.find({
        userId: new mongoose.Types.ObjectId(userId),
        isActive: true,
      }).sort({ rank: 1 });

      res.json(pillars);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.put('/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      delete updates.userId;

      const pillar = await ContentPillar.findByIdAndUpdate(
        id,
        { ...updates, $inc: { version: 1 } },
        { new: true }
      );
      if (!pillar) return res.status(404).json({ error: 'Pillar not found' });
      res.json(pillar);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /* ───────── Pillar Scores ───────── */

  router.get('/scores/:userId', async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const scores = await PillarScore.find({
        userId: new mongoose.Types.ObjectId(userId),
        isActive: true,
      }).sort({ priority: 1 });

      res.json(scores);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /* ───────── Topic Clusters ───────── */

  router.get('/topics/:userId', async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const pillarId = req.query.pillarId as string;
      const query: any = { userId: new mongoose.Types.ObjectId(userId), isActive: true };
      if (pillarId) query.pillarId = new mongoose.Types.ObjectId(pillarId);

      const clusters = await TopicCluster.find(query);
      res.json(clusters);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /* ───────── Authority Map ───────── */

  router.get('/authority/:userId', async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const authMap = await AuthorityMap.findOne({
        userId: new mongoose.Types.ObjectId(userId),
        isActive: true,
      });
      if (!authMap) return res.status(404).json({ error: 'No authority map found' });
      res.json(authMap);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /* ───────── Content Distribution ───────── */

  router.get('/distribution/:userId', async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const dist = await ContentDistribution.findOne({
        userId: new mongoose.Types.ObjectId(userId),
        isActive: true,
      });
      if (!dist) return res.status(404).json({ error: 'No content distribution found' });
      res.json(dist);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /* ───────── Snapshots ───────── */

  router.get('/snapshots/:userId', async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const limit = parseInt(req.query.limit as string) || 10;
      const snapshots = await PillarSnapshot.find({
        userId: new mongoose.Types.ObjectId(userId),
      })
        .sort({ version: -1 })
        .limit(limit)
        .select('version summary trigger reason createdAt');

      res.json(snapshots);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /* ───────── Status ───────── */

  router.get('/status/:userId', async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const oid = new mongoose.Types.ObjectId(userId);

      const [pillars, scores, clusters, authMap, dist, snapshots] = await Promise.all([
        ContentPillar.countDocuments({ userId: oid, isActive: true }),
        PillarScore.countDocuments({ userId: oid, isActive: true }),
        TopicCluster.countDocuments({ userId: oid, isActive: true }),
        AuthorityMap.findOne({ userId: oid, isActive: true }).select('summary'),
        ContentDistribution.findOne({ userId: oid, isActive: true }).select('summary'),
        PillarSnapshot.countDocuments({ userId: oid }),
      ]);

      res.json({
        pillars: {
          total: pillars,
          scored: scores,
          hasClusters: clusters > 0,
        },
        authority: {
          exists: !!authMap,
          strongAreas: authMap?.summary?.strongAreas || 0,
          growingAreas: authMap?.summary?.growingAreas || 0,
        },
        distribution: {
          exists: !!dist,
          totalPostsPerWeek: dist?.summary?.totalPostsPerWeek || 0,
          primaryPillar: dist?.summary?.primaryPillar || null,
        },
        snapshots: {
          total: snapshots,
        },
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}
