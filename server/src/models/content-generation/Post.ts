import mongoose, { Schema, Document, Model } from 'mongoose';

export type PostContentType = 'story' | 'educational' | 'framework' | 'contrarian' | 'journey' | 'project_breakdown' | 'case_study' | 'career_lesson' | 'founder_update' | 'build_in_public' | 'industry_commentary' | 'thought_leadership';

export type PostSource = 'calendar' | 'opportunity' | 'manual' | 'strategy' | 'regeneration';
export type PostStatus = 'draft' | 'review' | 'approved' | 'scheduled' | 'published' | 'archived';

export interface IPost extends Document {
  userId: mongoose.Types.ObjectId;
  title: string;
  hook: string;
  body: string;
  cta: string;
  fullContent: string;
  contentType: PostContentType;
  source: PostSource;
  sourceRef?: { type: string; id: mongoose.Types.ObjectId };
  status: PostStatus;
  tags: string[];
  wordCount: number;
  estimatedReadTime: number;
  voiceMatchScore: number;
  careerAlignmentScore: number;
  qualityScore: number;
  overallScore: number;
  isBestVersion: boolean;
  scheduleDate?: Date;
  publishedAt?: Date;
  linkedInPostId?: string;
  linkedInUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PostSchema = new Schema<IPost>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true },
  hook: { type: String, required: true },
  body: { type: String, required: true },
  cta: { type: String, required: true },
  fullContent: { type: String, required: true },
  contentType: {
    type: String,
    enum: ['story', 'educational', 'framework', 'contrarian', 'journey', 'project_breakdown', 'case_study', 'career_lesson', 'founder_update', 'build_in_public', 'industry_commentary', 'thought_leadership'],
    required: true, index: true,
  },
  source: {
    type: String,
    enum: ['calendar', 'opportunity', 'manual', 'strategy', 'regeneration'],
    required: true, index: true,
  },
  sourceRef: {
    type: { type: String },
    id: { type: Schema.Types.ObjectId },
  },
  status: {
    type: String,
    enum: ['draft', 'review', 'approved', 'scheduled', 'published', 'archived'],
    default: 'draft', index: true,
  },
  tags: [{ type: String }],
  wordCount: { type: Number, default: 0 },
  estimatedReadTime: { type: Number, default: 0 },
  voiceMatchScore: { type: Number, default: 0, min: 0, max: 100 },
  careerAlignmentScore: { type: Number, default: 0, min: 0, max: 100 },
  qualityScore: { type: Number, default: 0, min: 0, max: 100 },
  overallScore: { type: Number, default: 0, min: 0, max: 100 },
  isBestVersion: { type: Boolean, default: false },
  scheduleDate: Date,
  publishedAt: Date,
  linkedInPostId: String,
  linkedInUrl: String,
}, {
  timestamps: true,
  collection: 'posts',
});

PostSchema.index({ userId: 1, contentType: 1, status: 1 });
PostSchema.index({ userId: 1, overallScore: -1 });
PostSchema.index({ userId: 1, createdAt: -1 });

export const Post: Model<IPost> = mongoose.model<IPost>('GeneratedPost', PostSchema);
export default Post;
