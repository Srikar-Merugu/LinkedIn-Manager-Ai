import pino from 'pino';
import type { IEmotionalProfile } from '../../../models/writing/WritingDNA';

const logger = pino();

export class EmotionalIntelligenceEngine {

  analyze(texts: string[]): IEmotionalProfile {
    const all = texts.join(' ');
    const lower = all.toLowerCase();
    const sentences = texts.flatMap(t => t.split(/[.!?]+/).filter(s => s.trim().length > 0));

    const confidence = this.scoreDimension(lower, {
      positive: ['confident', 'know', 'certain', 'sure', 'absolutely', 'definitely', 'clearly', 'undoubtedly', 'without question', 'i know'],
      negative: ['maybe', 'perhaps', 'possibly', 'not sure', 'uncertain', 'unsure', 'might', 'could be', 'i think'],
    });

    const curiosity = this.scoreDimension(lower, {
      positive: ['curious', 'wonder', 'explore', 'experiment', 'discover', 'learn', 'question', 'try', 'test', 'what if', 'imagine'],
      negative: ['settle', 'accept', 'content', 'fine with', 'good enough'],
    });

    const humility = this.scoreDimension(lower, {
      positive: ['learned', 'mistake', 'failed', 'wrong', 'humble', 'still learning', 'not perfect', 'struggle', 'could have done better'],
      negative: ['perfect', 'always right', 'best at', 'never wrong', 'better than'],
    });

    const authority = this.scoreDimension(lower, {
      positive: ['expert', 'specialist', 'years of experience', 'led', 'managed', 'built', 'created', 'delivered', 'achieved', 'proven'],
      negative: ['junior', 'beginner', 'new to', 'novice', 'amateur'],
    });

    const optimism = this.scoreDimension(lower, {
      positive: ['excited', 'optimistic', 'opportunity', 'potential', 'growth', 'future', 'positive', 'hopeful', 'bright', 'promising'],
      negative: ['worried', 'concerned', 'pessimistic', 'negative', 'bleak', 'hopeless', 'downside'],
    });

    const riskTolerance = this.scoreDimension(lower, {
      positive: ['took a risk', 'bet on', 'went all in', 'quit', 'started', 'invested', 'committed', 'bold', 'leap', 'jump'],
      negative: ['safe', 'cautious', 'careful', 'conservative', 'hesitant', 'avoided', 'played it safe'],
    });

    const assertiveness = this.scoreDimension(lower, {
      positive: ['must', 'should', 'need to', 'don\'t', 'won\'t', 'never', 'always', 'essential', 'critical', 'mandatory'],
      negative: ['optional', 'maybe', 'could', 'suggestion', 'if you want', 'up to you', 'possibly'],
    });

    const empathy = this.scoreDimension(lower, {
      positive: ['understand', 'feel', 'support', 'help', 'care', 'listen', 'empathize', 'compassion', 'kindness', 'we'],
      negative: ['alone', 'only you', 'your problem', 'not my issue', 'indifferent'],
    });

    return {
      confidence: Math.round(confidence * 100) / 100,
      curiosity: Math.round(curiosity * 100) / 100,
      humility: Math.round(humility * 100) / 100,
      authority: Math.round(authority * 100) / 100,
      optimism: Math.round(optimism * 100) / 100,
      riskTolerance: Math.round(riskTolerance * 100) / 100,
      assertiveness: Math.round(assertiveness * 100) / 100,
      empathy: Math.round(empathy * 100) / 100,
    };
  }

  private scoreDimension(
    text: string,
    signals: { positive: string[]; negative: string[] }
  ): number {
    const posCount = signals.positive.filter(s => text.includes(s)).length;
    const negCount = signals.negative.filter(s => text.includes(s)).length;
    const total = posCount + negCount;

    if (total === 0) return 0.5;

    const posWeight = posCount / signals.positive.length;
    const negWeight = negCount / signals.negative.length;
    const raw = (posWeight - negWeight + 1) / 2;

    return Math.max(0, Math.min(1, raw));
  }
}

export const emotionalIntelligenceEngine = new EmotionalIntelligenceEngine();
