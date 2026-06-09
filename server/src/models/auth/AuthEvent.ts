import mongoose, { Schema, Document } from 'mongoose';

export interface IAuthEvent extends Document {
  userId: string;
  clerkId: string;
  eventType: 'login' | 'logout' | 'signup' | 'oauth_linkedin' | 'oauth_google' | 'oauth_github' | 'email_otp' | 'email_magiclink' | 'session_created' | 'session_removed' | 'account_linked' | 'account_unlinked' | 'password_reset_requested' | 'email_verified' | 'suspicious_login' | 'login_failed';
  provider: 'linkedin' | 'google' | 'github' | 'email' | 'unknown';
  ip: string;
  userAgent: string;
  location?: {
    country?: string;
    city?: string;
    timezone?: string;
  };
  device?: {
    type: string;
    os: string;
    browser: string;
    fingerprint?: string;
  };
  metadata: Record<string, unknown>;
  success: boolean;
  error?: string;
  sessionId?: string;
  timestamp: Date;
}

const AuthEventSchema = new Schema<IAuthEvent>({
  userId: { type: String, index: true },
  clerkId: { type: String, index: true },
  eventType: {
    type: String,
    required: true,
    enum: ['login', 'logout', 'signup', 'oauth_linkedin', 'oauth_google', 'oauth_github', 'email_otp', 'email_magiclink', 'session_created', 'session_removed', 'account_linked', 'account_unlinked', 'password_reset_requested', 'email_verified', 'suspicious_login', 'login_failed'],
  },
  provider: {
    type: String,
    enum: ['linkedin', 'google', 'github', 'email', 'unknown'],
    default: 'unknown',
  },
  ip: { type: String, required: true },
  userAgent: { type: String, required: true },
  location: {
    country: String,
    city: String,
    timezone: String,
  },
  device: {
    type: { type: String },
    os: String,
    browser: String,
    fingerprint: String,
  },
  metadata: { type: Schema.Types.Mixed, default: {} },
  success: { type: Boolean, default: true },
  error: String,
  sessionId: String,
  timestamp: { type: Date, default: Date.now },
}, {
  timestamps: true,
  collection: 'auth_events',
});

AuthEventSchema.index({ timestamp: -1 });
AuthEventSchema.index({ userId: 1, timestamp: -1 });
AuthEventSchema.index({ clerkId: 1, timestamp: -1 });
AuthEventSchema.index({ eventType: 1, timestamp: -1 });
AuthEventSchema.index({ ip: 1, timestamp: -1 });

export const AuthEvent = mongoose.model<IAuthEvent>('AuthEvent', AuthEventSchema);
export default AuthEvent;
