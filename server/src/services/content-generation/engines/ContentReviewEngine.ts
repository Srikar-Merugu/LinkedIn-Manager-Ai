import pino from 'pino';

const logger = pino();

export interface ContentReviewInput {
  hook: string;
  body: string;
  cta: string;
  fullContent: string;
  contentType: string;
  topic: string;
}

export interface DetectedIssue {
  type: 'ai_sounding' | 'overused_phrase' | 'generic_statement' | 'weak_hook' | 'weak_cta' | 'engagement_bait' | 'passive_voice' | 'jargon_overload';
  text: string;
  suggestion: string;
  severity: 'low' | 'medium' | 'high';
  position?: { start: number; end: number };
}

export interface SuggestedRewrite {
  original: string;
  rewrite: string;
  reason: string;
}

export interface ContentReviewResult {
  issues: DetectedIssue[];
  aiScore: number;
  humanScore: number;
  clicheCount: number;
  aiPhraseCount: number;
  rewriteSuggested: boolean;
  suggestedRewrites: SuggestedRewrite[];
  overallAssessment: string;
}

const AI_PHRASES = [
  'in today\'s digital landscape', 'it\'s worth noting that', 'let\'s dive in',
  'navigating the complexities', 'in the ever-evolving world', 'at the end of the day',
  'the bottom line is', 'game changer', 'thought leader', 'synergy',
  'circle back', 'touch base', 'paradigm shift', 'world-class', 'cutting-edge',
  'best-in-class', 'revolutionary', 'a deep dive into', 'in summary',
  'it is what it is', 'as previously mentioned', 'in the fast-paced world',
];

const OVERUSED_PHRASES = [
  'think outside the box', 'reach out', 'move the needle', 'drill down', 'bandwidth',
  'on the same page', 'take it offline', 'punt on that', 'boil the ocean',
  'low-hanging fruit', 'value-add', 'deep dive', 'circle back', 'action items',
  'pain point', 'win-win', 'best practice', 'leverage', 'holistic',
  'organic growth', 'scalable', 'ecosystem', 'stakeholder alignment',
];

const CLICHES = [
  'at the end of the day', 'what doesn\'t kill you', 'it is what it is',
  'been there done that', 'easier said than done', 'when life gives you lemons',
  'the elephant in the room', 'the calm before the storm', 'the best of both worlds',
  'think outside the box', 'there\'s no i in team', 'the grass is always greener',
];

export class ContentReviewEngine {
  review(input: ContentReviewInput): ContentReviewResult {
    logger.info({ contentType: input.contentType }, 'Reviewing content');

    const issues: DetectedIssue[] = [];

    this.detectAIPhrases(input.fullContent, issues);
    this.detectOverusedPhrases(input.fullContent, issues);
    this.detectCliches(input.fullContent, issues);
    this.detectWeakHook(input.hook, issues);
    this.detectWeakCTA(input.cta, issues);
    this.detectPassiveVoice(input.body, issues);

    const aiPhraseCount = issues.filter(i => i.type === 'ai_sounding').length;
    const clicheCount = issues.filter(i => i.type === 'overused_phrase').length;
    const totalIssues = issues.length;

    const aiScore = Math.min(100, totalIssues * 15);
    const humanScore = 100 - aiScore;
    const rewriteSuggested = aiScore > 30;

    const suggestedRewrites: SuggestedRewrite[] = [];
    if (aiPhraseCount > 0) {
      const aiIssue = issues.find(i => i.type === 'ai_sounding');
      if (aiIssue) {
        suggestedRewrites.push({
          original: aiIssue.text,
          rewrite: aiIssue.suggestion,
          reason: aiIssue.suggestion,
        });
      }
    }

    const overallAssessment = this.generateAssessment(aiScore, issues);

    return { issues, aiScore, humanScore, clicheCount, aiPhraseCount, rewriteSuggested, suggestedRewrites, overallAssessment };
  }

  private detectAIPhrases(content: string, issues: DetectedIssue[]): void {
    const content_lower = content.toLowerCase();
    AI_PHRASES.forEach(phrase => {
      const idx = content_lower.indexOf(phrase);
      if (idx !== -1) {
        const suggestion = this.suggestAIPhraseReplacement(phrase);
        issues.push({
          type: 'ai_sounding', text: phrase, suggestion,
          severity: idx < 200 ? 'high' : 'medium',
          position: { start: idx, end: idx + phrase.length },
        });
      }
    });
  }

