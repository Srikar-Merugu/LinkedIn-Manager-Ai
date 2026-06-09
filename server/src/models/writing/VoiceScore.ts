import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IVoiceScore extends Document {
  userId: mongoose.Types.ObjectId;
  writingDnaId?: mongoose.Types.ObjectId;
  contentId?: string;
  contentPreview: string;
  scores: {
    overall: number;
    vocabulary: number;
    tone: number;
    structure: number;
    storytelling: number;
    cta: number;
    hook: number;
  };
  breakdown: Array<{
    dimension: string;
    score: number;
    reason: string;
    suggestions: string[];
  }>;
  analyzedAt: Date;
  createdAt: Date;
}

const VoiceScoreSchema = new Schema<IVoiceScore>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  writingDnaId: { type: Schema.Types.ObjectId, ref: 'WritingDNA' },
  contentId: String,
  contentPreview: { type: String, required: true },
  scores: {
    overall: { type: Number, min: 0, max: 100, required: true },
    vocabulary: { type: Number, min: 0, max: 100 },
    tone: { type: Number, min: 0, max: 100 },
    structure: { type: Number, min: 0, max: 100 },
    storytelling: { type: Number, min: 0, max: 100 },
    cta: { type: Number, min: 0, max: 100 },
    hook: { type: Number, min: 0, max: 100 },
  },
  breakdown: [{
    dimension: String,
    score: { type: Number, min: 0, max: 100 },
    reason: String,
    suggestions: [String],
  }],
  analyzedAt: { type: Date, default: Date.now },
}, {
  timestamps: true,
  collection: 'voice_scores',
});

VoiceScoreSchema.index({ userId: 1, analyzedAt: -1 });
VoiceScoreSchema.index({ writingDnaId: 1 });
VoiceScoreSchema.index({ 'scores.overall': -1 });

export const VoiceScore: Model<IVoiceScore> = mongoose.model<IVoiceScore>(
  'VoiceScore',
  VoiceScoreSchema
);
export default VoiceScore;
