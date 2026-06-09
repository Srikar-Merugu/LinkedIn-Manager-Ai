import pino from 'pino';
import type { IWritingDNA } from '../../../models/writing/WritingDNA';

const logger = pino();

export interface VocabResult {
  favoriteWords: string[];
  frequentPhrases: string[];
  technicalTerms: string[];
  industryJargon: string[];
  uniqueExpressions: string[];
  fillerWords: string[];
  wordComplexity: number;
  avgWordLength: number;
  vocabularyRichness: number;
}

export class VocabularyAnalysisEngine {

  analyze(texts: string[], existingProfile?: Partial<IWritingDNA['vocabularyProfile']>): VocabResult {
    const all = texts.join(' ').toLowerCase();
    const words = all.split(/\s+/).filter(w => w.length > 1);
    const sentences = texts.flatMap(t => t.split(/[.!?]+/).filter(s => s.trim().length > 0));

    const freq = new Map<string, number>();
    for (const w of words) freq.set(w, (freq.get(w) || 0) + 1);
    const sorted = [...freq.entries()].sort((a, b) => b[1] - a[1]);

    const totalWords = words.length;
    const uniqueWords = new Set(words).size;
    const lexicalDiversity = totalWords > 0 ? uniqueWords / totalWords : 0;

    const contentWords = words.filter(w => w.length > 3);
    const contentFreq = new Map<string, number>();
    for (const w of contentWords) contentFreq.set(w, (contentFreq.get(w) || 0) + 1);
    const sortedContent = [...contentFreq.entries()].sort((a, b) => b[1] - a[1]);

    const favoriteWords = sortedContent.slice(0, 15).map(([w]) => w);

    const technicalTerms = [
      'algorithm', 'api', 'architecture', 'backend', 'cache', 'ci/cd', 'database',
      'deploy', 'devops', 'docker', 'endpoint', 'framework', 'frontend', 'fullstack',
      'implementation', 'integration', 'kubernetes', 'latency', 'microservices',
      'middleware', 'optimization', 'pipeline', 'protocol', 'refactor', 'repository',
      'scalable', 'schema', 'sdk', 'serverless', 'test', 'typescript', 'webhook',
    ].filter(t => words.some(w => w.includes(t)));

    const industryJargon = [
      'leverage', 'synergy', 'optimize', 'streamline', 'scalable', 'ecosystem',
      'solution', 'paradigm', 'best-in-class', 'deep dive', 'boil the ocean',
      'move the needle', 'circle back', 'thought leadership', 'value-add',
    ].filter(j => all.includes(j));

    const uniqueExpressions = this.findUniqueExpressions(texts, sortedContent);

    const fillerWords = ['actually', 'basically', 'literally', 'essentially', 'simply',
      'just', 'very', 'really', 'quite', 'somewhat', 'honestly', 'truthfully',
    ].filter(f => freq.has(f));

    const bigrams = this.getNgrams(contentWords, 2);
    const trigrams = this.getNgrams(contentWords, 3);
    const frequentPhrases = [
      ...bigrams.slice(0, 5).map(([p]) => p),
      ...trigrams.slice(0, 5).map(([p]) => p),
    ].filter(Boolean);

    const avgWordLen = words.reduce((s, w) => s + w.length, 0) / (words.length || 1);
    const wordComplexity = Math.min(avgWordLen / 12, 1);

    const richness = Math.min(lexicalDiversity * 3, 1);

    return {
      favoriteWords,
      frequentPhrases,
      technicalTerms,
      industryJargon,
      uniqueExpressions,
      fillerWords,
      wordComplexity: Math.round(wordComplexity * 100) / 100,
      avgWordLength: Math.round(avgWordLen * 10) / 10,
      vocabularyRichness: Math.round(richness * 100) / 100,
    };
  }

  private findUniqueExpressions(texts: string[], sortedContent: [string, number][]): string[] {
    const expressions: string[] = [];
    const all = texts.join(' ').toLowerCase();

    const patterns = [
      /building in public/i, /learn in public/i, /shipping fast/i,
      /learning by doing/i, /growth mindset/i, /fail forward/i,
      /done is better than perfect/i, /think different/i,
      /move fast/i, /break things/i, /iterate quickly/i,
      /continuous improvement/i, /feedback loop/i, /user first/i,
      /data driven/i, /customer obsession/i, /bias for action/i,
      /deep work/i, /first principles/i, /compound effect/i,
      /flywheel/i, /network effect/i, /moat/i,
      /zero to one/i, /idea maze/i, /product market fit/i,
    ];

    for (const pattern of patterns) {
      const match = all.match(pattern);
      if (match) {
        expressions.push(match[0].trim());
      }
    }

    const topPhrases = sortedContent.slice(0, 5).map(([w]) => w);
    for (const phrase of topPhrases) {
      if (!expressions.includes(phrase)) {
        expressions.push(phrase);
      }
    }

    return [...new Set(expressions)].slice(0, 10);
  }

  private getNgrams(words: string[], n: number): [string, number][] {
    const ngrams = new Map<string, number>();
    for (let i = 0; i <= words.length - n; i++) {
      const phrase = words.slice(i, i + n).join(' ');
      ngrams.set(phrase, (ngrams.get(phrase) || 0) + 1);
    }
    return [...ngrams.entries()]
      .filter(([, count]) => count > 1)
      .sort((a, b) => b[1] - a[1]);
  }
}

export const vocabularyAnalysisEngine = new VocabularyAnalysisEngine();
