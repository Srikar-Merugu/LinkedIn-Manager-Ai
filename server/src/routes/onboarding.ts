import { Router, Request, Response } from 'express';
import { onboardingService } from '../services/onboarding/OnboardingService';
import { getTokenFromReq, verifyToken } from '../utils/jwt';
import pino from 'pino';

const logger = pino();

export function createOnboardingRouter(): Router {
  const router = Router();

  function getUserId(req: Request): string | null {
    const token = getTokenFromReq(req);
    if (!token) return null;
    const payload = verifyToken(token);
    return payload?.userId || null;
  }

  router.get('/state', async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: 'Authentication required' });
      const progress = await onboardingService.getOnboardingProgress(userId);
      res.json(progress);
    } catch (error) {
      logger.error({ error }, 'Failed to get onboarding state');
      res.status(500).json({ error: 'Failed to get onboarding state' });
    }
  });

  router.post('/start', async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: 'Authentication required' });
      const state = await onboardingService.getOrCreateState(userId);
      res.json(state);
    } catch (error) {
      logger.error({ error }, 'Failed to start onboarding');
      res.status(500).json({ error: 'Failed to start onboarding' });
    }
  });

  router.post('/steps/welcome', async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: 'Authentication required' });
      const state = await onboardingService.completeStep(userId, 'welcome', req.body);
      res.json(state);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  router.post('/steps/linkedin', async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: 'Authentication required' });
      const { profileId, accessToken } = req.body;
      if (!profileId || !accessToken) {
        return res.status(400).json({ error: 'profileId and accessToken required' });
      }
      const state = await onboardingService.saveLinkedInData(userId, profileId, accessToken);
      res.json(state);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  router.post('/steps/resume', async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: 'Authentication required' });
      const state = await onboardingService.saveResumeData(userId, req.body.fileInfo, req.body.parsedData);
      res.json(state);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  router.post('/steps/github', async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: 'Authentication required' });
      const { username, ...githubInfo } = req.body;
      if (!username) return res.status(400).json({ error: 'username required' });
      const state = await onboardingService.saveGitHubData(userId, username, githubInfo);
      res.json(state);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  router.post('/steps/goals', async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: 'Authentication required' });
      const { goals } = req.body;
      if (!goals || !Array.isArray(goals)) {
        return res.status(400).json({ error: 'goals array required' });
      }
      const state = await onboardingService.saveCareerGoals(userId, goals);
      res.json(state);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  router.post('/steps/voice', async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: 'Authentication required' });
      const { samples } = req.body;
      if (!samples || !Array.isArray(samples)) {
        return res.status(400).json({ error: 'samples array required' });
      }
      const state = await onboardingService.saveVoiceSamples(userId, samples);
      res.json(state);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  router.post('/steps/skip', async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: 'Authentication required' });
      const { step } = req.body;
      if (!step) return res.status(400).json({ error: 'step required' });
      const state = await onboardingService.skipStep(userId, step);
      res.json(state);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  router.post('/analysis/start', async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: 'Authentication required' });
      const state = await onboardingService.startAIAnalysis(userId);
      res.json(state);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  router.post('/analysis/progress', async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: 'Authentication required' });
      const { progress, logEntry } = req.body;
      const state = await onboardingService.updateAnalysisProgress(userId, progress, logEntry);
      res.json(state);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  router.get('/summary', async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: 'Authentication required' });
      const summary = await onboardingService.getOnboardingSummary(userId);
      res.json(summary);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  router.post('/resume', async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: 'Authentication required' });
      const state = await onboardingService.resume(userId);
      if (!state) return res.status(404).json({ error: 'No onboarding state found' });
      res.json(state);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  router.post('/abort', async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: 'Authentication required' });
      await onboardingService.abort(userId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  router.post('/redirected', async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: 'Authentication required' });
      await onboardingService.markRedirected(userId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  return router;
}
