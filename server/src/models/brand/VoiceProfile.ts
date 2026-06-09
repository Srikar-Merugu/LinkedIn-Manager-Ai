import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IVoiceProfile extends Document {
  userId: mongoose.Types.ObjectId;
  brandDnaId?: mongoose.Types.ObjectId;

  vocabularyPatterns: {
    favoriteWords: string[];
    industryTerms: string[];
    fillerWordsToAvoid: string[];
    uniquePhrases: string[];
    wordComplexity: number;
    jargonLevel: 'none' | 'low' | 'moderate' | 'high';
  };

  sentenceStructure: {
    averageSentenceLength: number;
    preferredStructure: 'short' | 'medium' | 'long' | 'varied';
    usesBulletPoints: boolean;
    usesQuestions: boolean;
    usesStories: boolean;
    paragraphLength: 'short' | 'medium' | 'long';
    transitionWords: string[];
  };

  writingStyle: {
    formality: number;
    confidence: number;
    assertiveness: number;
    empathy: number;
    humor: number;
    storytelling: number;
    dataDriven: number;
    emotionalAppeal: number;
    directness: 'direct' | 'indirect' | 'balanced';
    perspective: 'first_person' | 'second_person' | 'third_person' | 'mixed';
  };

  emotionalTone: {
    dominantTones: string[];
    toneRange: string[];
    avoidedTones: string[];
    emotionalWords: string[];
    sentimentBaseline: number;
  };

  storytellingStyle: {
    preferredNarrativeArc: 'challenge-solution' | 'journey' | 'lesson-learned' | 'behind-the-scenes' | 'data-story';
    usesPersonalAnecdotes: boolean;
    usesCaseStudies: boolean;
    usesAnalogies: boolean;
    hookPreference: 'question' | 'statistic' | 'story' | 'controversy' | 'how-to';
    ctaPreference: 'direct' | 'subtle' | 'question' | 'engagement';
  };

  engagement: {
    averagePostLength: number;
    optimalPostLength: number;
    averageEngagementRate: number;
    bestPerformingHooks: string[];
    bestPerformingCTAs: string[];
    bestPostingTimes: string[];
    bestPostingDays: string[];
  };

  embeddingRef?: number[];
  embeddingVersion?: string;

  confidence: number;
  sampleCount: number;
  lastAnalyzedAt: Date;
  isActive: boolean;
  status: 'building' | 'ready' | 'needs_review';
  createdAt: Date;
  updatedAt: Date;
}

const VoiceProfileSchema = new Schema<IVoiceProfile>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true,
  },
  brandDnaId: {
    type: Schema.Types.ObjectId,
    ref: 'BrandDNA',
  },

  vocabularyPatterns: {
    favoriteWords: [String],
    industryTerms: [String],
    fillerWordsToAvoid: [String],
    uniquePhrases: [String],
    wordComplexity: { type: Number, default: 0.5, min: 0, max: 1 },
    jargonLevel: {
      type: String,
      enum: ['none', 'low', 'moderate', 'high'],
      default: 'moderate',
    },
  },

  sentenceStructure: {
    averageSentenceLength: { type: Number, default: 0 },
    preferredStructure: {
      type: String,
      enum: ['short', 'medium', 'long', 'varied'],
      default: 'medium',
    },
    usesBulletPoints: { type: Boolean, default: false },
    usesQuestions: { type: Boolean, default: false },
    usesStories: { type: Boolean, default: true },
    paragraphLength: {
      type: String,
      enum: ['short', 'medium', 'long'],
      default: 'medium',
    },
    transitionWords: [String],
  },

  writingStyle: {
    formality: { type: Number, default: 0.5, min: 0, max: 1 },
    confidence: { type: Number, default: 0.5, min: 0, max: 1 },
    assertiveness: { type: Number, default: 0.5, min: 0, max: 1 },
    empathy: { type: Number, default: 0.5, min: 0, max: 1 },
    humor: { type: Number, default: 0.3, min: 0, max: 1 },
    storytelling: { type: Number, default: 0.5, min: 0, max: 1 },
    dataDriven: { type: Number, default: 0.5, min: 0, max: 1 },
    emotionalAppeal: { type: Number, default: 0.5, min: 0, max: 1 },
    directness: {
      type: String,
      enum: ['direct', 'indirect', 'balanced'],
      default: 'balanced',
    },
    perspective: {
      type: String,
      enum: ['first_person', 'second_person', 'third_person', 'mixed'],
      default: 'first_person',
    },
  },

  emotionalTone: {
    dominantTones: [String],
    toneRange: [String],
    avoidedTones: [String],
    emotionalWords: [String],
    sentimentBaseline: { type: Number, default: 0, min: -1, max: 1 },
  },

  storytellingStyle: {
    preferredNarrativeArc: {
      type: String,
      enum: ['challenge-solution', 'journey', 'lesson-learned', 'behind-the-scenes', 'data-story'],
      default: 'journey',
    },
    usesPersonalAnecdotes: { type: Boolean, default: true },
    usesCaseStudies: { type: Boolean, default: false },
    usesAnalogies: { type: Boolean, default: false },
    hookPreference: {
      type: String,
      enum: ['question', 'statistic', 'story', 'controversy', 'how-to'],
      default: 'story',
    },
    ctaPreference: {
      type: String,
      enum: ['direct', 'subtle', 'question', 'engagement'],
      default: 'direct',
    },
  },

  engagement: {
    averagePostLength: { type: Number, default: 0 },
    optimalPostLength: { type: Number, default: 0 },
    averageEngagementRate: { type: Number, default: 0 },
    bestPerformingHooks: [String],
    bestPerformingCTAs: [String],
    bestPostingTimes: [String],
    bestPostingDays: [String],
  },

  embeddingRef: [Number],
  embeddingVersion: String,

  confidence: { type: Number, default: 0, min: 0, max: 1 },
  sampleCount: { type: Number, default: 0 },
  lastAnalyzedAt: Date,
  isActive: { type: Boolean, default: true },
  status: {
    type: String,
    enum: ['building', 'ready', 'needs_review'],
    default: 'building',
  },
}, {
  timestamps: true,
  collection: 'voice_profiles',
});

VoiceProfileSchema.index({ userId: 1, status: 1 });
VoiceProfileSchema.index({ embeddingVersion: 1 });
VoiceProfileSchema.index({ confidence: -1 });

VoiceProfileSchema.methods.updateFromPerformance = function (
  postMetrics: Array<{
    content: string;
    engagement: number;
    hook: string;
    cta: string;
    postedAt: Date;
  }>
): void {
  if (postMetrics.length < 5) return;

  const sorted = [...postMetrics].sort((a, b) => b.engagement - a.engagement);
  const top5 = sorted.slice(0, 5);

  this.engagement.bestPerformingHooks = [
    ...new Set(top5.map((p) => p.hook)),
  ];
  this.engagement.bestPerformingCTAs = [
    ...new Set(top5.map((p) => p.cta)),
  ];

  const avgLength =
    postMetrics.reduce((s, p) => s + p.content.length, 0) / postMetrics.length;
  this.engagement.averagePostLength = Math.round(avgLength);

  this.engagement.optimalPostLength = Math.round(
    top5.reduce((s, p) => s + p.content.length, 0) / top5.length
  );

  this.sampleCount += postMetrics.length;
  this.lastAnalyzedAt = new Date();
};

export const VoiceProfile: Model<IVoiceProfile> = mongoose.model<IVoiceProfile>(
  'VoiceProfile',
  VoiceProfileSchema
);
export default VoiceProfile;
