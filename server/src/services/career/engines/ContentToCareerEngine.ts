import pino from 'pino';

const logger = pino();

export interface ContentToCareerResult {
  goal: string;
  recommendedContentTypes: Array<{
    type: string;
    description: string;
    priority: number;
    examples: string[];
    estimatedImpact: 'high' | 'medium' | 'low';
  }>;
  recommendedTopics: string[];
  contentFrequency: string;
  strategy: string;
}

const GOAL_CONTENT_MAP: Record<string, Array<{
  type: string;
  description: string;
  examples: string[];
  impact: 'high' | 'medium' | 'low';
  defaultPriority: number;
}>> = {
  'internship': [
    { type: 'Project Breakdowns', description: 'Show technical depth through project deep-dives', examples: ['How I built [project]: architecture decisions', 'Building [x] from scratch: lessons learned'], impact: 'high', defaultPriority: 1 },
    { type: 'Learning Journey', description: 'Document your learning process and growth', examples: ['30 days of [technology]: what I learned', 'My journey from zero to [skill]'], impact: 'high', defaultPriority: 2 },
    { type: 'Interview Preparation', description: 'Share interview experiences and study approaches', examples: ['How I prepared for [company] technical interviews', 'Top [n] system design concepts for interviews'], impact: 'medium', defaultPriority: 3 },
    { type: 'Build In Public', description: 'Share your building process transparently', examples: ['Week [n] of building [project]: progress and blockers', 'What I learned shipping my first [type]'], impact: 'high', defaultPriority: 4 },
    { type: 'Technical Lessons', description: 'Teach concepts you have mastered', examples: ['Understanding [concept]: a visual guide', '[Technology] explained simply'], impact: 'medium', defaultPriority: 5 },
  ],
  'job_search': [
    { type: 'Case Studies', description: 'Show measurable impact from past work', examples: ['How I improved [metric] by [x]% at [company]', 'Building [system] that handled [scale]'], impact: 'high', defaultPriority: 1 },
    { type: 'Thought Leadership', description: 'Establish expertise in your domain', examples: ['Why [approach] is the future of [field]', 'My framework for [domain challenge]'], impact: 'high', defaultPriority: 2 },
    { type: 'Project Deep Dives', description: 'Detailed technical walkthroughs', examples: ['Architecture deep dive: building [system]', 'Technical decisions behind [project]'], impact: 'high', defaultPriority: 3 },
    { type: 'Industry Insights', description: 'Share analysis of industry trends', examples: ['The state of [industry] in 2025', 'What [trend] means for [profession]'], impact: 'medium', defaultPriority: 4 },
    { type: 'Career Reflections', description: 'Share career lessons and pivots', examples: ['What I learned from [n] years in [field]', 'My career framework for growth'], impact: 'medium', defaultPriority: 5 },
  ],
  'freelancing': [
    { type: 'Client Results', description: 'Showcase client success stories', examples: ['How I delivered [result] for [client type]', 'Client case study: from problem to solution'], impact: 'high', defaultPriority: 1 },
    { type: 'Framework Posts', description: 'Share your working methodology', examples: ['My [step] framework for [outcome]', 'How I approach [client problem]'], impact: 'high', defaultPriority: 2 },
    { type: 'Authority Content', description: 'Build expertise in your niche', examples: ['Why [approach] outperforms [alternative]', 'The definitive guide to [topic]'], impact: 'high', defaultPriority: 3 },
    { type: 'Industry Insights', description: 'Share market knowledge', examples: ['[Industry] trends every [role] should know', 'What I am seeing in [industry] right now'], impact: 'medium', defaultPriority: 4 },
    { type: 'Process Posts', description: 'Show your working process', examples: ['Behind the scenes: how I [service delivery]', 'My toolkit for [service area]'], impact: 'medium', defaultPriority: 5 },
  ],
  'startup': [
    { type: 'Founder Journey', description: 'Document startup building experience', examples: ['Building [startup]: month [n] update', 'What I learned raising our seed round'], impact: 'high', defaultPriority: 1 },
    { type: 'Product Updates', description: 'Share product development progress', examples: ['What we shipped this month', 'Product update: [feature] launch and learnings'], impact: 'high', defaultPriority: 2 },
    { type: 'Build In Public', description: 'Transparent building process', examples: ['[Metric] update: how we grew [x] in [timeframe]', 'Transparent revenue report: month [n]'], impact: 'high', defaultPriority: 3 },
    { type: 'Growth Experiments', description: 'Share growth strategies and results', examples: ['Growth experiment: [strategy] increased [metric] by [x]%', 'What worked and what did not in our growth stack'], impact: 'medium', defaultPriority: 4 },
    { type: 'Customer Learnings', description: 'Share customer insights', examples: ['What our customers taught us about [problem]', 'How [customer insight] changed our product direction'], impact: 'medium', defaultPriority: 5 },
  ],
  'personal_branding': [
    { type: 'Personal Stories', description: 'Share authentic experiences and lessons', examples: ['The moment that changed my career', 'Why I left [x] to build [y]'], impact: 'high', defaultPriority: 1 },
    { type: 'Unique Perspectives', description: 'Share contrarian or unique viewpoints', examples: ['Why [popular opinion] is actually wrong', 'My unconventional approach to [topic]'], impact: 'high', defaultPriority: 2 },
    { type: 'Expertise Showcases', description: 'Demonstrate domain authority', examples: ['[n] years of [field] taught me [lesson]', 'The framework I use for [complex task]'], impact: 'high', defaultPriority: 3 },
    { type: 'Value-Add Content', description: 'Provide actionable value to audience', examples: ['[n] tools I recommend for [task]', 'A complete guide to [topic] for beginners'], impact: 'medium', defaultPriority: 4 },
    { type: 'Community Engagement', description: 'Content that sparks discussion', examples: ['What is your take on [industry debate]?', 'I need your advice on [decision]'], impact: 'medium', defaultPriority: 5 },
  ],
  'thought_leadership': [
    { type: 'Original Frameworks', description: 'Create and share original methodologies', examples: ['Introducing the [name] framework for [outcome]', 'My [n]-step system for [domain challenge]'], impact: 'high', defaultPriority: 1 },
    { type: 'Industry Predictions', description: 'Make and defend predictions', examples: ['[Industry] in [year]: [n] predictions', 'Why [trend] will dominate [timeframe]'], impact: 'high', defaultPriority: 2 },
    { type: 'Deep Analysis', description: 'In-depth analysis of industry issues', examples: ['The [problem] in [industry]: causes and solutions', 'Deconstructing [trend]: what most people miss'], impact: 'high', defaultPriority: 3 },
    { type: 'Contrarian Views', description: 'Challenge mainstream thinking', examples: ['Why [popular approach] is holding you back', 'The uncomfortable truth about [topic]'], impact: 'high', defaultPriority: 4 },
    { type: 'Research & Insights', description: 'Share original research or analysis', examples: ['I analyzed [n] [data points] and here is what I found', 'The data behind [trend]: an analysis'], impact: 'medium', defaultPriority: 5 },
  ],
};

