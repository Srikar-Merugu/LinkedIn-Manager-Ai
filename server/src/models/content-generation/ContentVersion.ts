import mongoose, { Schema, Document, Model } from 'mongoose';

export type VersionChangeType = 'created' | 'edited' | 'regenerated' | 'reviewed' | 'approved' | 'ai_suggestion';

export interface IContentVersion extends Document {
  postId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  version: number;
  title: string;
  hook: string;
  body: string;
  cta: string;
  fullContent: string;
  scores: Record<string, number>;
  changeType: VersionChangeType;
  changeDescription: string;
  previousVersion?: number;
  wordCount: number;
  createdAt: Date;
}

const ContentVersionSchema = new Schema<IContentVersion>({
  postId: { type: Schema.Types.ObjectId, ref: 'Post', required: true, index: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  version: { type: Number, required: true },
  title: { type: String, required: true },
  hook: { type: String, required: true },
  body: { type: String, required: true },
  cta: { type: String, required: true },
  fullContent: { type: String, required: true },
  scores: { type: Schema.Types.Mixed, default: {} },
  changeType: {
    type: String,
    enum: ['created', 'edited', 'regenerated', 'reviewed', 'approved', 'ai_suggestion'],
    required: true,
  },
  changeDescription: { type: String, default: '' },
  previousVersion: Number,
  wordCount: { type: Number, default: 0 },
}, {
  timestamps: true,
  collection: 'content_versions',
});

ContentVersionSchema.index({ postId: 1, version: -1 });
ContentVersionSchema.index({ userId: 1, createdAt: -1 });

export const ContentVersion: Model<IContentVersion> = mongoose.model<IContentVersion>('ContentVersion', ContentVersionSchema);
export default ContentVersion;
