import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import pino from 'pino';
import { contentGenerationOrchestrator, GenerateInput } from '../services/content-generation/ContentGenerationOrchestrator';
import { Post } from '../models/content-generation/Post';
import { PostVariation } from '../models/content-generation/PostVariation';
import { ContentScore } from '../models/content-generation/ContentScore';
import { VoiceScore } from '../models/content-generation/VoiceScore';
import { ContentReview } from '../models/content-generation/ContentReview';
import { ContentVersion } from '../models/content-generation/ContentVersion';
import { GeneratedDraft } from '../models/content-generation/GeneratedDraft';
import { postVariationEngine } from '../services/content-generation/engines/PostVariationEngine';
import { contentReviewEngine } from '../services/content-generation/engines/ContentReviewEngine';
import { contentRegenerationEngine } from '../services/content-generation/engines/ContentRegenerationEngine';
import { voiceDNAEngine, VoiceProfile } from '../services/content-generation/engines/VoiceDNAEngine';
import { brandDNAEngine, BrandProfile } from '../services/content-generation/engines/BrandDNAEngine';
import { careerAlignmentEngine, CareerAlignmentInput } from '../services/content-generation/engines/CareerAlignmentEngine';
import { contentQualityEngine } from '../services/content-generation/engines/ContentQualityEngine';
import { linkedInOptimizationEngine } from '../services/content-generation/engines/LinkedInOptimizationEngine';
import { contentScoringEngine } from '../services/content-generation/engines/ContentScoringEngine';
import { getAuthenticatedUserId } from '../utils/auth';
import { QueueItem } from '../models/content-operations/QueueItem';
import { AnalysisReport } from '../models/analysis/AnalysisReport';

const logger = pino();

function getUserId(req: Request): string | null {
  return getAuthenticatedUserId(req);
}

