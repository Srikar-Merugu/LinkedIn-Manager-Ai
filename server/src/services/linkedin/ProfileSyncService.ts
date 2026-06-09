import mongoose from 'mongoose';
import pino from 'pino';
import { LinkedInService } from './LinkedInService';
import { ProfileParser } from './ProfileParser';
import { LinkedInProfile, ILinkedInProfile } from '../../models/LinkedInProfile';
import { LinkedInSkill, ILinkedInSkill } from '../../models/LinkedInSkill';
import { LinkedInActivity, ILinkedInActivity } from '../../models/LinkedInActivity';
import { LinkedInProject, ILinkedInProject } from '../../models/LinkedInProject';
import { LinkedInCertificate, ILinkedInCertificate } from '../../models/LinkedInCertificate';
import { ErrorRecoverySystem, ErrorCategory, ErrorSeverity } from '../ErrorRecoverySystem';

const logger = pino();

export enum SyncPhase {
  INITIAL = 'initial',
  PROFILE = 'profile',
  SKILLS = 'skills',
  ACTIVITY = 'activity',
  PROJECTS = 'projects',
  CERTIFICATES = 'certificates',
  COMPLETE = 'complete',
  FAILED = 'failed',
}

export interface SyncResult {
  success: boolean;
  profileId?: string;
  phases: Record<SyncPhase, { status: 'pending' | 'in_progress' | 'completed' | 'failed'; error?: string }>;
  duration: number;
  profileType?: string;
  careerStage?: string;
  updated: {
    profile: boolean;
    skills: number;
    activities: number;
    projects: number;
    certificates: number;
  };
}

export class ProfileSyncService {
  private linkedinService: LinkedInService;
  private profileParser: ProfileParser;
  private recoverySystem: ErrorRecoverySystem;

  constructor(
    linkedinService: LinkedInService,
    profileParser: ProfileParser,
    recoverySystem: ErrorRecoverySystem
  ) {
    this.linkedinService = linkedinService;
    this.profileParser = profileParser;
    this.recoverySystem = recoverySystem;
  }

