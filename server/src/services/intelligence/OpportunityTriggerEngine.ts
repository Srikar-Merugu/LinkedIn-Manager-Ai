import mongoose from 'mongoose';
import pino from 'pino';
import { ProfileChange } from '../../types/linkedin';
import { OpportunityEvent } from '../../models/intelligence/OpportunityEvent';

const logger = pino();

export class OpportunityTriggerEngine {
  async processChange(change: ProfileChange, userId: string, profileId: string): Promise<void> {
    const opportunities = this.generateOpportunitiesFromChange(change, userId, profileId);

    for (const opp of opportunities) {
      await OpportunityEvent.create(opp);
    }

    if (opportunities.length > 0) {
      logger.info({
        userId,
        profileId,
        changeType: change.type,
        opportunitiesGenerated: opportunities.length,
      }, 'Opportunities generated from profile change');
    }
  }

  async processBulkChanges(changes: ProfileChange[], userId: string, profileId: string): Promise<number> {
    let total = 0;
    for (const change of changes) {
      const opps = this.generateOpportunitiesFromChange(change, userId, profileId);
      if (opps.length > 0) {
        await OpportunityEvent.insertMany(opps);
        total += opps.length;
      }
    }
    return total;
  }

  generateContentOpportunitiesFromSync(
    userId: string,
    profileId: string,
    metadata: {
      headline?: string;
      about?: string;
      skills: string[];
      certifications: string[];
      experience: any[];
    }
  ): Array<{
    userId: mongoose.Types.ObjectId;
    profileId: mongoose.Types.ObjectId;
    type: 'content' | 'career' | 'networking' | 'skill' | 'credential';
    category: string;
    title: string;
    description: string;
    trigger?: string;
    score: number;
    impact: 'high' | 'medium' | 'low';
    effort: 'low' | 'medium' | 'high';
    status: string;
    metadata: Record<string, unknown>;
  }> {
    const opportunities: any[] = [];

    for (const skill of metadata.skills.slice(0, 5)) {
      opportunities.push({
        userId: new mongoose.Types.ObjectId(userId),
        profileId: new mongoose.Types.ObjectId(profileId),
        type: 'content' as const,
        category: 'teach',
        title: `Create a tutorial about ${skill}`,
        description: `You have ${skill} listed as a skill. Create educational content demonstrating your expertise.`,
        trigger: `skill_sync:${skill}`,
        score: 75,
        impact: 'high' as const,
        effort: 'medium' as const,
        status: 'pending',
        metadata: { skill, source: 'profile_sync' },
      });
    }

    for (const cert of metadata.certifications.slice(0, 3)) {
      opportunities.push({
        userId: new mongoose.Types.ObjectId(userId),
        profileId: new mongoose.Types.ObjectId(profileId),
        type: 'credential' as const,
        category: 'certification',
        title: `Share your ${cert} journey`,
        description: `You have a ${cert} certification. Share what you learned and how it helped your career.`,
        trigger: `cert_sync:${cert}`,
        score: 80,
        impact: 'high' as const,
        effort: 'low' as const,
        status: 'pending',
        metadata: { certification: cert, source: 'profile_sync' },
      });
    }

    return opportunities;
  }

  private generateOpportunitiesFromChange(
    change: ProfileChange,
    userId: string,
    profileId: string
  ): Array<{
    userId: mongoose.Types.ObjectId;
    profileId: mongoose.Types.ObjectId;
    type: 'content' | 'career' | 'networking' | 'skill' | 'credential';
    category: string;
    title: string;
    description: string;
    trigger?: string;
    triggerType: string;
    score: number;
    impact: 'high' | 'medium' | 'low';
    effort: 'low' | 'medium' | 'high';
    status: string;
    metadata: Record<string, unknown>;
  }> {
    const opportunities: any[] = [];
    const base = {
      userId: new mongoose.Types.ObjectId(userId),
      profileId: new mongoose.Types.ObjectId(profileId),
      triggerType: change.type,
      metadata: { source: 'profile_change' },
    };

    switch (change.type) {
      case 'certification_added':
        opportunities.push({
          ...base,
          type: 'credential' as const,
          category: 'certification',
          title: `Announce your new ${change.newValue} certification`,
          description: `Share your achievement and what you learned from earning this certification.`,
          trigger: change.newValue,
          score: 85,
          impact: 'high' as const,
          effort: 'low' as const,
          status: 'pending',
        });
        opportunities.push({
          ...base,
          type: 'content' as const,
          category: 'share_experience',
          title: `Write about your ${change.newValue} learning journey`,
          description: `Create content about the preparation process and key takeaways.`,
          trigger: change.newValue,
          score: 75,
          impact: 'medium' as const,
          effort: 'medium' as const,
          status: 'pending',
        });
        break;

      case 'skill_added':
        opportunities.push({
          ...base,
          type: 'skill' as const,
          category: 'skill_development',
          title: `Validate your new ${change.newValue} skill`,
          description: `Create a project or write an article demonstrating your ${change.newValue} skills.`,
          trigger: change.newValue,
          score: 70,
          impact: 'medium' as const,
          effort: 'medium' as const,
          status: 'pending',
        });
        break;

      case 'experience_added':
        opportunities.push({
          ...base,
          type: 'career' as const,
          category: 'career_update',
          title: `Share your new position announcement`,
          description: `Post about your new role, what you'll be working on, and why you're excited.`,
          trigger: change.newValue,
          score: 90,
          impact: 'high' as const,
          effort: 'low' as const,
          status: 'pending',
        });
        opportunities.push({
          ...base,
          type: 'content' as const,
          category: 'share_experience',
          title: `First ${Math.min(3, Math.round((parseInt(change.newValue?.split('@')[0]?.trim() || '3') || 3) / 3))} months at new role`,
          description: `Document your learnings and experiences in the first few months.`,
          trigger: change.newValue,
          score: 80,
          impact: 'high' as const,
          effort: 'medium' as const,
          status: 'pending',
        });
        break;

      case 'position_change':
        opportunities.push({
          ...base,
          type: 'career' as const,
          category: 'career_progression',
          title: `Write about your career transition from ${change.previousValue} to ${change.newValue}`,
          description: `Share your career growth story and advice for others.`,
          trigger: `${change.previousValue} -> ${change.newValue}`,
          score: 88,
          impact: 'high' as const,
          effort: 'medium' as const,
          status: 'pending',
        });
        break;

      case 'headline':
        opportunities.push({
          ...base,
          type: 'content' as const,
          category: 'brand_update',
          title: `Update your content strategy to align with new headline`,
          description: `Your headline changed, indicating a shift in positioning. Review your content strategy.`,
          trigger: change.newValue,
          score: 65,
          impact: 'medium' as const,
          effort: 'high' as const,
          status: 'pending',
        });
        break;
    }

    return opportunities;
  }
}

export const opportunityTriggerEngine = new OpportunityTriggerEngine();
