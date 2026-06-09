import mongoose from 'mongoose';
import crypto from 'crypto';
import pino from 'pino';
import { ProfileChange, LinkedInUserProfile, ChangeType } from '../../types/linkedin';
import { ProfileSnapshot, IProfileSnapshot } from '../../models/intelligence/ProfileSnapshot';
import { LinkedInProfile, ILinkedInProfile } from '../../models/LinkedInProfile';

const logger = pino();

export class ProfileChangeDetector {
  async createSnapshot(profileId: string, userId: string): Promise<{ snapshot: IProfileSnapshot; changes: ProfileChange[] }> {
    const profile = await LinkedInProfile.findById(profileId);
    if (!profile) throw new Error('Profile not found');

    const latestSnapshot = await ProfileSnapshot.findOne({ profileId })
      .sort({ snapshotVersion: -1 })
      .limit(1);

    const currentData = {
      headline: profile.headline || '',
      about: profile.about || '',
      experience: (profile.experience || []).map(e => ({
        title: e.title,
        company: e.company,
        startDate: e.startDate,
        endDate: e.endDate,
        currentlyWorking: e.currentlyWorking,
        description: e.description || '',
      })),
      education: (profile.education || []).map(e => ({
        school: e.school,
        degree: e.degree,
        fieldOfStudy: e.fieldOfStudy,
      })),
      skills: [] as string[],
      certifications: [] as string[],
      projects: [] as string[],
      profilePicture: profile.profilePicture || '',
    };

    const profileSkills = await mongoose.model('LinkedInSkill').find({ profileId }).lean();
    currentData.skills = (profileSkills as any[]).map(s => s.name);

    const hash = this.computeHash(currentData);

    if (latestSnapshot && latestSnapshot.hash === hash) {
      return { snapshot: latestSnapshot, changes: [] };
    }

    const snapshotVersion = (latestSnapshot?.snapshotVersion || 0) + 1;
    const changes = latestSnapshot
      ? this.detectChanges(latestSnapshot.data as any, currentData)
      : [];

    const snapshot = await ProfileSnapshot.create({
      userId: new mongoose.Types.ObjectId(userId),
      profileId: new mongoose.Types.ObjectId(profileId),
      snapshotVersion,
      data: currentData,
      hash,
      changesSincePrevious: changes.map(c => c.description),
    });

    return { snapshot, changes };
  }

  async getChangeHistory(profileId: string, limit = 10): Promise<ProfileChange[]> {
    const snapshots = await ProfileSnapshot.find({ profileId })
      .sort({ snapshotVersion: -1 })
      .limit(limit)
      .lean();

    const allChanges: ProfileChange[] = [];

    for (let i = 0; i < snapshots.length - 1; i++) {
      const current = snapshots[i] as any;
      const previous = snapshots[i + 1] as any;
      const changes = this.detectChanges(previous.data, current.data);

      allChanges.push(...changes);
    }

    return allChanges.slice(0, limit);
  }

  async getLatestSnapshot(profileId: string): Promise<IProfileSnapshot | null> {
    return ProfileSnapshot.findOne({ profileId }).sort({ snapshotVersion: -1 });
  }

  private detectChanges(
    previous: any,
    current: any
  ): ProfileChange[] {
    const changes: ProfileChange[] = [];
    const now = new Date();

    if (previous.headline !== current.headline) {
      changes.push({
        type: 'headline',
        description: 'Headline updated',
        previousValue: previous.headline,
        newValue: current.headline,
        detectedAt: now,
        severity: previous.headline ? 'positive' : 'info',
        opportunities: this.getHeadlineOpportunities(current.headline, previous.headline),
      });
    }

    if (previous.about !== current.about) {
      changes.push({
        type: 'about',
        description: 'About section updated',
        previousValue: previous.about ? `${previous.about.slice(0, 100)}...` : undefined,
        newValue: current.about ? `${current.about.slice(0, 100)}...` : undefined,
        detectedAt: now,
        severity: 'positive',
        opportunities: ['Review and update content strategy based on new about section'],
      });
    }

    if (previous.profilePicture !== current.profilePicture) {
      changes.push({
        type: 'profile_picture',
        description: 'Profile picture changed',
        detectedAt: now,
        severity: 'info',
        opportunities: [],
      });
    }

    const prevSkills = new Set(previous.skills || []);
    const currSkills = new Set(current.skills || []);
    const newSkills = [...currSkills].filter(s => !prevSkills.has(s));
    for (const skill of newSkills) {
      changes.push({
        type: 'skill_added',
        description: `New skill added: ${skill}`,
        newValue: skill as string | undefined,
        detectedAt: now,
        severity: 'positive',
        opportunities: [
          `Create content around your new ${skill} skill`,
          `Update your profile to highlight ${skill} experience`,
        ],
      });
    }

    const prevCerts = new Set(previous.certifications || []);
    const currCerts = new Set(current.certifications || []);
    const newCerts = [...currCerts].filter(c => !prevCerts.has(c));
    for (const cert of newCerts) {
      changes.push({
        type: 'certification_added',
        description: `New certification: ${cert}`,
        newValue: cert as string | undefined,
        detectedAt: now,
        severity: 'positive',
        opportunities: [
          `Announce your ${cert} certification`,
          `Share what you learned preparing for ${cert}`,
          `Create content related to ${cert}`,
        ],
      });
    }

    const prevExps = new Map((previous.experience || []).map((e: any) => [e.title + '@' + e.company, e]));
    const currExps = new Map((current.experience || []).map((e: any) => [e.title + '@' + e.company, e]));

    for (const [key, exp] of currExps.entries()) {
      const entry = exp as any;
      if (!prevExps.has(key)) {
        changes.push({
          type: 'experience_added',
          description: `New role: ${entry.title} at ${entry.company}`,
          newValue: `${entry.title} @ ${entry.company}`,
          detectedAt: now,
          severity: 'positive',
          opportunities: [
            `Share your new role at ${entry.company}`,
            `Write about your first ${Math.min(3, Math.round((entry.durationInMonths || 3) / 3))} months at ${entry.company}`,
            `Create content around your new responsibilities`,
          ],
        });
      }
    }

    const prevPositions = (previous.experience || []).filter((e: any) => e.currentlyWorking);
    const currPositions = (current.experience || []).filter((e: any) => e.currentlyWorking);

    if (prevPositions.length > 0 && currPositions.length > 0) {
      const prevRole = prevPositions[0]?.title || '';
      const currRole = currPositions[0]?.title || '';
      if (prevRole !== currRole && prevRole && currRole) {
        changes.push({
          type: 'position_change',
          description: `Position change: ${prevRole} → ${currRole}`,
          previousValue: prevRole,
          newValue: currRole,
          detectedAt: now,
          severity: 'positive',
          opportunities: [
            `Share your career progression story`,
            `Write about your transition from ${prevRole} to ${currRole}`,
            `Create content about career growth`,
          ],
        });
      }
    }

    return changes;
  }

  private getHeadlineOpportunities(current: string, previous: string): string[] {
    const opps: string[] = [];
    opps.push('Review if brand messaging has changed');
    opps.push('Update content strategy to align with new positioning');
    return opps;
  }

  private computeHash(data: any): string {
    const str = JSON.stringify(data);
    return crypto.createHash('sha256').update(str).digest('hex');
  }
}

export const profileChangeDetector = new ProfileChangeDetector();
