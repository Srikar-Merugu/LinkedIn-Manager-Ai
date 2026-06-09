import mongoose, { Schema, Document, Model } from 'mongoose';
import type { OpportunityCategory, ChangeType } from '../../types/linkedin';

export interface IOpportunityEvent extends Document {
  userId: mongoose.Types.ObjectId;
  profileId: mongoose.Types.ObjectId;
  type: 'content' | 'career' | 'networking' | 'skill' | 'credential';
  category: OpportunityCategory | string;
  title: string;
  description: string;
  trigger?: string;
  triggerType?: ChangeType;
  score: number;
  impact: 'high' | 'medium' | 'low';
  effort: 'low' | 'medium' | 'high';
  status: 'pending' | 'actioned' | 'dismissed' | 'expired';
  metadata: Record<string, unknown>;
  expiresAt?: Date;
  actionedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const OpportunityEventSchema = new Schema<IOpportunityEvent>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  profileId: { type: Schema.Types.ObjectId, ref: 'LinkedInProfile', required: true, index: true },
  type: {
    type: String,
    enum: ['content', 'career', 'networking', 'skill', 'credential'],
    required: true,
    index: true,
  },
  category: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  trigger: String,
  triggerType: String,
  score: { type: Number, default: 0, min: 0, max: 100 },
  impact: { type: String, enum: ['high', 'medium', 'low'], required: true },
  effort: { type: String, enum: ['low', 'medium', 'high'], required: true },
  status: {
    type: String,
    enum: ['pending', 'actioned', 'dismissed', 'expired'],
    default: 'pending',
    index: true,
  },
  metadata: { type: Schema.Types.Mixed, default: {} },
  expiresAt: { type: Date, index: true },
  actionedAt: Date,
}, {
  timestamps: true,
  collection: 'opportunity_events',
});

OpportunityEventSchema.index({ userId: 1, status: 1, score: -1 });
OpportunityEventSchema.index({ profileId: 1, type: 1, status: 1 });
OpportunityEventSchema.index({ createdAt: -1 });
OpportunityEventSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const OpportunityEvent: Model<IOpportunityEvent> = mongoose.model<IOpportunityEvent>('OpportunityEvent', OpportunityEventSchema);
export default OpportunityEvent;
