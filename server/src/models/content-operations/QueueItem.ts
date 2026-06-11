import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IQueueItem extends Document {
  userId: mongoose.Types.ObjectId;
  postId?: mongoose.Types.ObjectId;
  title?: string;
  calendarEntryId?: mongoose.Types.ObjectId;
  strategyId?: mongoose.Types.ObjectId;
  version: number;
  stage: 'idea' | 'planned' | 'draft_generated' | 'ready' | 'approved' | 'scheduled' | 'published' | 'failed' | 'analyzed' | 'archived';
  stageHistory: Array<{ stage: string; enteredAt: Date; triggeredBy: string }>;
  priority: number;
  priorityReasoning: string;
  careerImpact: number;
  authorityImpact: number;
  engagementPotential: number;
  opportunityPotential: number;
  urgency: number;
  automationMode: 'manual' | 'approval' | 'autonomous';
  assignedTo?: string;
  dueDate?: Date;
  scheduledAt?: Date;
  draftGeneratedAt?: Date;
  publishedAt?: Date;
  analyzedAt?: Date;
  linkedinPostId?: string;
  lastError?: string;
  createdAt: Date;
  updatedAt: Date;
}

const QueueItemSchema = new Schema<IQueueItem>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  postId: { type: Schema.Types.ObjectId, ref: 'Post' },
  title: { type: String, default: '' },
  calendarEntryId: { type: Schema.Types.ObjectId, ref: 'ContentCalendar' },
  strategyId: { type: Schema.Types.ObjectId, ref: 'ContentStrategyIntelligence' },
  version: { type: Number, default: 1 },
  stage: {
    type: String,
    enum: ['idea', 'planned', 'draft_generated', 'ready', 'approved', 'scheduled', 'published', 'failed', 'analyzed', 'archived'],
    default: 'idea',
    index: true,
  },
  stageHistory: [{
    stage: String,
    enteredAt: { type: Date, default: Date.now },
    triggeredBy: { type: String, default: 'system' },
  }],
  priority: { type: Number, default: 0, min: 0, max: 100 },
  priorityReasoning: { type: String, default: '' },
  careerImpact: { type: Number, default: 0, min: 0, max: 100 },
  authorityImpact: { type: Number, default: 0, min: 0, max: 100 },
  engagementPotential: { type: Number, default: 0, min: 0, max: 100 },
  opportunityPotential: { type: Number, default: 0, min: 0, max: 100 },
  urgency: { type: Number, default: 0, min: 0, max: 100 },
  automationMode: { type: String, enum: ['manual', 'approval', 'autonomous'], default: 'manual' },
  assignedTo: String,
  dueDate: Date,
  scheduledAt: Date,
  draftGeneratedAt: Date,
  publishedAt: Date,
  analyzedAt: Date,
  linkedinPostId: { type: String, default: '' },
  lastError: { type: String, default: '' },
}, {
  timestamps: true,
  collection: 'content_queue',
});

QueueItemSchema.index({ userId: 1, stage: 1, priority: -1 });
QueueItemSchema.index({ userId: 1, automationMode: 1 });
QueueItemSchema.index({ stage: 1, scheduledAt: 1 });

export const QueueItem: Model<IQueueItem> = mongoose.model<IQueueItem>('QueueItem', QueueItemSchema);
export default QueueItem;
