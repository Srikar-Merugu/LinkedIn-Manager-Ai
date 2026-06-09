import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import pino from 'pino';
import { orchestratorAgent } from '../services/ai-manager/OrchestratorAgent';
import { contextEngine } from '../services/ai-manager/ContextEngine';
import { memoryEngine } from '../services/ai-manager/MemoryEngine';
import { actionEngine } from '../services/ai-manager/ActionEngine';
import { ChatSession } from '../models/ai-manager/ChatSession';
import { ConversationHistory } from '../models/ai-manager/ConversationHistory';
import { AIRecommendation } from '../models/ai-manager/AIRecommendation';
import { AIAction } from '../models/ai-manager/AIAction';
import { UserPreference } from '../models/ai-manager/UserPreference';

const logger = pino();

function getClerkId(req: Request): string | null {
  return (req.headers['x-clerk-user-id'] as string) || null;
}

export function createAIManagerRouter(): Router {
  const router = Router();

  /* ──────── Chat ──────── */

  router.post('/chat', async (req: Request, res: Response) => {
    try {
      const clerkId = getClerkId(req);
      if (!clerkId) return res.status(401).json({ error: 'Authentication required' });

      const { userId, sessionId, message } = req.body;
      if (!userId || !message) return res.status(400).json({ error: 'userId and message required' });

      const response = await orchestratorAgent.processChat({ userId, sessionId, message });
      res.json(response);
    } catch (error: any) {
      logger.error({ error }, 'Chat processing failed');
      res.status(500).json({ error: error.message || 'Chat processing failed' });
    }
  });

  /* ──────── Sessions ──────── */

  router.get('/sessions/:userId', async (req: Request, res: Response) => {
    try {
      const clerkId = getClerkId(req);
      if (!clerkId) return res.status(401).json({ error: 'Authentication required' });

      const { userId } = req.params;
      const sessions = await ChatSession.find({ userId: new mongoose.Types.ObjectId(userId), status: 'active' })
        .sort({ lastMessageAt: -1 }).limit(20).lean();
      res.json(sessions);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post('/sessions', async (req: Request, res: Response) => {
    try {
      const clerkId = getClerkId(req);
      if (!clerkId) return res.status(401).json({ error: 'Authentication required' });

      const { userId } = req.body;
      if (!userId) return res.status(400).json({ error: 'userId required' });

      const session = await ChatSession.create({
        userId: new mongoose.Types.ObjectId(userId),
        title: 'New conversation',
        status: 'active',
        context: 'general',
      });
      res.json(session);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.put('/sessions/:id', async (req: Request, res: Response) => {
    try {
      const clerkId = getClerkId(req);
      if (!clerkId) return res.status(401).json({ error: 'Authentication required' });

      const { id } = req.params;
      const session = await ChatSession.findByIdAndUpdate(id, { $set: req.body }, { new: true });
      if (!session) return res.status(404).json({ error: 'Session not found' });
      res.json(session);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /* ──────── Conversation History ──────── */

  router.get('/history/:sessionId', async (req: Request, res: Response) => {
    try {
      const clerkId = getClerkId(req);
      if (!clerkId) return res.status(401).json({ error: 'Authentication required' });

      const { sessionId } = req.params;
      const { limit } = req.query;
      let query = ConversationHistory.find({ sessionId: new mongoose.Types.ObjectId(sessionId) }).sort({ createdAt: 1 });
      if (limit) query = query.limit(parseInt(limit as string));
      const history = await query.lean();
      res.json(history);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /* ──────── Recommendations ──────── */

  router.get('/recommendations/:userId', async (req: Request, res: Response) => {
    try {
      const clerkId = getClerkId(req);
      if (!clerkId) return res.status(401).json({ error: 'Authentication required' });

      const { userId } = req.params;
      const { category, status, limit } = req.query;
      const filter: any = { userId: new mongoose.Types.ObjectId(userId) };
      if (category) filter.category = category;
      if (status) filter.status = status;
      else filter.status = 'active';

      let query = AIRecommendation.find(filter).sort({ priority: -1, createdAt: -1 });
      if (limit) query = query.limit(parseInt(limit as string));

      const recommendations = await query.lean();
      res.json(recommendations);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.put('/recommendations/:id', async (req: Request, res: Response) => {
    try {
      const clerkId = getClerkId(req);
      if (!clerkId) return res.status(401).json({ error: 'Authentication required' });

      const { id } = req.params;
      const rec = await AIRecommendation.findByIdAndUpdate(id, { $set: req.body }, { new: true });
      if (!rec) return res.status(404).json({ error: 'Recommendation not found' });
      res.json(rec);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /* ──────── Proactive Recommendations ──────── */

  router.get('/proactive/:userId', async (req: Request, res: Response) => {
    try {
      const clerkId = getClerkId(req);
      if (!clerkId) return res.status(401).json({ error: 'Authentication required' });

      const { userId } = req.params;
      const recommendations = await orchestratorAgent.getProactiveRecommendations(userId);
      res.json(recommendations);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /* ──────── Actions ──────── */

  router.get('/actions/:userId', async (req: Request, res: Response) => {
    try {
      const clerkId = getClerkId(req);
      if (!clerkId) return res.status(401).json({ error: 'Authentication required' });

      const { userId } = req.params;
      const { status, limit } = req.query;
      const filter: any = { userId: new mongoose.Types.ObjectId(userId) };
      if (status) filter.status = status;

      let query = AIAction.find(filter).sort({ createdAt: -1 });
      if (limit) query = query.limit(parseInt(limit as string));

      const actions = await query.lean();
      res.json(actions);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post('/actions/:id/execute', async (req: Request, res: Response) => {
    try {
      const clerkId = getClerkId(req);
      if (!clerkId) return res.status(401).json({ error: 'Authentication required' });

      const { id } = req.params;
      const { approvedBy } = req.body;
      const result = await actionEngine.execute(id, approvedBy);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post('/actions/:id/approve', async (req: Request, res: Response) => {
    try {
      const clerkId = getClerkId(req);
      if (!clerkId) return res.status(401).json({ error: 'Authentication required' });

      const { id } = req.params;
      const { userId } = req.body;
      const result = await actionEngine.approveAction(id, userId);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post('/actions/:id/reject', async (req: Request, res: Response) => {
    try {
      const clerkId = getClerkId(req);
      if (!clerkId) return res.status(401).json({ error: 'Authentication required' });

      const { id } = req.params;
      const { reason } = req.body;
      const result = await actionEngine.rejectAction(id, reason);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /* ──────── Preferences ──────── */

  router.get('/preferences/:userId', async (req: Request, res: Response) => {
    try {
      const clerkId = getClerkId(req);
      if (!clerkId) return res.status(401).json({ error: 'Authentication required' });

      const { userId } = req.params;
      let prefs: any = await UserPreference.findOne({ userId: new mongoose.Types.ObjectId(userId) }).lean();
      if (!prefs) {
        prefs = { userId: new mongoose.Types.ObjectId(userId), proactivityLevel: 'balanced', communicationStyle: 'strategic', preferredContext: [], enabledAgents: [], notificationPreferences: { recommendations: true, proactiveAlerts: true, dailyDigest: false, weeklyReport: true }, quickActions: [], dismissedRecommendations: [], feedbackHistory: [] };
      }
      res.json(prefs);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.put('/preferences/:userId', async (req: Request, res: Response) => {
    try {
      const clerkId = getClerkId(req);
      if (!clerkId) return res.status(401).json({ error: 'Authentication required' });

      const { userId } = req.params;
      const prefs = await UserPreference.findOneAndUpdate(
        { userId: new mongoose.Types.ObjectId(userId) },
        { $set: req.body },
        { upsert: true, new: true },
      );
      res.json(prefs);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /* ──────── Context ──────── */

  router.get('/context/:userId', async (req: Request, res: Response) => {
    try {
      const clerkId = getClerkId(req);
      if (!clerkId) return res.status(401).json({ error: 'Authentication required' });

      const { userId } = req.params;
      const context = await contextEngine.load(userId);
      res.json(context);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /* ──────── Tasks ──────── */

  router.get('/tasks/:userId', async (req: Request, res: Response) => {
    try {
      const clerkId = getClerkId(req);
      if (!clerkId) return res.status(401).json({ error: 'Authentication required' });

      const { userId } = req.params;
      const tasks = await orchestratorAgent.generateSuggestedTasks(userId);
      res.json(tasks);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /* ──────── Status ──────── */

  router.get('/status/:userId', async (req: Request, res: Response) => {
    try {
      const clerkId = getClerkId(req);
      if (!clerkId) return res.status(401).json({ error: 'Authentication required' });

      const { userId } = req.params;
      const uid = new mongoose.Types.ObjectId(userId);

      const [activeSessions, activeRecommendations, pendingActions, memoryCount] = await Promise.all([
        ChatSession.countDocuments({ userId: uid, status: 'active' }),
        AIRecommendation.countDocuments({ userId: uid, status: 'active' }),
        AIAction.countDocuments({ userId: uid, status: 'pending' }),
        mongoose.model('CopilotMemory').countDocuments({ userId: uid, isActive: true }),
      ]);

      res.json({ activeSessions, activeRecommendations, pendingActions, memoryCount });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}
