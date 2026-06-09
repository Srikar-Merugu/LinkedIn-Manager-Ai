import mongoose, { Schema, Document, Model } from 'mongoose';

export type ActionStatus = 'pending' | 'approved' | 'executing' | 'completed' | 'failed' | 'rejected' | 'cancelled';
export type ActionType = 'generate_post' | 'update_calendar' | 'regenerate_strategy' | 'create_opportunity' | 'schedule_post' | 'create_draft' | 'update_queue' | 'update_profile' | 'sync_sheets' | 'review_analytics' | 'send_notification';

export interface IAIAction extends Document {
  userId: mongoose.Types.ObjectId;
  sessionId?: mongoose.Types.ObjectId;
  type: ActionType;
  title: string;
  description: string;
  status: ActionStatus;
  reasoning: string;
  params: Record<string, any>;
  result?: {
    success: boolean;
    data?: any;
    error?: string;
    executionTime?: number;
  };
  requiresApproval: boolean;
  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
  executedAt?: Date;
  auditLog: Array<{
    action: string;
    timestamp: Date;
    details: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const AIActionSchema = new Schema<IAIAction>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  sessionId: { type: Schema.Types.ObjectId, ref: 'ChatSession' },
  type: {
    type: String,
    enum: ['generate_post', 'update_calendar', 'regenerate_strategy', 'create_opportunity', 'schedule_post', 'create_draft', 'update_queue', 'update_profile', 'sync_sheets', 'review_analytics', 'send_notification'],
    required: true, index: true,
  },
  title: { type: String, required: true },
  description: { type: String, required: true },
  status: {
    type: String,
    enum: ['pending', 'approved', 'executing', 'completed', 'failed', 'rejected', 'cancelled'],
    default: 'pending', index: true,
  },
  reasoning: { type: String, required: true },
  params: { type: Schema.Types.Mixed, default: {} },
  result: {
    success: Boolean,
    data: Schema.Types.Mixed,
    error: String,
    executionTime: Number,
  },
  requiresApproval: { type: Boolean, default: true },
  approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  approvedAt: Date,
  executedAt: Date,
  auditLog: [{
    action: String,
    timestamp: { type: Date, default: Date.now },
    details: String,
  }],
}, {
  timestamps: true,
  collection: 'ai_actions',
});

AIActionSchema.index({ userId: 1, status: 1, createdAt: -1 });
AIActionSchema.index({ userId: 1, type: 1 });

export const AIAction: Model<IAIAction> = mongoose.model<IAIAction>('AIAction', AIActionSchema);
export default AIAction;