  async syncFullProfile(
    userId: string,
    accessToken: string,
    onPhase?: (phase: SyncPhase, status: string) => void
  ): Promise<SyncResult> {
    const startTime = Date.now();
    const result: SyncResult = {
      success: false,
      phases: {
        [SyncPhase.INITIAL]: { status: 'pending' },
        [SyncPhase.PROFILE]: { status: 'pending' },
        [SyncPhase.SKILLS]: { status: 'pending' },
        [SyncPhase.ACTIVITY]: { status: 'pending' },
        [SyncPhase.PROJECTS]: { status: 'pending' },
        [SyncPhase.CERTIFICATES]: { status: 'pending' },
        [SyncPhase.COMPLETE]: { status: 'pending' },
        [SyncPhase.FAILED]: { status: 'pending' },
      },
      duration: 0,
      updated: {
        profile: false,
        skills: 0,
        activities: 0,
        projects: 0,
        certificates: 0,
      },
    };

    const updatePhase = (phase: SyncPhase, status: 'pending' | 'in_progress' | 'completed' | 'failed', error?: string) => {
      result.phases[phase] = { status, error };
      onPhase?.(phase, status);
    };

    try {
      updatePhase(SyncPhase.INITIAL, 'in_progress');

      const linkedinProfile = await this.linkedinService.getProfile(accessToken);
      const existingProfile = await LinkedInProfile.findOne({ linkedinId: linkedinProfile.sub });

      updatePhase(SyncPhase.INITIAL, 'completed');
      updatePhase(SyncPhase.PROFILE, 'in_progress');

      const fullProfile = await this.linkedinService.getFullProfile(accessToken, linkedinProfile.sub);
      const parsed = this.profileParser.parse(fullProfile);

      const profileData = {
        userId: new mongoose.Types.ObjectId(userId),
        linkedinId: linkedinProfile.sub,
        accessToken,
        tokenExpiresAt: new Date(Date.now() + 86400000),
        firstName: fullProfile.firstName,
        lastName: fullProfile.lastName,
        headline: fullProfile.headline,
        about: fullProfile.about,
        profilePicture: fullProfile.profilePicture,
        email: fullProfile.email,
        experience: fullProfile.experience,
        education: fullProfile.education,
        summary: parsed.summary,
        metadata: {
          lastSyncedAt: new Date(),
          lastProfileFetchAt: new Date(),
          syncStatus: 'syncing' as const,
          syncAttempts: (existingProfile?.metadata?.syncAttempts || 0) + 1,
          isComplete: false,
          profileStrength: parsed.summary.careerStabilityScore,
        },
      };

      let profile: ILinkedInProfile;
      if (existingProfile) {
        profile = await LinkedInProfile.findByIdAndUpdate(
          existingProfile._id,
          { $set: profileData },
          { new: true, runValidators: true }
        ).exec() as ILinkedInProfile;
      } else {
        profile = await LinkedInProfile.create(profileData);
      }

      result.profileId = profile._id.toString();
      result.profileType = parsed.summary.profileType;
      result.careerStage = parsed.summary.careerStage;
      result.updated.profile = true;

      updatePhase(SyncPhase.PROFILE, 'completed');

      const [skills, activity] = await Promise.all([
        this.syncSkills(profile._id.toString(), userId, accessToken, linkedinProfile.sub, result, updatePhase),
        this.syncActivity(profile._id.toString(), userId, accessToken, linkedinProfile.sub, result, updatePhase),
      ]);

      try {
        await this.syncCertificates(profile._id.toString(), userId, accessToken, linkedinProfile.sub, result, updatePhase);
      } catch (error) {
        logger.warn({ error }, 'Certificate sync failed (non-critical)');
        updatePhase(SyncPhase.CERTIFICATES, 'failed', error instanceof Error ? error.message : 'Unknown error');
      }

      await LinkedInProfile.findByIdAndUpdate(profile._id, {
        $set: {
          'metadata.syncStatus': 'synced',
          'metadata.isComplete': true,
          'metadata.lastSyncedAt': new Date(),
          'summary.totalSkills': result.updated.skills,
          'summary.totalActivities': result.updated.activities,
          'summary.totalCertifications': result.updated.certificates,
        },
      });

      updatePhase(SyncPhase.COMPLETE, 'completed');

      result.success = true;
      result.duration = Date.now() - startTime;

      logger.info({
        userId,
        duration: result.duration,
        profileType: result.profileType,
        careerStage: result.careerStage,
        skills: skills,
        activities: activity,
      }, 'Profile sync completed');

      return result;
    } catch (error) {
      updatePhase(SyncPhase.FAILED, 'failed', error instanceof Error ? error.message : 'Unknown error');

      if (result.profileId) {
        await LinkedInProfile.findByIdAndUpdate(result.profileId, {
          $set: {
            'metadata.syncStatus': 'failed',
            'metadata.lastError': error instanceof Error ? error.message : 'Unknown error',
            'metadata.lastSyncedAt': new Date(),
          },
        });
      }

      result.duration = Date.now() - startTime;
      logger.error({ error, userId }, 'Profile sync failed');

      return result;
    }
  }

  private async syncSkills(
    profileId: string,
    userId: string,
    accessToken: string,
    linkedinId: string,
    result: SyncResult,
    updatePhase: (phase: SyncPhase, status: 'pending' | 'in_progress' | 'completed' | 'failed', error?: string) => void
  ): Promise<number> {
    updatePhase(SyncPhase.SKILLS, 'in_progress');

    try {
      const skills = await this.linkedinService.getSkills(accessToken, linkedinId);
      let syncedCount = 0;

      for (const skill of skills) {
        await LinkedInSkill.findOneAndUpdate(
          { profileId: new mongoose.Types.ObjectId(profileId), name: skill.name },
          {
            $set: {
              profileId: new mongoose.Types.ObjectId(profileId),
              userId: new mongoose.Types.ObjectId(userId),
              name: skill.name,
              endorsements: skill.endorsements || 0,
              isTopSkill: skill.isTopSkill || false,
              category: skill.category,
              source: 'imported',
              confidence: 1.0,
              isVerified: false,
            },
          },
          { upsert: true, new: true }
        );
        syncedCount++;
      }

      result.updated.skills = syncedCount;
      updatePhase(SyncPhase.SKILLS, 'completed');
      return syncedCount;
    } catch (error) {
      logger.warn({ error }, 'Skills sync failed');
      updatePhase(SyncPhase.SKILLS, 'failed', error instanceof Error ? error.message : 'Unknown error');
      return 0;
    }
  }

