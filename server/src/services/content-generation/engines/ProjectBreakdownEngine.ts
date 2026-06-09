import pino from 'pino';
import { StoryInput, StoryOutput, storyPostEngine } from './StoryPostEngine';
import { EducationalInput, EducationalOutput, educationalPostEngine } from './EducationalPostEngine';
import { FrameworkInput, FrameworkOutput, frameworkPostEngine } from './FrameworkPostEngine';

const logger = pino();

export interface ProjectData {
  name: string;
  description: string;
  technologies: string[];
  role: string;
  duration: string;
  outcome: string;
  challenges: string[];
  learnings: string[];
  teamSize?: number;
  liveUrl?: string;
  sourceCodeUrl?: string;
}

export interface ProjectPost {
  type: 'story' | 'technical_deep_dive' | 'lessons_learned' | 'architecture_breakdown' | 'build_in_public' | 'recruiter_attraction';
  title: string;
  hook: string;
  body: string;
  cta: string;
  fullContent: string;
}

export class ProjectBreakdownEngine {
  generateAll(project: ProjectData, voiceProfile: any): ProjectPost[] {
    logger.info({ project: project.name }, 'Generating all project breakdown posts');

    return [
      this.generateStoryPost(project, voiceProfile),
      this.generateTechnicalDeepDive(project, voiceProfile),
      this.generateLessonsLearned(project, voiceProfile),
      this.generateArchitectureBreakdown(project, voiceProfile),
      this.generateBuildInPublic(project, voiceProfile),
      this.generateRecruiterAttraction(project, voiceProfile),
    ];
  }

  private generateStoryPost(project: ProjectData, voiceProfile: any): ProjectPost {
    const storyInput: StoryInput = {
      topic: `building ${project.name}`,
      context: `I built ${project.name} — ${project.description.substring(0, 100)}`,
      keyInsight: project.learnings[0] || `Building ${project.name} taught me more than any course could.`,
      personalAngle: `As a ${project.role}, I faced unique challenges with ${project.name}.`,
      challenge: project.challenges[0] || `The biggest challenge was getting the architecture right.`,
      outcome: project.outcome,
      voiceProfile,
    };
    const story = storyPostEngine.generate(storyInput);
    return { ...story, type: 'story', title: `The story behind building ${project.name}` };
  }

  private generateTechnicalDeepDive(project: ProjectData, voiceProfile: any): ProjectPost {
    const lines: string[] = [];
    lines.push(`A deep dive into ${project.name}'s technical architecture.`);
    lines.push(``);
    lines.push(`Stack:`);
    project.technologies.forEach(t => lines.push(`  • ${t}`));
    lines.push(``);
    lines.push(`My role: ${project.role}`);
    lines.push(``);
    lines.push(`Key technical decisions:`);
    lines.push(`1. Why I chose this stack`);
    lines.push(`2. How I structured the codebase`);
    lines.push(`3. Performance considerations`);
    lines.push(`4. Scaling strategy`);
    lines.push(``);
    lines.push(`The hardest technical challenge:`);
    lines.push(project.challenges[0] || `Getting the initial architecture right was the hardest part.`);
    lines.push(``);
    lines.push(`If I were to rebuild today, here's what I'd do differently:`);
    lines.push(project.learnings.slice(0, 2).join('. ') || 'Use a different database for the initial schema.');

    const hook = `How I built ${project.name}: a technical deep dive 🛠️`;
    const body = lines.join('\n');
    const cta = `What tech stack are you using for your current project?`;
    const fullContent = `${hook}\n\n${body}\n\n${cta}`;

    return { type: 'technical_deep_dive', title: `${project.name}: Technical deep dive`, hook, body, cta, fullContent };
  }

  private generateLessonsLearned(project: ProjectData, voiceProfile: any): ProjectPost {
    const lessons = project.learnings.length > 0 ? project.learnings : ['Start with the problem, not the solution', 'Ship early and iterate', 'Talk to users before writing code'];
    const lines: string[] = [];

    lines.push(`${lessons.length} hard-won lessons from building ${project.name}:`);
    lines.push(``);
    lessons.forEach((l, i) => {
      lines.push(`${i + 1}. ${l}`);
      lines.push(``);
    });

    const hook = `${lessons.length} lessons I learned building ${project.name} (the hard way)`;
    const body = lines.join('\n');
    const cta = `What's the biggest lesson you've learned from a project? Share below 👇`;
    const fullContent = `${hook}\n\n${body}\n\n${cta}`;

    return { type: 'lessons_learned', title: `${lessons.length} lessons from building ${project.name}`, hook, body, cta, fullContent };
  }

