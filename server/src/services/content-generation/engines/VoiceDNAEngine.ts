import pino from 'pino';

const logger = pino();

export interface VoiceProfile {
  vocabularyRules: string[];
  toneRules: string[];
  storytellingRules: string[];
  hookRules: string[];
  ctaRules: string[];
  communicationRules: string[];
}

export interface VoiceValidationResult {
  passed: boolean;
  vocabularyMatch: number;
  toneMatch: number;
  storytellingMatch: number;
  hookMatch: number;
  ctaMatch: number;
  overall: number;
  issues: Array<{ rule: string; expected: string; found: string; severity: 'low' | 'medium' | 'high' }>;
  details: {
    vocabulary: string[];
    tone: string;
    storytelling: string;
    hook: string;
    cta: string;
  };
}

const AI_PHRASES = [
  'in today\'s digital landscape', 'it\'s worth noting that', 'let\'s dive in',
  'navigating the complexities', 'in the ever-evolving world', 'at the end of the day',
  'the bottom line is', 'game changer', 'thought leader', 'synergy',
  'circle back', 'touch base', 'paradigm shift', 'leverage', 'utilize',
  'a deep dive into', 'landscape', 'in summary', 'as previously mentioned',
  'it is what it is', 'I hope this', 'please find attached', 'in the fast-paced world',
  'cutting-edge', 'best-in-class', 'world-class', 'revolutionary', 'disruptive',
];

export class VoiceDNAEngine {
  validate(content: string, profile: VoiceProfile): VoiceValidationResult {
    logger.info('Validating content against voice DNA');

    const vocabularyMatch = this.checkVocabulary(content, profile.vocabularyRules);
    const toneMatch = this.checkTone(content, profile.toneRules);
    const storytellingMatch = this.checkStorytelling(content, profile.storytellingRules);
    const hookMatch = this.checkHooks(content, profile.hookRules);
    const ctaMatch = this.checkCTAs(content, profile.ctaRules);

    const issues: VoiceValidationResult['issues'] = [];

    if (vocabularyMatch < 70) {
      issues.push({ rule: 'vocabulary', expected: `Use vocabulary from: ${profile.vocabularyRules.slice(0, 3).join(', ')}`, found: 'Content uses generic terms instead of voice-specific vocabulary', severity: 'high' });
    }
    if (toneMatch < 70) {
      issues.push({ rule: 'tone', expected: `Tone should be: ${profile.toneRules[0] || 'authentic'}`, found: 'Tone deviates from voice profile', severity: 'medium' });
    }

    const overall = Math.round((vocabularyMatch + toneMatch + storytellingMatch + hookMatch + ctaMatch) / 5);

    return {
      passed: overall >= 70,
      vocabularyMatch, toneMatch, storytellingMatch, hookMatch, ctaMatch,
      overall, issues,
      details: {
        vocabulary: vocabularyMatch >= 70 ? ['Voice-specific vocabulary detected'] : ['Generic vocabulary detected'],
        tone: toneMatch >= 70 ? 'Tone matches voice profile' : 'Tone needs adjustment',
        storytelling: storytellingMatch >= 70 ? 'Storytelling aligns with voice' : 'Storytelling style mismatch',
        hook: hookMatch >= 70 ? 'Hook style matches voice' : "Hook doesn't match voice patterns",
        cta: ctaMatch >= 70 ? 'CTA aligns with voice' : "CTA style needs adjustment",
      },
    };
  }

  detectAIPhrases(content: string): { phrases: string[]; count: number } {
    const found = AI_PHRASES.filter(p => content.toLowerCase().includes(p));
    return { phrases: found, count: found.length };
  }

  private checkVocabulary(content: string, rules: string[]): number {
    if (rules.length === 0) return 80;
    const matched = rules.filter(r => content.toLowerCase().includes(r.toLowerCase()));
    return Math.round((matched.length / rules.length) * 100);
  }

  private checkTone(content: string, rules: string[]): number {
    if (rules.length === 0) return 85;
    const toneIndicators = rules.map(r => r.toLowerCase());
    const content_lower = content.toLowerCase();
    const matched = toneIndicators.filter(t => content_lower.includes(t));
    const score = Math.round((matched.length / toneIndicators.length) * 100);
    return Math.min(100, score + 20);
  }

  private checkStorytelling(content: string, rules: string[]): number {
    const storyMarkers = ['but', 'then', 'however', 'realized', 'learned', 'discovered', 'changed', 'because', 'until', 'after'];
    const found = storyMarkers.filter(m => content.toLowerCase().includes(m)).length;
    return Math.min(100, Math.round((found / storyMarkers.length) * 120));
  }

  private checkHooks(content: string, rules: string[]): number {
    const firstLine = content.split('\n')[0] || '';
    if (rules.length === 0) return 75;
    const matched = rules.filter(r => firstLine.toLowerCase().includes(r.toLowerCase()));
    return Math.min(100, Math.round(50 + (matched.length / rules.length) * 50));
  }

  private checkCTAs(content: string, rules: string[]): number {
    const lastThreeLines = content.split('\n').slice(-3).join(' ');
    const ctaIndicators = ['?', '👇', 'share', 'follow', 'tag', 'comment', 'save', 'drop', 'what\'s', 'what is'];
    const found = ctaIndicators.filter(c => lastThreeLines.includes(c)).length;
    if (rules.length === 0) return Math.min(100, found * 20 + 50);
    return Math.min(100, Math.round(40 + (found / ctaIndicators.length) * 60));
  }
}

export const voiceDNAEngine = new VoiceDNAEngine();
