import pino from 'pino';

const logger = pino();

interface SignalInput {
  source: string;
  type: string;
  title: string;
  description: string;
  metadata: Record<string, any>;
  category?: string;
}

interface AngleInput {
  type: string;
  title: string;
  hook: string;
  outline: string[];
  estimatedEngagement: number;
}

interface ExtractedOpportunity {
  signalType: string;
  title: string;
  description: string;
  keyInsight: string;
  relevantPillars: string[];
  angles: AngleInput[];
  tags: string[];
}

export class OpportunityExtractionEngine {
  extract(signal: SignalInput): ExtractedOpportunity[] {
    logger.info({ type: signal.type }, 'Extracting opportunities from signal');
    const opportunities: ExtractedOpportunity[] = [];

    if (signal.type === 'certification' || signal.type === 'certification_earned') {
      const certName = signal.metadata?.certification?.name || signal.title.replace('Certification:', '').trim();
      opportunities.push({
        signalType: 'certification',
        title: `Just earned: ${certName}`,
        description: `Share your certification journey and what it means for your expertise in ${certName}`,
        keyInsight: `Earning ${certName} demonstrates commitment to professional growth and validates expertise`,
        relevantPillars: ['Career Growth', 'Professional Development'],
        angles: [
          { type: 'story', title: `My journey to earning ${certName}`, hook: `I spent ${Math.floor(Math.random() * 3) + 1} months studying for ${certName}. Here's what it really took.`, outline: ['Why I pursued this certification', 'The study process', 'Key takeaways', 'What I would do differently'], estimatedEngagement: 75 },
          { type: 'educational', title: `${certName}: What I wish I knew before starting`, hook: `Everything I learned preparing for ${certName} — condensed into 5 key insights.`, outline: ['Core concepts', 'Study resources', 'Practice strategies', 'Exam tips'], estimatedEngagement: 80 },
          { type: 'career', title: `How ${certName} changed my career trajectory`, hook: `Certifications don't guarantee jobs. But ${certName} opened these 3 doors for me.`, outline: ['Before the certification', 'How I applied the knowledge', 'Career impact', 'ROI analysis'], estimatedEngagement: 85 },
        ],
        tags: ['certification', 'learning', 'career-growth', certName],
      });
    }

    if (signal.type === 'new_project' || signal.type === 'portfolio_project' || signal.type === 'project_added') {
      const proj = signal.metadata?.project || {};
      const projName = proj.title || proj.name || signal.title.replace(/Project:|Portfolio:/g, '').trim();
      opportunities.push({
        signalType: 'project',
        title: `Building ${projName}: Full breakdown`,
        description: `Share your experience building ${projName} — from concept to completion`,
        keyInsight: `Building ${projName} showcases practical skills and problem-solving ability`,
        relevantPillars: ['Projects', signal.metadata?.project?.technologies?.[0] || 'Development'],
        angles: [
          { type: 'technical', title: `${projName}: Architecture deep dive`, hook: `Behind the scenes of ${projName}: the architecture, decisions, and trade-offs I made.`, outline: ['Problem statement', 'Architecture decisions', 'Key implementation details', 'Lessons learned'], estimatedEngagement: 70 },
          { type: 'story', title: `What I learned building ${projName}`, hook: `${Math.floor(Math.random() * 5) + 1} lessons from building ${projName} that nobody talks about.`, outline: ['The idea', 'The build process', 'Challenges faced', 'Key learnings'], estimatedEngagement: 80 },
          { type: 'framework', title: `My framework for building ${signal.metadata?.project?.technologies?.[0] || 'software'} projects`, hook: `After building ${projName}, I developed a repeatable framework. Here it is.`, outline: ['Phase 1: Planning', 'Phase 2: Building', 'Phase 3: Testing', 'Phase 4: Launching'], estimatedEngagement: 75 },
        ],
        tags: ['project', 'building', 'development', projName],
      });
    }

    if (signal.type === 'new_repository') {
      const repo = signal.metadata?.repo || {};
      const repoName = repo.name || '';
      opportunities.push({
        signalType: 'open_source',
        title: `New open source project: ${repoName}`,
        description: `Share your new open source contribution and invite collaboration`,
        keyInsight: `Open source contributions demonstrate community involvement and technical capability`,
        relevantPillars: ['Open Source', repo.language || 'Development'],
        angles: [
          { type: 'founder', title: `Why I built ${repoName} in the open`, hook: `I decided to build ${repoName} publicly. Here's why that was the best decision.`, outline: ['The inspiration', 'Why open source', 'What I built', 'How to contribute'], estimatedEngagement: 70 },
          { type: 'technical', title: `${repoName}: Technical overview`, hook: `${repoName} explained: the architecture, stack, and design decisions.`, outline: ['Tech stack', 'Architecture', 'Key features', 'Getting started'], estimatedEngagement: 65 },
        ],
        tags: ['open-source', 'github', repoName],
      });
    }

    if (signal.type === 'new_position' || signal.type === 'new_role') {
      const role = signal.metadata?.position || signal.metadata?.role || '';
      opportunities.push({
        signalType: 'career_change',
        title: `New chapter: Starting as ${role}`,
        description: `Share your career transition and what led to this new role`,
        keyInsight: `Career transitions are valuable content that attracts recruiters and inspires peers`,
        relevantPillars: ['Career Growth', 'Professional Development'],
        angles: [
          { type: 'story', title: `How I landed the ${role} role`, hook: `The journey to ${role} wasn't linear. Here's what actually worked.`, outline: ['Where I started', 'The turning point', 'The application process', 'Key advice'], estimatedEngagement: 90 },
          { type: 'journey', title: `My career journey to ${role}`, hook: `${Math.floor(Math.random() * 5) + 5} years of ups and downs that led me to ${role}.`, outline: ['Early career', 'Pivotal moments', 'Skills that made the difference', "What's next"], estimatedEngagement: 85 },
          { type: 'career', title: `${Math.floor(Math.random() * 5) + 3} things I learned getting the ${role} role`, hook: `If you're aiming for ${role}, here are ${Math.floor(Math.random() * 5) + 3} things I wish someone told me.`, outline: ['Lesson 1', 'Lesson 2', 'Lesson 3', 'Final advice'], estimatedEngagement: 80 },
        ],
        tags: ['career', 'job-search', 'transition', role],
      });
    }

    if (signal.type === 'milestone' || signal.type === 'achievement') {
      const milestone = signal.metadata?.milestone || signal.metadata?.achievement || '';
      opportunities.push({
        signalType: 'milestone',
        title: `Milestone unlocked: ${milestone || signal.title}`,
        description: `Celebrate and share your achievement with your network`,
        keyInsight: `Professional milestones build authority and inspire your network`,
        relevantPillars: ['Career Growth'],
        angles: [
          { type: 'story', title: `How I reached this milestone`, hook: `It took ${Math.floor(Math.random() * 12) + 1} months of consistent effort. Here's the story behind this milestone.`, outline: ['The goal', 'The journey', 'Key moments', "What's next"], estimatedEngagement: 75 },
          { type: 'journey', title: `The habits that helped me achieve this`, hook: `${Math.floor(Math.random() * 3) + 1} habits that made the difference between trying and achieving.`, outline: ['Habit 1', 'Habit 2', 'Habit 3', 'How to start'], estimatedEngagement: 70 },
        ],
        tags: ['milestone', 'achievement', 'growth'],
      });
    }

    if (signal.type === 'case_study') {
      const cs = signal.metadata?.caseStudy || {};
      opportunities.push({
        signalType: 'case_study',
        title: `Case study: ${cs.title || 'Project insights'}`,
        description: `Share detailed insights from your case study experience`,
        keyInsight: `Case studies demonstrate real-world problem-solving and build authority`,
        relevantPillars: ['Projects', 'Case Studies'],
        angles: [
          { type: 'educational', title: `${cs.title || 'Project'}: Problems and solutions`, hook: `The ${Math.floor(Math.random() * 3) + 3} biggest challenges in ${cs.title || 'this project'} and exactly how I solved them.`, outline: ['Challenge 1', 'Solution 1', 'Challenge 2', 'Solution 2'], estimatedEngagement: 75 },
          { type: 'framework', title: `My approach to ${cs.title || 'similar projects'}`, hook: `After ${cs.title || 'this project'}, I developed a repeatable approach. Here's my framework.`, outline: ['Step 1: Discovery', 'Step 2: Planning', 'Step 3: Execution', 'Step 4: Review'], estimatedEngagement: 70 },
        ],
        tags: ['case-study', 'project', 'insights'],
      });
    }

    if (opportunities.length === 0) {
      opportunities.push({
        signalType: 'general',
        title: signal.title,
        description: signal.description,
        keyInsight: `Share your experience and insights from this professional activity`,
        relevantPillars: ['Career Growth'],
        angles: [
          { type: 'story', title: `What I learned from ${signal.title}`, hook: `Here's what ${signal.title} taught me about growth and professional development.`, outline: ['Background', 'Key learning', 'How it changed my approach', 'Advice for others'], estimatedEngagement: 65 },
        ],
        tags: ['professional-growth', signal.source],
      });
    }

    return opportunities;
  }
}

export const opportunityExtractionEngine = new OpportunityExtractionEngine();
