import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IVoiceScore extends Document {
  postId: mongoose.Types.ObjectId;
  variationId?: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  vocabularyMatch: number;
  toneMatch: number;
  storytellingMatch: number;
  hookMatch: number;
  ctaMatch: number;
  sentenceStructureMatch: number;
  overall: number;
  matchDetails: {
    vocabulary: string[];
    tone: string;
    storytelling: string;
    hook: string;
    cta: string;
  };
  issues: Array<{
    rule: string;
    expected: string;
    found: string;
    severity: 'low' | 'medium' | 'high';
  }>;
  createdAt: Date;
}

const VoiceScoreSchema = new Schema<IVoiceScore>({
  postId: { type: Schema.Types.ObjectId, ref: 'Post', required: true, index: true },
  variationId: { type: Schema.Types.ObjectId, ref: 'PostVariation' },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  vocabularyMatch: { type: Number, default: 0, min: 0, max: 100 },
  toneMatch: { type: Number, default: 0, min: 0, max: 100 },
  storytellingMatch: { type: Number, default: 0, min: 0, max: 100 },
  hookMatch: { type: Number, default: 0, min: 0, max: 100 },
  ctaMatch: { type: Number, default: 0, min: 0, max: 100 },
  sentenceStructureMatch: { type: Number, default: 0, min: 0, max: 100 },
  overall: { type: Number, default: 0, min: 0, max: 100 },
  matchDetails: {
    vocabulary: [{ type: String }],
    tone: String,
    storytelling: String,
    hook: String,
    cta: String,
  },
  issues: [{
    rule: String,
    expected: String,
    found: String,
    severity: { type: String, enum: ['low', 'medium', 'high'] },
  }],
}, {
  timestamps: true,
  collection: 'voice_scores',
});

VoiceScoreSchema.index({ postId: 1 });
VoiceScoreSchema.index({ userId: 1, overall: -1 });

export const VoiceScore: Model<IVoiceScore> = mongoose.model<IVoiceScore>('ContentVoiceScore', VoiceScoreSchema);
export default VoiceScore;
