import mongoose, { Schema, Document } from 'mongoose';

export interface IUserSession extends Document {
  userId: string;
  clerkId: string;
  clerkSessionId: string;
  ip: string;
  userAgent: string;
  device: {
    type: string;
    os: string;
    browser: string;
    fingerprint?: string;
  };
  location?: {
    country?: string;
    city?: string;
    timezone?: string;
  };
  isActive: boolean;
  lastActiveAt: Date;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSessionSchema = new Schema<IUserSession>({
  userId: { type: String, required: true, index: true },
  clerkId: { type: String, required: true, index: true },
  clerkSessionId: { type: String, required: true, unique: true, index: true },
  ip: { type: String, required: true },
  userAgent: { type: String, required: true },
  device: {
    type: { type: String },
    os: String,
    browser: String,
    fingerprint: String,
  },
  location: {
    country: String,
    city: String,
    timezone: String,
  },
  isActive: { type: Boolean, default: true },
  lastActiveAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
}, {
  timestamps: true,
  collection: 'user_sessions',
});

UserSessionSchema.index({ userId: 1, isActive: 1 });
UserSessionSchema.index({ clerkSessionId: 1 });
UserSessionSchema.index({ lastActiveAt: -1 });
UserSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const UserSession = mongoose.model<IUserSession>('UserSession', UserSessionSchema);
export default UserSession;
