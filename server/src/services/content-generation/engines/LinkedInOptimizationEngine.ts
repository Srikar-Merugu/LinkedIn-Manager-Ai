import pino from 'pino';

const logger = pino();

export interface OptimizationInput {
  hook: string;
  body: string;
  cta: string;
  contentType: string;
  topic: string;
}

export interface OptimizationResult {
  dwellTimeScore: number;
  commentScore: number;
  saveScore: number;
  shareScore: number;
  discussionQuality: number;
  overall: number;
  issues: Array<{ type: string; text: string; suggestion: string }>;
}

const ENGAGEMENT_BAIT = [
  'like if you agree', 'share if you care', 'comment below', 'type yes',
  '1 like = 1 prayer', 'ignore if', 'only real ones', '90% of people',
  'this will blow your mind', 'you won\'t believe', 'share this with',
];

const LOW_VALUE_PATTERNS = [
  'just wanted to share', 'thought i\'d post', 'random thought',
  'quick update', 'nothing special', 'just a quick',
];

export class LinkedInOptimizationEngine {
  optimize(input: OptimizationInput): OptimizationResult {
    logger.info({ contentType: input.contentType }, 'Optimizing for LinkedIn');

    const hook = input.hook || '';
    const body = input.body || '';
    const cta = input.cta || '';
    const contentType = input.contentType || '';
    const topic = input.topic || '';

    const issues: OptimizationResult['issues'] = [];
    const fullContent = `${hook}\n\n${body}\n\n${cta}`;

    const dwellTimeScore = this.evaluateDwellTime(hook, body);
    const commentScore = this.evaluateCommentPotential(hook, body, cta);
    const saveScore = this.evaluateSavePotential(body, cta, contentType);
    const shareScore = this.evaluateSharePotential(body, cta, topic);
    const discussionQuality = this.evaluateDiscussionQuality(body);

    this.checkEngagementBait(fullContent, issues);
    this.checkGenericWriting(fullContent, issues);
    this.checkLowValue(fullContent, issues);
    this.checkHookLength(hook, issues);
    this.checkContentLength(body, issues);
    this.checkCTAQuality(cta, issues);

    this.checkEngagementBait(fullContent, issues);
    this.checkGenericWriting(fullContent, issues);
    this.checkLowValue(fullContent, issues);
    this.checkHookLength(input.hook, issues);
    this.checkContentLength(input.body, issues);
    this.checkCTAQuality(input.cta, issues);

    const overall = Math.round(
      (dwellTimeScore * 0.2 + commentScore * 0.2 + saveScore * 0.2 + shareScore * 0.2 + discussionQuality * 0.2)
    );

    return { dwellTimeScore, commentScore, saveScore, shareScore, discussionQuality, overall, issues };
  }

  private evaluateDwellTime(hook: string, body: string): number {
    const words = body.split(/\s+/).filter(Boolean).length;
    const hasHookQuestion = hook.includes('?');
    const hasFormatting = body.includes('**') || body.includes('•');

    let score = 40;
    if (words >= 100 && words <= 300) score += 20;
    if (hasHookQuestion) score += 15;
    if (hasFormatting) score += 15;

    const hasLineBreaks = (body.match(/\n/g) || []).length >= 2;
    if (hasLineBreaks) score += 10;

    return Math.min(100, score);
  }

  private evaluateCommentPotential(hook: string, body: string, cta: string): number {
    let score = 30;

    if (cta.includes('?')) score += 20;
    if (cta.includes('👇') || cta.includes('↓')) score += 10;
    if (cta.toLowerCase().includes('comment') || cta.toLowerCase().includes('share')) score += 10;
    if (cta.toLowerCase().includes('agree') || cta.toLowerCase().includes('disagree')) score += 10;
    if (cta.toLowerCase().includes('what') || cta.toLowerCase().includes('your')) score += 10;

    const opinionTriggers = ['controversial', 'unpopular', 'hot take', 'change my mind'];
    const hasOpinionTrigger = opinionTriggers.some(t => hook.toLowerCase().includes(t));
    if (hasOpinionTrigger) score += 10;

    return Math.min(100, score);
  }

  private evaluateSavePotential(body: string, cta: string, contentType: string): number {
    let score = 30;

    const educationalKeywords = ['educational', 'framework', 'guide', 'tutorial', 'how to'];
    const isEducational = educationalKeywords.some(
      t => contentType.includes(t) || body.toLowerCase().includes(t)
    );
    if (isEducational) score += 20;

    if (body.includes('1.') || body.includes('•') || body.includes('- ')) score += 15;
    if (body.toLowerCase().includes('save') || cta.toLowerCase().includes('save')) score += 10;

    const hasList = (body.match(/\d+\./g) || []).length >= 3;
    if (hasList) score += 15;

    const hasActionableAdvice = ['you can', 'here\'s how', 'try this', 'do this'].some(
      t => body.toLowerCase().includes(t)
    );
    if (hasActionableAdvice) score += 10;

    return Math.min(100, score);
  }

