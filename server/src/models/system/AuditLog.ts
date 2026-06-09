import mongoose, { Schema, Document, Model } from 'mongoose';
import { AuditAction } from '../../types/database';

export interface IAuditLog extends Document {
  userId: mongoose.Types.ObjectId;
  action: AuditAction;
  resourceType: string;
  resourceId: string;

  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  diff?: Record<string, { from: unknown; to: unknown }>;

  actor: {
    type: 'user' | 'system' | 'ai_agent';
    id: string;
    agentVersion?: string;
    ip?: string;
    userAgent?: string;
  };

  metadata: {
    correlationId?: string;
    durationMs?: number;
    success: boolean;
    error?: string;
    model?: string;
    tokensUsed?: number;
    cost?: number;
  };

  context: {
    automationMode?: string;
    brandDnaVersion?: number;
    strategyVersion?: number;
  };

  timestamp: Date;
  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  action: {
    type: String,
    required: true,
    index: true,
  },
  resourceType: {
    type: String,
    required: true,
    index: true,
  },
  resourceId: {
    type: String,
    required: true,
    index: true,
  },

  before: Schema.Types.Mixed,
  after: Schema.Types.Mixed,
  diff: {
    type: Map,
    of: {
      from: Schema.Types.Mixed,
      to: Schema.Types.Mixed,
    },
  },

  actor: {
    type: { type: String, enum: ['user', 'system', 'ai_agent'], required: true },
    id: { type: String, required: true },
    agentVersion: String,
    ip: String,
    userAgent: String,
  },

  metadata: {
    correlationId: String,
    durationMs: Number,
    success: { type: Boolean, required: true },
    error: String,
    model: String,
    tokensUsed: Number,
    cost: Number,
  },

  context: {
    automationMode: String,
    brandDnaVersion: Number,
    strategyVersion: Number,
  },

  timestamp: { type: Date, default: Date.now, index: true },
}, {
  timestamps: true,
  collection: 'audit_logs',
});

AuditLogSchema.index({ userId: 1, timestamp: -1 });
AuditLogSchema.index({ action: 1, timestamp: -1 });
AuditLogSchema.index({ resourceType: 1, resourceId: 1 });
AuditLogSchema.index({ 'actor.type': 1, timestamp: -1 });
AuditLogSchema.index({ timestamp: -1 }, { expireAfterSeconds: 7776000 });
AuditLogSchema.index({ userId: 1, action: 1, timestamp: -1 });

AuditLogSchema.statics.logAction = async function (params: {
  userId: string;
  action: AuditAction;
  resourceType: string;
  resourceId: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  actor: IAuditLog['actor'];
  metadata?: Partial<IAuditLog['metadata']>;
  context?: IAuditLog['context'];
}): Promise<IAuditLog> {
  const diff: Record<string, { from: unknown; to: unknown }> = {};
  if (params.before && params.after) {
    const allKeys = new Set([
      ...Object.keys(params.before),
      ...Object.keys(params.after),
    ]);
    for (const key of allKeys) {
      const from = params.before[key];
      const to = params.after[key];
      if (JSON.stringify(from) !== JSON.stringify(to)) {
        diff[key] = { from, to };
      }
    }
  }

  return this.create({
    userId: params.userId,
    action: params.action,
    resourceType: params.resourceType,
    resourceId: params.resourceId,
    before: params.before,
    after: params.after,
    diff: Object.keys(diff).length > 0 ? diff : undefined,
    actor: params.actor,
    metadata: {
      success: true,
      ...params.metadata,
    },
    context: params.context,
  });
};

export const AuditLog: Model<IAuditLog> = mongoose.model<IAuditLog>(
  'AuditLog',
  AuditLogSchema
);
export default AuditLog;