  private suggestAIPhraseReplacement(phrase: string): string {
    const replacements: Record<string, string> = {
      'in today\'s digital landscape': 'Replace with specific context about your industry or niche',
      'it\'s worth noting that': 'Just state the fact directly — no need to preface it',
      'let\'s dive in': 'Start with your content directly — the dive in is implied',
      'navigating the complexities': 'Replace with specific challenges you actually faced',
      'in the ever-evolving world': 'Replace with specific timeframe and context',
      'at the end of the day': 'Cut this phrase and state your conclusion directly',
      'game changer': 'Replace with specific results or outcomes',
    };
    return replacements[phrase] || `Replace "${phrase}" with more specific, personal language`;
  }

  private detectOverusedPhrases(content: string, issues: DetectedIssue[]): void {
    const content_lower = content.toLowerCase();
    OVERUSED_PHRASES.forEach(phrase => {
      const idx = content_lower.indexOf(phrase);
      if (idx !== -1) {
        issues.push({
          type: 'overused_phrase', text: phrase,
          suggestion: `Replace "${phrase}" with a specific, original description`,
          severity: 'medium',
          position: { start: idx, end: idx + phrase.length },
        });
      }
    });
  }

  private detectCliches(content: string, issues: DetectedIssue[]): void {
    const content_lower = content.toLowerCase();
    CLICHES.forEach(cliche => {
      const idx = content_lower.indexOf(cliche);
      if (idx !== -1) {
        issues.push({
          type: 'overused_phrase', text: cliche,
          suggestion: 'Replace cliche with an original observation from your experience',
          severity: 'high',
          position: { start: idx, end: idx + cliche.length },
        });
      }
    });
  }

  private detectWeakHook(hook: string, issues: DetectedIssue[]): void {
    if (!hook || hook.length < 10) {
      issues.push({ type: 'weak_hook', text: hook, suggestion: 'Hook is too short or missing. Start with a compelling question, surprising fact, or personal story.', severity: 'high' });
      return;
    }

    const weakStarts = ['i think', 'i believe', 'just a', 'random', 'here is a', 'check out'];
    const hook_lower = hook.toLowerCase();
    const hasWeakStart = weakStarts.some(s => hook_lower.startsWith(s));
    if (hasWeakStart) {
      issues.push({ type: 'weak_hook', text: hook, suggestion: 'Start with a strong, confident statement. Remove hedging language.', severity: 'medium' });
    }

    if (!hook.includes('?') && !hook.includes(':') && !hook.includes('\u2014') && !hook.includes('\n')) {
      issues.push({ type: 'weak_hook', text: hook, suggestion: 'Consider adding a hook element — a question, colon for a list, or em dash for emphasis.', severity: 'low' });
    }
  }

  private detectWeakCTA(cta: string, issues: DetectedIssue[]): void {
    if (!cta || cta.length < 5) {
      issues.push({ type: 'weak_cta', text: cta, suggestion: 'Add a clear call-to-action. Ask a question or suggest a specific action.', severity: 'high' });
      return;
    }

    const hasAction = cta.includes('?') || cta.includes('\u{1F447}') ||
      cta.toLowerCase().includes('share') || cta.toLowerCase().includes('comment') ||
      cta.toLowerCase().includes('tag') || cta.toLowerCase().includes('save') ||
      cta.toLowerCase().includes('follow');
    if (!hasAction) {
      issues.push({ type: 'weak_cta', text: cta, suggestion: 'CTA should prompt an action: ask a question, invite sharing, or encourage saving.', severity: 'medium' });
    }
  }

  private detectPassiveVoice(body: string, issues: DetectedIssue[]): void {
    const passivePatterns = /\b(was|were|been|being|is being|are being|has been|have been|had been)\s+\w+ed\b/gi;
    let match;
    while ((match = passivePatterns.exec(body)) !== null) {
      issues.push({
        type: 'passive_voice', text: match[0],
        suggestion: 'Replace passive voice with active voice for more direct, engaging writing',
        severity: 'low',
        position: { start: match.index, end: match.index + match[0].length },
      });
    }
  }

  private generateAssessment(aiScore: number, issues: DetectedIssue[]): string {
    if (aiScore > 50) return 'Content reads like AI-generated text. Significant rewrites needed for authenticity.';
    if (aiScore > 30) return 'Content has some AI-sounding patterns. Review highlighted phrases and replace with personal language.';
    if (aiScore > 15) return 'Content feels mostly authentic. A few phrases could be more natural.';
    return 'Content reads naturally and authentically. Minimal AI detection flags.';
  }
}

export const contentReviewEngine = new ContentReviewEngine();
