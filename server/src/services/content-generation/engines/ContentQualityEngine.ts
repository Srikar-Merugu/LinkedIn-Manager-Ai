import pino from 'pino';

const logger = pino();

export interface QualityInput {
  content: string;
  contentType: string;
  topic: string;
  hook: string;
  cta: string;
}

export interface QualityResult {
  clarity: number;
  authenticity: number;
  readability: number;
  authority: number;
  uniqueness: number;
  engagementPotential: number;
  overall: number;
  strengths: string[];
  improvements: string[];
}

const READABILITY_STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'be',
  'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
  'would', 'could', 'should', 'may', 'might', 'shall', 'can', 'need',
]);

export class ContentQualityEngine {
  evaluate(input: QualityInput): QualityResult {
    logger.info({ contentType: input.contentType }, 'Evaluating content quality');

    const content = input.content || '';
    const topic = input.topic || '';
    const hook = input.hook || '';
    const cta = input.cta || '';
    const contentType = input.contentType || '';

    const clarity = this.evaluateClarity(content);
    const authenticity = this.evaluateAuthenticity(content);
    const readability = this.evaluateReadability(content);
    const authority = this.evaluateAuthority(content, topic);
    const uniqueness = this.evaluateUniqueness(content);
    const engagementPotential = this.evaluateEngagement({ content, hook, cta, contentType, topic });

    const overall = Math.round(
      (clarity * 0.2 + authenticity * 0.2 + readability * 0.15 + authority * 0.2 + uniqueness * 0.1 + engagementPotential * 0.15)
    );

    const strengths: string[] = [];
    const improvements: string[] = [];

    if (clarity >= 75) strengths.push('Clear and easy to understand');
    else improvements.push('Improve clarity — use shorter sentences and simpler language');

    if (authenticity >= 75) strengths.push('Authentic voice and personal perspective');
    else improvements.push('Add more personal experience and specific details');

    if (readability >= 70) strengths.push('Good readability and flow');
    else improvements.push('Break up long paragraphs and vary sentence length');

    if (authority >= 70) strengths.push('Demonstrates subject matter authority');
    else improvements.push('Add more specific examples and evidence of expertise');

    if (engagementPotential >= 70) strengths.push('Strong engagement potential');
    else improvements.push('Strengthen the hook and add a more compelling CTA');

    return {
      clarity, authenticity, readability, authority, uniqueness, engagementPotential,
      overall, strengths, improvements,
    };
  }

  private evaluateClarity(content: string): number {
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    if (sentences.length === 0) return 50;

    const avgWordsPerSentence = sentences.reduce((sum, s) => sum + s.split(/\s+/).filter(Boolean).length, 0) / sentences.length;

    if (avgWordsPerSentence <= 15) return 85;
    if (avgWordsPerSentence <= 20) return 75;
    if (avgWordsPerSentence <= 25) return 60;
    return 45;
  }

  private evaluateAuthenticity(content: string): number {
    const personalPronouns = ['i', 'my', 'me', 'we', 'our', 'mine'];
    const content_lower = content.toLowerCase();
    const pronounCount = personalPronouns.filter(p => content_lower.includes(p)).length;

    const firstPersonSentences = content.split(/[.!?]+/).filter(s => {
      const trimmed = s.trim().toLowerCase();
      return trimmed.startsWith('i ') || trimmed.startsWith('my ') || trimmed.startsWith('we ');
    }).length;

    const totalSentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
    const firstPersonRatio = totalSentences > 0 ? firstPersonSentences / totalSentences : 0;

    let score = 40 + (pronounCount * 5) + (firstPersonRatio * 30);
    if (pronounCount >= 3) score += 15;
    if (content_lower.includes('i learned') || content_lower.includes('i realized') || content_lower.includes('i discovered')) score += 10;

    return Math.min(100, Math.round(score));
  }

  private evaluateReadability(content: string): number {
    const lines = content.split('\n').filter(Boolean);
    const hasShortLines = lines.some(l => l.length > 0 && l.length <= 80);
    const hasBullets = content.includes('•') || content.includes('- ') || /\d+\.\s/.test(content);
    const hasWhiteSpace = lines.length >= 3;
    const hasBold = content.includes('**');

    let score = 40;
    if (hasShortLines) score += 15;
    if (hasBullets) score += 15;
    if (hasWhiteSpace) score += 15;
    if (hasBold) score += 15;

    return Math.min(100, score);
  }

  private evaluateAuthority(content: string, topic: string): number {
    const content_lower = content.toLowerCase();
    const topicWords = topic.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const topicMatch = topicWords.filter(w => content_lower.includes(w)).length;

    const authorityMarkers = [
      'i built', 'i created', 'i developed', 'i designed', 'i led',
      'my approach', 'my framework', 'my system', 'my method',
      'i learned', 'i discovered', 'i realized', 'years of', 'experience',
      'results', 'outcome', 'delivered',
    ];
    const markerCount = authorityMarkers.filter(m => content_lower.includes(m)).length;

    const score = 30 + (topicMatch / Math.max(topicWords.length, 1)) * 30 + markerCount * 8;
    return Math.min(100, Math.round(score));
  }

  private evaluateUniqueness(content: string): number {
    const genericPhrases = [
      'in conclusion', 'as mentioned', 'it is important to', 'there are many',
      'the key is', 'the main thing', 'ultimately', 'essentially', 'basically',
      'simply put', 'in other words', 'that being said',
    ];
    const content_lower = content.toLowerCase();
    const genericCount = genericPhrases.filter(p => content_lower.includes(p)).length;

    const words = content_lower.split(/\s+/).filter(w => !READABILITY_STOPWORDS.has(w) && w.length > 2);
    const uniqueWords = new Set(words);
    const uniquenessRatio = words.length > 0 ? uniqueWords.size / words.length : 0;

    let score = 50 + (uniquenessRatio * 30) - (genericCount * 8);
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  private evaluateEngagement(input: QualityInput): number {
    let score = 40;

    const hookQuestion = input.hook.includes('?');
    const hookStrong = input.hook.includes('—') || input.hook.includes(':') || input.hook.includes('nobody') || input.hook.includes('secret') || input.hook.includes('actually');
    if (hookQuestion) score += 10;
    if (hookStrong) score += 10;

    const ctaQuestion = input.cta.includes('?');
    const ctaAction = input.cta.includes('👇') || input.cta.includes('save') || input.cta.includes('share') || input.cta.includes('tag') || input.cta.includes('follow');
    if (ctaQuestion) score += 10;
    if (ctaAction) score += 10;

    const storyElements = ['because', 'but', 'then', 'however', 'realized', 'learned', 'discovered'];
    const storyCount = storyElements.filter(e => input.content.toLowerCase().includes(e)).length;
    score += storyCount * 3;

    return Math.min(100, score);
  }
}

export const contentQualityEngine = new ContentQualityEngine();
