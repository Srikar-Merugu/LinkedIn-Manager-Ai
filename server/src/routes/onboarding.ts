import { Router, Request, Response } from 'express';
import { onboardingService } from '../services/onboarding/OnboardingService';
import { brandAnalysisEngine } from '../services/analysis/BrandAnalysisEngine';
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

  router.post('/steps/linkedin-url', async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: 'Authentication required' });
      const { linkedinUrl } = req.body;
      if (!linkedinUrl) return res.status(400).json({ error: 'linkedinUrl required' });

      const { OnboardingState } = await import('../models/onboarding/OnboardingState');
      const state = await OnboardingState.findOne({ userId: new (await import('mongoose')).default.Types.ObjectId(userId) });
      if (!state) return res.status(404).json({ error: 'Onboarding state not found' });

      (state as any).linkedinUrl = linkedinUrl;
      await state.save();

      const result = await onboardingService.completeStep(userId, 'connect_linkedin', { linkedinUrl });
      res.json(result);
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

  router.post('/steps/github-url', async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: 'Authentication required' });
      const { githubUrl } = req.body;
      if (!githubUrl) return res.status(400).json({ error: 'githubUrl required' });

      const { OnboardingState } = await import('../models/onboarding/OnboardingState');
      const state = await OnboardingState.findOne({ userId: new (await import('mongoose')).default.Types.ObjectId(userId) });
      if (!state) return res.status(404).json({ error: 'Onboarding state not found' });

      (state as any).githubUrl = githubUrl;
      await state.save();

      const result = await onboardingService.completeStep(userId, 'connect_github', { githubUrl });
      res.json(result);
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

  router.post('/steps/:step/complete', async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: 'Authentication required' });
      const { step } = req.params;
      const state = await onboardingService.completeStep(userId, step as any, req.body);
      res.json(state);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  router.post('/resume/upload', async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: 'Authentication required' });

      const multer = (await import('multer')).default;
      const pdfParse = (await import('pdf-parse')) as any;
      const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

      await new Promise<void>((resolve, reject) => {
        upload.single('resume')(req as any, res as any, (err: any) => {
          if (err) reject(err);
          else resolve();
        });
      });

      const file = (req as any).file;
      if (!file) return res.status(400).json({ error: 'No file uploaded' });

      let parsed: any = {};
      if (file.mimetype === 'application/pdf' || file.originalname.endsWith('.pdf')) {
        const data = await pdfParse(file.buffer);
        parsed = {
          rawText: data.text,
          summary: data.text.substring(0, 500),
          skills: [],
          experience: [],
          education: [],
        };
      } else {
        parsed = {
          rawText: file.buffer.toString('utf-8'),
          summary: file.buffer.toString('utf-8').substring(0, 500),
          skills: [],
          experience: [],
          education: [],
        };
      }

      res.json({ parsed, fileInfo: { fileName: file.originalname, fileType: file.mimetype, fileSize: file.size } });
    } catch (error: any) {
      logger.error({ error }, 'Resume upload failed');
      res.status(500).json({ error: error.message || 'Failed to upload resume' });
    }
  });

  router.post('/analysis/run', async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: 'Authentication required' });

      const analysisResult = await brandAnalysisEngine.runFullAnalysis(userId);

      const { OnboardingState } = await import('../models/onboarding/OnboardingState');
      const state = await OnboardingState.findOne({ userId: new (await import('mongoose')).default.Types.ObjectId(userId) });
      if (state) {
        (state as any).analysisResult = analysisResult;
        (state as any).analysisStatus = 'completed';
        (state as any).analysisProgress = 100;
        (state as any).brandDnaGenerated = true;
        (state as any).completedAt = new Date();
        (state as any).status = 'completed';
        await state.save();
      }

      res.json(analysisResult);
    } catch (error: any) {
      logger.error({ error: error.message }, 'Analysis failed');
      res.status(500).json({ error: error.message || 'Analysis failed' });
    }
  });

  router.get('/summary', async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: 'Authentication required' });

      const { OnboardingState } = await import('../models/onboarding/OnboardingState');
      const state = await OnboardingState.findOne({ userId: new (await import('mongoose')).default.Types.ObjectId(userId) });

      if (state && (state as any).analysisResult) {
        return res.json((state as any).analysisResult);
      }

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
