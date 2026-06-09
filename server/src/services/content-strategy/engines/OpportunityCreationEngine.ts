import pino from 'pino';

const logger = pino();

interface ProfileInput {
  skills?: Array<{ name: string }>;
  experience?: Array<{ title: string; company?: string }>;
  careerGoal?: { targetRole?: string; primaryGoal?: string };
  contentPillars?: Array<{ name: string; authorityScore?: number }>;
}

interface OpportunityContent {
  type: string;
  targetAudience: string[];
  topicAreas: string[];
  contentType: string;
  distribution: string[];
  expectedOutcome: string;
}

interface OpportunityForecast {
  opportunityType: string;
  probability: number;
  timeframe: string;
  contentLever: string;
  expectedSignals: string[];
}

interface HighImpactContent {
  title: string;
  rationale: string;
  targetOutcome: string;
  priority: 'high' | 'medium' | 'low';
}

interface TriggerContent {
  trigger: string;
  contentTemplate: string;
  targetAudience: string;
  expectedResponse: string;
}

interface OpportunityOutput {
  contentToAttract: {
    recruiters: OpportunityContent[];
    hiringManagers: OpportunityContent[];
    founders: OpportunityContent[];
    clients: OpportunityContent[];
    investors: OpportunityContent[];
    developers: OpportunityContent[];
  };
  opportunityForecast: OpportunityForecast[];
  highImpactContent: HighImpactContent[];
  triggerContent: TriggerContent[];
}

