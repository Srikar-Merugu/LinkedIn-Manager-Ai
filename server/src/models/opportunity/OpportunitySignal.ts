import mongoose, { Schema, Document, Model } from 'mongoose';

export type SignalSource = 'linkedin' | 'github' | 'resume' | 'portfolio' | 'blog' | 'certification' | 'project' | 'learning' | 'manual';
export type SignalCategory = 'career' | 'learning' | 'authority' | 'technical' | 'founder' | 'community' | 'networking' | 'achievement';
export type SignalStatus = 'new' | 'classified' | 'processed' | 'dismissed' | 'expired';

export interface IOpportunitySignal extends Document {
  userId: mongoose.Types.ObjectId;
  source: SignalSource;
  category?: SignalCategory;
  type: string;
  title: string;
  description: string;
  metadata: Record<string, any>;
  detectedAt: Date;
  status: SignalStatus;
  confidence: number;
  sourceUrl?: string;
  sourceId?: string;
  isProcessed: boolean;
  processedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const OpportunitySignalSchema = new Schema<IOpportunitySignal>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  source: { type: String, enum: ['linkedin', 'github', 'resume', 'portfolio', 'blog', 'certification', 'project', 'learning', 'manual'], required: true, index: true },
  category: { type: String, enum: ['career', 'learning', 'authority', 'technical', 'founder', 'community', 'networking', 'achievement'] },
  type: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  metadata: { type: Schema.Types.Mixed, default: {} },
  detectedAt: { type: Date, default: Date.now, index: true },
  status: { type: String, enum: ['new', 'classified', 'processed', 'dismissed', 'expired'], default: 'new', index: true },
  confidence: { type: Number, default: 0.5, min: 0, max: 1 },
  sourceUrl: String,
  sourceId: String,
  isProcessed: { type: Boolean, default: false },
  processedAt: Date,
}, {
  timestamps: true,
  collection: 'opportunity_signals',
});

OpportunitySignalSchema.index({ userId: 1, source: 1, detectedAt: -1 });
OpportunitySignalSchema.index({ userId: 1, status: 1, confidence: -1 });

export const OpportunitySignal: Model<IOpportunitySignal> = mongoose.model<IOpportunitySignal>('OpportunitySignal', OpportunitySignalSchema);
export default OpportunitySignal;
