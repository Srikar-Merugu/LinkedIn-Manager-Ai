import pino from 'pino';

const logger = pino();

export interface ContrarianInput {
  topic: string;
  popularBelief: string;
  actualTruth: string;
  evidence: string[];
  voiceProfile: { vocabulary: string[]; tone: string; contrarianStyle: string };
}

export interface ContrarianOutput {
  hook: string;
  body: string;
  cta: string;
  fullContent: string;
  position: string;
}

const HOOK_TEMPLATES = [
  (t: ContrarianInput) => `Unpopular opinion: ${t.popularBelief} is wrong. Here's why.`,
  (t: ContrarianInput) => `Hot take: ${t.topic} isn't what you think it is.`,
  (t: ContrarianInput) => `I used to believe ${t.popularBelief}. I was wrong. Here's what changed my mind.`,
  (t: ContrarianInput) => `Everyone is saying ${t.popularBelief.toLowerCase()}. I disagree. Here's why:`,
  (t: ContrarianInput) => `The truth about ${t.topic} that nobody wants to admit:`,
  (t: ContrarianInput) => `Here's a controversial take on ${t.topic}: ${t.actualTruth}`,
  (t: ContrarianInput) => `${t.popularBelief} sounds logical. Until you look at the evidence.`,
  (t: ContrarianInput) => `I'm going against the grain on ${t.topic}. Here's my reasoning:`,
];

export class ContrarianPostEngine {
  generate(input: ContrarianInput): ContrarianOutput {
    logger.info({ topic: input.topic }, 'Generating contrarian post');

    const safeInput = {
      ...input,
      topic: input.topic || 'this topic',
      popularBelief: input.popularBelief || `What most people believe about ${input.topic || 'this topic'}`,
      actualTruth: input.actualTruth || '',
      evidence: Array.isArray(input.evidence) ? input.evidence : [],
      voiceProfile: input.voiceProfile || { vocabulary: [], tone: 'authentic', contrarianStyle: 'provocative' },
    };

    const hook = this.generateHook(safeInput);
    const body = this.generateBody(safeInput);
    const cta = this.generateCTA(safeInput);
    const fullContent = `${hook}\n\n${body}\n\n${cta}`;

    return { hook, body, cta, fullContent, position: safeInput.actualTruth };
  }

  generateHook(input: ContrarianInput): string {
    const template = HOOK_TEMPLATES[Math.floor(Math.random() * HOOK_TEMPLATES.length)];
    return template(input);
  }

  private generateBody(input: ContrarianInput): string {
    const { topic, popularBelief, actualTruth, evidence } = input;
    const lines: string[] = [];

    lines.push(`Let's talk about something uncomfortable.`);
    lines.push(``);
    lines.push(`The conventional wisdom says:`);
    lines.push(popularBelief);
    lines.push(``);
    lines.push(`Here's why I think that's incomplete:`);
    lines.push(``);
    lines.push(actualTruth);
    lines.push(``);
    lines.push(`Here's what I've learned from experience:`);
    lines.push(``);

    evidence.slice(0, 3).forEach((ev, i) => {
      lines.push(`${i + 1}. ${ev}`);
    });

    lines.push(``);
    lines.push(`Now, I'm not saying the conventional wisdom is entirely wrong.`);
    lines.push(``);
    lines.push(`What I am saying is:`);
    lines.push(`It's incomplete. It works for some people in some situations. But if it's not working for you, there's a reason.`);
    lines.push(``);
    lines.push(`The real answer is more nuanced than what the gurus will tell you.`);
    lines.push(``);
    lines.push(`${actualTruth}`);
    lines.push(``);
    lines.push(`This isn't about being controversial for attention. It's about sharing a perspective that took me years to develop.`);

    return lines.join('\n');
  }

  private generateCTA(input: ContrarianInput): string {
    const ctas = [
      `Do you agree or disagree? I want to hear your take.`,
      `What's a popular belief about ${input.topic} that you disagree with?`,
      `Share this if you're not afraid of unpopular opinions.`,
      `I know this might be controversial. Let's discuss it respectfully in the comments.`,
      `Follow me for more honest takes on ${input.topic}.`,
      `What's your experience? Have you found the conventional wisdom to be true?`,
      `👇 Drop your hottest take on ${input.topic} below.`,
    ];
    return ctas[Math.floor(Math.random() * ctas.length)];
  }
}

export const contrarianPostEngine = new ContrarianPostEngine();
