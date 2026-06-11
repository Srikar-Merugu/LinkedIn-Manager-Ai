import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import pino from 'pino';
import { brandDNAOrchestrator } from '../services/brand/BrandDNAOrchestrator';
import { brandDNAService } from '../services/brand/BrandDNAService';
import { voiceProfileService } from '../services/brand/VoiceProfileService';
import { intelligenceAggregator } from '../services/intelligence/IntelligenceAggregator';
import { ProfileParser } from '../services/linkedin/ProfileParser';
import { LinkedInProfile } from '../models/LinkedInProfile';
import { LinkedInSkill } from '../models/LinkedInSkill';
import { LinkedInActivity } from '../models/LinkedInActivity';
import { BrandDNA } from '../models/brand/BrandDNA';
import { BrandSnapshot } from '../models/brand/BrandSnapshot';
import { BrandPillar } from '../models/brand/BrandPillar';
import { StoryBank } from '../models/brand/StoryBank';
import { BrandRecommendation } from '../models/brand/BrandRecommendation';
import { VoiceProfile } from '../models/brand/VoiceProfile';
import type { LinkedInUserProfile } from '../types/linkedin';
import { getAuthenticatedUserId } from '../utils/auth';

const logger = pino();
const profileParser = new ProfileParser();

function getUserId(req: Request): string | null {
  return getAuthenticatedUserId(req);
}

