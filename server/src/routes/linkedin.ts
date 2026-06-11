import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import pino from 'pino';
import { LinkedInService } from '../services/linkedin/LinkedInService';
import { ProfileSyncService } from '../services/linkedin/ProfileSyncService';
import { User } from '../models/identity/User';
import { env } from '../config/env';

const logger = pino();

export function createLinkedInRouter(
  linkedinService: LinkedInService,
  syncService: ProfileSyncService
): Router {
  const router = Router();

  router.get('/linkedin', (req: Request, res: Response) => {
    try {
      const sessionToken = req.cookies?.session;
      if (!sessionToken) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const decoded = jwt.verify(sessionToken, env.jwtSecret) as { userId: string; email?: string };
      const state = crypto.randomBytes(16).toString('hex');

      const stateData = JSON.stringify({ userId: decoded.userId, state });
      const encodedState = Buffer.from(stateData).toString('base64url');

      const authUrl = linkedinService.getAuthorizationUrl(encodedState);

      res.json({ url: authUrl });
    } catch (error: any) {
      logger.error({ error: error.message }, 'Failed to generate LinkedIn OAuth URL');
      res.status(500).json({ error: 'Failed to generate LinkedIn authorization URL' });
    }
  });

  router.get('/linkedin/callback', async (req: Request, res: Response) => {
    try {
      const { code, state, error: linkedinError } = req.query;

      if (linkedinError) {
        const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
        return res.redirect(`${clientUrl}/onboarding?linkedin=error&reason=${encodeURIComponent(String(linkedinError))}`);
      }

      if (!code || !state) {
        const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
        return res.redirect(`${clientUrl}/onboarding?linkedin=error&reason=missing_parameters`);
      }

      let userId: string;
      try {
        const stateData = JSON.parse(Buffer.from(String(state), 'base64url').toString());
        userId = stateData.userId;
      } catch {
        const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
        return res.redirect(`${clientUrl}/onboarding?linkedin=error&reason=invalid_state`);
      }

      const user = await User.findById(userId);
      if (!user) {
        const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
        return res.redirect(`${clientUrl}/onboarding?linkedin=error&reason=user_not_found`);
      }

      let tokenResponse;
      try {
        tokenResponse = await linkedinService.exchangeCodeForToken(String(code));
      } catch (error: any) {
        logger.error({ error: error.message }, 'LinkedIn token exchange failed');
        const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
        return res.redirect(`${clientUrl}/onboarding?linkedin=error&reason=token_exchange_failed`);
      }

      const accessToken = tokenResponse.access_token;
      const refreshToken = tokenResponse.refresh_token;

      let profile;
      try {
        profile = await linkedinService.getProfile(accessToken);
      } catch (error: any) {
        logger.error({ error: error.message }, 'Failed to fetch LinkedIn profile');
        const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
        return res.redirect(`${clientUrl}/onboarding?linkedin=error&reason=profile_fetch_failed`);
      }

      const linkedinId = profile.sub;

      let syncResult;
      try {
        syncResult = await syncService.syncFullProfile(userId, accessToken, async (phase, status) => {
          logger.debug({ phase, status, userId }, 'LinkedIn sync phase update');
        });
      } catch (error: any) {
        logger.warn({ error: error.message }, 'Full profile sync failed, continuing with basic profile');
      }

      const profileId = syncResult?.success ? syncResult.profileId : null;

      const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
      const params = new URLSearchParams({
        linkedin: 'connected',
        linkedinId,
        ...(profileId ? { profileId } : {}),
      });

      res.redirect(`${clientUrl}/onboarding?${params.toString()}`);
    } catch (error: any) {
      logger.error({ error: error.message }, 'LinkedIn OAuth callback failed');
      const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
      res.redirect(`${clientUrl}/onboarding?linkedin=error&reason=internal_error`);
    }
  });

  return router;
}
