import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import pino from 'pino';
import { intelligenceAggregator } from '../services/intelligence/IntelligenceAggregator';
import { profileChangeDetector } from '../services/intelligence/ProfileChangeDetector';
import { opportunityTriggerEngine } from '../services/intelligence/OpportunityTriggerEngine';
import { ProfileSnapshot } from '../models/intelligence/ProfileSnapshot';
import { ProfileScore } from '../models/intelligence/ProfileScore';
import { OpportunityEvent } from '../models/intelligence/OpportunityEvent';
import { ExpertiseProfile } from '../models/intelligence/ExpertiseProfile';
import { LinkedInProfile } from '../models/LinkedInProfile';

const logger = pino();

function getClerkId(req: Request): string | null {
  return (req.headers['x-clerk-user-id'] as string) || null;
}

export function createIntelligenceRouter(): Router {
  const router = Router();

  router.get('/report/:profileId', async (req: Request, res: Response) => {
    try {
      const { profileId } = req.params;
      const clerkId = getClerkId(req);
      if (!clerkId) return res.status(401).json({ error: 'Authentication required' });

      const profile = await LinkedInProfile.findById(profileId).select('userId linkedinId');
      if (!profile) return res.status(404).json({ error: 'Profile not found' });

      const report = await intelligenceAggregator.generateFullReport(profileId, profile.userId.toString());
      res.json(report);
    } catch (error: any) {
      logger.error({ error }, 'Failed to generate intelligence report');
      res.status(500).json({ error: error.message || 'Failed to generate intelligence report' });
    }
  });

  router.get('/scores/:profileId', async (req: Request, res: Response) => {
    try {
      const { profileId } = req.params;
      const scores = await ProfileScore.findOne({ profileId }).sort({ version: -1 });
      if (!scores) return res.status(404).json({ error: 'No scores found' });
      res.json(scores);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get('/scores/:profileId/history', async (req: Request, res: Response) => {
    try {
      const { profileId } = req.params;
      const limit = parseInt(req.query.limit as string) || 10;
      const scores = await ProfileScore.find({ profileId })
        .sort({ version: -1 })
        .limit(limit)
        .select('overall dimensions generatedAt trend');
      res.json(scores);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get('/identity/:profileId', async (req: Request, res: Response) => {
    try {
      const { profileId } = req.params;
      const profile = await LinkedInProfile.findById(profileId).select('-accessToken -refreshToken');
      if (!profile) return res.status(404).json({ error: 'Profile not found' });

      const fullReport = await intelligenceAggregator.generateFullReport(profileId, profile.userId.toString());
      res.json(fullReport.identity);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get('/expertise/:profileId', async (req: Request, res: Response) => {
    try {
      const { profileId } = req.params;
      let expertise = await ExpertiseProfile.findOne({ profileId });

      if (!expertise) {
        const profile = await LinkedInProfile.findById(profileId).select('userId');
        if (!profile) return res.status(404).json({ error: 'Profile not found' });
        const report = await intelligenceAggregator.generateFullReport(profileId, profile.userId.toString());
        expertise = await ExpertiseProfile.findOne({ profileId });
      }

      res.json(expertise);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get('/opportunities/:profileId', async (req: Request, res: Response) => {
    try {
      const { profileId } = req.params;
      const profile = await LinkedInProfile.findById(profileId).select('userId');
      if (!profile) return res.status(404).json({ error: 'Profile not found' });

      const limit = parseInt(req.query.limit as string) || 50;
      const report = await intelligenceAggregator.generateFullReport(profileId, profile.userId.toString());
      res.json(report.contentOpportunities.slice(0, limit));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get('/gaps/:profileId', async (req: Request, res: Response) => {
    try {
      const { profileId } = req.params;
      const profile = await LinkedInProfile.findById(profileId).select('userId');
      if (!profile) return res.status(404).json({ error: 'Profile not found' });

      const report = await intelligenceAggregator.generateFullReport(profileId, profile.userId.toString());
      res.json(report.gaps);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get('/career/:profileId', async (req: Request, res: Response) => {
    try {
      const { profileId } = req.params;
      const profile = await LinkedInProfile.findById(profileId).select('userId');
      if (!profile) return res.status(404).json({ error: 'Profile not found' });

      const report = await intelligenceAggregator.generateFullReport(profileId, profile.userId.toString());
      res.json(report.career);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get('/changes/:profileId', async (req: Request, res: Response) => {
    try {
      const { profileId } = req.params;
      const limit = parseInt(req.query.limit as string) || 20;
      const changes = await profileChangeDetector.getChangeHistory(profileId, limit);
      res.json(changes);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get('/snapshots/:profileId', async (req: Request, res: Response) => {
    try {
      const { profileId } = req.params;
      const limit = parseInt(req.query.limit as string) || 5;
      const snapshots = await ProfileSnapshot.find({ profileId })
        .sort({ snapshotVersion: -1 })
        .limit(limit)
        .select('snapshotVersion createdAt changesSincePrevious');
      res.json(snapshots);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post('/snapshot/:profileId', async (req: Request, res: Response) => {
    try {
      const { profileId } = req.params;
      const clerkId = getClerkId(req);
      if (!clerkId) return res.status(401).json({ error: 'Authentication required' });

      const profile = await LinkedInProfile.findById(profileId).select('userId');
      if (!profile) return res.status(404).json({ error: 'Profile not found' });

      const { snapshot, changes } = await profileChangeDetector.createSnapshot(
        profileId,
        profile.userId.toString()
      );

      if (changes.length > 0) {
        await opportunityTriggerEngine.processBulkChanges(changes, profile.userId.toString(), profileId);
      }

      res.json({ snapshot, changes });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get('/opportunity-events/:profileId', async (req: Request, res: Response) => {
    try {
      const { profileId } = req.params;
      const status = req.query.status as string;
      const filter: any = { profileId: new mongoose.Types.ObjectId(profileId) };
      if (status) filter.status = status;

      const events = await OpportunityEvent.find(filter)
        .sort({ score: -1, createdAt: -1 })
        .limit(100);
      res.json(events);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.patch('/opportunity-events/:eventId', async (req: Request, res: Response) => {
    try {
      const { eventId } = req.params;
      const { status } = req.body;
      if (!status) return res.status(400).json({ error: 'status required' });

      const update: any = { status };
      if (status === 'actioned') update.actionedAt = new Date();

      const event = await OpportunityEvent.findByIdAndUpdate(eventId, { $set: update }, { new: true });
      if (!event) return res.status(404).json({ error: 'Event not found' });
      res.json(event);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get('/recommendations/:profileId', async (req: Request, res: Response) => {
    try {
      const { profileId } = req.params;
      const profile = await LinkedInProfile.findById(profileId).select('userId');
      if (!profile) return res.status(404).json({ error: 'Profile not found' });

      const report = await intelligenceAggregator.generateFullReport(profileId, profile.userId.toString());
      res.json(report.recommendations);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}

export default createIntelligenceRouter;