export class ContentToCareerEngine {

  map(goal: string): ContentToCareerResult {
    const normalizedGoal = goal?.toLowerCase().replace(/\s+/g, '_') || 'personal_branding';
    const contentTypes = GOAL_CONTENT_MAP[normalizedGoal] || GOAL_CONTENT_MAP['personal_branding'];

    const recommendedContentTypes = contentTypes.map(ct => ({
      type: ct.type,
      description: ct.description,
      priority: ct.defaultPriority,
      examples: ct.examples,
      estimatedImpact: ct.impact,
    }));

    const allTopics = contentTypes.flatMap(ct => ct.examples.map(e => this.extractTopic(e)));
    const uniqueTopics = [...new Set(allTopics)].filter(Boolean).slice(0, 10);

    const strategy = this.generateStrategy(normalizedGoal);

    logger.info({ goal: normalizedGoal, contentTypesGenerated: contentTypes.length }, 'Content-to-career mapping complete');

    return {
      goal: normalizedGoal,
      recommendedContentTypes,
      recommendedTopics: uniqueTopics,
      contentFrequency: this.suggestFrequency(normalizedGoal),
      strategy,
    };
  }

  private extractTopic(example: string): string {
    const match = example.match(/\[([^\]]+)\]/);
    return match ? match[1] : '';
  }

  private suggestFrequency(goal: string): string {
    const freqMap: Record<string, string> = {
      'internship': '3-4 posts per week focusing on learning and building',
      'job_search': '3-5 posts per week with case studies and insights',
      'freelancing': '4-5 posts per week to maintain visibility',
      'startup': '4-5 posts per week for growth and visibility',
      'personal_branding': '3-4 posts per week consistently',
      'thought_leadership': '2-3 high-quality posts per week',
    };
    return freqMap[goal] || '3-4 posts per week';
  }

  private generateStrategy(goal: string): string {
    const strategies: Record<string, string> = {
      'internship': 'Focus 60% on technical depth (projects, learning), 25% on interview prep, 15% on personal journey. Target companies you want to intern at.',
      'job_search': 'Focus 50% on proven expertise (case studies, deep dives), 30% on thought leadership, 20% on career narrative. Optimize content for recruiter discovery.',
      'freelancing': 'Focus 40% on client results, 30% on methodology, 20% on industry insight, 10% on process. Every post should demonstrate value delivery.',
      'startup': 'Focus 35% on building journey, 25% on product, 20% on growth, 20% on customer insights. Build an audience of potential users and investors.',
      'personal_branding': 'Focus 40% on unique perspective, 30% on expertise, 20% on stories, 10% on engagement. Consistency is more important than virality.',
      'thought_leadership': 'Focus 50% on original ideas, 30% on deep analysis, 20% on industry commentary. Quality over frequency — each post should add new value.',
    };
    return strategies[goal] || 'Create a balanced mix of educational and engagement content aligned with your career goals.';
  }
}

export const contentToCareerEngine = new ContentToCareerEngine();
