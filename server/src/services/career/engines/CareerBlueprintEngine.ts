import pino from 'pino';
import type { ICareerBlueprint } from '../../../models/career/CareerBlueprint';

const logger = pino();

interface BlueprintInput {
  currentPosition: string;
  targetPosition: string;
  careerStage: string;
  skills?: Array<{ name: string }>;
  topGaps?: string[];
  recommendedContent?: string[];
  authorityTopics?: string[];
  networkingTargets?: string[];
  confidence: number;
}

export class CareerBlueprintEngine {

  generate(input: BlueprintInput): Pick<ICareerBlueprint, 'sections' | 'milestones' | 'progress'> {
    const sections = this.buildSections(input);
    const milestones = this.buildMilestones(input);
    const totalTasks = Object.values(sections).reduce((sum, s) => sum + (s.tasks?.length || 0), 0);

    logger.info({ currentPosition: input.currentPosition, targetPosition: input.targetPosition, totalTasks }, 'Career blueprint generated');

    return {
      sections: sections as ICareerBlueprint['sections'],
      milestones,
      progress: {
        overall: 0,
        skillsCompleted: 0,
        contentCompleted: 0,
        networkingCompleted: 0,
        authorityCompleted: 0,
      },
    };
  }

  private buildSections(input: BlueprintInput) {
    return {
      skillDevelopment: {
        title: 'Skill Development Plan',
        description: `Bridge the gap between ${input.currentPosition} and ${input.targetPosition}`,
        tasks: [
          {
            name: 'Identify top 3 skill gaps',
            description: `Research the most in-demand skills for ${input.targetPosition} roles`,
            priority: 'critical' as const,
            effort: 'low' as const,
            timeframe: 'week1-2' as const,
            completed: false,
          },
          {
            name: 'Create learning roadmap',
            description: 'Structure your learning with courses, projects, and practice',
            priority: 'high' as const,
            effort: 'low' as const,
            timeframe: 'week1-2' as const,
            completed: false,
          },
          {
            name: 'Complete first certification or course',
            description: 'Validate your learning with recognized credentials',
            priority: 'high' as const,
            effort: 'medium' as const,
            timeframe: 'week3-4' as const,
            completed: false,
          },
          {
            name: 'Build portfolio project',
            description: `Apply new skills in a practical project relevant to ${input.targetPosition}`,
            priority: 'high' as const,
            effort: 'high' as const,
            timeframe: 'week5-8' as const,
            completed: false,
          },
          {
            name: 'Practice with real-world problems',
            description: 'Solve industry-relevant challenges to solidify learning',
            priority: 'medium' as const,
            effort: 'medium' as const,
            timeframe: 'week9-12' as const,
            completed: false,
          },
        ],
        metrics: { coursesCompleted: 0, projectsBuilt: 0, certificationsEarned: 0, skillsMastered: 0 },
      },
      contentPlan: {
        title: 'Content Plan',
        description: `Publish content that positions you as a ${input.targetPosition} candidate`,
        tasks: [
          {
            name: 'Define content pillars',
            description: `Identify 3-5 topics that align with ${input.targetPosition} roles`,
            priority: 'critical' as const,
            effort: 'low' as const,
            timeframe: 'week1-2' as const,
            completed: false,
          },
          {
            name: 'Publish weekly',
            description: 'Commit to 3-4 posts per week on your chosen topics',
            priority: 'high' as const,
            effort: 'medium' as const,
            timeframe: 'week3-6' as const,
            completed: false,
          },
          {
            name: 'Create 1 deep-dive case study',
            description: 'Showcase your expertise with a detailed project or framework breakdown',
            priority: 'high' as const,
            effort: 'high' as const,
            timeframe: 'week5-8' as const,
            completed: false,
          },
          {
            name: 'Optimize for recruiter discovery',
            description: 'Ensure your content ranks for keywords relevant to your target role',
            priority: 'medium' as const,
            effort: 'low' as const,
            timeframe: 'week7-10' as const,
            completed: false,
          },
          {
            name: 'Analyze and iterate',
            description: 'Review content performance and double down on what works',
            priority: 'medium' as const,
            effort: 'low' as const,
            timeframe: 'week9-12' as const,
            completed: false,
          },
        ],
        metrics: { postsPublished: 0, totalEngagement: 0, newFollowers: 0, inboundInquiries: 0 },
      },
      networkingPlan: {
        title: 'Networking Plan',
        description: 'Build strategic relationships that accelerate career growth',
        tasks: [
          {
            name: 'Identify target connections',
            description: `List 20 people to connect with in ${input.targetPosition} roles`,
            priority: 'critical' as const,
            effort: 'low' as const,
            timeframe: 'week1-2' as const,
            completed: false,
          },
          {
            name: 'Send personalized outreach',
            description: 'Connect with 10 target connections per week with personalized notes',
            priority: 'high' as const,
            effort: 'medium' as const,
            timeframe: 'week3-6' as const,
            completed: false,
          },
          {
            name: 'Join relevant communities',
            description: 'Become active in 3 professional communities in your target space',
            priority: 'high' as const,
            effort: 'medium' as const,
            timeframe: 'week3-6' as const,
            completed: false,
          },
          {
            name: 'Attend 1 industry event',
            description: 'Participate in conference, meetup, or webinar in your domain',
            priority: 'medium' as const,
            effort: 'medium' as const,
            timeframe: 'week5-10' as const,
            completed: false,
          },
          {
            name: 'Seek mentorship',
            description: 'Ask 2-3 senior professionals for mentorship or informational interviews',
            priority: 'high' as const,
            effort: 'medium' as const,
            timeframe: 'week7-12' as const,
            completed: false,
          },
        ],
        metrics: { newConnections: 0, meaningfulConversations: 0, mentorsFound: 0, referralsReceived: 0 },
      },
      authorityBuilding: {
        title: 'Authority Building Plan',
        description: `Establish yourself as a credible voice in ${input.targetPosition}`,
        tasks: [
          {
            name: 'Define your niche',
            description: `Identify the specific topics you will own as a ${input.targetPosition}`,
            priority: 'critical' as const,
            effort: 'low' as const,
            timeframe: 'week1-2' as const,
            completed: false,
          },
          {
            name: 'Publish thought leadership',
            description: 'Create original frameworks, insights, and perspectives on your topics',
            priority: 'high' as const,
            effort: 'high' as const,
            timeframe: 'week3-8' as const,
            completed: false,
          },
          {
            name: 'Engage with industry leaders',
            description: 'Comment on, share, and add value to posts from established voices',
            priority: 'high' as const,
            effort: 'medium' as const,
            timeframe: 'week3-8' as const,
            completed: false,
          },
          {
            name: 'Create signature content',
            description: 'Develop a framework, methodology, or unique angle that becomes your signature',
            priority: 'medium' as const,
            effort: 'high' as const,
            timeframe: 'week5-10' as const,
            completed: false,
          },
          {
            name: 'Measure authority growth',
            description: 'Track mentions, shares, and inbound opportunities as authority metrics',
            priority: 'low' as const,
            effort: 'low' as const,
            timeframe: 'week9-12' as const,
            completed: false,
          },
        ],
        metrics: { postsPublished: 0, engagementRate: 0, mentionsByOthers: 0, collaborationRequests: 0 },
      },
    };
  }

