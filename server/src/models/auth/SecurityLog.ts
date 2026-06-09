import mongoose, { Schema, Document } from 'mongoose';

export interface ISecurityLog extends Document {
  userId?: string;
  clerkId?: string;
  eventType: 'suspicious_login' | 'failed_login_attempt' | 'new_device' | 'new_location' | 'multiple_failed_attempts' | 'session_hijack_attempt' | 'unauthorized_access' | 'rate_limit_exceeded' | 'csrf_validation_failed' | 'token_expired' | 'account_deleted' | 'privacy_settings_changed' | 'data_export_requested';
  severity: 'low' | 'medium' | 'high' | 'critical';
  ip: string;
  userAgent: string;
  location?: {
    country?: string;
    city?: string;
  };
  details: Record<string, unknown>;
  isResolved: boolean;
  resolvedAt?: Date;
  resolution?: string;
  timestamp: Date;
}

const SecurityLogSchema = new Schema<ISecurityLog>({
  userId: { type: String, index: true },
  clerkId: { type: String, index: true },
  eventType: {
    type: String,
    required: true,
    enum: ['suspicious_login', 'failed_login_attempt', 'new_device', 'new_location', 'multiple_failed_attempts', 'session_hijack_attempt', 'unauthorized_access', 'rate_limit_exceeded', 'csrf_validation_failed', 'token_expired', 'account_deleted', 'privacy_settings_changed', 'data_export_requested'],
  },
  severity: {
    type: String,
    required: true,
    enum: ['low', 'medium', 'high', 'critical'],
  },
  ip: { type: String, required: true },
  userAgent: { type: String, required: true },
  location: {
    country: String,
    city: String,
  },
  details: { type: Schema.Types.Mixed, default: {} },
  isResolved: { type: Boolean, default: false },
  resolvedAt: Date,
  resolution: String,
  timestamp: { type: Date, default: Date.now },
}, {
  timestamps: true,
  collection: 'security_logs',
});

SecurityLogSchema.index({ severity: 1, timestamp: -1 });
SecurityLogSchema.index({ userId: 1, timestamp: -1 });
SecurityLogSchema.index({ eventType: 1, timestamp: -1 });
SecurityLogSchema.index({ isResolved: 1, severity: 1 });

export const SecurityLog = mongoose.model<ISecurityLog>('SecurityLog', SecurityLogSchema);
export default SecurityLog;