export class OpportunityCreationEngine {
  analyze(profile: ProfileInput): OpportunityOutput {
    logger.info('Analyzing opportunity creation strategy');
    const skillNames = (profile.skills || []).map(s => s.name);
    const targetRole = profile.careerGoal?.targetRole || '';

    const contentToAttract = {
      recruiters: [
        {
          type: 'Skill Showcase',
          targetAudience: ['Technical Recruiters', 'HR Managers'],
          topicAreas: skillNames.slice(0, 5),
          contentType: 'Project deep-dives, certification achievements, skill demonstrations',
          distribution: ['LinkedIn Posts', 'LinkedIn Articles'],
          expectedOutcome: 'Recruiters reach out with relevant role opportunities',
        },
        {
          type: 'Career Narrative',
          targetAudience: ['Recruiters', 'Talent Acquisition'],
          topicAreas: [targetRole, 'career growth', 'professional development'],
          contentType: 'Career journey posts, lessons learned, growth stories',
          distribution: ['LinkedIn Posts'],
          expectedOutcome: 'Strong professional narrative attracts recruiter attention',
        },
      ],
      hiringManagers: [
        {
          type: 'Problem-Solution Content',
          targetAudience: ['Engineering Managers', 'Tech Leads', 'Department Heads'],
          topicAreas: [...skillNames.slice(0, 3), 'technical leadership', 'project outcomes'],
          contentType: 'Case studies, technical deep-dives, architecture decisions',
          distribution: ['LinkedIn Posts', 'Technical Blog Posts'],
          expectedOutcome: 'Hiring managers recognize problem-solving capability',
        },
      ],
      founders: [
        {
          type: 'Builder Content',
          targetAudience: ['Startup Founders', 'CTOs', 'Product Leaders'],
          topicAreas: ['building from scratch', 'technical decisions', 'scaling challenges'],
          contentType: 'Project building stories, technical trade-off analyses',
          distribution: ['LinkedIn Posts', 'Twitter'],
          expectedOutcome: 'Founders see you as a builder who can contribute early-stage',
        },
      ],
      clients: [
        {
          type: 'Expertise Demonstration',
          targetAudience: ['Potential Clients', 'Consulting Prospects'],
          topicAreas: skillNames.slice(0, 4),
          contentType: 'Framework posts, educational content, results showcases',
          distribution: ['LinkedIn Posts', 'Portfolio', 'Case Studies'],
          expectedOutcome: 'Inbound client inquiries for consulting or freelance work',
        },
      ],
      investors: [
        {
          type: 'Market Insight',
          targetAudience: ['Angel Investors', 'Venture Capitalists'],
          topicAreas: ['industry trends', 'market analysis', 'technical innovation'],
          contentType: 'Trend analysis, thought leadership, market observations',
          distribution: ['LinkedIn Articles', 'Twitter Threads'],
          expectedOutcome: 'Investor recognition as domain expert for deal flow or advisory',
        },
      ],
      developers: [
        {
          type: 'Educational Content',
          targetAudience: ['Peer Developers', 'Junior Engineers', 'Tech Enthusiasts'],
          topicAreas: skillNames.slice(0, 5),
          contentType: 'Tutorials, code snippets, architecture explanations, best practices',
          distribution: ['LinkedIn Posts', 'GitHub', 'Technical Blog'],
          expectedOutcome: 'Build peer authority and attract collaboration opportunities',
        },
      ],
    };

    const opportunityForecast: OpportunityForecast[] = [
      {
        opportunityType: 'Job opportunities via LinkedIn',
        probability: 75,
        timeframe: '1-3 months',
        contentLever: 'Consistent skill showcase and career narrative content',
        expectedSignals: ['Recruiter DMs increasing', 'InMail about roles', 'Interview requests'],
      },
      {
        opportunityType: 'Speaking/event invitations',
        probability: 40,
        timeframe: '2-6 months',
        contentLever: 'Thought leadership and unique framework content',
        expectedSignals: ['Event organizer DMs', 'Podcast invitations', 'Panel requests'],
      },
      {
        opportunityType: 'Consulting/freelance clients',
        probability: 35,
        timeframe: '2-4 months',
        contentLever: 'Expertise demonstration and problem-solving content',
        expectedSignals: ['Direct messages about services', 'Consulting inquiries', 'Project proposals'],
      },
      {
        opportunityType: 'Collaboration/partnership opportunities',
        probability: 50,
        timeframe: '1-3 months',
        contentLever: 'Community engagement and peer content interaction',
        expectedSignals: ['Collaboration proposals', 'Co-author requests', 'Joint project invitations'],
      },
    ];

    const highImpactContent: HighImpactContent[] = [
      {
        title: `The ${targetRole || 'Professional'} Framework I Built From Scratch`,
        rationale: 'Original frameworks demonstrate unique thinking and become signature content that defines your professional brand.',
        targetOutcome: 'Establish unique professional identity and attract speaking/collaboration opportunities',
        priority: 'high',
      },
      {
        title: `How I Solved [Real Problem] Using ${skillNames[0] || 'My Skills'}`,
        rationale: 'Specific problem-solving stories are the highest-converting content for opportunity generation.',
        targetOutcome: 'Demonstrate practical capability to recruiters and hiring managers',
        priority: 'high',
      },
      {
        title: `My Honest Take on ${skillNames[1] || 'Industry'} Trends in 2026`,
        rationale: 'Contrarian and opinion-based content drives engagement and positions you as a thought leader.',
        targetOutcome: 'Increase engagement rate and profile visibility',
        priority: 'medium',
      },
    ];

    const triggerContent: TriggerContent[] = [
      {
        trigger: 'New project or achievement',
        contentTemplate: `I just finished building [project]. Here's how I approached [challenge] and what I learned about [skill]. [Key insight]`,
        targetAudience: 'Recruiters and hiring managers',
        expectedResponse: 'Interest in your capabilities and project experience',
      },
      {
        trigger: 'Industry news or trend',
        contentTemplate: `Everyone is talking about [trend]. Here's my perspective as someone who has [relevant experience]. [Unique take]`,
        targetAudience: 'Peers and thought leaders',
        expectedResponse: 'Engagement and discussion from industry peers',
      },
      {
        trigger: 'Learning or certification',
        contentTemplate: `Just earned [certification]. Here's why I decided to pursue it and what it taught me about [skill area]. [Key lesson]`,
        targetAudience: 'Recruiters and peers',
        expectedResponse: 'Recognition of growth mindset and expertise depth',
      },
    ];

    return { contentToAttract, opportunityForecast, highImpactContent, triggerContent };
  }
}

export const opportunityCreationEngine = new OpportunityCreationEngine();
