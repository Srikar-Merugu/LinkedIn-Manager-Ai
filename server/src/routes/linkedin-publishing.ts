import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import axios from 'axios';
import pino from 'pino';
import { LinkedInConnection } from '../models/identity/LinkedInConnection';
import { QueueItem } from '../models/content-operations/QueueItem';
import { Post } from '../models/content-generation/Post';
import { linkedinPublisher } from '../services/linkedin/LinkedInPublisher';
import { autoPublisher } from '../services/scheduler/AutoPublisher';
import { getAuthenticatedUserId } from '../utils/auth';
import { env } from '../config/env';

const logger = pino();

function getUserId(req: Request): string | null {
  return getAuthenticatedUserId(req);
}

export function createLinkedInPublishingRouter(): Router {
  const router = Router();

  /* ───────── Connect LinkedIn (OAuth URL) ───────── */

  router.get('/linkedin/connect', (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: 'Authentication required' });

      const state = crypto.randomBytes(16).toString('hex');
      const stateData = JSON.stringify({ userId, state, purpose: 'publishing' });
      const encodedState = Buffer.from(stateData).toString('base64url');

      const redirectUri = process.env.LINKEDIN_REDIRECT_URI || '';
      const clientId = process.env.LINKEDIN_CLIENT_ID || '';

      logger.info({ userId, redirectUri, clientId: clientId.substring(0, 8) + '...' }, 'Generating LinkedIn OAuth URL for publishing');

      const params = new URLSearchParams({
        response_type: 'code',
        client_id: clientId,
        redirect_uri: redirectUri,
        scope: 'openid profile email w_member_social',
        state: encodedState,
      });

      const authUrl = `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`;
      logger.info({ userId, authUrl: authUrl.substring(0, 100) + '...' }, 'LinkedIn OAuth URL generated');
      res.json({ url: authUrl });
    } catch (error: any) {
      logger.error({ error: error.message }, 'Failed to generate LinkedIn connect URL');
      res.status(500).json({ error: 'Failed to generate LinkedIn authorization URL' });
    }
  });

  /* ───────── LinkedIn OAuth Callback (for publishing) ───────── */

  router.get('/linkedin/publish-callback', async (req: Request, res: Response) => {
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
    try {
      const { code, state, error: linkedinError } = req.query;

      if (linkedinError) {
        return res.redirect(`${clientUrl}/dashboard/publishing-center?linkedin=error&reason=${encodeURIComponent(String(linkedinError))}`);
      }

      if (!code || !state) {
        return res.redirect(`${clientUrl}/dashboard/publishing-center?linkedin=error&reason=missing_parameters`);
      }

      let userId: string;
      try {
        const stateData = JSON.parse(Buffer.from(String(state), 'base64url').toString());
        userId = stateData.userId;
      } catch {
        return res.redirect(`${clientUrl}/dashboard/publishing-center?linkedin=error&reason=invalid_state`);
      }

      // Exchange code for token
      const tokenResponse = await axios.post(
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

      const { access_token, refresh_token, expires_in } = tokenResponse.data;

      // Get user profile
      const profileResponse = await axios.get('https://api.linkedin.com/v2/userinfo', {
        headers: { Authorization: `Bearer ${access_token}` },
      });

      const linkedinProfile = profileResponse.data;

      // Save or update connection
      const encryptedAccessToken = access_token;
      const encryptedRefreshToken = refresh_token || '';

      await LinkedInConnection.findOneAndUpdate(
        { userId: new mongoose.Types.ObjectId(userId) },
        {
          userId: new mongoose.Types.ObjectId(userId),
          linkedinUserId: linkedinProfile.sub,
          email: linkedinProfile.email || '',
          fullName: linkedinProfile.name || '',
          profileUrl: `https://linkedin.com/in/${linkedinProfile.sub}`,
          accessTokenEncrypted: encryptedAccessToken,
          refreshTokenEncrypted: encryptedRefreshToken,
          tokenExpiresAt: new Date(Date.now() + (expires_in || 600) * 1000),
          scope: 'openid profile email w_member_social',
          isConnected: true,
        },
        { upsert: true, new: true }
      );

      logger.info({ userId, linkedinId: linkedinProfile.sub }, 'LinkedIn connected for publishing');

      res.redirect(`${clientUrl}/dashboard/publishing-center?linkedin=connected`);
    } catch (error: any) {
      logger.error({ error: error.message }, 'LinkedIn publish callback failed');
      res.redirect(`${clientUrl}/dashboard/publishing-center?linkedin=error&reason=token_exchange_failed`);
    }
  });

  /* ───────── Check LinkedIn Connection Status ───────── */

  router.get('/linkedin/status', async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: 'Authentication required' });

      logger.info({ userId }, 'Checking LinkedIn connection status');

      const connection = await LinkedInConnection.findOne({ userId }).lean();
      if (!connection) {
        logger.info({ userId }, 'No LinkedIn connection found');
        return res.json({ connected: false });
      }

      logger.info({ userId, linkedinId: connection.linkedinUserId, isConnected: connection.isConnected }, 'LinkedIn connection found');

      // Test the connection
      const testResult = await linkedinPublisher.testConnection(userId);

      logger.info({ userId, connected: testResult.connected, error: testResult.error }, 'LinkedIn connection test result');

      res.json({
        connected: testResult.connected,
        profile: testResult.profile || {
          name: connection.fullName,
          email: connection.email,
        },
        error: testResult.error,
      });
    } catch (error: any) {
      logger.error({ error: error.message }, 'Failed to check LinkedIn status');
      res.status(500).json({ error: error.message });
    }
  });

  /* ───────── Disconnect LinkedIn ───────── */

  router.post('/linkedin/disconnect', async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: 'Authentication required' });

      await LinkedInConnection.findOneAndUpdate(
        { userId },
        { isConnected: false }
      );

      res.json({ disconnected: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /* ───────── Approve Queue Item (move to scheduled) ───────── */

  router.post('/queue/:id/approve', async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: 'Authentication required' });

      const { id } = req.params;
      const { scheduledAt } = req.body;

      const item = await QueueItem.findById(id);
      if (!item) return res.status(404).json({ error: 'Queue item not found' });
      if (item.userId.toString() !== userId) return res.status(403).json({ error: 'Unauthorized' });

      item.stage = 'scheduled';
      item.scheduledAt = scheduledAt ? new Date(scheduledAt) : new Date();
      item.stageHistory.push({
        stage: 'scheduled',
        enteredAt: new Date(),
        triggeredBy: 'user',
      });
      await item.save();

      res.json(item);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /* ───────── Schedule Multiple Items ───────── */

  router.post('/queue/bulk-approve', async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: 'Authentication required' });

      const { itemIds, scheduledAt } = req.body;
      if (!Array.isArray(itemIds)) return res.status(400).json({ error: 'itemIds array required' });

      const results = [];
      for (const id of itemIds) {
        const item = await QueueItem.findById(id);
        if (item && item.userId.toString() === userId) {
          item.stage = 'scheduled';
          item.scheduledAt = scheduledAt ? new Date(scheduledAt) : new Date();
          item.stageHistory.push({
            stage: 'scheduled',
            enteredAt: new Date(),
            triggeredBy: 'user_bulk',
          });
          await item.save();
          results.push(item);
        }
      }

      res.json({ scheduled: results.length, items: results });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /* ───────── Publish Now (immediate) ───────── */

  router.post('/queue/:id/publish-now', async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: 'Authentication required' });

      const { id } = req.params;
      const item = await QueueItem.findById(id);
      if (!item) return res.status(404).json({ error: 'Queue item not found' });
      if (item.userId.toString() !== userId) return res.status(403).json({ error: 'Unauthorized' });

      // Get content
      let content = '';
      if (item.postId) {
        const post = await Post.findById(item.postId).lean();
        if (post) {
          content = post.fullContent || `${post.hook}\n\n${post.body}\n\n${post.cta}`;
        }
      }
      if (!content && item.title) content = item.title;

      if (!content) {
        return res.status(400).json({ error: 'No content found for this item' });
      }

      const result = await linkedinPublisher.publishPost(userId, content);

      if (result.success) {
        item.stage = 'published';
        item.linkedinPostId = result.linkedinPostId;
        item.publishedAt = new Date();
        item.stageHistory.push({
          stage: 'published',
          enteredAt: new Date(),
          triggeredBy: 'user_immediate',
        });
        await item.save();

        if (item.postId) {
          await Post.findByIdAndUpdate(item.postId, { status: 'published' });
        }

        res.json({ success: true, linkedinPostId: result.linkedinPostId });
      } else {
        item.stage = 'failed';
        item.lastError = result.error;
        item.stageHistory.push({
          stage: 'failed',
          enteredAt: new Date(),
          triggeredBy: 'user_immediate',
        });
        await item.save();

        res.status(500).json({ success: false, error: result.error });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /* ───────── Retry Failed Item ───────── */

  router.post('/queue/:id/retry', async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: 'Authentication required' });

      const { id } = req.params;
      const item = await QueueItem.findById(id);
      if (!item) return res.status(404).json({ error: 'Queue item not found' });
      if (item.userId.toString() !== userId) return res.status(403).json({ error: 'Unauthorized' });
      if (item.stage !== 'failed') return res.status(400).json({ error: 'Item is not in failed state' });

      const result = await autoPublisher.retryFailed(id);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /* ───────── Publisher Status ───────── */

  router.get('/publisher/status', async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: 'Authentication required' });

      const [scheduledCount, publishedCount, failedCount] = await Promise.all([
        QueueItem.countDocuments({ userId, stage: 'scheduled' }),
        QueueItem.countDocuments({ userId, stage: 'published' }),
        QueueItem.countDocuments({ userId, stage: 'failed' }),
      ]);

      const nextScheduled = await QueueItem.findOne({
        userId,
        stage: 'scheduled',
        scheduledAt: { $gte: new Date() },
      }).sort({ scheduledAt: 1 }).lean();

      res.json({
        scheduledCount,
        publishedCount,
        failedCount,
        nextScheduledAt: nextScheduled?.scheduledAt || null,
        schedulerRunning: true,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}
