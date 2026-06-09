import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IBrandSnapshot extends Document {
  userId: mongoose.Types.ObjectId;
  profileId?: mongoose.Types.ObjectId;
  brandDnaId?: mongoose.Types.ObjectId;
  version: number;
  snapshot: Record<string, unknown>;
  reason: string;
  trigger: 'manual' | 'linkedin_change' | 'certification' | 'project' | 'goals_change' | 'resume_update' | 'github_activity';
  confidence: number;
  agentVersion: string;
  score?: number;
  createdAt: Date;
}

const BrandSnapshotSchema = new Schema<IBrandSnapshot>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  profileId: { type: Schema.Types.ObjectId, ref: 'LinkedInProfile' },
  brandDnaId: { type: Schema.Types.ObjectId, ref: 'BrandDNA' },
  version: { type: Number, required: true },
  snapshot: { type: Schema.Types.Mixed, required: true },
  reason: { type: String, required: true },
  trigger: {
    type: String,
    enum: ['manual', 'linkedin_change', 'certification', 'project', 'goals_change', 'resume_update', 'github_activity'],
    required: true,
    index: true,
  },
  confidence: { type: Number, required: true, min: 0, max: 1 },
  agentVersion: { type: String, required: true },
  score: { type: Number, min: 0, max: 100 },
  createdAt: { type: Date, default: Date.now },
});

BrandSnapshotSchema.index({ userId: 1, version: -1 });
BrandSnapshotSchema.index({ brandDnaId: 1, version: -1 });
BrandSnapshotSchema.index({ userId: 1, trigger: 1, createdAt: -1 });

export const BrandSnapshot: Model<IBrandSnapshot> = mongoose.model<IBrandSnapshot>(
  'BrandSnapshot',
  BrandSnapshotSchema
);
export default BrandSnapshot;
