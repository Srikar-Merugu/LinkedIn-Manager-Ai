import mongoose from 'mongoose';
import pino from 'pino';
import { VoiceProfile, IVoiceProfile } from '../../models/brand/VoiceProfile';
import { VoiceSample } from '../../models/onboarding/VoiceSample';
import { LinkedInActivity } from '../../models/LinkedInActivity';

const logger = pino();

export class VoiceProfileService {

  async getVoiceProfile(userId: string): Promise<IVoiceProfile | null> {
    return VoiceProfile.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      isActive: true,
    });
  }

  async generateVoiceProfile(
    userId: string,
    brandDnaId?: string
  ): Promise<IVoiceProfile> {
    const samples = await VoiceSample.find({
      userId: new mongoose.Types.ObjectId(userId),
    }).lean();

    const activity = await LinkedInActivity.find({
      userId: new mongoose.Types.ObjectId(userId),
    }).sort({ timestamp: -1 }).limit(50).lean();

    const allTexts = [
      ...samples.map(s => s.content),
      ...activity.filter(a => a.content).map(a => a.content || ''),
    ].filter(Boolean);

    const vocabulary = this.analyzeVocabulary(allTexts);
    const sentenceStructure = this.analyzeSentenceStructure(allTexts);
    const writingStyle = this.analyzeWritingStyle(allTexts);
    const emotionalTone = this.analyzeEmotionalTone(allTexts);
    const storytelling = this.analyzeStorytelling(allTexts);
    const engagement = this.analyzeEngagement(activity);

    const existing = await VoiceProfile.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      isActive: true,
    });

    const profileData = {
      userId: new mongoose.Types.ObjectId(userId),
      brandDnaId: brandDnaId ? new mongoose.Types.ObjectId(brandDnaId) : undefined,
      vocabularyPatterns: vocabulary,
      sentenceStructure,
      writingStyle,
      emotionalTone,
      storytellingStyle: storytelling,
      engagement,
      confidence: Math.min(allTexts.length / 20, 1),
      sampleCount: allTexts.length,
      lastAnalyzedAt: new Date(),
      isActive: true,
      status: allTexts.length >= 5 ? 'ready' as const : 'building' as const,
    };

    if (existing) {
      Object.assign(existing, profileData);
      await existing.save();
      return existing;
    }

    return VoiceProfile.create(profileData);
  }

  private analyzeVocabulary(texts: string[]): IVoiceProfile['vocabularyPatterns'] {
    const all = texts.join(' ').toLowerCase();
    const words = all.split(/\s+/).filter(w => w.length > 2);

    const freq = new Map<string, number>();
    for (const w of words) freq.set(w, (freq.get(w) || 0) + 1);

    const sorted = [...freq.entries()].sort((a, b) => b[1] - a[1]);
    const favoriteWords = sorted.slice(0, 10).map(([w]) => w);

    const industryTerms = [
      'strategy', 'innovation', 'leadership', 'growth', 'impact',
      'solution', 'scale', 'transform', 'optimize', 'ecosystem',
      'synergy', 'leverage', 'agile', 'roadmap', 'stakeholder',
    ].filter(t => all.includes(t));

    const fillerWords = [
      'actually', 'basically', 'literally', 'essentially', 'simply',
      'just', 'very', 'really', 'quite', 'somewhat',
    ].filter(f => freq.has(f));

    const avgWordLength = words.reduce((s, w) => s + w.length, 0) / (words.length || 1);
    const wordComplexity = Math.min(avgWordLength / 10, 1);

    const jargonScore = industryTerms.length > 5 ? 'high'
      : industryTerms.length > 3 ? 'moderate'
      : industryTerms.length > 1 ? 'low'
      : 'none' as const;

    return {
      favoriteWords,
      industryTerms,
      fillerWordsToAvoid: fillerWords,
      uniquePhrases: [],
      wordComplexity,
      jargonLevel: jargonScore,
    };
  }

  private analyzeSentenceStructure(texts: string[]): IVoiceProfile['sentenceStructure'] {
    const sentences = texts.flatMap(t => t.split(/[.!?]+/).filter(s => s.trim().length > 0));
    const lengths = sentences.map(s => s.split(/\s+/).filter(Boolean).length);
    const avgLen = lengths.reduce((a, b) => a + b, 0) / (lengths.length || 1);

    const structure: IVoiceProfile['sentenceStructure'] = {
      averageSentenceLength: Math.round(avgLen),
      preferredStructure: avgLen > 25 ? 'long' : avgLen > 15 ? 'medium' : avgLen > 8 ? 'short' : 'varied',
      usesBulletPoints: texts.some(t => t.includes('•') || t.includes('- ') || /\d+\.\s/.test(t)),
      usesQuestions: texts.some(t => t.includes('?')),
      usesStories: texts.some(t => t.length > 500),
      paragraphLength: 'medium',
      transitionWords: ['however', 'therefore', 'furthermore', 'moreover', 'consequently'].filter(t => texts.some(text => text.toLowerCase().includes(t))),
    };

    return structure;
  }

  private analyzeWritingStyle(texts: string[]): IVoiceProfile['writingStyle'] {
    const all = texts.join(' ');
    const sentences = texts.flatMap(t => t.split(/[.!?]+/).filter(s => s.trim().length > 0));
    const firstPerson = sentences.filter(s => /\b(I|we|my|our)\b/i.test(s)).length;
    const secondPerson = sentences.filter(s => /\b(you|your)\b/i.test(s)).length;
    const dataMentions = (all.match(/\d+%/g) || []).length + (all.match(/data|analytics|metrics|quantify/i) || []).length;

    return {
      formality: Math.min((all.match(/formal|professional|establish|utilize/i) || []).length * 0.1 + 0.3, 1),
      confidence: Math.min((all.match(/confident|believe|know|certain|definitely|absolutely/i) || []).length * 0.1 + 0.5, 1),
      assertiveness: Math.min((all.match(/must|should|need|will|always|never|essential|critical/i) || []).length * 0.1 + 0.4, 1),
      empathy: Math.min((all.match(/understand|feel|care|support|help|listen|appreciate/i) || []).length * 0.1 + 0.3, 1),
      humor: Math.min((all.match(/funny|hilarious|joke|lol|smile|laugh|irony/i) || []).length * 0.1 + 0.1, 1),
      storytelling: Math.min((all.match(/story|experience|journey|when|remember|once|then|after/i) || []).length * 0.05 + 0.3, 1),
      dataDriven: Math.min(dataMentions * 0.1 + 0.2, 1),
      emotionalAppeal: Math.min((all.match(/inspiring|passion|love|excited|grateful|amazing|incredible/i) || []).length * 0.1 + 0.2, 1),
      directness: firstPerson > secondPerson ? 'direct' : secondPerson > firstPerson ? 'balanced' : 'balanced',
      perspective: firstPerson > sentences.length * 0.5 ? 'first_person'
        : secondPerson > sentences.length * 0.3 ? 'second_person'
        : 'mixed',
    };
  }

  private analyzeEmotionalTone(texts: string[]): IVoiceProfile['emotionalTone'] {
    const all = texts.join(' ').toLowerCase();
    const tonePatterns: Record<string, string[]> = {
      'Professional': ['professional', 'strategic', 'executive', 'corporate', 'business'],
      'Inspiring': ['inspiring', 'motivational', 'vision', 'dream', 'purpose'],
      'Analytical': ['analyze', 'data', 'research', 'framework', 'methodology'],
      'Passionate': ['passionate', 'love', 'excited', 'thrilled', 'energized'],
      'Empathetic': ['understand', 'support', 'help', 'care', 'community'],
      'Innovative': ['innovative', 'creative', 'disruptive', 'future', 'cutting-edge'],
      'Authoritative': ['expert', 'leading', 'authority', 'recognized', 'trusted'],
      'Encouraging': ['encourage', 'believe', 'growth', 'potential', 'opportunity'],
    };

    const tones: string[] = [];
    for (const [tone, keywords] of Object.entries(tonePatterns)) {
      if (keywords.some(k => all.includes(k))) {
        tones.push(tone);
      }
    }

    const avoidedTones = ['Aggressive', 'Dismissive', 'Arrogant', 'Negative'];
    const sentimentScore = this.calculateSentiment(all);

    return {
      dominantTones: tones.slice(0, 3),
      toneRange: tones,
      avoidedTones,
      emotionalWords: ['impact', 'growth', 'passion', 'innovation', 'journey'].filter(w => all.includes(w)),
      sentimentBaseline: sentimentScore,
    };
  }

  private analyzeStorytelling(texts: string[]): IVoiceProfile['storytellingStyle'] {
    const all = texts.join(' ').toLowerCase();

    const arcScore: Record<string, number> = {
      'challenge-solution': (all.match(/challenge|problem|solution|solve|overcome|resolve/i) || []).length,
      'journey': (all.match(/journey|path|started|began|evolv|progress/i) || []).length,
      'lesson-learned': (all.match(/lesson|learned|taught|realized|discovered|insight/i) || []).length,
      'behind-the-scenes': (all.match(/behind|process|inside|peek|exclusive|sneak/i) || []).length,
      'data-story': (all.match(/data|research|study|survey|statistic|metric/i) || []).length,
    };

    const preferredArc = Object.entries(arcScore).sort((a, b) => b[1] - a[1])[0]?.[0] as IVoiceProfile['storytellingStyle']['preferredNarrativeArc'] || 'journey';

    const hookPatterns: Record<string, number> = {
      'question': (all.match(/\?/g) || []).length,
      'statistic': (all.match(/\d+%/g) || []).length,
      'story': (all.match(/when i|remember|one day|years ago|i recall/i) || []).length,
      'controversy': (all.match(/but|however|actually|truth|myth|wrong/i) || []).length,
      'how-to': (all.match(/how to|steps|guide|tips|way to|method/i) || []).length,
    };

    const hookPref = Object.entries(hookPatterns).sort((a, b) => b[1] - a[1])[0]?.[0] as IVoiceProfile['storytellingStyle']['hookPreference'] || 'story';

    const ctaPatterns: Record<string, number> = {
      'direct': (all.match(/follow|subscribe|connect|share|comment|like|try/i) || []).length,
      'subtle': (all.match(/let me know|what do you|would you|curious|thoughts\?/i) || []).length,
      'question': (all.match(/what's your|have you|do you|how do you|what do/i) || []).length,
      'engagement': (all.match(/tag|mention|challenge|nominate|vote|poll/i) || []).length,
    };

    const ctaPref = Object.entries(ctaPatterns).sort((a, b) => b[1] - a[1])[0]?.[0] as IVoiceProfile['storytellingStyle']['ctaPreference'] || 'direct';

    return {
      preferredNarrativeArc: preferredArc,
      usesPersonalAnecdotes: texts.some(t => /\b(I|my|we)\b/i.test(t)),
      usesCaseStudies: texts.some(t => /case study|example|scenario|client|project/i.test(t)),
      usesAnalogies: texts.some(t => /like a|just as|similar to|compared|unlike|analogous/i.test(t)),
      hookPreference: hookPref,
      ctaPreference: ctaPref,
    };
  }

  private analyzeEngagement(activity: any[]): IVoiceProfile['engagement'] {
    const posts = activity.filter(a => a.type === 'post' || a.type === 'article');
    const totalEngagement = posts.reduce(
      (sum: number, p: any) => sum + (p.engagement?.likes || 0) + (p.engagement?.comments || 0) + (p.engagement?.shares || 0),
      0
    );

    return {
      averagePostLength: posts.length > 0
        ? Math.round(posts.reduce((s: number, p: any) => s + (p.content?.length || 0), 0) / posts.length)
        : 0,
      optimalPostLength: 0,
      averageEngagementRate: posts.length > 0 ? Math.round(totalEngagement / posts.length) : 0,
      bestPerformingHooks: [],
      bestPerformingCTAs: [],
      bestPostingTimes: [],
      bestPostingDays: [],
    };
  }

  private calculateSentiment(text: string): number {
    const positive = ['great', 'excellent', 'amazing', 'wonderful', 'fantastic',
      'love', 'happy', 'grateful', 'inspired', 'exciting',
      'successful', 'powerful', 'impactful', 'innovative', 'beautiful'];
    const negative = ['bad', 'terrible', 'awful', 'poor', 'difficult',
      'challenging', 'struggle', 'failed', 'worst', 'hate',
      'unfortunately', 'disappointing', 'frustrating', 'stressful', 'painful'];

    const words = text.toLowerCase().split(/\s+/);
    const posCount = words.filter(w => positive.some(p => w.includes(p))).length;
    const negCount = words.filter(w => negative.some(n => w.includes(n))).length;
    const total = posCount + negCount;

    if (total === 0) return 0;
    return Math.round(((posCount - negCount) / total) * 100) / 100;
  }
}

export const voiceProfileService = new VoiceProfileService();
