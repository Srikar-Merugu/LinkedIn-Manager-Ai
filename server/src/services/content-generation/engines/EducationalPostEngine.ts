import pino from 'pino';

const logger = pino();

export interface EducationalInput {
  topic: string;
  concept: string;
  examples: string[];
  actionableAdvice: string[];
  voiceProfile: { vocabulary: string[]; tone: string; teachingStyle: string };
  audienceLevel: 'beginner' | 'intermediate' | 'advanced';
}

export interface EducationalOutput {
  hook: string;
  body: string;
  cta: string;
  fullContent: string;
  keyTakeaways: string[];
}

const HOOK_TEMPLATES = [
  (t: EducationalInput) => `${t.topic} explained simply:`,
  (t: EducationalInput) => `Most people get ${t.topic} wrong. Here's the right way:`,
  (t: EducationalInput) => `Stop overcomplicating ${t.topic}. Here's what matters:`,
  (t: EducationalInput) => `${t.concept} — a thread 🧵`,
  (t: EducationalInput) => `${Math.floor(Math.random() * 5) + 3} lessons about ${t.topic} I wish someone taught me earlier:`,
  (t: EducationalInput) => `The complete guide to ${t.topic} (no fluff):`,
  (t: EducationalInput) => `What nobody teaches you about ${t.concept}:`,
  (t: EducationalInput) => `The gap between knowing ${t.topic} and mastering it:`,
  (t: EducationalInput) => `If you only learn one thing about ${t.topic}, make it this:`,
  (t: EducationalInput) => `${t.topic} doesn't have to be complicated. Here's the simplified version:`,
];

export class EducationalPostEngine {
  generate(input: EducationalInput): EducationalOutput {
    logger.info({ topic: input.topic }, 'Generating educational post');

    const hook = this.generateHook(input);
    const body = this.generateBody(input);
    const cta = this.generateCTA(input);
    const fullContent = `${hook}\n\n${body}\n\n${cta}`;
    const keyTakeaways = input.actionableAdvice.slice(0, 3);

    return { hook, body, cta, fullContent, keyTakeaways };
  }

  generateHook(input: EducationalInput): string {
    const template = HOOK_TEMPLATES[Math.floor(Math.random() * HOOK_TEMPLATES.length)];
    return template(input);
  }

  private generateBody(input: EducationalInput): string {
    const { topic, concept, examples, actionableAdvice, audienceLevel } = input;
    const lines: string[] = [];

    lines.push(`Let's break ${topic} down.`);
    lines.push(``);

    if (audienceLevel === 'beginner') {
      lines.push(`${concept} — in plain English:`);
    } else {
      lines.push(`${concept} — here's what you need to know:`);
    }
    lines.push(``);

    if (examples.length > 0) {
      lines.push(`Real example:`);
      lines.push(examples[0]);
      lines.push(``);
      if (examples.length > 1) {
        lines.push(`Another one:`);
        lines.push(examples[1]);
        lines.push(``);
      }
    }

    lines.push(`Here's the framework I use:`);
    lines.push(``);
    actionableAdvice.slice(0, 4).forEach((advice, i) => {
      lines.push(`${i + 1}. ${advice}`);
    });

    lines.push(``);
    lines.push(`The key insight:`);
    lines.push(`Most advice about ${topic} focuses on tactics. The real leverage comes from understanding ${concept}.`);
    lines.push(``);
    lines.push(`Once you internalize this, everything else falls into place.`);

    return lines.join('\n');
  }

  private generateCTA(input: EducationalInput): string {
    const ctas = [
      `Save this for reference next time you're working on ${input.topic}.`,
      `Share this with someone who's learning ${input.topic}.`,
      `What's the biggest challenge you face with ${input.topic}?`,
      `Follow me for more practical advice on ${input.topic}.`,
      `Drop a 🧵 if you want more deep dives on ${input.topic}.`,
      `Which part of ${input.topic} do you struggle with most?`,
      `Tag a friend who needs to see this breakdown.`,
    ];
    return ctas[Math.floor(Math.random() * ctas.length)];
  }
}

export const educationalPostEngine = new EducationalPostEngine();
