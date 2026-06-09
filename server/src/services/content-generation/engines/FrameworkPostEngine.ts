import pino from 'pino';

const logger = pino();

export interface FrameworkInput {
  topic: string;
  frameworkName: string;
  steps: Array<{ name: string; description: string }>;
  voiceProfile: { vocabulary: string[]; tone: string; frameworkStyle: string };
  outcome?: string;
}

export interface FrameworkOutput {
  hook: string;
  body: string;
  cta: string;
  fullContent: string;
  framework: string;
}

const HOOK_TEMPLATES = [
  (t: FrameworkInput) => `The ${t.frameworkName} framework for ${t.topic}:`,
  (t: FrameworkInput) => `I used to struggle with ${t.topic}. Then I built a system. Here it is:`,
  (t: FrameworkInput) => `${t.frameworkName}: A ${t.steps.length}-step system for mastering ${t.topic}.`,
  (t: FrameworkInput) => `Most people wing ${t.topic}. I use a framework. Here's mine:`,
  (t: FrameworkInput) => `There's a right way and a wrong way to approach ${t.topic}. Here's my framework:`,
  (t: FrameworkInput) => `After ${Math.floor(Math.random() * 10) + 5} years of ${t.topic}, I distilled everything into ${t.steps.length} steps:`,
];

export class FrameworkPostEngine {
  generate(input: FrameworkInput): FrameworkOutput {
    logger.info({ topic: input.topic, framework: input.frameworkName }, 'Generating framework post');

    const hook = this.generateHook(input);
    const body = this.generateBody(input);
    const cta = this.generateCTA(input);
    const fullContent = `${hook}\n\n${body}\n\n${cta}`;

    return { hook, body, cta, fullContent, framework: input.frameworkName };
  }

  generateHook(input: FrameworkInput): string {
    const template = HOOK_TEMPLATES[Math.floor(Math.random() * HOOK_TEMPLATES.length)];
    return template(input);
  }

  private generateBody(input: FrameworkInput): string {
    const { frameworkName, steps, outcome } = input;
    const lines: string[] = [];

    lines.push(`I call it the **${frameworkName}** framework.`);
    lines.push(``);
    lines.push(`Here's how it works:`);
    lines.push(``);

    steps.forEach((step, i) => {
      lines.push(`Step ${i + 1}: ${step.name}`);
      lines.push(step.description);
      lines.push(``);
    });

    if (outcome) {
      lines.push(`The result:`);
      lines.push(outcome);
      lines.push(``);
    }

    lines.push(`The beauty of this framework is its simplicity.`);
    lines.push(``);
    lines.push(`You don't need a complex system to master ${input.topic}. You need repeatable steps that compound over time.`);
    lines.push(``);
    lines.push(`Each step builds on the last. Skip one, and the whole system breaks. That's by design — ${input.topic} requires all ${steps.length} elements working together.`);

    return lines.join('\n');
  }

  private generateCTA(input: FrameworkInput): string {
    const ctas = [
      `Save this framework for your next ${input.topic} project.`,
      `Try this out and let me know which step made the biggest difference.`,
      `Share this with someone building their ${input.topic} system.`,
      `Which step resonates most with your experience?`,
      `Follow me for more frameworks like ${input.frameworkName}.`,
      `Drop a 📌 if you're going to implement this this week.`,
      `What's your current approach to ${input.topic}? I'd love to hear it.`,
    ];
    return ctas[Math.floor(Math.random() * ctas.length)];
  }
}

export const frameworkPostEngine = new FrameworkPostEngine();