  private evaluateSharePotential(body: string, cta: string, topic: string): number {
    let score = 30;

    const shareableTopics = ['career', 'growth', 'learn', 'success', 'failure', 'lesson'];
    const hasShareableTopic = shareableTopics.some(t => topic.toLowerCase().includes(t));
    if (hasShareableTopic) score += 15;

    const storyElements = ['because', 'but', 'then', 'however', 'after', 'before'];
    const storyCount = storyElements.filter(e => body.toLowerCase().includes(e)).length;
    if (storyCount >= 3) score += 15;

    if (cta.toLowerCase().includes('share') || cta.toLowerCase().includes('tag')) score += 15;

    const emotionalTriggers = ['struggled', 'failed', 'mistake', 'regret', 'proud', 'grateful'];
    const hasEmotion = emotionalTriggers.some(t => body.toLowerCase().includes(t));
    if (hasEmotion) score += 15;

    const hasPersonalStory = body.toLowerCase().includes('i ') || body.toLowerCase().includes('my ');
    if (hasPersonalStory) score += 10;

    return Math.min(100, score);
  }

  private evaluateDiscussionQuality(body: string): number {
    let score = 40;

    const substantiveTerms = ['because', 'reason', 'evidence', 'experience', 'example', 'data', 'research', 'study'];
    const substantiveCount = substantiveTerms.filter(t => body.toLowerCase().includes(t)).length;
    score += substantiveCount * 5;

    if (body.split(/\n\n/).length >= 3) score += 10;

    const wordCount = body.split(/\s+/).filter(Boolean).length;
    if (wordCount >= 100 && wordCount <= 500) score += 10;

    return Math.min(100, score);
  }

  private checkEngagementBait(content: string, issues: OptimizationResult['issues']): void {
    ENGAGEMENT_BAIT.forEach(phrase => {
      if (content.toLowerCase().includes(phrase)) {
        issues.push({
          type: 'engagement_bait', text: phrase,
          suggestion: 'Remove this — it reduces content quality and LinkedIn may penalize it',
        });
      }
    });
  }

  private checkGenericWriting(content: string, issues: OptimizationResult['issues']): void {
    const genericPatterns = [
      /\bin today('s)? (digital |tech )?(landscape|world)\b/i,
      /\bit('s)? worth noting\b/i,
      /\blet('s)? dive in\b/i,
      /\bnavigating the (complexities|challenges)\b/i,
      /\bin the ever(-)?evolving\b/i,
    ];
    genericPatterns.forEach(pattern => {
      const match = content.match(pattern);
      if (match) {
        issues.push({
          type: 'generic_statement', text: match[0],
          suggestion: 'Replace with specific, personal language',
        });
      }
    });
  }

  private checkLowValue(content: string, issues: OptimizationResult['issues']): void {
    LOW_VALUE_PATTERNS.forEach(pattern => {
      if (content.toLowerCase().includes(pattern)) {
        issues.push({
          type: 'generic_statement', text: pattern,
          suggestion: 'Start with a strong hook instead of a disclaimer',
        });
      }
    });
  }

  private checkHookLength(hook: string, issues: OptimizationResult['issues']): void {
    const wordCount = hook.split(/\s+/).filter(Boolean).length;
    if (wordCount > 30) {
      issues.push({ type: 'weak_hook', text: 'Hook is too long', suggestion: 'Keep hooks under 30 words for maximum impact' });
    }
    if (wordCount < 5) {
      issues.push({ type: 'weak_hook', text: 'Hook is too short', suggestion: 'Add more context to make the hook compelling' });
    }
  }

  private checkContentLength(body: string, issues: OptimizationResult['issues']): void {
    const wordCount = body.split(/\s+/).filter(Boolean).length;
    if (wordCount > 500) {
      issues.push({ type: 'generic_statement', text: 'Content is too long', suggestion: 'Aim for 150-300 words for optimal LinkedIn engagement' });
    }
    if (wordCount < 50) {
      issues.push({ type: 'generic_statement', text: 'Content is too short', suggestion: 'Add more depth and value to the post' });
    }
  }

  private checkCTAQuality(cta: string, issues: OptimizationResult['issues']): void {
    const hasAction = cta.includes('?') || cta.includes('👇') ||
      cta.toLowerCase().includes('share') || cta.toLowerCase().includes('comment') ||
      cta.toLowerCase().includes('tag') || cta.toLowerCase().includes('save') ||
      cta.toLowerCase().includes('follow');
    if (!hasAction) {
      issues.push({
        type: 'weak_cta', text: 'CTA lacks clear direction',
        suggestion: 'Add a question or a specific action for readers',
      });
    }
  }
}

export const linkedInOptimizationEngine = new LinkedInOptimizationEngine();
