import mongoose, { Schema, Document } from 'mongoose';

export interface ILoginHistory extends Document {
  userId: string;
  clerkId: string;
  provider: 'linkedin' | 'google' | 'github' | 'email';
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
  };
  success: boolean;
  failureReason?: string;
  sessionId?: string;
  timestamp: Date;
}

const LoginHistorySchema = new Schema<ILoginHistory>({
  userId: { type: String, index: true },
  clerkId: { type: String, index: true },
  provider: {
    type: String,
    required: true,
    enum: ['linkedin', 'google', 'github', 'email'],
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
  },
  success: { type: Boolean, default: true },
  failureReason: String,
  sessionId: String,
  timestamp: { type: Date, default: Date.now },
}, {
  timestamps: true,
  collection: 'login_history',
});

LoginHistorySchema.index({ userId: 1, timestamp: -1 });
LoginHistorySchema.index({ clerkId: 1, timestamp: -1 });
LoginHistorySchema.index({ ip: 1, timestamp: -1 });

export const LoginHistory = mongoose.model<ILoginHistory>('LoginHistory', LoginHistorySchema);
export default LoginHistory;
