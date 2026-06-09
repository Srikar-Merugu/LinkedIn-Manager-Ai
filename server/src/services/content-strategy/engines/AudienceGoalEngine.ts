import pino from 'pino';

const logger = pino();

interface ProfileInput {
  skills?: Array<{ name: string }>;
  experience?: Array<{ title: string; company?: string }>;
  projects?: Array<{ title: string; description?: string }>;
  certifications?: Array<{ name: string }>;
  careerGoal?: { primaryGoal?: string; targetRole?: string };
  brandDNA?: Record<string, any>;
  writingDNA?: Record<string, any>;
  contentPillars?: Array<{ name: string; authorityScore?: number }>;
  audienceData?: { size?: string; engagement?: string; demographics?: string[] };
  analytics?: { topPerformingTopics?: string[]; avgEngagement?: number };
}

interface AudienceGoal {
  category: 'audience';
  goal: string;
  reasoning: string;
  expectedOutcome: string;
  successMetrics: string[];
}

export class AudienceGoalEngine {
  generate(profile: ProfileInput): AudienceGoal[] {
    logger.info('Generating audience goals from profile');
    const goals: AudienceGoal[] = [];
    const expLevel = this.detectExperienceLevel(profile);
    const audienceSize = profile.audienceData?.size || 'small';

    if (audienceSize === 'small' || audienceSize === 'none') {
      goals.push({
        category: 'audience',
        goal: 'Build initial audience from zero through consistent value-driven content',
        reasoning: `As a ${expLevel} professional with limited audience presence, priority is establishing a visible professional brand and attracting first followers through high-quality, niche-specific content.`,
        expectedOutcome: 'Reach 500+ meaningful connections with target industry professionals within 90 days',
        successMetrics: ['New connections per week', 'Profile views increase', 'Content impressions', 'Follower growth rate'],
      });
    }

    if (audienceSize === 'medium') {
      goals.push({
        category: 'audience',
        goal: 'Double audience engagement and expand reach within target industries',
        reasoning: `With an established mid-size audience, focus shifts from pure growth to deepening engagement and expanding into adjacent professional communities.`,
        expectedOutcome: '25% increase in meaningful engagement and 1000+ new targeted followers',
        successMetrics: ['Engagement rate increase', 'Comment quality score', 'Share rate', 'New industry connections'],
      });
    }

    if (audienceSize === 'large') {
      goals.push({
        category: 'audience',
        goal: 'Convert audience into professional opportunities through strategic content',
        reasoning: 'With a large established audience, focus on monetizing attention through strategic positioning that attracts recruiters, clients, and collaborators.',
        expectedOutcome: '10+ qualified inbound opportunities per month from audience',
        successMetrics: ['Inbound opportunities', 'DM conversions', 'Collaboration requests', 'Speaking/event invitations'],
      });
    }

    goals.push({
      category: 'audience',
      goal: `Establish authority as a go-to ${expLevel} in ${this.detectPrimarySkill(profile)}`,
      reasoning: 'Audiences follow professionals who demonstrate consistent expertise. Positioning as a domain authority creates a compounding audience growth effect.',
      expectedOutcome: 'Recognized as a thought leader in target domain within professional circles',
      successMetrics: ['Mentions by other creators', 'Content saves', 'Repost rate', 'Direct messages about expertise'],
    });

    return goals;
  }

  private detectExperienceLevel(profile: ProfileInput): string {
    const skills = profile.skills?.length || 0;
    const years = profile.experience?.length || 0;
    const certs = profile.certifications?.length || 0;
    const score = skills * 2 + years * 3 + certs;
    if (score < 5) return 'early-career professional';
    if (score < 12) return 'mid-career professional';
    return 'senior professional';
  }

  private detectPrimarySkill(profile: ProfileInput): string {
    return profile.skills?.[0]?.name || profile.careerGoal?.targetRole || 'professional';
  }
}

export const audienceGoalEngine = new AudienceGoalEngine();