  private buildMilestones(input: BlueprintInput) {
    return [
      {
        week: 2,
        title: 'Foundation Laid',
        description: 'Skill gaps identified, content pillars defined, target connections listed, niche established',
        deliverables: ['Skill gap analysis complete', 'Content calendar created', 'Connection target list of 20', 'Niche statement defined'],
        status: 'pending' as const,
      },
      {
        week: 4,
        title: 'Momentum Building',
        description: 'First course underway, content publishing started, outreach in progress',
        deliverables: ['First course or certification started', '4+ posts published', '20+ new connections', 'Joined 3 communities'],
        status: 'pending' as const,
      },
      {
        week: 6,
        title: 'Visibility Growing',
        description: 'Consistent publishing established, meaningful conversations happening',
        deliverables: ['10+ posts published', '50+ new connections', 'Active in communities', 'First case study drafted'],
        status: 'pending' as const,
      },
      {
        week: 8,
        title: 'Tangible Progress',
        description: 'Portfolio project underway, signature content in development, mentor engaged',
        deliverables: ['Portfolio project started', 'Deep-dive case study published', 'Mentorship conversation held', 'Analytics review complete'],
        status: 'pending' as const,
      },
      {
        week: 10,
        title: 'Authority Emerging',
        description: 'Recognition growing, first inbound opportunities appearing',
        deliverables: ['Industry event attended', 'Signature content published', 'First inbound inquiry', 'Content strategy optimized'],
        status: 'pending' as const,
      },
      {
        week: 12,
        title: '90-Day Milestone',
        description: 'Career growth trajectory established, next 90-day plan ready',
        deliverables: ['Portfolio project complete', '15+ posts published', '100+ meaningful connections', 'Next 90-day plan drafted'],
        status: 'pending' as const,
      },
    ];
  }
}

export const careerBlueprintEngine = new CareerBlueprintEngine();
