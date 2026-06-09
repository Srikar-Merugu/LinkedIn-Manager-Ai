import mongoose, { Schema, Document, Model } from 'mongoose';

export type SessionStatus = 'active' | 'paused' | 'archived';
export type SessionContext = 'general' | 'content' | 'brand' | 'career' | 'analytics' | 'publishing' | 'opportunity';

export interface IChatSession extends Document {
  userId: mongoose.Types.ObjectId;
  title: string;
  status: SessionStatus;
  context: SessionContext;
  messageCount: number;
  lastMessageAt: Date;
  metadata: {
    topics: string[];
    intentHistory: string[];
    activeRecommendations: number;
    pendingActions: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const ChatSessionSchema = new Schema<IChatSession>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true },
  status: { type: String, enum: ['active', 'paused', 'archived'], default: 'active', index: true },
  context: { type: String, enum: ['general', 'content', 'brand', 'career', 'analytics', 'publishing', 'opportunity'], default: 'general' },
  messageCount: { type: Number, default: 0 },
  lastMessageAt: { type: Date, default: Date.now },
  metadata: {
    topics: [{ type: String }],
    intentHistory: [{ type: String }],
    activeRecommendations: { type: Number, default: 0 },
    pendingActions: { type: Number, default: 0 },
  },
}, {
  timestamps: true,
  collection: 'chat_sessions',
});

ChatSessionSchema.index({ userId: 1, lastMessageAt: -1 });
ChatSessionSchema.index({ userId: 1, status: 1 });

export const ChatSession: Model<IChatSession> = mongoose.model<IChatSession>('ChatSession', ChatSessionSchema);
export default ChatSession;
