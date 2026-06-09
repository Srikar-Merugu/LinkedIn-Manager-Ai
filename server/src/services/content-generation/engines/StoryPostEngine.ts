import pino from 'pino';

const logger = pino();

export interface StoryInput {
  topic: string;
  context: string;
  keyInsight: string;
  personalAngle?: string;
  challenge?: string;
  outcome?: string;
  voiceProfile: { vocabulary: string[]; tone: string; storytellingStyle: string };
  careerGoal?: string;
}

export interface StoryOutput {
  hook: string;
  body: string;
  cta: string;
  fullContent: string;
  storyArc: { setup: string; conflict: string; resolution: string; insight: string };
}

const HOOK_TEMPLATES = [
  (t: StoryInput) => `I spent ${Math.floor(Math.random() * 5) + 3} ${['years', 'months', 'weeks'][Math.floor(Math.random() * 3)]} learning this the hard way. Here's what nobody told me about ${t.topic}.`,
  (t: StoryInput) => `This one moment changed how I think about ${t.topic} forever.`,
  (t: StoryInput) => `I almost quit ${t.topic} entirely. Here's what made me stay.`,
  (t: StoryInput) => `The biggest myth about ${t.topic}:`,
  (t: StoryInput) => `What if everything you know about ${t.topic} is wrong?`,
  (t: StoryInput) => `I went from struggling with ${t.topic} to building a career around it. Here's exactly what changed.`,
  (t: StoryInput) => `3AM. One decision. Everything changed. Here's my story about ${t.topic}.`,
  (t: StoryInput) => `Someone asked me "${t.topic} isn't working for me. What am I doing wrong?" Here's what I told them.`,
  (t: StoryInput) => `The ${t.topic} conversation nobody is having:`,
  (t: StoryInput) => `I made a mistake with ${t.topic}. Then I made it again. Here's what I learned on the third try.`,
];

const CTA_TEMPLATES = [
  (t: StoryInput) => `What's your experience with ${t.topic}? Share below 👇`,
  (t: StoryInput) => `Have you faced something similar? Let me know in the comments.`,
  (t: StoryInput) => `If this resonates, follow along for more on ${t.topic}.`,
  (t: StoryInput) => `Tag someone who needs to hear this story.`,
  (t: StoryInput) => `Save this for when you need a reminder that you're not alone in this.`,
  (t: StoryInput) => `What would you add? I'm always learning from this community.`,
  (t: StoryInput) => `Drop a 💡 if this story helped you see ${t.topic} differently.`,
];

export class StoryPostEngine {
  generate(input: StoryInput): StoryOutput {
    logger.info({ topic: input.topic }, 'Generating story post');

    const hook = this.generateHook(input);
    const body = this.generateBody(input);
    const cta = this.generateCTA(input);
    const fullContent = `${hook}\n\n${body}\n\n${cta}`;

    return {
      hook, body, cta, fullContent,
      storyArc: {
        setup: `The situation: ${input.context || `I was working on ${input.topic}`}`,
        conflict: `The challenge: ${input.challenge || "Things weren't going as planned"}`,
        resolution: `What I learned: ${input.keyInsight}`,
        insight: `The takeaway: ${input.personalAngle || input.keyInsight}`,
      },
    };
  }

  generateHook(input: StoryInput): string {
    const template = HOOK_TEMPLATES[Math.floor(Math.random() * HOOK_TEMPLATES.length)];
    return template(input);
  }

  private generateBody(input: StoryInput): string {
    const { topic, context, keyInsight, challenge, outcome, personalAngle } = input;
    const lines: string[] = [];

    lines.push(`Let me set the scene.`);
    lines.push(``);
    lines.push(`${context || `I was deep into ${topic}, thinking I had it all figured out.`}`);
    lines.push(``);
    lines.push(`Then reality hit.`);
    lines.push(``);
    lines.push(`${challenge || `The hardest part wasn't the work itself. It was realizing how much I didn't know about ${topic}.`}`);
    lines.push(``);
    lines.push(`Here's what actually happened:`);
    lines.push(``);
    lines.push(`${personalAngle || `I took a step back and completely changed my approach.`} ${keyInsight}`);
    lines.push(``);
    lines.push(`${outcome || `The result wasn't just better outcomes. It was a fundamentally different way of thinking about ${topic}.`}`);
    lines.push(``);
    lines.push(`But here's the part I don't share often:`);
    lines.push(``);
    lines.push(`It wasn't a straight line. There were setbacks, doubts, and moments I almost gave up. The growth came from the struggle, not the success.`);

    return lines.join('\n');
  }

  generateCTA(input: StoryInput): string {
    const template = CTA_TEMPLATES[Math.floor(Math.random() * CTA_TEMPLATES.length)];
    return template(input);
  }
}

export const storyPostEngine = new StoryPostEngine();
