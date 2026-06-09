import { Router, Request, Response } from 'express';
import { Webhook } from 'svix';
import type { WebhookEvent } from '@clerk/backend';
import { onboardingService } from '../services/onboarding/OnboardingService';
import { User } from '../models/identity/User';
import { env } from '../config/env';
import pino from 'pino';

const logger = pino();

export function createOnboardingRouter(): Router {
  const router = Router();

  function getClerkId(req: Request): string | null {
    const userId = req.headers['x-clerk-user-id'] as string;
    const authHeader = req.headers['authorization'];
    if (userId) return userId;
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const decoded = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
        return decoded.sub || decoded.userId || null;
      } catch {
        return null;
      }
    }
    return null;
  }

  router.post('/webhook', async (req: Request, res: Response) => {
    const svixId = req.headers['svix-id'] as string;
    const svixTimestamp = req.headers['svix-timestamp'] as string;
    const svixSignature = req.headers['svix-signature'] as string;

    if (!svixId || !svixTimestamp || !svixSignature) {
      return res.status(400).json({ error: 'Missing svix headers' });
    }

    let evt: WebhookEvent;
    try {
      const wh = new Webhook(env.clerkWebhookSecret);
      evt = wh.verify(JSON.stringify(req.body), {
        'svix-id': svixId,
        'svix-timestamp': svixTimestamp,
        'svix-signature': svixSignature,
      }) as WebhookEvent;
    } catch (err) {
      logger.error({ err }, 'Webhook verification failed');
      return res.status(400).json({ error: 'Webhook verification failed' });
    }

    const { type, data } = evt;

    try {
      switch (type) {
        case 'user.created': {
          const { id, email_addresses, first_name, last_name, image_url } = data as any;
          const email = email_addresses?.[0]?.email_address || '';
          const name = [first_name, last_name].filter(Boolean).join(' ') || 'User';

          const existingUser = await User.findOne({ clerkId: id });
          if (!existingUser) {
            await User.create({
              clerkId: id,
              email,
              fullName: name,
              avatar: image_url,
              onboardingStatus: 'not_started',
              onboardingStep: 0,
            });
            await onboardingService.getOrCreateState(id, email, name);
          }
          break;
        }

        case 'user.updated': {
          const { id, email_addresses, first_name, last_name, image_url } = data as any;
          const email = email_addresses?.[0]?.email_address || '';
          const name = [first_name, last_name].filter(Boolean).join(' ') || 'User';

          await User.findOneAndUpdate({ clerkId: id }, {
            email,
            fullName: name,
            avatar: image_url,
          });
          break;
        }

        case 'user.deleted': {
          const { id } = data as any;
          await User.findOneAndUpdate({ clerkId: id }, { isDeleted: true, deletedAt: new Date() });
          break;
        }

        case 'session.created': {
          const { user_id } = data as any;
          await User.findOneAndUpdate({ clerkId: user_id }, { lastActiveAt: new Date() });
          break;
        }
      }

      res.json({ success: true });
    } catch (error) {
      logger.error({ error, webhookType: type }, 'Webhook handler error');
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  });

  router.get('/state', async (req: Request, res: Response) => {
    try {
      const clerkId = getClerkId(req);
      if (!clerkId) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      const progress = await onboardingService.getOnboardingProgress(clerkId);
      res.json(progress);
    } catch (error) {
      logger.error({ error }, 'Failed to get onboarding state');
      res.status(500).json({ error: 'Failed to get onboarding state' });
    }
  });

  router.post('/start', async (req: Request, res: Response) => {
    try {
      const clerkId = getClerkId(req);
      if (!clerkId) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      const state = await onboardingService.getOrCreateState(clerkId);
      res.json(state);
    } catch (error) {
      logger.error({ error }, 'Failed to start onboarding');
      res.status(500).json({ error: 'Failed to start onboarding' });
    }
  });

  router.post('/steps/welcome', async (req: Request, res: Response) => {
    try {
      const clerkId = getClerkId(req);
      if (!clerkId) return res.status(401).json({ error: 'Authentication required' });
      const state = await onboardingService.completeStep(clerkId, 'welcome', req.body);
      res.json(state);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  router.post('/steps/linkedin', async (req: Request, res: Response) => {
    try {
      const clerkId = getClerkId(req);
      if (!clerkId) return res.status(401).json({ error: 'Authentication required' });
      const { profileId, accessToken } = req.body;
      if (!profileId || !accessToken) {
        return res.status(400).json({ error: 'profileId and accessToken required' });
      }
      const state = await onboardingService.saveLinkedInData(clerkId, profileId, accessToken);
      res.json(state);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  router.post('/steps/resume', async (req: Request, res: Response) => {
    try {
      const clerkId = getClerkId(req);
      if (!clerkId) return res.status(401).json({ error: 'Authentication required' });
      const state = await onboardingService.saveResumeData(clerkId, req.body.fileInfo, req.body.parsedData);
      res.json(state);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  router.post('/steps/github', async (req: Request, res: Response) => {
    try {
      const clerkId = getClerkId(req);
      if (!clerkId) return res.status(401).json({ error: 'Authentication required' });
      const { username, ...githubInfo } = req.body;
      if (!username) return res.status(400).json({ error: 'username required' });
      const state = await onboardingService.saveGitHubData(clerkId, username, githubInfo);
      res.json(state);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  router.post('/steps/portfolio', async (req: Request, res: Response) => {
    try {
      const clerkId = getClerkId(req);
      if (!clerkId) return res.status(401).json({ error: 'Authentication required' });
      const { url, ...portfolioInfo } = req.body;
      if (!url) return res.status(400).json({ error: 'url required' });
      const state = await onboardingService.savePortfolioData(clerkId, url, portfolioInfo);
      res.json(state);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  router.post('/steps/goals', async (req: Request, res: Response) => {
    try {
      const clerkId = getClerkId(req);
      if (!clerkId) return res.status(401).json({ error: 'Authentication required' });
      const { goals } = req.body;
      if (!goals || !Array.isArray(goals)) {
        return res.status(400).json({ error: 'goals array required' });
      }
      const state = await onboardingService.saveCareerGoals(clerkId, goals);
      res.json(state);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  router.post('/steps/content-experience', async (req: Request, res: Response) => {
    try {
      const clerkId = getClerkId(req);
      if (!clerkId) return res.status(401).json({ error: 'Authentication required' });
      const { frequency } = req.body;
      if (!frequency) return res.status(400).json({ error: 'frequency required' });
      const state = await onboardingService.saveContentExperience(clerkId, frequency);
      res.json(state);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  router.post('/steps/voice', async (req: Request, res: Response) => {
    try {
      const clerkId = getClerkId(req);
      if (!clerkId) return res.status(401).json({ error: 'Authentication required' });
      const { samples } = req.body;
      if (!samples || !Array.isArray(samples)) {
        return res.status(400).json({ error: 'samples array required' });
      }
      const state = await onboardingService.saveVoiceSamples(clerkId, samples);
      res.json(state);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  router.post('/steps/ai_analysis', async (req: Request, res: Response) => {
    try {
      const clerkId = getClerkId(req);
      if (!clerkId) return res.status(401).json({ error: 'Authentication required' });
      const state = await onboardingService.completeStep(clerkId, 'ai_analysis', req.body);
      res.json(state);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  router.post('/steps/skip', async (req: Request, res: Response) => {
    try {
      const clerkId = getClerkId(req);
      if (!clerkId) return res.status(401).json({ error: 'Authentication required' });
      const { step } = req.body;
      if (!step) return res.status(400).json({ error: 'step required' });
      const state = await onboardingService.skipStep(clerkId, step);
      res.json(state);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  router.post('/analysis/start', async (req: Request, res: Response) => {
    try {
      const clerkId = getClerkId(req);
      if (!clerkId) return res.status(401).json({ error: 'Authentication required' });
      const state = await onboardingService.startAIAnalysis(clerkId);
      res.json(state);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  router.post('/analysis/progress', async (req: Request, res: Response) => {
    try {
      const clerkId = getClerkId(req);
      if (!clerkId) return res.status(401).json({ error: 'Authentication required' });
      const { progress, logEntry } = req.body;
      const state = await onboardingService.updateAnalysisProgress(clerkId, progress, logEntry);
      res.json(state);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  router.get('/summary', async (req: Request, res: Response) => {
    try {
      const clerkId = getClerkId(req);
      if (!clerkId) return res.status(401).json({ error: 'Authentication required' });
      const summary = await onboardingService.getOnboardingSummary(clerkId);
      res.json(summary);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  router.post('/resume', async (req: Request, res: Response) => {
    try {
      const clerkId = getClerkId(req);
      if (!clerkId) return res.status(401).json({ error: 'Authentication required' });
      const state = await onboardingService.resume(clerkId);
      if (!state) return res.status(404).json({ error: 'No onboarding state found' });
      res.json(state);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  router.post('/abort', async (req: Request, res: Response) => {
    try {
      const clerkId = getClerkId(req);
      if (!clerkId) return res.status(401).json({ error: 'Authentication required' });
      await onboardingService.abort(clerkId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  router.post('/redirected', async (req: Request, res: Response) => {
    try {
      const clerkId = getClerkId(req);
      if (!clerkId) return res.status(401).json({ error: 'Authentication required' });
      await onboardingService.markRedirected(clerkId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  return router;
}
