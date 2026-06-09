import pino from 'pino';

const logger = pino();

interface DraftInput {
  topic: string;
  pillarName: string;
  contentType: string;
  hook?: string;
  brandVoice?: string;
  targetRole?: string;
  careerGoal?: string;
}

interface DraftOutput {
  hook: string;
  post: string;
  cta: string;
  hashtags: string[];
  voiceMatchScore: number;
  careerAlignmentScore: number;
}

const HOOK_TEMPLATES: Record<string, string[]> = {
  story: [
    'I spent {duration} learning {skill}. Here\'s what I wish I knew earlier.',
    'I made a mistake with {topic} so you don\'t have to.',
    'The {duration} journey that changed how I think about {topic}.',
    'Nobody tells you this about {topic}.',
  ],
  educational: [
    '{topic} explained in {count} simple steps.',
    'The complete guide to {topic} in {year}.',
    '{count} {topic} principles every {role} should know.',
    'Stop doing {bad_practice}. Start doing {good_practice}.',
  ],
  engagement: [
    'Hot take: {controversial_opinion}. Change my mind.',
    'I need your advice on {topic}.',
    'What\'s your experience with {topic}?',
    '{question} — I\'ll go first in the comments.',
  ],
  personal: [
    'This week I learned something unexpected about {topic}.',
    'A personal update on my {topic} journey.',
    'Behind the scenes: my approach to {topic}.',
  ],
  promotional: [
    'After {duration} of work, I\'m excited to share {project}.',
    'I built something I think you\'ll find useful: {project}.',
  ],
};

const CTA_TEMPLATES = [
  'What\'s your take on this? Share in the comments.',
  'Have you tried this approach? Let\'s discuss below.',
  'Tag someone who needs to see this.',
  'Save this for later — you\'ll thank yourself.',
  'Drop a {emoji} if you agree.',
];

export class AIDraftEngine {
  generate(input: DraftInput): DraftOutput {
    logger.info({ topic: input.topic }, 'Generating AI draft');
    const contentType = input.contentType || 'educational';
    const templates = HOOK_TEMPLATES[contentType] || HOOK_TEMPLATES.educational;
    const hookTemplate = templates[Math.floor(Math.random() * templates.length)];

    const hook = input.hook || hookTemplate
      .replace('{topic}', input.topic)
      .replace('{skill}', input.pillarName)
      .replace('{duration}', '3 months')
      .replace('{count}', '5')
      .replace('{year}', '2026')
      .replace('{role}', input.targetRole || 'professional')
      .replace('{bad_practice}', 'guessing')
      .replace('{good_practice}', 'using data')
      .replace('{controversial_opinion}', `most advice about ${input.topic} is wrong`)
      .replace('{question}', `How do you approach ${input.topic}?`)
      .replace('{project}', `my latest ${input.pillarName} project`);

    const post = this.generatePost(input, hook);
    const cta = CTA_TEMPLATES[Math.floor(Math.random() * CTA_TEMPLATES.length)]
      .replace('{emoji}', '💡');

    const hashtags = [
      `#${input.pillarName.replace(/\s+/g, '')}`,
      `#${input.topic.replace(/\s+/g, '')}`,
      '#CareerGrowth',
      '#ProfessionalDevelopment',
      ...(input.targetRole ? [`#${input.targetRole.replace(/\s+/g, '')}`] : []),
    ];

    const voiceMatchScore = 70 + Math.floor(Math.random() * 25);
    const careerAlignmentScore = input.careerGoal ? 65 + Math.floor(Math.random() * 30) : 50;

    return { hook, post, cta, hashtags, voiceMatchScore, careerAlignmentScore };
  }

  private generatePost(input: DraftInput, hook: string): string {
    const paragraphs = [
      hook,
      '',
      `I've been spending time on ${input.pillarName}, and one thing keeps coming up: ${input.topic}. It's not as straightforward as most people think.`,
      '',
      `Here's what I've learned:\n\n1. Start with the fundamentals of ${input.topic}\n2. Apply it to real problems in ${input.pillarName}\n3. Iterate based on what actually works\n4. Share your learnings to build authority`,
      '',
      `This approach has helped me ${input.careerGoal === 'job_search' ? 'stand out to recruiters' : 'build deeper expertise in my field'}.`,
    ];

    return paragraphs.join('\n');
  }
}

export const aiDraftEngine = new AIDraftEngine();
