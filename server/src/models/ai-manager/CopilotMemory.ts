import mongoose, { Schema, Document, Model } from 'mongoose';

export type MemoryType = 'fact' | 'preference' | 'goal' | 'insight' | 'feedback' | 'pattern' | 'context';
export type MemorySource = 'conversation' | 'analysis' | 'action' | 'system' | 'feedback';

export interface ICopilotMemory extends Document {
  userId: mongoose.Types.ObjectId;
  type: MemoryType;
  source: MemorySource;
  key: string;
  value: any;
  context: string;
  confidence: number;
  tags: string[];
  isActive: boolean;
  lastReferenced: Date;
  referenceCount: number;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const CopilotMemorySchema = new Schema<ICopilotMemory>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { type: String, enum: ['fact', 'preference', 'goal', 'insight', 'feedback', 'pattern', 'context'], required: true, index: true },
  source: { type: String, enum: ['conversation', 'analysis', 'action', 'system', 'feedback'], required: true },
  key: { type: String, required: true },
  value: { type: Schema.Types.Mixed, required: true },
  context: { type: String, default: '' },
  confidence: { type: Number, default: 0.5, min: 0, max: 1 },
  tags: [{ type: String }],
  isActive: { type: Boolean, default: true },
  lastReferenced: { type: Date, default: Date.now },
  referenceCount: { type: Number, default: 0 },
  expiresAt: Date,
}, {
  timestamps: true,
  collection: 'copilot_memory',
});

CopilotMemorySchema.index({ userId: 1, type: 1, key: 1 }, { unique: true });
CopilotMemorySchema.index({ userId: 1, isActive: 1, confidence: -1 });
CopilotMemorySchema.index({ userId: 1, tags: 1 });
CopilotMemorySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const CopilotMemory: Model<ICopilotMemory> = mongoose.model<ICopilotMemory>('CopilotMemory', CopilotMemorySchema);
export default CopilotMemory;
