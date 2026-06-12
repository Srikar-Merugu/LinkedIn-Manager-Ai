import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ILinkedInChallenge extends Document {
  userId: mongoose.Types.ObjectId;
  status: 'setup' | 'active' | 'paused' | 'completed';
  topics: string[];
  postsPerWeek: number;
  postingDays: string[];
  postingTime: string;
  reviewMode: boolean;
  startDate: Date;
  endDate: Date;
  currentDay: number;
  totalDays: number;
  stats: {
    postsGenerated: number;
    postsPublished: number;
    postsFailed: number;
    currentStreak: number;
    longestStreak: number;
    avgEngagement: number;
    profileViews: number;
    followerGrowth: number;
  };
  calendar: {
    day: number;
    date: Date;
    dayOfWeek: string;
    contentType: string;
    pillar: string;
    topic: string;
    hook: string;
    status: 'pending' | 'generating' | 'generated' | 'scheduled' | 'published' | 'failed';
    postId?: mongoose.Types.ObjectId;
    generatedAt?: Date;
    publishedAt?: Date;
    error?: string;
    retryCount: number;
  }[];
  generatedTopics: string[];
  generatedHooks: string[];
  generatedStructures: string[];
  createdAt: Date;
  updatedAt: Date;
}

const LinkedInChallengeSchema = new Schema<ILinkedInChallenge>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  status: { type: String, enum: ['setup', 'active', 'paused', 'completed'], default: 'setup' },
  topics: { type: [String], default: [] },
  postsPerWeek: { type: Number, default: 3 },
  postingDays: { type: [String], default: [] },
  postingTime: { type: String, default: '09:00' },
  reviewMode: { type: Boolean, default: false },
  startDate: { type: Date, default: Date.now },
  endDate: { type: Date },
  currentDay: { type: Number, default: 0 },
  totalDays: { type: Number, default: 90 },
  stats: {
    postsGenerated: { type: Number, default: 0 },
    postsPublished: { type: Number, default: 0 },
    postsFailed: { type: Number, default: 0 },
    currentStreak: { type: Number, default: 0 },
    longestStreak: { type: Number, default: 0 },
    avgEngagement: { type: Number, default: 0 },
    profileViews: { type: Number, default: 0 },
    followerGrowth: { type: Number, default: 0 },
  },
  calendar: { type: [Schema.Types.Mixed] as any[], default: [] },
  generatedTopics: { type: [String], default: [] },
  generatedHooks: { type: [String], default: [] },
  generatedStructures: { type: [String], default: [] },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, {
  timestamps: true,
  collection: 'linkedin_challenges',
});

LinkedInChallengeSchema.index({ userId: 1 }, { unique: true });

export const LinkedInChallenge: Model<ILinkedInChallenge> = mongoose.model<ILinkedInChallenge>('LinkedInChallenge', LinkedInChallengeSchema);
export default LinkedInChallenge;
