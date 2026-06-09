import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPillarSnapshot extends Document {
  userId: mongoose.Types.ObjectId;
  version: number;

  pillars: Array<{
    name: string;
    rank: number;
    authorityScore: number;
    engagementScore: number;
    careerAlignmentScore: number;
    percentage: number;
    topicCount: number;
  }>;

  summary: {
    totalPillars: number;
    topPillar: string;
    averageAuthorityScore: number;
    averageEngagementScore: number;
    primaryDistribution: string;
  };

  trigger: 'career_goal_change' | 'brand_dna_change' | 'project_added' | 'certification_added' | 'linkedin_update' | 'resume_update' | 'manual_regeneration';
  reason: string;
  previousSnapshotId?: mongoose.Types.ObjectId;

  createdAt: Date;
}

const PillarSnapshotEntrySchema = new Schema({
  name: { type: String, required: true },
  rank: { type: Number, required: true },
  authorityScore: { type: Number, min: 0, max: 100 },
  engagementScore: { type: Number, min: 0, max: 100 },
  careerAlignmentScore: { type: Number, min: 0, max: 100 },
  percentage: { type: Number, min: 0, max: 100 },
  topicCount: { type: Number },
}, { _id: false });

const PillarSnapshotSchema = new Schema<IPillarSnapshot>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  version: { type: Number, required: true },

  pillars: [PillarSnapshotEntrySchema],

  summary: {
    totalPillars: { type: Number, default: 0 },
    topPillar: { type: String, default: '' },
    averageAuthorityScore: { type: Number, default: 0 },
    averageEngagementScore: { type: Number, default: 0 },
    primaryDistribution: { type: String, default: '' },
  },

  trigger: {
    type: String,
    enum: ['career_goal_change', 'brand_dna_change', 'project_added', 'certification_added', 'linkedin_update', 'resume_update', 'manual_regeneration'],
    required: true,
  },
  reason: { type: String, required: true },
  previousSnapshotId: { type: Schema.Types.ObjectId, ref: 'PillarSnapshot' },
}, {
  timestamps: true,
  collection: 'pillar_snapshots',
});

PillarSnapshotSchema.index({ userId: 1, version: -1 });
PillarSnapshotSchema.index({ userId: 1, createdAt: -1 });

export const PillarSnapshot: Model<IPillarSnapshot> = mongoose.model<IPillarSnapshot>(
  'PillarSnapshot',
  PillarSnapshotSchema
);
export default PillarSnapshot;
