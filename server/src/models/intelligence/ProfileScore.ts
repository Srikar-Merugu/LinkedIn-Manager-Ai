import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IScoreDimensionSnapshot {
  current: number;
  previous?: number;
  reasoning: string;
  recommendations: string[];
}

export interface IProfileScore extends Document {
  userId: mongoose.Types.ObjectId;
  profileId: mongoose.Types.ObjectId;
  version: number;
  overall: number;
  dimensions: {
    profileCompleteness: IScoreDimensionSnapshot;
    personalBranding: IScoreDimensionSnapshot;
    expertise: IScoreDimensionSnapshot;
    authority: IScoreDimensionSnapshot;
    visibility: IScoreDimensionSnapshot;
    opportunity: IScoreDimensionSnapshot;
    contentReadiness: IScoreDimensionSnapshot;
    careerGrowth: IScoreDimensionSnapshot;
  };
  previousOverall?: number;
  trend: 'improving' | 'declining' | 'stable' | 'first';
  generatedAt: Date;
  createdAt: Date;
}

const ScoreDimensionSnapshotSchema = new Schema<IScoreDimensionSnapshot>({
  current: { type: Number, required: true, min: 0, max: 100 },
  previous: { type: Number, min: 0, max: 100 },
  reasoning: { type: String, default: '' },
  recommendations: [String],
}, { _id: false });

const ProfileScoreSchema = new Schema<IProfileScore>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  profileId: { type: Schema.Types.ObjectId, ref: 'LinkedInProfile', required: true, index: true },
  version: { type: Number, default: 1 },
  overall: { type: Number, required: true, min: 0, max: 100 },
  dimensions: {
    profileCompleteness: { type: ScoreDimensionSnapshotSchema, required: true },
    personalBranding: { type: ScoreDimensionSnapshotSchema, required: true },
    expertise: { type: ScoreDimensionSnapshotSchema, required: true },
    authority: { type: ScoreDimensionSnapshotSchema, required: true },
    visibility: { type: ScoreDimensionSnapshotSchema, required: true },
    opportunity: { type: ScoreDimensionSnapshotSchema, required: true },
    contentReadiness: { type: ScoreDimensionSnapshotSchema, required: true },
    careerGrowth: { type: ScoreDimensionSnapshotSchema, required: true },
  },
  previousOverall: Number,
  trend: {
    type: String,
    enum: ['improving', 'declining', 'stable', 'first'],
    default: 'first',
  },
  generatedAt: { type: Date, default: Date.now },
}, {
  timestamps: true,
  collection: 'profile_scores',
});

ProfileScoreSchema.index({ profileId: 1, version: -1 });
ProfileScoreSchema.index({ userId: 1, generatedAt: -1 });
ProfileScoreSchema.index({ overall: -1 });
ProfileScoreSchema.index({ 'dimensions.profileCompleteness.current': -1 });

export const ProfileScore: Model<IProfileScore> = mongoose.model<IProfileScore>('ProfileScore', ProfileScoreSchema);
export default ProfileScore;
