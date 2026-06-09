import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IWritingSnapshot extends Document {
  userId: mongoose.Types.ObjectId;
  writingDnaId?: mongoose.Types.ObjectId;
  version: number;
  snapshot: Record<string, unknown>;
  reason: string;
  trigger: 'new_post' | 'new_blog' | 'new_portfolio' | 'user_edit' | 'sample_upload' | 'full_analysis';
  sampleCount: number;
  totalWords: number;
  createdAt: Date;
}

const WritingSnapshotSchema = new Schema<IWritingSnapshot>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  writingDnaId: { type: Schema.Types.ObjectId, ref: 'WritingDNA' },
  version: { type: Number, required: true },
  snapshot: { type: Schema.Types.Mixed, required: true },
  reason: { type: String, required: true },
  trigger: {
    type: String,
    enum: ['new_post', 'new_blog', 'new_portfolio', 'user_edit', 'sample_upload', 'full_analysis'],
    required: true,
  },
  sampleCount: { type: Number, default: 0 },
  totalWords: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

WritingSnapshotSchema.index({ userId: 1, version: -1 });
WritingSnapshotSchema.index({ writingDnaId: 1, version: -1 });
WritingSnapshotSchema.index({ userId: 1, trigger: 1, createdAt: -1 });

export const WritingSnapshot: Model<IWritingSnapshot> = mongoose.model<IWritingSnapshot>(
  'WritingSnapshot',
  WritingSnapshotSchema
);
export default WritingSnapshot;
