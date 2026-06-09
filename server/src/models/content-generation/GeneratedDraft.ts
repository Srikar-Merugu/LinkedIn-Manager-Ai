import mongoose, { Schema, Document, Model } from 'mongoose';

export type DraftStatus = 'pending' | 'generating' | 'completed' | 'failed';

export interface IGeneratedDraft extends Document {
  userId: mongoose.Types.ObjectId;
  sourceType: 'calendar' | 'opportunity' | 'manual' | 'strategy' | 'regeneration';
  sourceId?: mongoose.Types.ObjectId;
  sourceDescription: string;
  postId?: mongoose.Types.ObjectId;
  contentType: string;
  variations: number;
  status: DraftStatus;
  generationParams: {
    tone?: string;
    audience?: string;
    goal?: string;
    length?: 'short' | 'medium' | 'long';
    complexity?: 'simple' | 'moderate' | 'complex';
    contentType?: string;
    customPrompt?: string;
  };
  error?: string;
  generationTime?: number;
  resultSummary?: {
    bestVersion: string;
    avgScore: number;
    variationsGenerated: number;
  };
  createdAt: Date;
  completedAt?: Date;
}

const GeneratedDraftSchema = new Schema<IGeneratedDraft>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  sourceType: {
    type: String,
    enum: ['calendar', 'opportunity', 'manual', 'strategy', 'regeneration'],
    required: true, index: true,
  },
  sourceId: { type: Schema.Types.ObjectId },
  sourceDescription: { type: String, required: true },
  postId: { type: Schema.Types.ObjectId, ref: 'Post' },
  contentType: { type: String, required: true },
  variations: { type: Number, default: 3 },
  status: {
    type: String,
    enum: ['pending', 'generating', 'completed', 'failed'],
    default: 'pending', index: true,
  },
  generationParams: {
    tone: String,
    audience: String,
    goal: String,
    length: { type: String, enum: ['short', 'medium', 'long'] },
    complexity: { type: String, enum: ['simple', 'moderate', 'complex'] },
    contentType: String,
    customPrompt: String,
  },
  error: String,
  generationTime: Number,
  resultSummary: {
    bestVersion: String,
    avgScore: Number,
    variationsGenerated: Number,
  },
}, {
  timestamps: true,
  collection: 'generated_drafts',
});

GeneratedDraftSchema.index({ userId: 1, status: 1 });
GeneratedDraftSchema.index({ userId: 1, createdAt: -1 });
GeneratedDraftSchema.index({ sourceType: 1, sourceId: 1 });

export const GeneratedDraft: Model<IGeneratedDraft> = mongoose.model<IGeneratedDraft>('GeneratedDraft', GeneratedDraftSchema);
export default GeneratedDraft;
