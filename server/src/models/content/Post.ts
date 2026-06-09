import mongoose, { Schema, Document, Model } from 'mongoose';
import { PostStatus, PostFormat, ContentSource } from '../../types/database';

export interface IPostVariant {
  version: number;
  hook: string;
  body: string;
  cta: string;
  hashtags: string[];
  reason: string;
  performancePrediction: number;
  createdAt: Date;
}

export interface IPost extends Document {
  userId: mongoose.Types.ObjectId;
  contentCalendarId?: mongoose.Types.ObjectId;
  contentPillarId?: mongoose.Types.ObjectId;
  strategyId?: mongoose.Types.ObjectId;
  opportunityId?: mongoose.Types.ObjectId;
  contentIdeaId?: mongoose.Types.ObjectId;
  parentPostId?: mongoose.Types.ObjectId;

  title: string;
  hook: string;
  body: string;
  cta: string;
  hashtags: string[];
  mentions: string[];
  linkUrl?: string;
  mediaUrls: string[];
  altText?: string;

  format: PostFormat;
  status: PostStatus;
  source: ContentSource;

  variants: IPostVariant[];
  selectedVariant?: number;

  scores: {
    brandAlignment: number;
    voiceMatch: number;
    engagementPotential: number;
    qualityScore: number;
    controversyRisk: number;
    overall: number;
  };

  qualityReview: {
    reviewedBy: 'ai' | 'human';
    reviewedAt?: Date;
    modifications: string[];
    passed: boolean;
    notes?: string;
  };

  aiMetadata: {
    generatedBy: string;
    agentVersion: string;
    generationTimeMs: number;
    model: string;
    promptTokens: number;
    completionTokens: number;
    cost: number;
  };

  schedule: {
    scheduledAt?: Date;
    publishedAt?: Date;
    timezone: string;
  };

  performance?: {
    impressions: number;
    likes: number;
    comments: number;
    shares: number;
    saves: number;
    engagementRate: number;
    profileVisits: number;
    followerGain: number;
    linkClicks: number;
    lastFetchedAt: Date;
  };

  isAIGenerated: boolean;
  isRecycled: boolean;
  tags: string[];
  labels: string[];

  createdAt: Date;
  updatedAt: Date;
}

const PostVariantSchema = new Schema<IPostVariant>({
  version: { type: Number, required: true },
  hook: { type: String, required: true },
  body: { type: String, required: true },
  cta: { type: String, required: true },
  hashtags: [String],
  reason: { type: String, required: true },
  performancePrediction: { type: Number, required: true, min: 0, max: 100 },
  createdAt: { type: Date, default: Date.now },
}, { _id: false });

const PostSchema = new Schema<IPost>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  contentCalendarId: { type: Schema.Types.ObjectId, ref: 'ContentCalendar' },
  contentPillarId: { type: Schema.Types.ObjectId, ref: 'ContentPillar' },
  strategyId: { type: Schema.Types.ObjectId, ref: 'ContentStrategy' },
  opportunityId: { type: Schema.Types.ObjectId, ref: 'Opportunity' },
  contentIdeaId: { type: Schema.Types.ObjectId, ref: 'ContentIdea' },
  parentPostId: { type: Schema.Types.ObjectId, ref: 'Post' },

  title: { type: String, required: true },
  hook: { type: String, required: true },
  body: { type: String, required: true },
  cta: { type: String, required: true },
  hashtags: [String],
  mentions: [String],
  linkUrl: String,
  mediaUrls: [String],
  altText: String,

  format: {
    type: String,
    enum: ['post', 'article', 'carousel', 'thread', 'poll', 'video'],
    required: true,
    index: true,
  },
  status: {
    type: String,
    enum: ['draft', 'review', 'approved', 'scheduled', 'published', 'failed', 'archived'],
    default: 'draft',
    index: true,
  },
  source: {
    type: String,
    enum: ['generated', 'manual', 'opportunity', 'recycled', 'ai_suggested'],
    default: 'generated',
  },

  variants: [PostVariantSchema],
  selectedVariant: Number,

  scores: {
    brandAlignment: { type: Number, default: 0, min: 0, max: 100 },
    voiceMatch: { type: Number, default: 0, min: 0, max: 100 },
    engagementPotential: { type: Number, default: 0, min: 0, max: 100 },
    qualityScore: { type: Number, default: 0, min: 0, max: 100 },
    controversyRisk: { type: Number, default: 0, min: 0, max: 100 },
    overall: { type: Number, default: 0, min: 0, max: 100 },
  },

  qualityReview: {
    reviewedBy: { type: String, enum: ['ai', 'human'], default: 'ai' },
    reviewedAt: Date,
    modifications: [String],
    passed: { type: Boolean, default: false },
    notes: String,
  },

  aiMetadata: {
    generatedBy: String,
    agentVersion: String,
    generationTimeMs: Number,
    model: String,
    promptTokens: Number,
    completionTokens: Number,
    cost: Number,
  },

  schedule: {
    scheduledAt: Date,
    publishedAt: Date,
    timezone: { type: String, default: 'UTC' },
  },

  performance: {
    impressions: Number,
    likes: Number,
    comments: Number,
    shares: Number,
    saves: Number,
    engagementRate: Number,
    profileVisits: Number,
    followerGain: Number,
    linkClicks: Number,
    lastFetchedAt: Date,
  },

  isAIGenerated: { type: Boolean, default: true },
  isRecycled: { type: Boolean, default: false },
  tags: [String],
  labels: [String],
}, {
  timestamps: true,
  collection: 'posts',
});

PostSchema.index({ userId: 1, status: 1, createdAt: -1 });
PostSchema.index({ userId: 1, contentPillarId: 1, status: 1 });
PostSchema.index({ status: 1, 'schedule.scheduledAt': 1 });
PostSchema.index({ 'scores.overall': -1 });
PostSchema.index({ opportunityId: 1 });
PostSchema.index({ contentCalendarId: 1 });
PostSchema.index({ hashtags: 1 });
PostSchema.index({ 'qualityReview.passed': 1 });
PostSchema.index({ 'aiMetadata.cost': 1 });

PostSchema.virtual('engagement').get(function () {
  if (!this.performance) return 0;
  return (
    (this.performance.likes || 0) +
    (this.performance.comments || 0) +
    (this.performance.shares || 0)
  );
});

PostSchema.virtual('isPublished').get(function () {
  return this.status === 'published';
});

PostSchema.methods.selectBestVariant = function (): number {
  if (this.variants.length === 0) return -1;
  if (this.selectedVariant !== undefined && this.selectedVariant >= 0) {
    return this.selectedVariant;
  }
  const best = this.variants.reduce((best: number, curr: any, idx: number) =>
    curr.performancePrediction > (this.variants[best]?.performancePrediction || 0) ? idx : best
  , 0);
  this.selectedVariant = best;
  return best;
};

PostSchema.methods.getContent = function (): { hook: string; body: string; cta: string; hashtags: string[] } {
  const variant = this.selectedVariant !== undefined
    ? this.variants[this.selectedVariant]
    : undefined;
  return {
    hook: variant?.hook || this.hook,
    body: variant?.body || this.body,
    cta: variant?.cta || this.cta,
    hashtags: variant?.hashtags || this.hashtags,
  };
};

export const Post: Model<IPost> = mongoose.model<IPost>('Post', PostSchema);
export default Post;
