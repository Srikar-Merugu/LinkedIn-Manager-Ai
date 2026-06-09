import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IToneDimension {
  primary: string;
  primaryConfidence: number;
  secondary: string[];
  avoidedTones: string[];
  toneRange: string[];
}

export interface IHookPattern {
  type: 'question' | 'contrarian' | 'personal' | 'bold_claim' | 'data_point' | 'story_opening' | 'how_to';
  text: string;
  frequency: number;
  effectiveness: number;
  confidence: number;
}

export interface ICTAPattern {
  type: 'direct' | 'question' | 'subtle' | 'engagement' | 'story';
  text: string;
  frequency: number;
  effectiveness: number;
  confidence: number;
}

export interface IContentFormatPreference {
  format: 'story' | 'framework' | 'educational' | 'contrarian' | 'journey' | 'career' | 'opinion' | 'tutorial' | 'list';
  rank: number;
  frequency: number;
  avgEngagement: number;
}

export interface IStorytellingBlueprint {
  preferredArc: string;
  hookStyle: string;
  lessonDelivery: string;
  conclusionPattern: string;
  usesAnecdotes: boolean;
  usesData: boolean;
  usesAnalogy: boolean;
  narrativeStructure: string[];
}

export interface IEmotionalProfile {
  confidence: number;
  curiosity: number;
  humility: number;
  authority: number;
  optimism: number;
  riskTolerance: number;
  assertiveness: number;
  empathy: number;
}

export interface IWritingDNA extends Document {
  userId: mongoose.Types.ObjectId;
  profileId?: mongoose.Types.ObjectId;
  version: number;

  voiceSignature: string;
  communicationStyle: string;
  overallConfidence: number;

  vocabularyProfile: {
    favoriteWords: string[];
    frequentPhrases: string[];
    technicalTerms: string[];
    industryJargon: string[];
    uniqueExpressions: string[];
    fillerWords: string[];
    wordComplexity: number;
    avgWordLength: number;
    vocabularyRichness: number;
  };

  toneProfile: IToneDimension;

  structureProfile: {
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
  };

  hooks: IHookPattern[];
  ctas: ICTAPattern[];

  formatPreferences: IContentFormatPreference[];

  storytellingBlueprint: IStorytellingBlueprint;

  emotionalProfile: IEmotionalProfile;

  writingRules: string[];
  sampleCount: number;
  totalWordsAnalyzed: number;
  lastAnalyzedAt: Date;
  isActive: boolean;

  createdAt: Date;
  updatedAt: Date;
}

const WritingDNASchema = new Schema<IWritingDNA>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  profileId: { type: Schema.Types.ObjectId, ref: 'LinkedInProfile' },
  version: { type: Number, default: 1 },

  voiceSignature: { type: String, required: true },
  communicationStyle: { type: String, required: true },
  overallConfidence: { type: Number, min: 0, max: 1, required: true },

  vocabularyProfile: {
    favoriteWords: [String],
    frequentPhrases: [String],
    technicalTerms: [String],
    industryJargon: [String],
    uniqueExpressions: [String],
    fillerWords: [String],
    wordComplexity: { type: Number, min: 0, max: 1 },
    avgWordLength: Number,
    vocabularyRichness: { type: Number, min: 0, max: 1 },
  },

  toneProfile: {
    primary: String,
    primaryConfidence: { type: Number, min: 0, max: 1 },
    secondary: [String],
    avoidedTones: [String],
    toneRange: [String],
  },

  structureProfile: {
    avgSentenceLength: Number,
    avgParagraphLength: Number,
    preferredParagraphLength: { type: String, enum: ['short', 'medium', 'long', 'varied'] },
    usesBulletPoints: { type: Number, min: 0, max: 1 },
    usesQuestions: { type: Number, min: 0, max: 1 },
    usesStories: { type: Number, min: 0, max: 1 },
    usesDataPoints: { type: Number, min: 0, max: 1 },
    usesQuotes: { type: Number, min: 0, max: 1 },
    emojiFrequency: { type: Number, min: 0, max: 1 },
    lineBreakFrequency: { type: Number, min: 0, max: 1 },
  },

  hooks: [{
    type: { type: String, enum: ['question', 'contrarian', 'personal', 'bold_claim', 'data_point', 'story_opening', 'how_to'] },
    text: String,
    frequency: { type: Number, min: 0 },
    effectiveness: { type: Number, min: 0, max: 1 },
    confidence: { type: Number, min: 0, max: 1 },
  }],

  ctas: [{
    type: { type: String, enum: ['direct', 'question', 'subtle', 'engagement', 'story'] },
    text: String,
    frequency: { type: Number, min: 0 },
    effectiveness: { type: Number, min: 0, max: 1 },
    confidence: { type: Number, min: 0, max: 1 },
  }],

  formatPreferences: [{
    format: { type: String, enum: ['story', 'framework', 'educational', 'contrarian', 'journey', 'career', 'opinion', 'tutorial', 'list'] },
    rank: { type: Number },
    frequency: { type: Number },
    avgEngagement: { type: Number },
  }],

  storytellingBlueprint: {
    preferredArc: String,
    hookStyle: String,
    lessonDelivery: String,
    conclusionPattern: String,
    usesAnecdotes: Boolean,
    usesData: Boolean,
    usesAnalogy: Boolean,
    narrativeStructure: [String],
  },

  emotionalProfile: {
    confidence: { type: Number, min: 0, max: 1 },
    curiosity: { type: Number, min: 0, max: 1 },
    humility: { type: Number, min: 0, max: 1 },
    authority: { type: Number, min: 0, max: 1 },
    optimism: { type: Number, min: 0, max: 1 },
    riskTolerance: { type: Number, min: 0, max: 1 },
    assertiveness: { type: Number, min: 0, max: 1 },
    empathy: { type: Number, min: 0, max: 1 },
  },

  writingRules: [String],
  sampleCount: { type: Number, default: 0 },
  totalWordsAnalyzed: { type: Number, default: 0 },
  lastAnalyzedAt: { type: Date },
  isActive: { type: Boolean, default: true },
}, {
  timestamps: true,
  collection: 'writing_dnas',
});

WritingDNASchema.index({ userId: 1, isActive: 1 });
WritingDNASchema.index({ 'toneProfile.primary': 1 });

export const WritingDNA: Model<IWritingDNA> = mongoose.model<IWritingDNA>(
  'WritingDNA',
  WritingDNASchema
);
export default WritingDNA;
