import { Router, Request, Response } from 'express';
import pino from 'pino';
import { env } from '../config/env';
import { User } from '../models/identity/User';
import { authEventService } from '../services/auth/AuthEventService';
import { LinkedInService } from '../services/linkedin/LinkedInService';

const logger = pino();

export function createAuthRouter(linkedinService?: LinkedInService): Router {
  const router = Router();

  router.get('/me', async (req: Request, res: Response) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const token = authHeader.slice(7);
      const response = await fetch('https://api.clerk.com/v1/sessions/verify', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.clerk.secretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      if (!response.ok) {
        return res.status(401).json({ error: 'Invalid session' });
      }

      const session: any = await response.json();
      const clerkId = session.user_id;

      const user = await User.findOne({ clerkId });
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({ user: user.toJSON() });
    } catch (error: any) {
      logger.error({ error: error.message }, 'Failed to get current user');
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.post('/linkedin/sync', async (req: Request, res: Response) => {
    try {
      const { accessToken, linkedinId } = req.body;
      if (!accessToken || !linkedinId) {
        return res.status(400).json({ error: 'accessToken and linkedinId are required' });
      }

      const user = await User.findOne({ clerkId: linkedinId });
      if (!user) {
        return res.status(401).json({ error: 'User not found' });
      }

      if (!linkedinService) {
        return res.status(503).json({ error: 'LinkedIn service unavailable' });
      }

      logger.info({ userId: user._id, linkedinId }, 'LinkedIn sync requested');

      const linkedinProfile = await linkedinService.getProfile(accessToken);
      if (!linkedinProfile) {
        return res.status(502).json({ error: 'Failed to fetch LinkedIn profile' });
      }

      res.json({
        success: true,
        profile: linkedinProfile,
        message: 'LinkedIn profile synced successfully',
      });
    } catch (error: any) {
      logger.error({ error: error.message }, 'LinkedIn sync failed');
      res.status(500).json({ error: 'LinkedIn sync failed' });
    }
  });

  router.get('/linkedin/url', async (_req: Request, res: Response) => {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: env.linkedin.clientId,
      redirect_uri: env.linkedin.redirectUri,
      scope: env.linkedin.scopes.join(' '),
      state: Math.random().toString(36).slice(2),
    });

    res.json({ url: `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}` });
  });

  router.get('/analytics', async (_req: Request, res: Response) => {
    try {
      const analytics = await authEventService.getAuthAnalytics();
      res.json(analytics);
    } catch (error: any) {
      logger.error({ error: error.message }, 'Failed to get auth analytics');
      res.status(500).json({ error: 'Failed to fetch analytics' });
    }
  });

  return router;
}
