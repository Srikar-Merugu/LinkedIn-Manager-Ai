import mongoose, { Schema, Document, Model } from 'mongoose';
import { ChatRole } from '../../types/database';

export interface IChatMessage {
  role: ChatRole;
  content: string;
  timestamp: Date;
  metadata?: {
    tokens?: number;
    model?: string;
    latencyMs?: number;
    toolCalls?: Array<{ name: string; args: Record<string, unknown>; result: unknown }>;
    cost?: number;
  };
}

export interface IChatSession extends Document {
  userId: mongoose.Types.ObjectId;
  title: string;
  summary?: string;

  messages: IChatMessage[];
  messageCount: number;
  tokenCount: number;
  totalCost: number;

  context: {
    activeBrandDnaId?: mongoose.Types.ObjectId;
    activeStrategyId?: mongoose.Types.ObjectId;
    activePostId?: mongoose.Types.ObjectId;
    pinnedContext: string[];
    recentReferences: Array<{
      type: string;
      id: string;
      label: string;
    }>;
  };

  status: 'active' | 'paused' | 'archived';
  isStarred: boolean;
  tags: string[];
  lastMessageAt: Date;

  metadata: {
    agentVersion: string;
    model: string;
    averageLatencyMs: number;
    totalInteractions: number;
  };

  createdAt: Date;
  updatedAt: Date;
}

const ChatMessageSchema = new Schema<IChatMessage>({
  role: {
    type: String,
    enum: ['user', 'assistant', 'system'],
    required: true,
  },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  metadata: {
    tokens: Number,
    model: String,
    latencyMs: Number,
    toolCalls: [{
      name: String,
      args: Schema.Types.Mixed,
      result: Schema.Types.Mixed,
    }],
    cost: Number,
  },
}, { _id: false });

const ChatSessionSchema = new Schema<IChatSession>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  title: { type: String, required: true },
  summary: String,

  messages: [ChatMessageSchema],
  messageCount: { type: Number, default: 0 },
  tokenCount: { type: Number, default: 0 },
  totalCost: { type: Number, default: 0 },

  context: {
    activeBrandDnaId: { type: Schema.Types.ObjectId, ref: 'BrandDNA' },
    activeStrategyId: { type: Schema.Types.ObjectId, ref: 'ContentStrategy' },
    activePostId: { type: Schema.Types.ObjectId, ref: 'Post' },
    pinnedContext: [String],
    recentReferences: [{
      type: String,
      id: String,
      label: String,
    }],
  },

  status: {
    type: String,
    enum: ['active', 'paused', 'archived'],
    default: 'active',
    index: true,
  },
  isStarred: { type: Boolean, default: false },
  tags: [String],
  lastMessageAt: { type: Date, default: Date.now },

  metadata: {
    agentVersion: { type: String, default: '1.0.0' },
    model: { type: String, default: 'gpt-4o-mini' },
    averageLatencyMs: { type: Number, default: 0 },
    totalInteractions: { type: Number, default: 0 },
  },
}, {
  timestamps: true,
  collection: 'chat_sessions',
});

ChatSessionSchema.index({ userId: 1, lastMessageAt: -1 });
ChatSessionSchema.index({ userId: 1, status: 1, lastMessageAt: -1 });
ChatSessionSchema.index({ isStarred: 1, userId: 1 });
ChatSessionSchema.index({ tokenCount: 1 });

ChatSessionSchema.pre('save', function (next) {
  this.messageCount = this.messages.length;
  this.lastMessageAt = new Date();

  const lastMsg = this.messages[this.messages.length - 1];
  if (lastMsg?.metadata?.tokens) {
    this.tokenCount += lastMsg.metadata.tokens;
  }
  if (lastMsg?.metadata?.cost) {
    this.totalCost += lastMsg.metadata.cost;
  }

  const assistantMessages = this.messages.filter((m) => m.role === 'assistant');
  this.metadata.totalInteractions = assistantMessages.length;

  if (assistantMessages.length > 0) {
    const latencies = assistantMessages
      .map((m: any) => m.metadata?.latencyMs)
      .filter((l: any): l is number => l !== undefined);
    this.metadata.averageLatencyMs =
      latencies.length > 0
        ? Math.round(latencies.reduce((s, l) => s + l, 0) / latencies.length)
        : 0;
  }

  next();
});

ChatSessionSchema.methods.addMessage = function (
  role: ChatRole,
  content: string,
  metadata?: IChatMessage['metadata']
): void {
  this.messages.push({
    role,
    content,
    timestamp: new Date(),
    metadata,
  });
};

ChatSessionSchema.methods.getContextWindow = function (
  maxMessages = 50
): IChatMessage[] {
  return this.messages.slice(-maxMessages);
};

ChatSessionSchema.methods.getSummary = function (): string {
  if (this.summary) return this.summary;
  const messages: IChatMessage[] = this.messages || [];
  const firstUserMsg = messages.find((m) => m.role === 'user');
  return firstUserMsg
    ? firstUserMsg.content.slice(0, 100) + '...'
    : this.title;
};

export const ChatSession: Model<IChatSession> = mongoose.model<IChatSession>(
  'ChatSession',
  ChatSessionSchema
);
export default ChatSession;
