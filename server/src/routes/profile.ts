import { Router, Request, Response } from 'express';
import pino from 'pino';
import { LinkedInService } from '../services/linkedin/LinkedInService';
import { ProfileSyncService, SyncPhase } from '../services/linkedin/ProfileSyncService';
import { CachingLayer } from '../services/CachingLayer';
import { LinkedInProfile } from '../models/LinkedInProfile';
import { LinkedInSkill } from '../models/LinkedInSkill';
import { LinkedInActivity } from '../models/LinkedInActivity';
import { LinkedInProject } from '../models/LinkedInProject';
import { LinkedInCertificate } from '../models/LinkedInCertificate';
import { User } from '../models/identity/User';
import { OnboardingState } from '../models/onboarding/OnboardingState';
import { getTokenFromReq, verifyToken } from '../utils/jwt';

const logger = pino();

function getUserId(req: Request): string | null {
  const token = getTokenFromReq(req);
  if (!token) return null;
  const payload = verifyToken(token);
  return payload?.userId || null;
}

export function createProfileRouter(
  linkedinService: LinkedInService,
  syncService: ProfileSyncService,
  cachingLayer: CachingLayer
): Router {
  const router = Router();

  router.get('/', async (req: Request, res: Response) => {
    try {
      const { linkedinId } = req.query;

      if (!linkedinId || typeof linkedinId !== 'string') {
        return res.status(400).json({ error: 'Missing linkedinId parameter' });
      }

      const cacheKey = `profile:${linkedinId}`;
      const cached = await cachingLayer.get(cacheKey);
      if (cached) {
        return res.json(cached);
      }

      const profile = await LinkedInProfile.findOne({ linkedinId }).select('-accessToken -refreshToken');

      if (!profile) {
        return res.status(404).json({ error: 'Profile not found. Please sync first.' });
      }

      await cachingLayer.set(cacheKey, profile, 120);
      res.json(profile);
    } catch (error) {
      logger.error({ error }, 'Failed to fetch profile');
      res.status(500).json({ error: 'Failed to fetch profile' });
    }
  });

  router.post('/sync', async (req: Request, res: Response) => {
    try {
      const { accessToken } = req.body;
      if (!accessToken) {
        return res.status(400).json({ error: 'Missing required field: accessToken' });
      }

      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      let user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      logger.info({ userId }, 'Starting profile sync');

      const onPhase = async (phase: SyncPhase, status: string) => {
        logger.debug({ phase, status }, 'Sync phase update');
      };

      const result = await syncService.syncFullProfile(user._id.toString(), accessToken, onPhase);

      if (result.success) {
        await cachingLayer.invalidate(`profile:${result.profileId}`);
        await cachingLayer.invalidatePattern('profile:*');

        await OnboardingState.findOneAndUpdate(
          { userId: user._id },
          {
            $set: {
              'connectedSources.linkedin': {
                connected: true,
                profileId: result.profileId,
                accessToken,
                syncedAt: new Date(),
              },
            },
          }
        );

        await User.findByIdAndUpdate(user._id, {
          $set: {
            onboardingStatus: 'linkedin_connected',
          },
        });

        res.json(result);
      } else {
        res.status(500).json(result);
      }
    } catch (error) {
      logger.error({ error }, 'Profile sync failed');
      res.status(500).json({ error: 'Profile sync failed' });
    }
  });

  router.get('/by-user', async (req: Request, res: Response) => {
    try {
      const currentUserId = getUserId(req);
      if (!currentUserId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const user = await User.findById(currentUserId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const state = await OnboardingState.findOne({ userId: user._id });

      if (state?.connectedSources?.linkedin?.profileId) {
        const profile = await LinkedInProfile.findById(
          state.connectedSources.linkedin.profileId
        ).select('-accessToken -refreshToken');
        if (profile) {
          return res.json(profile);
        }
      }
      if (user) {
        const profile = await LinkedInProfile.findOne({
          userId: user._id,
        })
          .sort({ 'metadata.lastSyncedAt': -1 })
          .select('-accessToken -refreshToken');
        if (profile) {
          return res.json(profile);
        }
      }

      return res.status(404).json({ error: 'No LinkedIn profile found for this user' });
    } catch (error) {
      logger.error({ error }, 'Failed to fetch profile by user');
      res.status(500).json({ error: 'Failed to fetch profile' });
    }
  });

  router.get('/:profileId', async (req: Request, res: Response) => {
    try {
      const { profileId } = req.params;

      const profile = await LinkedInProfile.findById(profileId).select('-accessToken -refreshToken');

      if (!profile) {
        return res.status(404).json({ error: 'Profile not found' });
      }

      res.json(profile);
    } catch (error) {
      logger.error({ error }, 'Failed to get profile by id');
      res.status(500).json({ error: 'Failed to get profile' });
    }
  });

  router.get('/:profileId/skills', async (req: Request, res: Response) => {
    try {
      const { profileId } = req.params;
      const { limit = '50', offset = '0' } = req.query;

      const skills = await LinkedInSkill.find({ profileId })
        .sort({ endorsements: -1, isTopSkill: -1 })
        .skip(parseInt(offset as string, 10))
        .limit(parseInt(limit as string, 10));

      const total = await LinkedInSkill.countDocuments({ profileId });

      res.json({ skills, total, limit: parseInt(limit as string, 10), offset: parseInt(offset as string, 10) });
    } catch (error) {
      logger.error({ error }, 'Failed to get skills');
      res.status(500).json({ error: 'Failed to get skills' });
    }
  });

  router.get('/:profileId/activity', async (req: Request, res: Response) => {
    try {
      const { profileId } = req.params;
      const { limit = '50', offset = '0', type } = req.query;

      const query: Record<string, unknown> = { profileId };
      if (type && typeof type === 'string') {
        query.type = type;
      }

      const activity = await LinkedInActivity.find(query)
        .sort({ timestamp: -1 })
        .skip(parseInt(offset as string, 10))
        .limit(parseInt(limit as string, 10));

      const total = await LinkedInActivity.countDocuments(query);

      res.json({ activity, total, limit: parseInt(limit as string, 10), offset: parseInt(offset as string, 10) });
    } catch (error) {
      logger.error({ error }, 'Failed to get activity');
      res.status(500).json({ error: 'Failed to get activity' });
    }
  });

  router.get('/:profileId/projects', async (req: Request, res: Response) => {
    try {
      const { profileId } = req.params;

      const projects = await LinkedInProject.find({ profileId })
        .sort({ isFeatured: -1, 'metadata.relevanceScore': -1 });

      res.json(projects);
    } catch (error) {
      logger.error({ error }, 'Failed to get projects');
      res.status(500).json({ error: 'Failed to get projects' });
    }
  });

  router.get('/:profileId/certificates', async (req: Request, res: Response) => {
    try {
      const { profileId } = req.params;

      const certificates = await LinkedInCertificate.find({ profileId })
        .sort({ 'metadata.prestigeScore': -1 });

      res.json(certificates);
    } catch (error) {
      logger.error({ error }, 'Failed to get certificates');
      res.status(500).json({ error: 'Failed to get certificates' });
    }
  });

  router.get('/:profileId/summary', async (req: Request, res: Response) => {
    try {
      const { profileId } = req.params;
      const cacheKey = `summary:${profileId}`;

      const cached = await cachingLayer.get(cacheKey);
      if (cached) return res.json(cached);

      const profile = await LinkedInProfile.findById(profileId)
        .select('summary metadata scores firstName lastName headline profilePicture');

      if (!profile) {
        return res.status(404).json({ error: 'Profile not found' });
      }

      await cachingLayer.set(cacheKey, profile, 300);
      res.json(profile);
    } catch (error) {
      logger.error({ error }, 'Failed to get profile summary');
      res.status(500).json({ error: 'Failed to get profile summary' });
    }
  });

  return router;
}