  private async syncActivity(
    profileId: string,
    userId: string,
    accessToken: string,
    linkedinId: string,
    result: SyncResult,
    updatePhase: (phase: SyncPhase, status: 'pending' | 'in_progress' | 'completed' | 'failed', error?: string) => void
  ): Promise<number> {
    updatePhase(SyncPhase.ACTIVITY, 'in_progress');

    try {
      const activity = await this.linkedinService.getActivity(accessToken, linkedinId);
      let syncedCount = 0;

      for (const act of activity) {
        const activityId = `${profileId}-${act.timestamp.getTime()}-${act.type}`;

        await LinkedInActivity.findOneAndUpdate(
          { profileId: new mongoose.Types.ObjectId(profileId), activityId },
          {
            $set: {
              profileId: new mongoose.Types.ObjectId(profileId),
              userId: new mongoose.Types.ObjectId(userId),
              activityId,
              type: act.type,
              content: act.content,
              url: act.url,
              timestamp: act.timestamp,
              engagement: {
                likes: act.engagement?.likes || 0,
                comments: act.engagement?.comments || 0,
                shares: act.engagement?.shares || 0,
              },
              isPinned: false,
              metadata: {
                isOriginalContent: true,
                source: 'api',
              },
            },
          },
          { upsert: true, new: true }
        );
        syncedCount++;
      }

      result.updated.activities = syncedCount;
      updatePhase(SyncPhase.ACTIVITY, 'completed');
      return syncedCount;
    } catch (error) {
      logger.warn({ error }, 'Activity sync failed');
      updatePhase(SyncPhase.ACTIVITY, 'failed', error instanceof Error ? error.message : 'Unknown error');
      return 0;
    }
  }

  private async syncCertificates(
    profileId: string,
    userId: string,
    accessToken: string,
    linkedinId: string,
    result: SyncResult,
    updatePhase: (phase: SyncPhase, status: 'pending' | 'in_progress' | 'completed' | 'failed', error?: string) => void
  ): Promise<number> {
    updatePhase(SyncPhase.CERTIFICATES, 'in_progress');

    try {
      const certificates: any[] = [];
      let syncedCount = 0;

      for (const cert of certificates) {
        await LinkedInCertificate.findOneAndUpdate(
          {
            profileId: new mongoose.Types.ObjectId(profileId),
            name: cert.name,
            issuingOrganization: cert.issuingOrganization,
          },
          {
            $set: {
              profileId: new mongoose.Types.ObjectId(profileId),
              userId: new mongoose.Types.ObjectId(userId),
              name: cert.name,
              issuingOrganization: cert.issuingOrganization,
              url: cert.url,
              doesNotExpire: cert.doesNotExpire || false,
              skills: cert.skills || [],
              metadata: {
                source: 'imported',
              },
            },
          },
          { upsert: true, new: true }
        );
        syncedCount++;
      }

      result.updated.certificates = syncedCount;
      updatePhase(SyncPhase.CERTIFICATES, 'completed');
      return syncedCount;
    } catch (error) {
      logger.warn({ error }, 'Certificate sync failed');
      updatePhase(SyncPhase.CERTIFICATES, 'failed', error instanceof Error ? error.message : 'Unknown error');
      return 0;
    }
  }
}
