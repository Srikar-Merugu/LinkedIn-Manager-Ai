import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ILinkedInActivity extends Document {
  profileId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  activityId: string;
  type: 'post' | 'repost' | 'comment' | 'reaction' | 'article';
  content?: string;
  url?: string;
  timestamp: Date;
  engagement: {
    likes: number;
    comments: number;
    shares: number;
    impressions?: number;
  };
  sentiment?: {
    score: number;
    label: 'positive' | 'negative' | 'neutral';
  };
  topics?: string[];
  hashtags?: string[];
  mentions?: string[];
  mediaType?: 'image' | 'video' | 'document' | 'link' | 'text';
  isPinned: boolean;
  metadata: {
    language?: string;
    characterCount?: number;
    readabilityScore?: number;
    engagementRate?: number;
    isOriginalContent: boolean;
    source: 'scraped' | 'api' | 'imported';
  };
  createdAt: Date;
  updatedAt: Date;
}

const LinkedInActivitySchema = new Schema<ILinkedInActivity>({
  profileId: {
    type: Schema.Types.ObjectId,
    ref: 'LinkedInProfile',
    required: true,
    index: true,
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  activityId: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['post', 'repost', 'comment', 'reaction', 'article'],
    required: true,
    index: true,
  },
  content: String,
  url: String,
  timestamp: {
    type: Date,
    required: true,
    index: true,
  },
  engagement: {
    likes: { type: Number, default: 0 },
    comments: { type: Number, default: 0 },
    shares: { type: Number, default: 0 },
    impressions: Number,
  },
  sentiment: {
    score: Number,
    label: {
      type: String,
      enum: ['positive', 'negative', 'neutral'],
    },
  },
  topics: [String],
  hashtags: [String],
  mentions: [String],
  mediaType: {
    type: String,
    enum: ['image', 'video', 'document', 'link', 'text'],
  },
  isPinned: { type: Boolean, default: false },
  metadata: {
    language: String,
    characterCount: Number,
    readabilityScore: Number,
    engagementRate: Number,
    isOriginalContent: { type: Boolean, default: true },
    source: {
      type: String,
      enum: ['scraped', 'api', 'imported'],
      default: 'api',
    },
  },
}, {
  timestamps: true,
  collection: 'linkedin_activities',
});

LinkedInActivitySchema.index({ profileId: 1, activityId: 1 }, { unique: true });
LinkedInActivitySchema.index({ profileId: 1, timestamp: -1 });
LinkedInActivitySchema.index({ userId: 1, timestamp: -1 });
LinkedInActivitySchema.index({ type: 1, timestamp: -1 });
LinkedInActivitySchema.index({ topics: 1 });
LinkedInActivitySchema.index({ 'engagement.likes': -1 });
LinkedInActivitySchema.index({ 'metadata.engagementRate': -1 });

export const LinkedInActivity: Model<ILinkedInActivity> = mongoose.model<ILinkedInActivity>(
  'LinkedInActivity',
  LinkedInActivitySchema
);

export default LinkedInActivity;