export function createBrandRouter(): Router {
  const router = Router();

  /* ───────── Brand DNA ───────── */

  router.get('/dna', async (req: Request, res: Response) => {
    try {
      const authUserId = getUserId(req);
      if (!authUserId) return res.status(401).json({ error: 'Authentication required' });

      const userId = req.query.userId as string;
      if (!userId) return res.status(400).json({ error: 'userId required' });

      const dna = await brandDNAService.getBrandDNA(userId);
      if (!dna) return res.status(404).json({ error: 'Brand DNA not found. Generate one first.' });

      res.json(dna);
    } catch (error: any) {
      logger.error({ error }, 'Failed to fetch brand DNA');
      res.status(500).json({ error: error.message || 'Failed to fetch brand DNA' });
    }
  });

  router.post('/generate/:profileId', async (req: Request, res: Response) => {
    try {
      const { profileId } = req.params;
      const { userId } = req.body;
      const authUserId = getUserId(req);
      if (!authUserId) return res.status(401).json({ error: 'Authentication required' });
      if (!userId) return res.status(400).json({ error: 'userId required' });

      logger.info({ profileId, userId }, 'Generating Brand DNA via orchestrator');

      const report = await intelligenceAggregator.generateFullReport(profileId, userId);

      const profile = await LinkedInProfile.findById(profileId).select('-accessToken -refreshToken');
      if (!profile) return res.status(404).json({ error: 'LinkedIn profile not found' });

      const skills = await LinkedInSkill.find({ profileId }).lean();
      const activity = await LinkedInActivity.find({ profileId }).sort({ timestamp: -1 }).limit(100).lean();

      const linkedinProfile = buildLinkedInUserProfile(profile, skills as any[], activity as any[]);
      const parsed = profileParser.parse(linkedinProfile);

      const result = await brandDNAOrchestrator.generate(userId, profileId, report, parsed, linkedinProfile);

      voiceProfileService.generateVoiceProfile(userId, result.dna._id?.toString()).catch(
        (err: unknown) => logger.error({ err }, 'Failed to auto-generate voice profile')
      );

      res.json(result);
    } catch (error: any) {
      logger.error({ error }, 'Failed to generate Brand DNA');
      res.status(500).json({ error: error.message || 'Failed to generate Brand DNA' });
    }
  });

  router.put('/dna', async (req: Request, res: Response) => {
    try {
      const authUserId = getUserId(req);
      if (!authUserId) return res.status(401).json({ error: 'Authentication required' });

      const { userId, updates } = req.body;
      if (!userId || !updates) return res.status(400).json({ error: 'userId and updates required' });

      const dna = await BrandDNA.findOne({
        userId: new mongoose.Types.ObjectId(userId),
        isActive: true,
      });
      if (!dna) return res.status(404).json({ error: 'Brand DNA not found' });

      const allowedFields = [
        'archetype', 'archetypeDescription', 'secondaryArchetype',
        'values', 'uniqueValueProposition', 'missionStatement', 'originStory',
        'positioning', 'uniquenessFactors', 'targetAudience', 'brandTerritory',
        'visualDirection', 'competitorAnalysis', 'contentDNA', 'growthRoadmap',
        'brandRules', 'brandScore', 'status',
      ];

      for (const field of allowedFields) {
        if (updates[field] !== undefined) {
          (dna as any)[field] = updates[field];
        }
      }

      dna.lastReviewedAt = new Date();
      await dna.save();
      res.json(dna);
    } catch (error: any) {
      logger.error({ error }, 'Failed to update brand DNA');
      res.status(500).json({ error: error.message || 'Failed to update brand DNA' });
    }
  });

  /* ───────── Brand Snapshots ───────── */

  router.get('/snapshots/:userId', async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const limit = parseInt(req.query.limit as string) || 10;
      const snapshots = await BrandSnapshot.find({ userId: new mongoose.Types.ObjectId(userId) })
        .sort({ version: -1 })
        .limit(limit)
        .select('version reason trigger confidence score createdAt');
      res.json(snapshots);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /* ───────── Content Pillars ───────── */

  router.get('/pillars/:userId', async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const pillars = await BrandPillar.findOne({
        userId: new mongoose.Types.ObjectId(userId),
        isActive: true,
      });
      if (!pillars) return res.status(404).json({ error: 'No content pillars found' });
      res.json(pillars);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /* ───────── Story Bank ───────── */

  router.get('/stories/:userId', async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const type = req.query.type as string;
      const query: any = { userId: new mongoose.Types.ObjectId(userId), isActive: true };
      const stories = await StoryBank.findOne(query);
      if (!stories) return res.status(404).json({ error: 'No stories found' });

      if (type) {
        const filtered = stories.stories.filter(s => s.type === type);
        return res.json({ ...stories.toObject(), stories: filtered, totalStories: filtered.length });
      }

      res.json(stories);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /* ───────── Brand Recommendations ───────── */

  router.get('/recommendations/:userId', async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const priority = req.query.priority as string;
      const query: any = { userId: new mongoose.Types.ObjectId(userId), isActive: true };

      const recs = await BrandRecommendation.findOne(query);
      if (!recs) return res.status(404).json({ error: 'No recommendations found' });

      if (priority) {
        const filtered = recs.recommendations.filter(r => r.priority === priority);
        return res.json({ ...recs.toObject(), recommendations: filtered, totalRecommendations: filtered.length });
      }

      res.json(recs);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /* ───────── Voice Profile ───────── */

  router.get('/voice', async (req: Request, res: Response) => {
    try {
      const authUserId = getUserId(req);
      if (!authUserId) return res.status(401).json({ error: 'Authentication required' });

      const userId = req.query.userId as string;
      if (!userId) return res.status(400).json({ error: 'userId required' });

      const voice = await voiceProfileService.getVoiceProfile(userId);
      if (!voice) return res.status(404).json({ error: 'Voice profile not found' });

      res.json(voice);
    } catch (error: any) {
      logger.error({ error }, 'Failed to fetch voice profile');
      res.status(500).json({ error: error.message || 'Failed to fetch voice profile' });
    }
  });

  router.post('/voice/generate', async (req: Request, res: Response) => {
    try {
      const authUserId = getUserId(req);
      if (!authUserId) return res.status(401).json({ error: 'Authentication required' });

      const { userId, brandDnaId } = req.body;
      if (!userId) return res.status(400).json({ error: 'userId required' });

      const voice = await voiceProfileService.generateVoiceProfile(userId, brandDnaId);
      res.json(voice);
    } catch (error: any) {
      logger.error({ error }, 'Failed to generate voice profile');
      res.status(500).json({ error: error.message || 'Failed to generate voice profile' });
    }
  });

  /* ───────── Status ───────── */

  router.get('/status/:userId', async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const oid = new mongoose.Types.ObjectId(userId);

      const [dna, voice, pillars, stories, recs] = await Promise.all([
        BrandDNA.findOne({ userId: oid, isActive: true }),
        VoiceProfile.findOne({ userId: oid, isActive: true }),
        BrandPillar.findOne({ userId: oid, isActive: true }),
        StoryBank.findOne({ userId: oid, isActive: true }),
        BrandRecommendation.findOne({ userId: oid, isActive: true }),
      ]);

      res.json({
        brandDna: {
          exists: !!dna,
          status: dna?.status || null,
          archetype: dna?.archetype || null,
          version: dna?.version || 0,
          score: dna?.brandScore || null,
          lastGenerated: dna?.regeneratedAt || dna?.createdAt || null,
        },
        voiceProfile: {
          exists: !!voice,
          status: voice?.status || null,
          sampleCount: voice?.sampleCount || 0,
          lastAnalyzed: voice?.lastAnalyzedAt || null,
        },
        contentPillars: {
          exists: !!pillars,
          count: pillars?.pillars?.length || 0,
        },
        storyBank: {
          exists: !!stories,
          count: stories?.totalStories || 0,
        },
        recommendations: {
          exists: !!recs,
          count: recs?.totalRecommendations || 0,
        },
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get('/full-report/:userId', async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const oid = new mongoose.Types.ObjectId(userId);

      const [dna, voice, pillars, stories, recs, snapshots] = await Promise.all([
        BrandDNA.findOne({ userId: oid, isActive: true }),
        VoiceProfile.findOne({ userId: oid, isActive: true }),
        BrandPillar.findOne({ userId: oid, isActive: true }),
        StoryBank.findOne({ userId: oid, isActive: true }),
        BrandRecommendation.findOne({ userId: oid, isActive: true }),
        BrandSnapshot.find({ userId: oid }).sort({ version: -1 }).limit(5).select('version reason trigger score createdAt').lean(),
      ]);

      res.json({
        dna,
        voiceProfile: voice,
        pillars,
        stories,
        recommendations: recs,
        recentSnapshots: snapshots,
        generatedAt: new Date().toISOString(),
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}

function buildLinkedInUserProfile(
  profile: any,
  skills: any[],
  activity: any[]
): LinkedInUserProfile {
  return {
    id: profile.linkedinId || profile._id.toString(),
    firstName: profile.firstName || '',
    lastName: profile.lastName || '',
    headline: profile.headline || '',
    vanityName: profile.vanityName,
    profilePicture: profile.profilePicture,
    about: profile.about || '',
    email: profile.email,
    location: profile.location,
    industry: profile.industry,
    experience: (profile.experience || []).map((exp: any) => ({
      title: exp.title || '',
      company: exp.company || '',
      companyLogo: exp.companyLogo,
      companyUrl: exp.companyUrl,
      location: exp.location,
      description: exp.description,
      startDate: exp.startDate,
      endDate: exp.endDate,
      currentlyWorking: exp.currentlyWorking,
      employmentType: exp.employmentType,
      industry: exp.industry,
      durationInMonths: exp.durationInMonths,
    })),
    education: (profile.education || []).map((edu: any) => ({
      school: edu.school || '',
      schoolLogo: edu.schoolLogo,
      degree: edu.degree,
      fieldOfStudy: edu.fieldOfStudy,
      grade: edu.grade,
      description: edu.description,
      startDate: edu.startDate,
      endDate: edu.endDate,
      activities: edu.activities,
    })),
    skills: skills.map((s: any) => ({
      name: s.name || '',
      endorsements: s.endorsements,
      isTopSkill: s.isTopSkill,
      category: s.category,
    })),
    certifications: (profile.certifications || []).map((cert: any) => ({
      name: cert.name || '',
      issuingOrganization: cert.issuingOrganization || '',
      authority: cert.authority,
      licenseNumber: cert.licenseNumber,
      url: cert.url,
      issueDate: cert.issueDate,
      expirationDate: cert.expirationDate,
      doesNotExpire: cert.doesNotExpire,
    })),
    projects: (profile.projects || []).map((proj: any) => ({
      title: proj.title || '',
      description: proj.description,
      url: proj.url,
      members: proj.members,
      startDate: proj.startDate,
      endDate: proj.endDate,
      currentlyWorking: proj.currentlyWorking,
    })),
    activity: activity.map((a: any) => ({
      type: a.type || 'post',
      content: a.content,
      url: a.url,
      timestamp: a.timestamp || new Date(),
      engagement: a.engagement ? {
        likes: a.engagement.likes || 0,
        comments: a.engagement.comments || 0,
        shares: a.engagement.shares || 0,
      } : undefined,
    })),
  };
}
