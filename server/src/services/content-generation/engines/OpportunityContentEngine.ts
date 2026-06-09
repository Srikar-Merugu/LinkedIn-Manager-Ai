import pino from 'pino';
import { storyPostEngine, StoryInput } from './StoryPostEngine';
import { educationalPostEngine, EducationalInput } from './EducationalPostEngine';
import { frameworkPostEngine, FrameworkInput } from './FrameworkPostEngine';

const logger = pino();

export interface OpportunityContentInput {
  signalType: string;
  title: string;
  description: string;
  keyInsight: string;
  metadata: Record<string, any>;
  voiceProfile: any;
  careerGoals?: Array<{ type: string; target: string; description: string; timeline: string }>;
  brandProfile?: any;
}

export interface ContentVersion {
  version: string;
  type: string;
  title: string;
  hook: string;
  body: string;
  cta: string;
  fullContent: string;
}

export class OpportunityContentEngine {
  generateAll(input: OpportunityContentInput): ContentVersion[] {
    logger.info({ signalType: input.signalType, title: input.title }, 'Generating all opportunity content versions');

    const versions: ContentVersion[] = [];

    versions.push(this.generateStoryVersion(input));
    versions.push(this.generateEducationalVersion(input));
    versions.push(this.generateFrameworkVersion(input));
    versions.push(this.generateCareerVersion(input));
    versions.push(this.generateJourneyVersion(input));

    return versions;
  }

  private generateStoryVersion(input: OpportunityContentInput): ContentVersion {
    const storyInput: StoryInput = {
      topic: input.title,
      context: input.description,
      keyInsight: input.keyInsight,
      personalAngle: `My experience with ${input.title}`,
      voiceProfile: input.voiceProfile,
      careerGoal: input.careerGoals?.[0]?.target,
    };
    const story = storyPostEngine.generate(storyInput);
    return { ...story, version: 'A', type: 'story', title: `The story behind ${input.title}` };
  }

  private generateEducationalVersion(input: OpportunityContentInput): ContentVersion {
    const edInput: EducationalInput = {
      topic: input.title,
      concept: input.keyInsight,
      examples: [input.description],
      actionableAdvice: [input.keyInsight, `Apply this to your ${input.signalType} journey`, 'Share your learning'],
      voiceProfile: input.voiceProfile,
      audienceLevel: input.signalType === 'certification' || input.signalType === 'technical' ? 'beginner' : 'intermediate',
    };
    const ed = educationalPostEngine.generate(edInput);
    return { ...ed, version: 'B', type: 'educational', title: `What I learned from ${input.title}` };
  }

  private generateFrameworkVersion(input: OpportunityContentInput): ContentVersion {
    const fwInput: FrameworkInput = {
      topic: `mastering ${input.signalType}`,
      frameworkName: `The ${input.signalType.charAt(0).toUpperCase() + input.signalType.slice(1)} Framework`,
      steps: [
        { name: 'Discovery', description: `Identify opportunities in ${input.signalType}` },
        { name: 'Learning', description: input.description },
        { name: 'Application', description: `Apply ${input.keyInsight} to real situations` },
        { name: 'Reflection', description: `Evaluate outcomes and iterate` },
        { name: 'Sharing', description: `Share your ${input.signalType} journey with your network` },
      ],
      voiceProfile: input.voiceProfile,
      outcome: `Master ${input.signalType} with a repeatable system`,
    };
    const fw = frameworkPostEngine.generate(fwInput);
    return { ...fw, version: 'C', type: 'framework', title: `My framework for ${input.signalType}` };
  }

  private generateCareerVersion(input: OpportunityContentInput): ContentVersion {
    const lines: string[] = [];
    lines.push(`How ${input.title} impacts your career trajectory:`);
    lines.push(``);
    lines.push(`The reality:`);
    lines.push(input.description);
    lines.push(``);
    lines.push(`Why this matters for your career:`);
    lines.push(input.keyInsight);
    lines.push(``);
    lines.push(`What recruiters and hiring managers see:`);
    lines.push(`When you share your ${input.signalType} journey, you demonstrate:`);
    lines.push(`1. Initiative — you didn't wait for permission`);
    lines.push(`2. Growth mindset — you invest in yourself`);
    lines.push(`3. Expertise — you have hands-on experience`);
    lines.push(`4. Communication — you can articulate your journey`);
    lines.push(``);
    lines.push(`This isn't just content. It's career capital.`);

    const hook = `This ${input.signalType} could be the most important career move you make this year`;
    const body = lines.join('\n');
    const cta = `Save this for your career reflection. What's the last thing you did that advanced your career?`;
    const fullContent = `${hook}\n\n${body}\n\n${cta}`;

    return { version: 'D', type: 'career', title: `Career impact of ${input.title}`, hook, body, cta, fullContent };
  }

  private generateJourneyVersion(input: OpportunityContentInput): ContentVersion {
    const lines: string[] = [];

    lines.push(`My ${input.signalType} journey: from start to ${input.signalType === 'certification' ? 'certified' : 'shipped'}`);
    lines.push(``);
    lines.push(`Chapter 1: The beginning`);
    lines.push(`I started this ${input.signalType} journey because ${input.description.substring(0, 100)}`);
    lines.push(``);
    lines.push(`Chapter 2: The middle`);
    lines.push(`This is where most people quit. The initial excitement fades, and the real work begins.`);
    lines.push(``);
    lines.push(`Chapter 3: The breakthrough`);
    lines.push(`${input.keyInsight}`);
    lines.push(``);
    lines.push(`Chapter 4: The completion`);
    lines.push(`Looking back, every challenge was worth it. ${input.title} changed how I approach my work.`);
    lines.push(``);
    lines.push(`Your journey might look different. But the pattern is universal.`);
    lines.push(``);
    lines.push(`Start → Struggle → Breakthrough → Growth`);

    const hook = `My ${input.signalType} journey: A 4-chapter story`;
    const body = lines.join('\n');
    const cta = `What's your current professional journey? Share your story below.`;
    const fullContent = `${hook}\n\n${body}\n\n${cta}`;

    return { version: 'E', type: 'journey', title: `My ${input.signalType} journey`, hook, body, cta, fullContent };
  }
}

export const opportunityContentEngine = new OpportunityContentEngine();
