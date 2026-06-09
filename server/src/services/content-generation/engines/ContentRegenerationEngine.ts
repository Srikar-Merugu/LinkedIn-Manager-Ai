import pino from 'pino';
import { StoryPostEngine, StoryInput, StoryOutput } from './StoryPostEngine';
import { EducationalPostEngine, EducationalInput, EducationalOutput } from './EducationalPostEngine';
import { FrameworkPostEngine, FrameworkInput, FrameworkOutput } from './FrameworkPostEngine';
import { ContrarianPostEngine, ContrarianInput, ContrarianOutput } from './ContrarianPostEngine';

const logger = pino();

export interface RegenerationParams {
  tone?: 'story' | 'educational' | 'framework' | 'contrarian' | 'journey';
  audience?: string;
  goal?: string;
  contentType?: string;
  length?: 'short' | 'medium' | 'long';
  complexity?: 'simple' | 'moderate' | 'complex';
}

export interface RegenerationInput {
  originalContent: string;
  topic: string;
  context: string;
  keyInsight: string;
  voiceProfile: any;
  params: RegenerationParams;
}

export interface RegenerationOutput {
  hook: string;
  body: string;
  cta: string;
  fullContent: string;
  type: string;
  appliedParams: RegenerationParams;
}

const storyEngine = new StoryPostEngine();
const educationalEngine = new EducationalPostEngine();
const frameworkEngine = new FrameworkPostEngine();
const contrarianEngine = new ContrarianPostEngine();

export class ContentRegenerationEngine {
  regenerate(input: RegenerationInput): RegenerationOutput {
    logger.info({ topic: input.topic, params: input.params }, 'Regenerating content');

    switch (input.params.tone) {
      case 'educational':
        return this.generateEducational(input);
      case 'framework':
        return this.generateFramework(input);
      case 'contrarian':
        return this.generateContrarian(input);
      case 'journey':
        return this.generateJourney(input);
      case 'story':
      default:
        return this.generateStory(input);
    }
  }

  private generateStory(input: RegenerationInput): RegenerationOutput {
    const si: StoryInput = {
      topic: input.topic,
      context: input.context,
      keyInsight: input.keyInsight,
      voiceProfile: input.voiceProfile,
    };
    const result = storyEngine.generate(si);
    return { ...result, type: 'story', appliedParams: input.params };
  }

  private generateEducational(input: RegenerationInput): RegenerationOutput {
    const ei: EducationalInput = {
      topic: input.topic,
      concept: input.keyInsight,
      examples: [input.context],
      actionableAdvice: ['Understand the fundamentals', 'Apply consistently', 'Measure results', 'Iterate based on feedback'],
      voiceProfile: input.voiceProfile,
      audienceLevel: input.params.complexity === 'simple' ? 'beginner' : input.params.complexity === 'complex' ? 'advanced' : 'intermediate',
    };

    if (input.params.length === 'short') {
      ei.actionableAdvice = ei.actionableAdvice.slice(0, 2);
    }
    if (input.params.length === 'long') {
      ei.actionableAdvice = [...ei.actionableAdvice, 'Share your learning process', 'Document your journey'];
    }

    const result = educationalEngine.generate(ei);
    return { ...result, type: 'educational', appliedParams: input.params };
  }

  private generateFramework(input: RegenerationInput): RegenerationOutput {
    const stepCount = input.params.length === 'short' ? 3 : input.params.length === 'long' ? 6 : 4;
    const steps: Array<{ name: string; description: string }> = [];

    for (let i = 1; i <= stepCount; i++) {
      steps.push({
        name: `Step ${i}`,
        description: `Key action for ${input.topic}`,
      });
    }

    const fi: FrameworkInput = {
      topic: input.topic,
      frameworkName: `The ${input.topic.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('')} System`,
      steps,
      voiceProfile: input.voiceProfile,
      outcome: `Master ${input.topic}`,
    };
    const result = frameworkEngine.generate(fi);
    return { ...result, type: 'framework', appliedParams: input.params };
  }

  private generateContrarian(input: RegenerationInput): RegenerationOutput {
    const ci: ContrarianInput = {
      topic: input.topic,
      popularBelief: `What most people believe about ${input.topic}`,
      actualTruth: input.keyInsight,
      evidence: [input.context, 'Based on my direct experience and results'],
      voiceProfile: input.voiceProfile,
    };
    const result = contrarianEngine.generate(ci);
    return { ...result, type: 'contrarian', appliedParams: input.params };
  }

  private generateJourney(input: RegenerationInput): RegenerationOutput {
    const lines: string[] = [];

    lines.push(`My journey through ${input.topic}:`);
    lines.push(``);
    lines.push(`Where I started:`);
    lines.push(`I had questions about ${input.topic}. Lots of them.`);
    lines.push(``);
    lines.push(`What I discovered:`);
    lines.push(input.keyInsight);
    lines.push(``);
    lines.push(`The turning point:`);
    lines.push(input.context);
    lines.push(``);
    lines.push(`Where I am now:`);
    lines.push(`Still learning. But now I know what questions to ask.`);
    lines.push(``);
    lines.push(`Your journey might look different. But the pattern is the same.`);

    const hook = `My ${input.topic} journey: What I learned along the way`;
    const body = lines.join('\n');
    const cta = `What's your journey been like? I'd love to hear your story.`;
    const fullContent = `${hook}\n\n${body}\n\n${cta}`;

    return { hook, body, cta, fullContent, type: 'journey', appliedParams: input.params };
  }
}

export const contentRegenerationEngine = new ContentRegenerationEngine();
