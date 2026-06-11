import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import pino from 'pino';
import { googleSheetsService } from '../services/google/GoogleSheetsService';
import { getAuthenticatedUserId } from '../utils/auth';
import { Post } from '../models/content-generation/Post';
import { QueueItem } from '../models/content-operations/QueueItem';

const logger = pino();

const GoogleConnectionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  accessToken: { type: String, required: true },
  refreshToken: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  email: String,
  isConnected: { type: Boolean, default: true },
  lastUsedAt: Date,
}, { timestamps: true });

const GoogleConnection = mongoose.models.GoogleConnection || mongoose.model('GoogleConnection', GoogleConnectionSchema);

function getUserId(req: Request): string | null {
  return getAuthenticatedUserId(req);
}

export function createGoogleSheetsRouter(): Router {
  const router = Router();

  router.get('/connect', (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: 'Authentication required' });
      const url = googleSheetsService.getAuthUrl(userId);
      res.json({ url });
    } catch (error: any) {
      logger.error({ error: error.message }, 'Failed to generate Google OAuth URL');
      res.status(500).json({ error: error.message });
    }
  });

  router.get('/callback', async (req: Request, res: Response) => {
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
    try {
      const { code, state, error: googleError } = req.query;
      if (googleError) return res.redirect(`${clientUrl}/dashboard/content-calendar?google=error&reason=${encodeURIComponent(String(googleError))}`);
      if (!code || !state) return res.redirect(`${clientUrl}/dashboard/content-calendar?google=error&reason=missing_parameters`);

      let userId: string;
      try {
        const stateData = JSON.parse(String(state));
        userId = stateData.userId;
      } catch { return res.redirect(`${clientUrl}/dashboard/content-calendar?google=error&reason=invalid_state`); }

      const tokens = await googleSheetsService.exchangeCode(String(code));

      await GoogleConnection.findOneAndUpdate(
        { userId: new mongoose.Types.ObjectId(userId) },
        {
          userId: new mongoose.Types.ObjectId(userId),
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresAt: tokens.expiresAt,
          isConnected: true,
          lastUsedAt: new Date(),
        },
        { upsert: true, new: true }
      );

      logger.info({ userId }, 'Google Sheets connected');
      res.redirect(`${clientUrl}/dashboard/content-calendar?google=connected`);
    } catch (error: any) {
      logger.error({ error: error.message }, 'Google callback failed');
      res.redirect(`${clientUrl}/dashboard/content-calendar?google=error&reason=token_exchange_failed`);
    }
  });

  router.get('/status', async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: 'Authentication required' });
      const connection = await GoogleConnection.findOne({ userId }).lean() as any;
      res.json({ connected: connection?.isConnected || false, email: connection?.email || null });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post('/disconnect', async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: 'Authentication required' });
      await GoogleConnection.findOneAndUpdate({ userId }, { isConnected: false });
      res.json({ disconnected: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post('/export', async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: 'Authentication required' });

      const connection = await GoogleConnection.findOne({ userId }) as any;
      if (!connection || !connection.isConnected) {
        return res.status(400).json({ error: 'Google account not connected' });
      }

      let accessToken = connection.accessToken;
      if (new Date(connection.expiresAt) <= new Date()) {
        const tokens = await googleSheetsService.refreshAccessToken(connection.refreshToken);
        accessToken = tokens.accessToken;
        await GoogleConnection.findOneAndUpdate(
          { userId },
          { accessToken: tokens.accessToken, expiresAt: tokens.expiresAt }
        );
      }

      const userObjectId = new mongoose.Types.ObjectId(userId);

      const [posts, queueItems] = await Promise.all([
        Post.find({ userId: userObjectId }).sort({ createdAt: -1 }).limit(200).lean(),
        QueueItem.find({ userId: userObjectId }).sort({ createdAt: -1 }).limit(100).lean(),
      ]);

      const result = await googleSheetsService.exportAllData(accessToken, {
        posts,
        queueItems,
        analytics: [],
      });

      await GoogleConnection.findOneAndUpdate({ userId }, { lastUsedAt: new Date() });

      logger.info({ userId, spreadsheetId: result.spreadsheetId, posts: posts.length, queue: queueItems.length }, 'Full export to Google Sheets');
      res.json(result);
    } catch (error: any) {
      logger.error({ error: error.message, stack: error.stack }, 'Failed to export to Google Sheets');
      res.status(500).json({ error: error.message || 'Failed to export to Google Sheets' });
    }
  });

  return router;
}
