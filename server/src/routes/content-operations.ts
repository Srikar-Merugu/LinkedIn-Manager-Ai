import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import pino from 'pino';
import { contentOperatingSystemOrchestrator } from '../services/content-operations/ContentOperatingSystemOrchestrator';
import { ContentCalendar } from '../models/strategy/ContentCalendar';
import { QueueItem } from '../models/content-operations/QueueItem';
import { PublishingMode } from '../models/content-operations/PublishingMode';
import { CalendarSnapshot } from '../models/content-operations/CalendarSnapshot';
import { automationModeEngine } from '../services/content-operations/engines/AutomationModeEngine';

const logger = pino();

function getClerkId(req: Request): string | null {
  return (req.headers['x-clerk-user-id'] as string) || null;
}

export function createContentOperationsRouter(): Router {
  const router = Router();

  /* ───────── Full Calendar Generation ───────── */

  router.post('/full-report', async (req: Request, res: Response) => {
    try {
      const clerkId = getClerkId(req);
      if (!clerkId) return res.status(401).json({ error: 'Authentication required' });

      const { userId, strategyData } = req.body;
      if (!userId || !strategyData) return res.status(400).json({ error: 'userId and strategyData required' });

      const report = await contentOperatingSystemOrchestrator.generateFullCalendar(userId, strategyData);
      res.json(report);
    } catch (error: any) {
      logger.error({ error }, 'Failed to generate content operations report');
      res.status(500).json({ error: error.message || 'Failed to generate content operations report' });
    }
  });

  /* ───────── Calendar CRUD ───────── */

  router.get('/calendar/:userId', async (req: Request, res: Response) => {
    try {
      const clerkId = getClerkId(req);
      if (!clerkId) return res.status(401).json({ error: 'Authentication required' });

      const { userId } = req.params;
      const { startDate, endDate, status, pillar, limit } = req.query;

      const filter: any = { userId: new mongoose.Types.ObjectId(userId) };
      if (startDate || endDate) {
        filter.date = {};
        if (startDate) filter.date.$gte = new Date(startDate as string);
        if (endDate) filter.date.$lte = new Date(endDate as string);
      }
      if (status) filter.status = status;
      if (pillar) filter.pillarName = pillar;

      let query = ContentCalendar.find(filter).sort({ date: 1 });
      if (limit) query = query.limit(parseInt(limit as string));

      const entries = await query.lean();
      res.json(entries);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.put('/calendar/:id', async (req: Request, res: Response) => {
    try {
      const clerkId = getClerkId(req);
      if (!clerkId) return res.status(401).json({ error: 'Authentication required' });

      const { id } = req.params;
      const entry = await ContentCalendar.findByIdAndUpdate(id, { $set: req.body }, { new: true });
      if (!entry) return res.status(404).json({ error: 'Calendar entry not found' });
      res.json(entry);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post('/calendar/batch', async (req: Request, res: Response) => {
    try {
      const clerkId = getClerkId(req);
      if (!clerkId) return res.status(401).json({ error: 'Authentication required' });

      const { updates } = req.body;
      if (!Array.isArray(updates)) return res.status(400).json({ error: 'updates array required' });

      const results = [];
      for (const { id, ...data } of updates) {
        const entry = await ContentCalendar.findByIdAndUpdate(id, { $set: data }, { new: true });
        results.push(entry);
      }
      res.json({ updated: results.length, results });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /* ───────── Queue ───────── */

  router.get('/queue/:userId', async (req: Request, res: Response) => {
    try {
      const clerkId = getClerkId(req);
      if (!clerkId) return res.status(401).json({ error: 'Authentication required' });

      const { userId } = req.params;
      const { stage, limit } = req.query;

      const filter: any = { userId: new mongoose.Types.ObjectId(userId) };
      if (stage) filter.stage = stage;

      let query = QueueItem.find(filter).sort({ priority: -1, dueDate: 1 });
      if (limit) query = query.limit(parseInt(limit as string));

      const items = await query.populate('calendarEntryId').lean();
      res.json(items);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post('/queue/:id/advance', async (req: Request, res: Response) => {
    try {
      const clerkId = getClerkId(req);
      if (!clerkId) return res.status(401).json({ error: 'Authentication required' });

      const { id } = req.params;
      const result = await contentOperatingSystemOrchestrator.advanceQueueItem(id, 'user');
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.put('/queue/:id', async (req: Request, res: Response) => {
    try {
      const clerkId = getClerkId(req);
      if (!clerkId) return res.status(401).json({ error: 'Authentication required' });

      const { id } = req.params;
      const item = await QueueItem.findByIdAndUpdate(id, { $set: req.body }, { new: true });
      if (!item) return res.status(404).json({ error: 'Queue item not found' });
      res.json(item);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /* ───────── Draft Generation ───────── */

  router.post('/draft/generate', async (req: Request, res: Response) => {
    try {
      const clerkId = getClerkId(req);
      if (!clerkId) return res.status(401).json({ error: 'Authentication required' });

      const { calendarEntryId, profileData } = req.body;
      if (!calendarEntryId) return res.status(400).json({ error: 'calendarEntryId required' });

      const result = await contentOperatingSystemOrchestrator.generateDraftForEntry(calendarEntryId, profileData || {});
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /* ───────── Publishing Mode ───────── */

  router.get('/mode/:userId', async (req: Request, res: Response) => {
    try {
      const clerkId = getClerkId(req);
      if (!clerkId) return res.status(401).json({ error: 'Authentication required' });

      const { userId } = req.params;
      const mode = await automationModeEngine.getMode(new mongoose.Types.ObjectId(userId));
      res.json(mode);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.put('/mode/:userId', async (req: Request, res: Response) => {
    try {
      const clerkId = getClerkId(req);
      if (!clerkId) return res.status(401).json({ error: 'Authentication required' });

      const { userId } = req.params;
      const { mode, reason } = req.body;
      const result = await automationModeEngine.setMode(new mongoose.Types.ObjectId(userId), mode, reason);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.put('/mode/:userId/config', async (req: Request, res: Response) => {
    try {
      const clerkId = getClerkId(req);
      if (!clerkId) return res.status(401).json({ error: 'Authentication required' });

      const { userId } = req.params;
      const config = await automationModeEngine.updateConfig(new mongoose.Types.ObjectId(userId), req.body);
      res.json(config);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /* ───────── Google Sheets Sync ───────── */

  router.post('/sync/sheets/:userId', async (req: Request, res: Response) => {
    try {
      const clerkId = getClerkId(req);
      if (!clerkId) return res.status(401).json({ error: 'Authentication required' });

      const { userId } = req.params;
      const result = await contentOperatingSystemOrchestrator.syncToSheets(userId);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /* ───────── Opportunity Integration ───────── */

  router.post('/opportunity/process', async (req: Request, res: Response) => {
    try {
      const clerkId = getClerkId(req);
      if (!clerkId) return res.status(401).json({ error: 'Authentication required' });

      const { userId, signals } = req.body;
      if (!userId || !signals) return res.status(400).json({ error: 'userId and signals required' });

      const result = await contentOperatingSystemOrchestrator.processOpportunity(userId, signals);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /* ───────── Analytics Feedback ───────── */

  router.get('/analytics/:userId', async (req: Request, res: Response) => {
    try {
      const clerkId = getClerkId(req);
      if (!clerkId) return res.status(401).json({ error: 'Authentication required' });

      const { userId } = req.params;
      const feedback = await contentOperatingSystemOrchestrator.getAnalyticsFeedback(userId);
      res.json(feedback);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /* ───────── Snapshots ───────── */

  router.get('/snapshots/:userId', async (req: Request, res: Response) => {
    try {
      const clerkId = getClerkId(req);
      if (!clerkId) return res.status(401).json({ error: 'Authentication required' });

      const { userId } = req.params;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 5;
      const snapshots = await CalendarSnapshot.find({ userId: new mongoose.Types.ObjectId(userId) })
        .sort({ version: -1 })
        .limit(limit)
        .lean();
      res.json(snapshots);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /* ───────── Status ───────── */

  router.get('/status/:userId', async (req: Request, res: Response) => {
    try {
      const clerkId = getClerkId(req);
      if (!clerkId) return res.status(401).json({ error: 'Authentication required' });

      const { userId } = req.params;
      const uid = new mongoose.Types.ObjectId(userId);

      const [calendarCount, queueCount, mode, latestSnapshot] = await Promise.all([
        ContentCalendar.countDocuments({ userId: uid }),
        QueueItem.countDocuments({ userId: uid }),
        PublishingMode.findOne({ userId: uid }).lean(),
        CalendarSnapshot.findOne({ userId: uid }).sort({ version: -1 }).lean(),
      ]);

      const statusBreakdown = await ContentCalendar.aggregate([
        { $match: { userId: uid } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]);

      const queueBreakdown = await QueueItem.aggregate([
        { $match: { userId: uid } },
        { $group: { _id: '$stage', count: { $sum: 1 } } },
      ]);

      const statusMap: Record<string, number> = {};
      statusBreakdown.forEach((s: any) => { statusMap[s._id] = s.count; });

      const queueMap: Record<string, number> = {};
      queueBreakdown.forEach((s: any) => { queueMap[s._id] = s.count; });

      res.json({
        calendar: {
          total: calendarCount,
          byStatus: statusMap,
          hasEntries: calendarCount > 0,
        },
        queue: {
          total: queueCount,
          byStage: queueMap,
          hasItems: queueCount > 0,
        },
        publishingMode: mode ? { mode: mode.mode, autoPublish: mode.config.autoPublishPosts, autoSchedule: mode.config.autoSchedulePosts } : null,
        snapshot: latestSnapshot ? {
          version: latestSnapshot.version,
          date: latestSnapshot.snapshotDate,
          totalEntries: latestSnapshot.summary.totalEntries,
          coverageDays: latestSnapshot.summary.coverageDays,
        } : null,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}
