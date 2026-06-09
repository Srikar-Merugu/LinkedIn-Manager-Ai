import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import pino from 'pino';
import { LinkedInService } from '../services/linkedin/LinkedInService';
import { ProfileParser } from '../services/linkedin/ProfileParser';
import { ScoringEngine } from '../services/analysis/ScoringEngine';
import { ProfileAnalysisEngine } from '../services/analysis/ProfileAnalysisEngine';
import { RecommendationEngine } from '../services/analysis/RecommendationEngine';
import { CachingLayer } from '../services/CachingLayer';
import { LinkedInProfile } from '../models/LinkedInProfile';
import { LinkedInSkill } from '../models/LinkedInSkill';
import { LinkedInActivity } from '../models/LinkedInActivity';
import { IntelligenceReport } from '../types/linkedin';

const logger = pino();

export function createAnalysisRouter(
  linkedinService: LinkedInService,
  profileParser: ProfileParser,
  scoringEngine: ScoringEngine,
  analysisEngine: ProfileAnalysisEngine,
  recommendationEngine: RecommendationEngine,
  cachingLayer: CachingLayer
): Router {
  const router = Router();

  router.get('/report/:profileId', async (req: Request, res: Response) => {
    try {
      const { profileId } = req.params;
      const cacheKey = `report:${profileId}`;

      const cached = await cachingLayer.get<IntelligenceReport>(cacheKey);
      if (cached) return res.json(cached);

      const profile = await LinkedInProfile.findById(profileId).select('-accessToken -refreshToken');
      if (!profile) {
        return res.status(404).json({ error: 'Profile not found' });
      }

      const skills = await LinkedInSkill.find({ profileId });
      const activity = await LinkedInActivity.find({ profileId }).sort({ timestamp: -1 }).limit(50);

      const linkedinProfile = {
        id: profile.linkedinId,
        firstName: profile.firstName,
        lastName: profile.lastName,
        headline: profile.headline || '',
        vanityName: profile.vanityName,
        profilePicture: profile.profilePicture,
        about: profile.about || '',
        experience: profile.experience.map(e => ({
          title: e.title,
          company: e.company,
          companyLogo: e.companyLogo,
          companyUrl: e.companyUrl,
          location: e.location,
          description: e.description,
          startDate: e.startDate,
          endDate: e.endDate,
          currentlyWorking: e.currentlyWorking,
          employmentType: e.employmentType,
          industry: e.industry,
          durationInMonths: e.durationInMonths,
        })),
        education: profile.education.map(e => ({
          school: e.school,
          schoolLogo: e.schoolLogo,
          degree: e.degree,
          fieldOfStudy: e.fieldOfStudy,
          grade: e.grade,
          description: e.description,
          startDate: e.startDate,
          endDate: e.endDate,
          activities: e.activities,
        })),
        skills: skills.map(s => ({
          name: s.name,
          endorsements: s.endorsements,
          isTopSkill: s.isTopSkill,
          category: s.category,
        })),
        certifications: [],
        projects: [],
        activity: activity.map(a => ({
          type: a.type as 'post' | 'repost' | 'comment' | 'reaction' | 'article',
          content: a.content,
          url: a.url,
          timestamp: a.timestamp,
          engagement: {
            likes: a.engagement.likes,
            comments: a.engagement.comments,
            shares: a.engagement.shares,
          },
        })),
      };

      const parsed = profileParser.parse(linkedinProfile);

      const report = analysisEngine.generateIntelligenceReport(
        profile.userId.toString(),
        profileId,
        parsed,
        linkedinProfile
      );

      await cachingLayer.set(cacheKey, report, 600);

      if (profile.scores) {
        profile.scores = {
          profile: mongoose.Types.Decimal128.fromString(String(report.scores.profile.overall)),
          branding: mongoose.Types.Decimal128.fromString(String(report.scores.branding.overall)),
          visibility: mongoose.Types.Decimal128.fromString(String(report.scores.visibility.overall)),
          opportunity: mongoose.Types.Decimal128.fromString(String(report.scores.opportunity.overall)),
          contentReadiness: mongoose.Types.Decimal128.fromString(String(report.scores.contentReadiness.overall)),
        };
      }

      profile.intelligenceReport = {
        generatedAt: report.generatedAt,
        reportVersion: '1.0.0',
      };

      await profile.save();

      res.json(report);
    } catch (error) {
      logger.error({ error }, 'Failed to generate intelligence report');
      res.status(500).json({ error: 'Failed to generate intelligence report' });
    }
  });

  router.get('/report/:profileId/scores', async (req: Request, res: Response) => {
    try {
      const { profileId } = req.params;

      const profile = await LinkedInProfile.findById(profileId).select('scores');

      if (!profile) {
        return res.status(404).json({ error: 'Profile not found' });
      }

      res.json(profile.scores || {});
    } catch (error) {
      logger.error({ error }, 'Failed to get scores');
      res.status(500).json({ error: 'Failed to get scores' });
    }
  });

  router.get('/report/:profileId/recommendations', async (req: Request, res: Response) => {
    try {
      const { profileId } = req.params;
      const cacheKey = `recommendations:${profileId}`;

      const cached = await cachingLayer.get(cacheKey);
      if (cached) return res.json(cached);

      const report = await cachingLayer.get<IntelligenceReport>(`report:${profileId}`);
      if (!report) {
        return res.status(404).json({ error: 'Generate intelligence report first' });
      }

      const prioritized = recommendationEngine.prioritize(report, null as any);

      await cachingLayer.set(cacheKey, prioritized, 600);
      res.json(prioritized);
    } catch (error) {
      logger.error({ error }, 'Failed to get recommendations');
      res.status(500).json({ error: 'Failed to get recommendations' });
    }
  });

  router.get('/report/:profileId/action-plan', async (req: Request, res: Response) => {
    try {
      const { profileId } = req.params;

      const report = await cachingLayer.get<IntelligenceReport>(`report:${profileId}`);
      if (!report) {
        return res.status(404).json({ error: 'Generate intelligence report first' });
      }

      const actionPlan = recommendationEngine.generateActionPlan(report, null as any);
      res.json(actionPlan);
    } catch (error) {
      logger.error({ error }, 'Failed to generate action plan');
      res.status(500).json({ error: 'Failed to generate action plan' });
    }
  });

  return router;
}
