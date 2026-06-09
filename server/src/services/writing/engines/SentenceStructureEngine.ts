import pino from 'pino';

const logger = pino();

export interface StructureResult {
  avgSentenceLength: number;
  avgParagraphLength: number;
  preferredParagraphLength: 'short' | 'medium' | 'long' | 'varied';
  usesBulletPoints: number;
  usesQuestions: number;
  usesStories: number;
  usesDataPoints: number;
  usesQuotes: number;
  emojiFrequency: number;
  lineBreakFrequency: number;
}

export class SentenceStructureEngine {

  analyze(texts: string[]): StructureResult {
    const all = texts.join('\n\n');
    const paragraphs = all.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    const sentences = texts.flatMap(t => t.split(/[.!?]+/).filter(s => s.trim().length > 5));

    const sentenceLengths = sentences.map(s => s.split(/\s+/).filter(Boolean).length);
    const avgSentLen = sentenceLengths.reduce((a, b) => a + b, 0) / (sentenceLengths.length || 1);

    const paraLengths = paragraphs.map(p => p.split(/\s+/).filter(Boolean).length);
    const avgParaLen = paraLengths.reduce((a, b) => a + b, 0) / (paraLengths.length || 1);

    const paraPref = avgParaLen > 80 ? 'long' as const : avgParaLen > 40 ? 'medium' as const : avgParaLen > 20 ? 'short' as const : 'varied' as const;

    const bulletScore = texts.filter(t => /[•\-*\d+\.]\s/.test(t) || t.includes('\n- ') || t.includes('\n* ')).length / texts.length;

    const questionCount = texts.filter(t => t.includes('?')).length;
    const questionScore = texts.length > 0 ? questionCount / texts.length : 0;

    const storyIndicators = ['when i', 'one day', 'i remember', 'years ago', 'recently', 'last week', 'this happened', 'i was'];
    const storyScore = texts.filter(t => storyIndicators.some(ind => t.toLowerCase().includes(ind))).length / texts.length;

    const dataPatterns = [/\d+%/g, /\d+x/g, /\d+,\d+/g, /\$\d+/g, /increased|decreased|grew|dropped|reduced/g];
    const dataScore = texts.filter(t => dataPatterns.some(p => p.test(t))).length / texts.length;

    const quoteScore = texts.filter(t => t.includes('"') || t.includes('"') || t.includes('"')).length / texts.length;

    const emojiRegex = /[\p{Emoji}]/gu;
    const emojiCount = (all.match(emojiRegex) || []).length;
    const emojiScore = Math.min(emojiCount / (texts.length || 1) * 0.1, 1);

    const breaks = (all.match(/\n\s*\n/g) || []).length;
    const breakScore = Math.min(breaks / (paragraphs.length || 1) * 0.5, 1);

    return {
      avgSentenceLength: Math.round(avgSentLen * 10) / 10,
      avgParagraphLength: Math.round(avgParaLen * 10) / 10,
      preferredParagraphLength: paraPref,
      usesBulletPoints: Math.round(bulletScore * 100) / 100,
      usesQuestions: Math.round(questionScore * 100) / 100,
      usesStories: Math.round(storyScore * 100) / 100,
      usesDataPoints: Math.round(dataScore * 100) / 100,
      usesQuotes: Math.round(quoteScore * 100) / 100,
      emojiFrequency: Math.round(emojiScore * 100) / 100,
      lineBreakFrequency: Math.round(breakScore * 100) / 100,
    };
  }
}

export const sentenceStructureEngine = new SentenceStructureEngine();