  private generateArchitectureBreakdown(project: ProjectData, voiceProfile: any): ProjectPost {
    const lines: string[] = [];

    lines.push(`Here's how ${project.name} works under the hood.`);
    lines.push(``);
    lines.push(`Architecture overview:`);
    lines.push(`  ┌─ Frontend ──────────────────────┐`);
    lines.push(`  │  ${project.technologies[0] || 'React/Next.js'}             │`);
    lines.push(`  └───────────┬─────────────────────┘`);
    lines.push(`              │ API`);
    lines.push(`  ┌───────────▼─────────────────────┐`);
    lines.push(`  │  Backend Services               │`);
    lines.push(`  │  ${project.technologies[1] || 'Node.js/Python'}              │`);
    lines.push(`  └───────────┬─────────────────────┘`);
    lines.push(`              │ Data`);
    lines.push(`  ┌───────────▼─────────────────────┐`);
    lines.push(`  │  Database / Storage             │`);
    lines.push(`  │  ${project.technologies[2] || 'PostgreSQL/MongoDB'}         │`);
    lines.push(`  └─────────────────────────────────┘`);
    lines.push(``);
    lines.push(`Key architectural decisions:`);
    lines.push(`• ${project.challenges[0] || 'Separation of concerns between services'}`);
    lines.push(`• ${project.challenges[1] || 'API design for scalability'}`);
    lines.push(`• Data flow optimization`);

    const hook = `${project.name} architecture: How I designed it and why`;
    const body = lines.join('\n');
    const cta = `I'd love to hear about your architecture choices — what's your stack?`;
    const fullContent = `${hook}\n\n${body}\n\n${cta}`;

    return { type: 'architecture_breakdown', title: `${project.name}: Architecture breakdown`, hook, body, cta, fullContent };
  }

  private generateBuildInPublic(project: ProjectData, voiceProfile: any): ProjectPost {
    const lines: string[] = [];

    lines.push(`I built ${project.name} completely in public. Here's what happened.`);
    lines.push(``);
    lines.push(`Timeline:`);
    lines.push(`  Duration: ${project.duration}`);
    lines.push(`  Role: ${project.role}`);
    lines.push(``);
    lines.push(`What I shared along the way:`);
    lines.push(`1. The initial concept and why I chose to build it`);
    lines.push(`2. Weekly progress updates`);
    lines.push(`3. Technical challenges and how I solved them`);
    lines.push(`4. User feedback and iterations`);
    lines.push(`5. The launch and results`);
    lines.push(``);
    lines.push(`The result:`);
    lines.push(project.outcome || `${project.name} is now live and serving users.`);
    lines.push(``);
    lines.push(`Building in public wasn't just about accountability. It created opportunities I never expected — from job offers to collaboration requests.`);

    const hook = `Building ${project.name} in public: The complete journey`;
    const body = lines.join('\n');
    const cta = `Are you building something? Consider doing it in public. It's worth it. Save this for when you start.`;
    const fullContent = `${hook}\n\n${body}\n\n${cta}`;

    return { type: 'build_in_public', title: `Building ${project.name} in public`, hook, body, cta, fullContent };
  }

  private generateRecruiterAttraction(project: ProjectData, voiceProfile: any): ProjectPost {
    const lines: string[] = [];

    lines.push(`Here's what building ${project.name} says about me as a ${project.role}:`);
    lines.push(``);
    lines.push(`What I built:`);
    lines.push(project.description);
    lines.push(``);
    lines.push(`The stack I used:`);
    project.technologies.forEach(t => lines.push(`  • ${t}`));
    lines.push(``);
    lines.push(`What this proves:`);
    lines.push(`1. I can take a project from concept to completion`);
    lines.push(`2. I make thoughtful technical decisions`);
    lines.push(`3. I overcome challenges and ship results`);
    lines.push(`4. ${project.learnings[0] || 'I learn continuously'}`);
    lines.push(``);
    lines.push(`The result: ${project.outcome || 'A production-ready application that solves real problems.'}`);
    lines.push(``);
    lines.push(`I'm not just listing technologies. I'm showing what I can do with them.`);

    const hook = `Hiring managers: Here's what ${project.name} tells you about my skills`;
    const body = lines.join('\n');
    const cta = `I'm always open to interesting opportunities. If this resonates, let's connect.`;
    const fullContent = `${hook}\n\n${body}\n\n${cta}`;

    return { type: 'recruiter_attraction', title: `What ${project.name} says about my skills`, hook, body, cta, fullContent };
  }
}

export const projectBreakdownEngine = new ProjectBreakdownEngine();
