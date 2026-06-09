import pino from 'pino';
import type { IWritingDNA } from '../../../models/writing/WritingDNA';

const logger = pino();

export interface MatchScoreResult {
  overall: number;
  vocabulary: number;
  tone: number;
  structure: number;
  storytelling: number;
  cta: number;
  hook: number;
  breakdown: Array<{
    dimension: string;
    score: number;
    reason: string;
    suggestions: string[];
  }>;
}

export class VoiceMatchScoringEngine {

  score(content: string, dna: IWritingDNA): MatchScoreResult {
    const texts = [content];
    const lower = content.toLowerCase();

    const vocabScore = this.scoreVocabulary(lower, dna);
    const toneScore = this.scoreTone(lower, dna);
    const structureScore = this.scoreStructure(content, dna);
    const storytellingScore = this.scoreStorytelling(lower, content, dna);
    const hookScore = this.scoreHook(content, dna);
    const ctaScore = this.scoreCTA(content, dna);

    const overall = Math.round(
      vocabScore * 0.2 +
      toneScore * 0.2 +
      structureScore * 0.15 +
      storytellingScore * 0.2 +
      hookScore * 0.15 +
      ctaScore * 0.1
    );

    return {
      overall,
      vocabulary: vocabScore,
      tone: toneScore,
      structure: structureScore,
      storytelling: storytellingScore,
      cta: ctaScore,
      hook: hookScore,
      breakdown: [
        {
          dimension: 'Vocabulary',
          score: vocabScore,
          reason: vocabScore >= 80 ? 'Word choice matches your style' : vocabScore >= 60 ? 'Some vocabulary mismatches detected' : 'Vocabulary differs significantly from your style',
          suggestions: this.getVocabSuggestions(vocabScore, dna),
        },
        {
          dimension: 'Tone',
          score: toneScore,
          reason: toneScore >= 80 ? 'Tone is consistent with your voice' : toneScore >= 60 ? 'Tone could be more aligned' : 'Tone does not match your natural voice',
          suggestions: this.getToneSuggestions(toneScore, dna),
        },
        {
          dimension: 'Structure',
          score: structureScore,
          reason: structureScore >= 80 ? 'Structure matches your patterns' : structureScore >= 60 ? 'Structure could be more natural' : 'Structure differs from your style',
          suggestions: this.getStructureSuggestions(structureScore, dna),
        },
        {
          dimension: 'Storytelling',
          score: storytellingScore,
          reason: storytellingScore >= 80 ? 'Storytelling approach matches' : storytellingScore >= 60 ? 'Could use your storytelling patterns' : 'Storytelling style differs',
          suggestions: [],
        },
        {
          dimension: 'Hook',
          score: hookScore,
          reason: hookScore >= 80 ? 'Hook style matches your patterns' : hookScore >= 60 ? 'Try your preferred hook style' : 'Opening does not match your style',
          suggestions: [],
        },
        {
          dimension: 'CTA',
          score: ctaScore,
          reason: ctaScore >= 80 ? 'CTA style matches your patterns' : ctaScore >= 60 ? 'CTA could match better' : 'Closing does not match your style',
          suggestions: [],
        },
      ],
    };
  }

  private scoreVocabulary(text: string, dna: IWritingDNA): number {
    let score = 100;

    const favoriteWords = dna.vocabularyProfile.favoriteWords || [];
    const fillerWords = dna.vocabularyProfile.fillerWords || [];
    const technicalTerms = dna.vocabularyProfile.technicalTerms || [];

    const matchedFavorites = favoriteWords.filter(w => text.includes(w)).length;
    const matchedFiller = fillerWords.filter(w => text.includes(w)).length;

    if (favoriteWords.length > 0) {
      const favRatio = matchedFavorites / favoriteWords.length;
      score -= (1 - Math.min(favRatio * 2, 1)) * 30;
    }

    if (fillerWords.length > 0) {
      const expectedFillerRatio = fillerWords.length / (fillerWords.length + 50);
      const actualFillerRatio = matchedFiller / Math.max(text.split(/\s+/).length, 1);
      const fillerDiff = Math.abs(actualFillerRatio - expectedFillerRatio);
      score -= fillerDiff * 100 * 0.5;
    }

    const avgWordLen = text.split(/\s+/).filter(Boolean).reduce((s, w) => s + w.length, 0) / Math.max(text.split(/\s+/).filter(Boolean).length, 1);
    const complexityDiff = Math.abs(avgWordLen - (dna.vocabularyProfile.avgWordLength || 5)) / 5;
    score -= complexityDiff * 20;

    return Math.max(0, Math.round(score));
  }

  private scoreTone(text: string, dna: IWritingDNA): number {
    const primaryTone = dna.toneProfile.primary?.toLowerCase() || '';
    if (!primaryTone) return 50;

    const toneSignals: Record<string, RegExp[]> = {
      'professional': [/professional|results|deliver|execute|strategic|solution|client|stakeholder/i],
      'educational': [/learn|teach|understand|explain|concept|framework|guide/i],
      'inspirational': [/inspire|believe|dream|possible|journey|purpose|motivation/i],
      'technical': [/code|algorithm|api|database|function|implementation|pipeline/i],
      'analytical': [/analyze|data|research|study|metric|statistic|measure/i],
      'conversational': [/honestly|actually|basically|so|well|you know/i],
      'humorous': [/funny|hilarious|joke|lol|honestly though/i],
      'empathetic': [/understand|feel|support|care|struggle|difficult|hard/i],
      'authoritative': [/expert|leading|authority|trusted|proven|certified/i],
      'storytelling': [/story|experience|journey|when i|back when|one day/i],
    };

    const primaryPatterns = toneSignals[primaryTone];
    if (!primaryPatterns) return 50;

    const matches = primaryPatterns.reduce((s, p) => s + (text.match(p) || []).length, 0);
    const expectedMatches = Math.max(text.split(/\s+/).length * 0.02, 1);

    const matchRatio = Math.min(matches / expectedMatches, 2);
    return Math.round(Math.min(matchRatio * 60, 100));
  }

