import pino from 'pino';
import { StoryPostEngine, StoryInput } from './StoryPostEngine';
import { EducationalPostEngine, EducationalInput } from './EducationalPostEngine';
import { FrameworkPostEngine, FrameworkInput } from './FrameworkPostEngine';
import { ContrarianPostEngine, ContrarianInput } from './ContrarianPostEngine';

const logger = pino();

export type AngleType = 'story' | 'educational' | 'framework' | 'contrarian' | 'journey' | 'career';

export interface VariationInput {
  topic: string;
  context: string;
  keyInsight: string;
  voiceProfile: any;
  contentType: string;
}

export interface VariationResult {
  version: string;
  angle: string;
  hook: string;
  body: string;
  cta: string;
  fullContent: string;
  type: AngleType;
}

const storyEngine = new StoryPostEngine();
const educationalEngine = new EducationalPostEngine();
const frameworkEngine = new FrameworkPostEngine();
const contrarianEngine = new ContrarianPostEngine();

export class PostVariationEngine {
  generateThree(input: VariationInput): VariationResult[] {
    logger.info({ topic: input.topic }, 'Generating 3 content variations');

    return [
      this.generateVersionA(input),
      this.generateVersionB(input),
      this.generateVersionC(input),
    ];
  }

  private generateVersionA(input: VariationInput): VariationResult {
    const base: StoryInput = {
      topic: input.topic,
      context: input.context,
      keyInsight: input.keyInsight,
      personalAngle: `My personal experience with ${input.topic}`,
      voiceProfile: input.voiceProfile,
    };
    const result = storyEngine.generate(base);
    return {
      ...result, version: 'A',
      angle: 'Personal story approach — build connection through vulnerability and experience.',
      type: 'story',
    };
  }

  private generateVersionB(input: VariationInput): VariationResult {
    const base: EducationalInput = {
      topic: input.topic,
      concept: input.keyInsight,
      examples: [input.context],
      actionableAdvice: [
        'Start with understanding the fundamentals',
        'Apply in small increments',
        'Reflect and iterate',
        'Share your learning publicly',
      ],
      voiceProfile: input.voiceProfile,
      audienceLevel: 'intermediate',
    };
    const result = educationalEngine.generate(base);
    return {
      ...result, version: 'B',
      angle: 'Educational approach — provide actionable value that readers can save and apply.',
      type: 'educational',
    };
  }

  private generateVersionC(input: VariationInput): VariationResult {
    const base: FrameworkInput = {
      topic: input.topic,
      frameworkName: `The ${input.topic.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('')} System`,
      steps: [
        { name: 'Understand', description: `Deep dive into ${input.topic} fundamentals` },
        { name: 'Strategize', description: 'Build a plan based on your unique context' },
        { name: 'Execute', description: 'Implement with consistency and focus' },
        { name: 'Optimize', description: 'Measure results and iterate on your approach' },
      ],
      voiceProfile: input.voiceProfile,
      outcome: `Master ${input.topic} with a repeatable system`,
    };
    const result = frameworkEngine.generate(base);
    return {
      ...result, version: 'C',
      angle: 'Framework approach — position yourself as a systems thinker and authority.',
      type: 'framework',
    };
  }

  regenerate(input: VariationInput, params: {
    tone?: string; length?: string; audience?: string; goal?: string;
  }): VariationResult[] {
    if (params.tone === 'contrarian') {
      const base: ContrarianInput = {
        topic: input.topic,
        popularBelief: `The conventional wisdom about ${input.topic}`,
        actualTruth: input.keyInsight,
        evidence: [input.context, 'Based on my experience and results'],
        voiceProfile: input.voiceProfile,
      };
      const result = contrarianEngine.generate(base);
      return [{
        ...result, version: 'R',
        angle: 'Contrarian approach — provoke thought and drive discussion',
        type: 'contrarian',
      }];
    }

    return this.generateThree(input);
  }
}

export const postVariationEngine = new PostVariationEngine();
