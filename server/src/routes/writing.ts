import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import pino from 'pino';
import { writingDNAOrchestrator } from '../services/writing/WritingDNAOrchestrator';
import { voiceMatchScoringEngine } from '../services/writing/engines/VoiceMatchScoringEngine';
import { continuousLearningService } from '../services/writing/engines/ContinuousLearningService';
import { WritingDNA } from '../models/writing/WritingDNA';
import { WritingSnapshot } from '../models/writing/WritingSnapshot';
import { VoiceScore } from '../models/writing/VoiceScore';
import { getAuthenticatedUserId } from '../utils/auth';

const logger = pino();

function getUserId(req: Request): string | null {
  return getAuthenticatedUserId(req);
}

export function createWritingRouter(): Router {
  const router = Router();

  /* ───────── Generate ───────── */

  router.post('/generate', async (req: Request, res: Response) => {
    try {
      const authUserId = getUserId(req);
      if (!authUserId) return res.status(401).json({ error: 'Authentication required' });

      const { userId, texts, profileId } = req.body;
      if (!userId || !texts) return res.status(400).json({ error: 'userId and texts required' });

      if (!Array.isArray(texts) || texts.length < 3) {
        return res.status(400).json({ error: 'Need at least 3 writing samples' });
      }

      const result = await writingDNAOrchestrator.generate(userId, texts, profileId);
      res.json(result);
    } catch (error: any) {
      logger.error({ error }, 'Failed to generate Writing DNA');
      res.status(500).json({ error: error.message || 'Failed to generate Writing DNA' });
    }
  });

  /* ───────── Writing DNA CRUD ───────── */

  router.get('/dna', async (req: Request, res: Response) => {
    try {
      const authUserId = getUserId(req);
      if (!authUserId) return res.status(401).json({ error: 'Authentication required' });

      const userId = req.query.userId as string;
      if (!userId) return res.status(400).json({ error: 'userId required' });

      const dna = await WritingDNA.findOne({
        userId: new mongoose.Types.ObjectId(userId),
        isActive: true,
      });
      if (!dna) return res.status(404).json({ error: 'Writing DNA not found. Generate one first.' });

      res.json(dna);
    } catch (error: any) {
      logger.error({ error }, 'Failed to fetch Writing DNA');
      res.status(500).json({ error: error.message || 'Failed to fetch Writing DNA' });
    }
  });

  router.put('/dna', async (req: Request, res: Response) => {
    try {
      const authUserId = getUserId(req);
      if (!authUserId) return res.status(401).json({ error: 'Authentication required' });

      const { userId, updates } = req.body;
      if (!userId || !updates) return res.status(400).json({ error: 'userId and updates required' });

      const dna = await WritingDNA.findOne({
        userId: new mongoose.Types.ObjectId(userId),
        isActive: true,
      });
      if (!dna) return res.status(404).json({ error: 'Writing DNA not found' });

      const allowedFields = [
        'writingRules', 'voiceSignature', 'communicationStyle',
        'hooks', 'ctas', 'formatPreferences',
      ];

      for (const field of allowedFields) {
        if (updates[field] !== undefined) {
          (dna as any)[field] = updates[field];
        }
      }

      dna.lastAnalyzedAt = new Date();
      await dna.save();
      res.json(dna);
    } catch (error: any) {
      logger.error({ error }, 'Failed to update Writing DNA');
      res.status(500).json({ error: error.message || 'Failed to update Writing DNA' });
    }
  });

  /* ───────── Snapshots ───────── */

  router.get('/snapshots/:userId', async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const limit = parseInt(req.query.limit as string) || 10;
      const snapshots = await WritingSnapshot.find({ userId: new mongoose.Types.ObjectId(userId) })
        .sort({ version: -1 })
        .limit(limit)
        .select('version reason trigger sampleCount totalWords createdAt');
      res.json(snapshots);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /* ───────── Hooks & CTAs ───────── */

  router.get('/hooks/:userId', async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const dna = await WritingDNA.findOne({
        userId: new mongoose.Types.ObjectId(userId),
        isActive: true,
      });
      if (!dna) return res.status(404).json({ error: 'Writing DNA not found' });
      res.json({ hooks: dna.hooks || [], count: dna.hooks?.length || 0 });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get('/ctas/:userId', async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const dna = await WritingDNA.findOne({
        userId: new mongoose.Types.ObjectId(userId),
        isActive: true,
      });
      if (!dna) return res.status(404).json({ error: 'Writing DNA not found' });
      res.json({ ctas: dna.ctas || [], count: dna.ctas?.length || 0 });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /* ───────── Learn / Incorporate New Content ───────── */

  router.post('/learn', async (req: Request, res: Response) => {
    try {
      const authUserId = getUserId(req);
      if (!authUserId) return res.status(401).json({ error: 'Authentication required' });

      const { userId, texts, trigger } = req.body;
      if (!userId || !texts) return res.status(400).json({ error: 'userId and texts required' });

      const result = await continuousLearningService.incorporateNewContent(
        userId,
        Array.isArray(texts) ? texts : [texts],
        trigger || 'new_post'
      );

      if (!result) return res.status(404).json({ error: 'Writing DNA not found. Generate one first.' });
      res.json(result);
    } catch (error: any) {
      logger.error({ error }, 'Failed to incorporate new content');
      res.status(500).json({ error: error.message || 'Failed to incorporate new content' });
    }
  });

  /* ───────── Score Content ───────── */

  router.post('/score', async (req: Request, res: Response) => {
    try {
      const authUserId = getUserId(req);
      if (!authUserId) return res.status(401).json({ error: 'Authentication required' });

      const { userId, content, contentId } = req.body;
      if (!userId || !content) return res.status(400).json({ error: 'userId and content required' });

      const dna = await WritingDNA.findOne({
        userId: new mongoose.Types.ObjectId(userId),
        isActive: true,
      });
      if (!dna) return res.status(404).json({ error: 'Writing DNA not found' });

      const scores = voiceMatchScoringEngine.score(content, dna.toObject());

      const voiceScore = await VoiceScore.create({
        userId: new mongoose.Types.ObjectId(userId),
        writingDnaId: dna._id,
        contentId,
        contentPreview: content.slice(0, 200),
        scores: {
          overall: scores.overall,
          vocabulary: scores.vocabulary,
          tone: scores.tone,
          structure: scores.structure,
          storytelling: scores.storytelling,
          cta: scores.cta,
          hook: scores.hook,
        },
        breakdown: scores.breakdown,
      });

      res.json(voiceScore);
    } catch (error: any) {
      logger.error({ error }, 'Failed to score content');
      res.status(500).json({ error: error.message || 'Failed to score content' });
    }
  });

  /* ───────── Status ───────── */

  router.get('/status/:userId', async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const oid = new mongoose.Types.ObjectId(userId);

      const dna = await WritingDNA.findOne({ userId: oid, isActive: true });
      const snapshotCount = await WritingSnapshot.countDocuments({ userId: oid });
      const recentScores = await VoiceScore.find({ userId: oid })
        .sort({ analyzedAt: -1 })
        .limit(5)
        .select('scores.overall contentPreview analyzedAt')
        .lean();

      res.json({
        writingDNA: {
          exists: !!dna,
          version: dna?.version || 0,
          confidence: dna?.overallConfidence || 0,
          sampleCount: dna?.sampleCount || 0,
          totalWords: dna?.totalWordsAnalyzed || 0,
          voiceSignature: dna?.voiceSignature || null,
          communicationStyle: dna?.communicationStyle || null,
          lastAnalyzed: dna?.lastAnalyzedAt || null,
        },
        learningHistory: {
          snapshotCount,
          hasEnoughSamples: (dna?.sampleCount || 0) >= 3,
        },
        recentScores,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /* ───────── Full Report ───────── */

  router.get('/full-report/:userId', async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const oid = new mongoose.Types.ObjectId(userId);

      const [dna, snapshots, recentScores] = await Promise.all([
        WritingDNA.findOne({ userId: oid, isActive: true }),
        WritingSnapshot.find({ userId: oid }).sort({ version: -1 }).limit(5).select('version reason trigger sampleCount totalWords createdAt').lean(),
        VoiceScore.find({ userId: oid }).sort({ analyzedAt: -1 }).limit(10).select('scores contentPreview analyzedAt').lean(),
      ]);

      if (!dna) return res.status(404).json({ error: 'Writing DNA not found' });

      res.json({
        dna,
        recentSnapshots: snapshots,
        recentScores,
        generatedAt: new Date().toISOString(),
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /* ───────── Learning History ───────── */

  router.get('/learning/:userId', async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const limit = parseInt(req.query.limit as string) || 10;
      const history = await continuousLearningService.getLearningHistory(userId, limit);
      res.json(history);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}