  private scoreStructure(text: string, dna: IWritingDNA): number {
    let score = 100;
    const structure = dna.structureProfile;

    const words = text.split(/\s+/).filter(Boolean);
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 5);
    const avgSentLen = sentences.length > 0 ? words.length / sentences.length : 0;

    if (structure.avgSentenceLength > 0) {
      const diff = Math.abs(avgSentLen - structure.avgSentenceLength);
      score -= Math.min(diff * 2, 30);
    }

    const hasBullets = /[•\-*\d+\.]\s/.test(text);
    if (structure.usesBulletPoints > 0.3 && !hasBullets) {
      score -= 20;
    } else if (structure.usesBulletPoints < 0.1 && hasBullets) {
      score -= 20;
    }

    const hasQuestions = text.includes('?');
    if (structure.usesQuestions > 0.2 && !hasQuestions) {
      score -= 15;
    } else if (structure.usesQuestions < 0.05 && hasQuestions) {
      score -= 15;
    }

    return Math.max(0, Math.round(score));
  }

  private scoreStorytelling(text: string, content: string, dna: IWritingDNA): number {
    let score = 70;
    const bp = dna.storytellingBlueprint;

    if (bp.usesAnecdotes) {
      const hasStory = /when i|i remember|one day|last year|years ago|recently|i was/i.test(text);
      if (hasStory) score += 15;
      else score -= 10;
    }

    if (bp.usesData) {
      const hasData = /\d+%|\d+x|increased|decreased|grew/i.test(text);
      if (hasData) score += 15;
      else score -= 10;
    }

    return Math.max(0, Math.min(100, score));
  }

  private scoreHook(text: string, dna: IWritingDNA): number {
    const firstLine = text.split('\n')[0]?.trim() || '';
    if (!firstLine) return 50;

    const hooks = dna.hooks || [];
    if (hooks.length === 0) return 50;

    const preferredHook = hooks[0];
    const hookPatterns: Record<string, RegExp[]> = {
      question: [/^(how|what|why|when|where|who|do|does|are|can|should)/i, /\?$/],
      contrarian: [/^(unpopular opinion|hot take|controversial|actually)/i],
      personal: [/^(i |i'm |i was |i've |my |when i)/i],
      bold_claim: [/^(the #1|the best|the worst|the most|nobody|stop)/i],
      data_point: [/^\d+/, /^(according to|studies show|research says)/i],
      story_opening: [/^(last year|last week|yesterday|a few|back in)/i],
      how_to: [/^(here's how|how i|how to|my framework)/i],
    };

    const patterns = hookPatterns[preferredHook.type];
    if (!patterns) return 60;

    const matchesPreferred = patterns.some(p => p.test(firstLine));
    return matchesPreferred ? 90 : 40;
  }

  private scoreCTA(text: string, dna: IWritingDNA): number {
    const lines = text.split('\n').filter(l => l.trim().length > 5);
    const lastLine = lines[lines.length - 1] || '';

    const ctas = dna.ctas || [];
    if (ctas.length === 0) return 50;

    const preferredCTA = ctas[0];
    const ctaPatterns: Record<string, RegExp[]> = {
      question: [/\?$/, /what do you think|have you|how do you|share your/i],
      direct: [/^(follow|subscribe|connect|share|comment|like)/i],
      subtle: [/^(let me know|would love|curious|happy to)/i],
      engagement: [/^(tag|mention|nominate|challenge|vote|poll|agree)/i],
      story: [/^(that's why|that's how|here's what|this is why)/i],
    };

    const patterns = ctaPatterns[preferredCTA.type];
    if (!patterns) return 60;

    const matchesPreferred = patterns.some(p => p.test(lastLine));
    return matchesPreferred ? 90 : 40;
  }

  private getVocabSuggestions(score: number, dna: IWritingDNA): string[] {
    if (score >= 80) return ['Vocabulary is well-aligned'];
    const suggestions: string[] = [];
    const faves = dna.vocabularyProfile.favoriteWords?.slice(0, 3) || [];
    if (faves.length > 0) suggestions.push(`Use more of your signature words: "${faves.join(', ')}"`);
    return suggestions;
  }

  private getToneSuggestions(score: number, dna: IWritingDNA): string[] {
    if (score >= 80) return ['Tone is consistent'];
    const tone = dna.toneProfile.primary || '';
    return [`Adjust tone to be more "${tone}"`, 'Match your natural voice patterns'];
  }

  private getStructureSuggestions(score: number, dna: IWritingDNA): string[] {
    if (score >= 80) return ['Structure matches your style'];
    const avgLen = dna.structureProfile.avgSentenceLength || 0;
    const suggestions: string[] = [];
    if (avgLen > 0) suggestions.push(`Aim for ~${Math.round(avgLen)} words per sentence`);
    if (dna.structureProfile.usesBulletPoints > 0.3) suggestions.push('Add bullet points for readability');
    if (dna.structureProfile.usesQuestions > 0.2) suggestions.push('Include questions to engage readers');
    return suggestions;
  }
}

export const voiceMatchScoringEngine = new VoiceMatchScoringEngine();
