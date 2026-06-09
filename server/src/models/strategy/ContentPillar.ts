import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IContentPillar extends Document {
  userId: mongoose.Types.ObjectId;
  brandDnaId?: mongoose.Types.ObjectId;

  name: string;
  description: string;
  rationale: string;
  rank: number;

  subTopics: string[];
  keywords: string[];
  hashtags: string[];
  formats: Array<{
    type: 'post' | 'article' | 'carousel' | 'thread' | 'video';
    frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly';
    ratio: number;
  }>;

  cadence: {
    postsPerWeek: number;
    preferredDays: string[];
    preferredTimes: string[];
  };

  audience: {
    targetRoles: string[];
    targetSeniority: string[];
    painPoints: string[];
    questions: string[];
  };

  competitorAnalysis: Array<{
    creator: string;
    url: string;
    strengths: string[];
    contentGap: string;
  }>;

  performance: {
    totalPosts: number;
    averageEngagement: number;
    topPerformingTopics: string[];
    underperformingTopics: string[];
    lastAnalyzedAt?: Date;
  };

  confidence: number;
  isActive: boolean;
  status: 'draft' | 'active' | 'paused' | 'archived';
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

const ContentPillarSchema = new Schema<IContentPillar>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  brandDnaId: {
    type: Schema.Types.ObjectId,
    ref: 'BrandDNA',
  },

  name: { type: String, required: true },
  description: { type: String, required: true },
  rationale: { type: String, required: true },
  rank: { type: Number, required: true },

  subTopics: [String],
  keywords: [String],
  hashtags: [String],
  formats: [{
    type: {
      type: String,
      enum: ['post', 'article', 'carousel', 'thread', 'video'],
      required: true,
    },
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'biweekly', 'monthly'],
      required: true,
    },
    ratio: { type: Number, required: true, min: 0, max: 100 },
  }],

  cadence: {
    postsPerWeek: { type: Number, default: 2 },
    preferredDays: [String],
    preferredTimes: [String],
  },

  audience: {
    targetRoles: [String],
    targetSeniority: [String],
    painPoints: [String],
    questions: [String],
  },

  competitorAnalysis: [{
    creator: { type: String, required: true },
    url: String,
    strengths: [String],
    contentGap: String,
  }],

  performance: {
    totalPosts: { type: Number, default: 0 },
    averageEngagement: { type: Number, default: 0 },
    topPerformingTopics: [String],
    underperformingTopics: [String],
    lastAnalyzedAt: Date,
  },

  confidence: { type: Number, default: 0, min: 0, max: 1 },
  isActive: { type: Boolean, default: true },
  status: {
    type: String,
    enum: ['draft', 'active', 'paused', 'archived'],
    default: 'active',
    index: true,
  },
  version: { type: Number, default: 1 },
}, {
  timestamps: true,
  collection: 'content_pillars',
});

ContentPillarSchema.index({ userId: 1, isActive: 1, rank: 1 });
ContentPillarSchema.index({ userId: 1, status: 1 });
ContentPillarSchema.index({ keywords: 1 });
ContentPillarSchema.index({ 'competitorAnalysis.creator': 1 });

ContentPillarSchema.methods.getContentMix = function (): Record<string, number> {
  const mix: Record<string, number> = {};
  for (const f of this.formats) {
    mix[f.type] = f.ratio;
  }
  return mix;
};

export const ContentPillar: Model<IContentPillar> = mongoose.model<IContentPillar>(
  'ContentPillar',
  ContentPillarSchema
);
export default ContentPillar;