export function createContentGenerationRouter(): Router {
  const router = Router();

  /* ───────── Generate ───────── */

  router.post('/generate', async (req: Request, res: Response) => {
    try {
      const authUserId = getUserId(req);
      if (!authUserId) return res.status(401).json({ error: 'Authentication required' });

      const input: GenerateInput = req.body;
      if (!input.userId || !input.topic || !input.contentType) {
        return res.status(400).json({ error: 'userId, topic, and contentType are required' });
      }

      // Load analysis report if voiceProfile/brandProfile not provided
      if (!input.voiceProfile || !input.brandProfile) {
        const report = await AnalysisReport.findOne({ userId: new mongoose.Types.ObjectId(input.userId) }).lean();
        if (!report) {
          return res.status(400).json({ error: 'Analysis report required', details: 'Complete onboarding first to generate your analysis report.' });
        }
        if (!input.voiceProfile) input.voiceProfile = (report as any).writingDNA || {};
        if (!input.brandProfile) {
          const bd = (report as any).brandDNA || {};
          input.brandProfile = {
            positioning: bd.positioning || '',
            audience: bd.targetAudience ? [bd.targetAudience] : [],
            expertise: bd.brandTerritory || [],
            authorityAreas: bd.brandRules?.map((r: any) => r.rule || r) || [],
            brandRules: bd.brandRules?.map((r: any) => r.rule || r) || [],
            brandVoice: bd.brandVoice || '',
            targetIndustries: [],
            targetRoles: [],
          };
        }
        if (!input.careerGoals) input.careerGoals = (report as any).careerBlueprint?.careerGoals || [];
        if (!input.currentRole) input.currentRole = (report as any).resumeAnalysis?.currentRole || '';
      }

      const result = await contentGenerationOrchestrator.generate(input);

      // Save generated post to publishing queue
      if (result.success && result.post) {
        try {
          await QueueItem.create({
            userId: new mongoose.Types.ObjectId(input.userId),
            stage: 'draft_generated',
            priority: 50,
            automationMode: 'manual',
            draftGeneratedAt: new Date(),
            stageHistory: [{ stage: 'draft_generated', enteredAt: new Date(), triggeredBy: 'content_generation' }],
          });
        } catch (queueErr: any) {
          logger.warn({ error: queueErr.message }, 'Failed to save to publishing queue');
        }
      }

      res.json(result);
    } catch (error: any) {
      logger.error({ error: error.message }, 'Generation failed');
      res.status(500).json({ error: error.message || 'Generation failed' });
    }
  });

  /* ───────── Regenerate ───────── */

  router.post('/regenerate/:postId', async (req: Request, res: Response) => {
    try {
      const authUserId = getUserId(req);
      if (!authUserId) return res.status(401).json({ error: 'Authentication required' });

      const { postId } = req.params;
      const params = req.body;

      const existingPost = await Post.findById(postId);
      if (!existingPost) return res.status(404).json({ error: 'Post not found' });

      const input: GenerateInput = {
        userId: existingPost.userId.toString(),
        topic: existingPost.title.replace(/^(The story of|How I|My framework for|The truth about|My journey|How to|A complete guide to|Why I|Thoughts on|Reflections on)\s+/i, ''),
        context: existingPost.body.substring(0, 500),
        keyInsight: existingPost.body.substring(0, 200),
        contentType: existingPost.contentType,
        sourceType: 'regeneration',
        sourceId: postId,
        sourceDescription: `Regeneration of post ${postId}`,
        voiceProfile: params.voiceProfile,
        brandProfile: params.brandProfile,
        careerGoals: params.careerGoals,
        currentRole: params.currentRole,
        targetRole: params.targetRole,
        generationParams: params.generationParams || {},
      };

      const report = await contentGenerationOrchestrator.regenerate(input, params);
      res.json(report);
    } catch (error: any) {
      logger.error({ error }, 'Regeneration failed');
      res.status(500).json({ error: error.message || 'Regeneration failed' });
    }
  });

  /* ───────── List Posts ───────── */

  router.get('/posts/:userId', async (req: Request, res: Response) => {
    try {
      const authUserId = getUserId(req);
      if (!authUserId) return res.status(401).json({ error: 'Authentication required' });

      const { userId } = req.params;
      const { contentType, status, limit } = req.query;

      const filter: any = { userId: new mongoose.Types.ObjectId(userId) };
      if (contentType) filter.contentType = contentType;
      if (status) filter.status = status;

      let query = Post.find(filter).sort({ createdAt: -1 });
      if (limit) query = query.limit(parseInt(limit as string));

      const posts = await query.lean();
      res.json(posts);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /* ───────── Get Post ───────── */

  router.get('/posts/detail/:postId', async (req: Request, res: Response) => {
    try {
      const authUserId = getUserId(req);
      if (!authUserId) return res.status(401).json({ error: 'Authentication required' });

      const { postId } = req.params;
      const data = await contentGenerationOrchestrator.getPostWithScores(postId);
      if (!data) return res.status(404).json({ error: 'Post not found' });
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /* ───────── Update Post ───────── */

  router.put('/posts/:postId', async (req: Request, res: Response) => {
    try {
      const authUserId = getUserId(req);
      if (!authUserId) return res.status(401).json({ error: 'Authentication required' });

      const { postId } = req.params;
      const updates = req.body;

      const existing = await Post.findById(postId);
      if (!existing) return res.status(404).json({ error: 'Post not found' });

      const updated = await Post.findByIdAndUpdate(postId, { $set: updates }, { new: true });

      await ContentVersion.create({
        postId: new mongoose.Types.ObjectId(postId),
        userId: existing.userId,
        version: (await ContentVersion.countDocuments({ postId })) + 1,
        title: updates.title || existing.title,
        hook: updates.hook || existing.hook,
        body: updates.body || existing.body,
        cta: updates.cta || existing.cta,
        fullContent: updates.fullContent || existing.fullContent,
        scores: {},
        changeType: 'edited',
        changeDescription: updates.changeDescription || 'Manual edit',
        wordCount: (updates.fullContent || existing.fullContent).split(/\s+/).filter(Boolean).length,
      });

      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /* ───────── Delete Post ───────── */

  router.delete('/posts/:postId', async (req: Request, res: Response) => {
    try {
      const authUserId = getUserId(req);
      if (!authUserId) return res.status(401).json({ error: 'Authentication required' });

      const { postId } = req.params;
      const pid = new mongoose.Types.ObjectId(postId);

      await Promise.all([
        Post.findByIdAndDelete(pid),
        PostVariation.deleteMany({ postId: pid }),
        ContentScore.deleteMany({ postId: pid }),
        VoiceScore.deleteMany({ postId: pid }),
        ContentReview.deleteMany({ postId: pid }),
        ContentVersion.deleteMany({ postId: pid }),
      ]);

      res.json({ deleted: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /* ───────── Get Variations ───────── */

  router.get('/variations/:postId', async (req: Request, res: Response) => {
    try {
      const authUserId = getUserId(req);
      if (!authUserId) return res.status(401).json({ error: 'Authentication required' });

      const { postId } = req.params;
      const variations = await PostVariation.find({ postId: new mongoose.Types.ObjectId(postId) }).lean();
      res.json(variations);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /* ───────── Select Best Variation ───────── */

  router.put('/variations/:variationId/select', async (req: Request, res: Response) => {
    try {
      const authUserId = getUserId(req);
      if (!authUserId) return res.status(401).json({ error: 'Authentication required' });

      const { variationId } = req.params;
      const variation = await PostVariation.findById(variationId);
      if (!variation) return res.status(404).json({ error: 'Variation not found' });

      await Post.findByIdAndUpdate(variation.postId, {
        $set: {
          hook: variation.hook, body: variation.body, cta: variation.cta,
          fullContent: variation.fullContent, isBestVersion: true,
        },
      });

      await PostVariation.updateMany({ postId: variation.postId }, { $set: { 'scores.overall': 0 } });
      await PostVariation.findByIdAndUpdate(variationId, { $set: { 'scores.overall': 100 } });

      res.json({ selected: true, variation });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /* ───────── Get Draft History ───────── */

  router.get('/drafts/:userId', async (req: Request, res: Response) => {
    try {
      const authUserId = getUserId(req);
      if (!authUserId) return res.status(401).json({ error: 'Authentication required' });

      const { userId } = req.params;
      const { status, limit } = req.query;

      const filter: any = { userId: new mongoose.Types.ObjectId(userId) };
      if (status) filter.status = status;

      let query = GeneratedDraft.find(filter).sort({ createdAt: -1 });
      if (limit) query = query.limit(parseInt(limit as string));

      const drafts = await query.lean();
      res.json(drafts);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /* ───────── Validate Voice ───────── */

  router.post('/validate/voice', async (req: Request, res: Response) => {
    try {
      const authUserId = getUserId(req);
      if (!authUserId) return res.status(401).json({ error: 'Authentication required' });

      const { content, voiceProfile } = req.body;
      const result = voiceDNAEngine.validate(content, voiceProfile);
      const aiPhrases = voiceDNAEngine.detectAIPhrases(content);
      res.json({ ...result, aiPhrases });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /* ───────── Validate Brand ───────── */

  router.post('/validate/brand', async (req: Request, res: Response) => {
    try {
      const authUserId = getUserId(req);
      if (!authUserId) return res.status(401).json({ error: 'Authentication required' });

      const { content, topic, brandProfile } = req.body;
      const result = brandDNAEngine.validate(content, topic, brandProfile);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /* ───────── Evaluate Career Alignment ───────── */

  router.post('/evaluate/career', async (req: Request, res: Response) => {
    try {
      const authUserId = getUserId(req);
      if (!authUserId) return res.status(401).json({ error: 'Authentication required' });

      const input: CareerAlignmentInput = req.body;
      const result = careerAlignmentEngine.evaluate(input);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /* ───────── Review Content ───────── */

  router.post('/review', async (req: Request, res: Response) => {
    try {
      const authUserId = getUserId(req);
      if (!authUserId) return res.status(401).json({ error: 'Authentication required' });

      const result = contentReviewEngine.review(req.body);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /* ───────── Score Content ───────── */

  router.post('/score', async (req: Request, res: Response) => {
    try {
      const authUserId = getUserId(req);
      if (!authUserId) return res.status(401).json({ error: 'Authentication required' });

      const result = contentScoringEngine.score(req.body);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /* ───────── Optimize for LinkedIn ───────── */

  router.post('/optimize', async (req: Request, res: Response) => {
    try {
      const authUserId = getUserId(req);
      if (!authUserId) return res.status(401).json({ error: 'Authentication required' });

      const result = linkedInOptimizationEngine.optimize(req.body);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /* ───────── Generate Variations ───────── */

  router.post('/variations/generate', async (req: Request, res: Response) => {
    try {
      const authUserId = getUserId(req);
      if (!authUserId) return res.status(401).json({ error: 'Authentication required' });

      const variations = postVariationEngine.generateThree(req.body);
      res.json({ variations });
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

      const [totalPosts, totalDrafts, byStatus, byType, recentPosts] = await Promise.all([
        Post.countDocuments({ userId: uid }),
        GeneratedDraft.countDocuments({ userId: uid }),
        Post.aggregate([
          { $match: { userId: uid } },
          { $group: { _id: '$status', count: { $sum: 1 } } },
        ]),
        Post.aggregate([
          { $match: { userId: uid } },
          { $group: { _id: '$contentType', count: { $sum: 1 } } },
        ]),
        Post.find({ userId: uid }).sort({ createdAt: -1 }).limit(5).lean(),
      ]);

      const statusMap: Record<string, number> = {};
      byStatus.forEach((s: any) => { statusMap[s._id] = s.count; });

      const typeMap: Record<string, number> = {};
      byType.forEach((s: any) => { typeMap[s._id] = s.count; });

      res.json({
        totalPosts,
        totalDrafts,
        byStatus: statusMap,
        byType: typeMap,
        recentPosts,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}
