import pino from 'pino';

const logger = pino();

interface ProjectData {
  title: string;
  description: string;
  technologies?: string[];
  url?: string;
  role?: string;
  duration?: string;
  impact?: string;
}

interface ProjectOpportunity {
  projectName: string;
  opportunities: Array<{
    angle: string;
    title: string;
    hook: string;
    outline: string[];
    estimatedEngagement: number;
    targetAudience: string[];
  }>;
}

export class ProjectOpportunityEngine {
  analyze(project: ProjectData): ProjectOpportunity {
    logger.info({ project: project.title }, 'Analyzing project opportunities');
    const tech = (project.technologies || ['technology']).slice(0, 3);

    return {
      projectName: project.title,
      opportunities: [
        {
          angle: 'breakdown',
          title: `${project.title}: Complete project breakdown`,
          hook: `I built ${project.title}. Here's exactly how it works under the hood.`,
          outline: ['Problem statement', 'Architecture overview', 'Key components', `Built with ${tech.join(', ')}`, 'Results and impact'],
          estimatedEngagement: 75,
          targetAudience: ['Developers', 'Tech Leads', 'Hiring Managers'],
        },
        {
          angle: 'lessons',
          title: `${Math.floor(Math.random() * 5) + 3} lessons from building ${project.title}`,
          hook: `Building ${project.title} taught me ${Math.floor(Math.random() * 5) + 3} things I'll carry into every future project.`,
          outline: ['Lesson 1: What went wrong', 'Lesson 2: What went right', 'Lesson 3: What I would change', 'Lesson 4: Key takeaway'],
          estimatedEngagement: 82,
          targetAudience: ['Developers', 'Product Managers', 'Founders'],
        },
        {
          angle: 'mistakes',
          title: `The mistakes I made building ${project.title}`,
          hook: `I made ${Math.floor(Math.random() * 4) + 2} critical mistakes building ${project.title}. Here's what I learned.`,
          outline: ['Mistake 1: Planning oversight', 'Mistake 2: Technical debt', 'Mistake 3: Scope creep', 'How I fixed each one'],
          estimatedEngagement: 85,
          targetAudience: ['Developers', 'Tech Leads', 'Students'],
        },
        {
          angle: 'technical_deep_dive',
          title: `${project.title}: Technical deep dive into ${tech[0] || 'the stack'}`,
          hook: `A deep dive into the ${tech[0] || 'technical'} decisions behind ${project.title}.`,
          outline: ['Architecture decisions', `${tech[0] || 'Core'} implementation`, 'Performance considerations', 'Trade-offs and alternatives'],
          estimatedEngagement: 68,
          targetAudience: ['Senior Developers', 'Architects', 'Tech Leads'],
        },
        {
          angle: 'build_in_public',
          title: `Building ${project.title} in public: The full story`,
          hook: `I built ${project.title} completely in public. Here's what happened when I shared every step.`,
          outline: ['Why I built in public', 'The reaction', 'Community contributions', 'Final outcome', 'Would I do it again?'],
          estimatedEngagement: 78,
          targetAudience: ['Founders', 'Developers', 'Content Creators'],
        },
        {
          angle: 'founder_insights',
          title: `What building ${project.title} taught me about product development`,
          hook: `Building ${project.title} from scratch showed me what product development actually looks like.`,
          outline: ['Finding the problem', 'Building the solution', 'User feedback', 'Iteration cycle', 'Key insights for founders'],
          estimatedEngagement: 72,
          targetAudience: ['Founders', 'Product Managers', ' Entrepreneurs'],
        },
      ],
    };
  }
}

export const projectOpportunityEngine = new ProjectOpportunityEngine();
