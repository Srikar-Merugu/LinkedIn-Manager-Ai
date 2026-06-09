import mongoose, { Schema, Document, Model } from 'mongoose';
import { PostStatus } from '../../types/database';

export interface ICalendarEntry extends Document {
  userId: mongoose.Types.ObjectId;
  strategyId?: mongoose.Types.ObjectId;
  contentPillarId?: mongoose.Types.ObjectId;

  date: Date;
  scheduledTime?: string;
  timezone: string;

  topic: string;
  hook: string;
  draft: string;
  finalContent?: string;

  format: 'post' | 'article' | 'carousel' | 'thread' | 'poll' | 'video';
  status: PostStatus;

  pillarName: string;
  pillarTopic: string;
  contentType: 'educational' | 'engagement' | 'personal' | 'promotional' | 'story';

  source: 'generated' | 'manual' | 'opportunity' | 'recycled' | 'ai_suggested';

  googleSheetsRow?: number;
  sheetsMetadata?: {
    sheetId: string;
    range: string;
    lastSyncedAt: Date;
  };

  performance?: {
    impressions?: number;
    likes?: number;
    comments?: number;
    shares?: number;
    saves?: number;
    engagementRate?: number;
    clickedAt?: Date;
  };

  labels: string[];
  tags: string[];

  isPinned: boolean;
  isDraft: boolean;
  postedAt?: Date;
  failedAt?: Date;
  failureReason?: string;

  createdAt: Date;
  updatedAt: Date;
}

const ContentCalendarSchema = new Schema<ICalendarEntry>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  strategyId: {
    type: Schema.Types.ObjectId,
    ref: 'ContentStrategy',
  },
  contentPillarId: {
    type: Schema.Types.ObjectId,
    ref: 'ContentPillar',
  },

  date: {
    type: Date,
    required: true,
    index: true,
  },
  scheduledTime: String,
  timezone: { type: String, default: 'UTC' },

  topic: { type: String, required: true },
  hook: { type: String, required: true },
  draft: { type: String, required: true },
  finalContent: String,

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

  pillarName: { type: String, required: true },
  pillarTopic: { type: String, required: true },
  contentType: {
    type: String,
    enum: ['educational', 'engagement', 'personal', 'promotional', 'story'],
    default: 'educational',
  },

  source: {
    type: String,
    enum: ['generated', 'manual', 'opportunity', 'recycled', 'ai_suggested'],
    default: 'generated',
  },

  googleSheetsRow: Number,
  sheetsMetadata: {
    sheetId: String,
    range: String,
    lastSyncedAt: Date,
  },

  performance: {
    impressions: Number,
    likes: Number,
    comments: Number,
    shares: Number,
    saves: Number,
    engagementRate: Number,
    clickedAt: Date,
  },

  labels: [String],
  tags: [String],

  isPinned: { type: Boolean, default: false },
  isDraft: { type: Boolean, default: false },
  postedAt: Date,
  failedAt: Date,
  failureReason: String,
}, {
  timestamps: true,
  collection: 'content_calendars',
});

ContentCalendarSchema.index({ userId: 1, date: -1, status: 1 });
ContentCalendarSchema.index({ userId: 1, status: 1, date: 1 });
ContentCalendarSchema.index({ strategyId: 1, date: 1 });
ContentCalendarSchema.index({ contentPillarId: 1 });
ContentCalendarSchema.index({ status: 1, date: 1 });
ContentCalendarSchema.index({ 'performance.engagementRate': -1 });
ContentCalendarSchema.index({ source: 1 });

ContentCalendarSchema.virtual('isOverdue').get(function () {
  if (this.status === 'published' || this.status === 'archived') return false;
  return new Date() > this.date;
});

ContentCalendarSchema.virtual('daysUntilDue').get(function () {
  return Math.ceil(
    (this.date.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
});

ContentCalendarSchema.methods.markPosted = function (
  performance?: { likes?: number; comments?: number; shares?: number; impressions?: number }
): void {
  this.status = 'published';
  this.postedAt = new Date();
  if (performance) {
    this.performance = {
      ...this.performance,
      ...performance,
      engagementRate: performance.impressions && performance.impressions > 0
        ? ((performance.likes || 0) + (performance.comments || 0) + (performance.shares || 0)) / performance.impressions
        : 0,
    };
  }
};

ContentCalendarSchema.methods.markFailed = function (reason: string): void {
  this.status = 'failed';
  this.failedAt = new Date();
  this.failureReason = reason;
};

export const ContentCalendar: Model<ICalendarEntry> = mongoose.model<ICalendarEntry>(
  'ContentCalendar',
  ContentCalendarSchema
);
export default ContentCalendar;
