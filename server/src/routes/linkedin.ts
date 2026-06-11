import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import pino from 'pino';
import { LinkedInService } from '../services/linkedin/LinkedInService';
import { ProfileSyncService } from '../services/linkedin/ProfileSyncService';
import { LinkedInConnection, encrypt } from '../models/identity/LinkedInConnection';
import { User } from '../models/identity/User';
import { env } from '../config/env';

const logger = pino();

function getClientUrl(): string {
  return (process.env.CLIENT_URL || 'http://localhost:3000').trim();
}

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
    const clientUrl = getClientUrl();
    try {
      const { code, state, error: linkedinError } = req.query;

      logger.info({ hasCode: !!code, hasState: !!state, linkedinError }, 'LinkedIn callback received');

      if (linkedinError) {
        logger.error({ linkedinError }, 'LinkedIn returned an error');
        return res.redirect(`${clientUrl}/dashboard/publishing-center?linkedin=error&reason=${encodeURIComponent(String(linkedinError))}`);
      }

      if (!code || !state) {
        logger.error('Missing code or state in LinkedIn callback');
        return res.redirect(`${clientUrl}/dashboard/publishing-center?linkedin=error&reason=missing_parameters`);
      }

      let userId: string;
      let purpose: string | undefined;
      try {
        const stateData = JSON.parse(Buffer.from(String(state), 'base64url').toString());
        userId = stateData.userId;
        purpose = stateData.purpose;
        logger.info({ userId, purpose }, 'LinkedIn callback state decoded');
      } catch {
        logger.error('Failed to decode LinkedIn callback state');
        return res.redirect(`${clientUrl}/dashboard/publishing-center?linkedin=error&reason=invalid_state`);
      }

      // ───────── PUBLISHING FLOW ─────────
      if (purpose === 'publishing') {
        logger.info({ userId }, 'Processing LinkedIn callback for PUBLISHING flow');

        let tokenResponse;
        try {
          tokenResponse = await axios.post(
            'https://www.linkedin.com/oauth/v2/accessToken',
            new URLSearchParams({
              grant_type: 'authorization_code',
              code: String(code),
              client_id: process.env.LINKEDIN_CLIENT_ID || '',
              client_secret: process.env.LINKEDIN_CLIENT_SECRET || '',
              redirect_uri: process.env.LINKEDIN_REDIRECT_URI || '',
            }).toString(),
            { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
          );
          logger.info({ userId, expiresIn: tokenResponse.data.expires_in }, 'LinkedIn token exchanged for publishing');
        } catch (error: any) {
          logger.error({ error: error.message, userId }, 'LinkedIn token exchange failed for publishing');
          return res.redirect(`${clientUrl}/dashboard/publishing-center?linkedin=error&reason=token_exchange_failed`);
        }

        const { access_token, refresh_token, expires_in } = tokenResponse.data;

        let profile;
        try {
          const profileResponse = await axios.get('https://api.linkedin.com/v2/userinfo', {
            headers: { Authorization: `Bearer ${access_token}` },
          });
          profile = profileResponse.data;
          logger.info({ userId, linkedinId: profile.sub }, 'LinkedIn profile fetched for publishing');
        } catch (error: any) {
          logger.error({ error: error.message, userId }, 'Failed to fetch LinkedIn profile for publishing');
          return res.redirect(`${clientUrl}/dashboard/publishing-center?linkedin=error&reason=profile_fetch_failed`);
        }

        try {
          await LinkedInConnection.findOneAndUpdate(
            { userId: new mongoose.Types.ObjectId(userId) },
            {
              userId: new mongoose.Types.ObjectId(userId),
              linkedinUserId: profile.sub,
              email: profile.email || '',
              fullName: profile.name || '',
              profileUrl: `https://linkedin.com/in/${profile.sub}`,
              accessTokenEncrypted: encrypt(access_token),
              refreshTokenEncrypted: refresh_token ? encrypt(refresh_token) : '',
              tokenExpiresAt: new Date(Date.now() + (expires_in || 600) * 1000),
              scope: 'openid profile email w_member_social',
              isConnected: true,
              lastUsedAt: new Date(),
            },
            { upsert: true, new: true }
          );
          logger.info({ userId, linkedinId: profile.sub }, 'LinkedIn connection saved for publishing');
        } catch (error: any) {
          logger.error({ error: error.message, userId }, 'Failed to save LinkedIn connection');
          return res.redirect(`${clientUrl}/dashboard/publishing-center?linkedin=error&reason=save_failed`);
        }

        return res.redirect(`${clientUrl}/dashboard/publishing-center?linkedin=connected`);
      }

      // ───────── ONBOARDING FLOW (existing) ─────────
      logger.info({ userId }, 'Processing LinkedIn callback for ONBOARDING flow');

      const user = await User.findById(userId);
      if (!user) {
        return res.redirect(`${clientUrl}/onboarding?linkedin=error&reason=user_not_found`);
      }

      let tokenResponse;
      try {
        tokenResponse = await linkedinService.exchangeCodeForToken(String(code));
      } catch (error: any) {
        logger.error({ error: error.message }, 'LinkedIn token exchange failed');
        return res.redirect(`${clientUrl}/onboarding?linkedin=error&reason=token_exchange_failed`);
      }

      const accessToken = tokenResponse.access_token;

      let profile;
      try {
        profile = await linkedinService.getProfile(accessToken);
      } catch (error: any) {
        logger.error({ error: error.message }, 'Failed to fetch LinkedIn profile');
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

      const params = new URLSearchParams({
        linkedin: 'connected',
        linkedinId,
        ...(profileId ? { profileId } : {}),
      });

      res.redirect(`${clientUrl}/onboarding?${params.toString()}`);
    } catch (error: any) {
      logger.error({ error: error.message }, 'LinkedIn OAuth callback failed');
      const clientUrl = getClientUrl();
      res.redirect(`${clientUrl}/dashboard/publishing-center?linkedin=error&reason=internal_error`);
    }
  });

  return router;
}
