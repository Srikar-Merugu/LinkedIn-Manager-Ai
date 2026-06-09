import pino from 'pino';
import type { IToneDimension } from '../../../models/writing/WritingDNA';

const logger = pino();

export class ToneDetectionEngine {

  analyze(texts: string[]): IToneDimension & { secondary: string[]; avoidedTones: string[] } {
    const all = texts.join(' ').toLowerCase();
    const tones = this.scoreTones(all, texts);

    tones.sort((a, b) => b.score - a.score);

    const primary = tones[0];
    const secondary = tones.filter(t => t.score > 0.2).slice(1, 4).map(t => t.name);
    const avoidedTones = tones.filter(t => t.score < 0.05).map(t => t.name);

    const allActiveTones = tones.filter(t => t.score > 0.1).map(t => t.name);

    return {
      primary: primary.name,
      primaryConfidence: Math.round(primary.score * 100) / 100,
      secondary,
      avoidedTones,
      toneRange: allActiveTones,
    };
  }

  private scoreTones(all: string, texts: string[]): Array<{ name: string; score: number }> {
    return [
      {
        name: 'Professional',
        score: this.calculateToneScore(all, texts, {
          keywords: ['professional', 'results', 'deliver', 'execute', 'strategic', 'solution', 'client', 'stakeholder'],
          patterns: [/formal/, /business/, /corporate/, /enterprise/],
          weight: 1,
        }),
      },
      {
        name: 'Educational',
        score: this.calculateToneScore(all, texts, {
          keywords: ['learn', 'teach', 'understand', 'explain', 'concept', 'framework', 'guide', 'tutorial', 'how to', 'steps'],
          patterns: [/here('s| is) how/, /let me explain/, /the key is/, /what i learned/],
          weight: 1,
        }),
      },
      {
        name: 'Inspirational',
        score: this.calculateToneScore(all, texts, {
          keywords: ['inspire', 'believe', 'dream', 'possible', 'journey', 'purpose', 'never give up', 'keep going', 'motivation'],
          patterns: [/you can/, /anything is possible/, /don't give up/, /keep pushing/],
          weight: 1,
        }),
      },
      {
        name: 'Technical',
        score: this.calculateToneScore(all, texts, {
          keywords: ['code', 'algorithm', 'api', 'database', 'function', 'implementation', 'architecture', 'pipeline', 'deploy', 'config'],
          patterns: [/type|interface|class|function|import|export|async/],
          weight: 1,
        }),
      },
      {
        name: 'Analytical',
        score: this.calculateToneScore(all, texts, {
          keywords: ['analyze', 'data', 'research', 'study', 'metric', 'statistic', 'measure', 'evaluate', 'compare', 'correlation'],
          patterns: [/\d+%/, /increase|decrease|grew|reduced/, /on average/],
          weight: 1,
        }),
      },
      {
        name: 'Conversational',
        score: this.calculateToneScore(all, texts, {
          keywords: ['honestly', 'actually', 'basically', 'so', 'well', 'you know', 'thing is', 'here\'s the thing'],
          patterns: [/^so /m, /^honestly/m, /right\?/, /you know\?/],
          weight: 1,
        }),
      },
      {
        name: 'Humorous',
        score: this.calculateToneScore(all, texts, {
          keywords: ['funny', 'hilarious', 'lol', 'joke', 'honestly though', 'can\'t make this up', 'plot twist'],
          patterns: [/😂|🤣|😅/, /jk/, /just kidding/],
          weight: 1,
        }),
      },
      {
        name: 'Empathetic',
        score: this.calculateToneScore(all, texts, {
          keywords: ['understand', 'feel', 'support', 'care', 'struggle', 'difficult', 'hard', 'vulnerable', 'imposter'],
          patterns: [/i get it/, /i know how/, /it's okay/, /you're not alone/],
          weight: 1,
        }),
      },
      {
        name: 'Authoritative',
        score: this.calculateToneScore(all, texts, {
          keywords: ['expert', 'leading', 'authority', 'recognized', 'trusted', 'industry standard', 'best practice', 'proven', 'certified'],
          patterns: [/i've found that/, /in my experience/, /based on my/, /the data shows/],
          weight: 1,
        }),
      },
      {
        name: 'Storytelling',
        score: this.calculateToneScore(all, texts, {
          keywords: ['story', 'experience', 'journey', 'when i', 'back when', 'one day', 'remember when', 'years ago'],
          patterns: [/let me tell you/, /here's a story/, /this one time/, /i'll never forget/],
          weight: 1,
        }),
      },
    ];
  }

  private calculateToneScore(
    all: string,
    texts: string[],
    config: { keywords: string[]; patterns: RegExp[]; weight: number }
  ): number {
    let score = 0;

    const keywordMatches = config.keywords.filter(k => all.includes(k)).length;
    score += Math.min(keywordMatches / config.keywords.length, 1) * 0.5;

    const patternMatches = config.patterns.reduce((sum, p) => {
      const matches = (all.match(p) || []).length;
      return sum + Math.min(matches, 3);
    }, 0);
    score += Math.min(patternMatches / config.patterns.length, 1) * 0.3;

    const textCount = texts.filter(t => config.keywords.some(k => t.toLowerCase().includes(k))).length;
    score += Math.min(textCount / texts.length, 1) * 0.2;

    return Math.min(score, 1);
  }
}

export const toneDetectionEngine = new ToneDetectionEngine();
