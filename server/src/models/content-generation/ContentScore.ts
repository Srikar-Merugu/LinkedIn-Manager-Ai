import mongoose, { Schema, Document, Model } from 'mongoose';

export type ScoreType = 'generation' | 'review' | 'regeneration';

export interface IContentScore extends Document {
  postId: mongoose.Types.ObjectId;
  variationId?: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  scoreType: ScoreType;
  clarity: number;
  authenticity: number;
  readability: number;
  authority: number;
  uniqueness: number;
  engagementPotential: number;
  dwellTime: number;
  commentPotential: number;
  savePotential: number;
  sharePotential: number;
  overall: number;
  feedback: string[];
  strengths: string[];
  improvements: string[];
  createdAt: Date;
}

const ContentScoreSchema = new Schema<IContentScore>({
  postId: { type: Schema.Types.ObjectId, ref: 'Post', required: true, index: true },
  variationId: { type: Schema.Types.ObjectId, ref: 'PostVariation' },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  scoreType: { type: String, enum: ['generation', 'review', 'regeneration'], required: true },
  clarity: { type: Number, default: 0, min: 0, max: 100 },
  authenticity: { type: Number, default: 0, min: 0, max: 100 },
  readability: { type: Number, default: 0, min: 0, max: 100 },
  authority: { type: Number, default: 0, min: 0, max: 100 },
  uniqueness: { type: Number, default: 0, min: 0, max: 100 },
  engagementPotential: { type: Number, default: 0, min: 0, max: 100 },
  dwellTime: { type: Number, default: 0, min: 0, max: 100 },
  commentPotential: { type: Number, default: 0, min: 0, max: 100 },
  savePotential: { type: Number, default: 0, min: 0, max: 100 },
  sharePotential: { type: Number, default: 0, min: 0, max: 100 },
  overall: { type: Number, default: 0, min: 0, max: 100 },
  feedback: [{ type: String }],
  strengths: [{ type: String }],
  improvements: [{ type: String }],
}, {
  timestamps: true,
  collection: 'content_scores',
});

ContentScoreSchema.index({ postId: 1, scoreType: 1 });
ContentScoreSchema.index({ userId: 1, overall: -1 });

export const ContentScore: Model<IContentScore> = mongoose.model<IContentScore>('ContentScore', ContentScoreSchema);
export default ContentScore;
