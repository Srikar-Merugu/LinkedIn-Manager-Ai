import mongoose, { Schema, Document, Model } from 'mongoose';

export type MessageRole = 'user' | 'assistant' | 'system';
export type MessageType = 'text' | 'recommendation' | 'action' | 'insight' | 'question' | 'suggestion' | 'error';

export interface IContextSnapshot {
  intent: string;
  activeContext: string;
  relevantData: string[];
  dataFreshness: Record<string, string>;
}

export interface IConversationHistory extends Document {
  sessionId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  role: MessageRole;
  type: MessageType;
  content: string;
  metadata: {
    intent?: string;
    confidence?: number;
    agentUsed?: string;
    triggeredAction?: string;
    recommendationId?: mongoose.Types.ObjectId;
    actionId?: mongoose.Types.ObjectId;
    contextSnapshot?: IContextSnapshot;
    dataSources?: string[];
  };
  embedding?: number[];
  tokenCount: number;
  createdAt: Date;
}

const ConversationHistorySchema = new Schema<IConversationHistory>({
  sessionId: { type: Schema.Types.ObjectId, ref: 'ChatSession', required: true, index: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  role: { type: String, enum: ['user', 'assistant', 'system'], required: true },
  type: { type: String, enum: ['text', 'recommendation', 'action', 'insight', 'question', 'suggestion', 'error'], default: 'text' },
  content: { type: String, required: true },
  metadata: {
    intent: String,
    confidence: Number,
    agentUsed: String,
    triggeredAction: String,
    recommendationId: { type: Schema.Types.ObjectId },
    actionId: { type: Schema.Types.ObjectId },
    contextSnapshot: {
      intent: String,
      activeContext: String,
      relevantData: [{ type: String }],
      dataFreshness: { type: Schema.Types.Mixed },
    },
    dataSources: [{ type: String }],
  },
  embedding: [{ type: Number }],
  tokenCount: { type: Number, default: 0 },
}, {
  timestamps: true,
  collection: 'conversation_history',
});

ConversationHistorySchema.index({ sessionId: 1, createdAt: 1 });
ConversationHistorySchema.index({ userId: 1, createdAt: -1 });
ConversationHistorySchema.index({ 'metadata.intent': 1 });

export const ConversationHistory: Model<IConversationHistory> = mongoose.model<IConversationHistory>('ConversationHistory', ConversationHistorySchema);
export default ConversationHistory;
