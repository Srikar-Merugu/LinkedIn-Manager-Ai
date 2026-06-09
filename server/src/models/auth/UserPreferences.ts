import mongoose, { Schema, Document } from 'mongoose';

export interface IUserPreferences extends Document {
  userId: string;
  clerkId: string;
  theme: 'dark' | 'light' | 'system';
  notifications: {
    email: {
      marketing: boolean;
      security: boolean;
      product: boolean;
      weeklyDigest: boolean;
    };
    push: {
      enabled: boolean;
      newInsights: boolean;
      opportunities: boolean;
      contentReminders: boolean;
    };
    inApp: {
      sounds: boolean;
      badges: boolean;
      previews: boolean;
    };
  };
  privacy: {
    profileVisibility: 'public' | 'private' | 'connections';
    showOnlineStatus: boolean;
    showActivity: boolean;
    dataCollection: boolean;
    analyticsSharing: boolean;
  };
  security: {
    twoFactorEnabled: boolean;
    loginNotifications: boolean;
    deviceTracking: boolean;
    sessionTimeout: number;
  };
  communication: {
    digestFrequency: 'realtime' | 'daily' | 'weekly' | 'never';
    preferredLanguage: string;
    timezone: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const UserPreferencesSchema = new Schema<IUserPreferences>({
  userId: { type: String, required: true, unique: true, index: true },
  clerkId: { type: String, required: true, index: true },
  theme: { type: String, enum: ['dark', 'light', 'system'], default: 'dark' },
  notifications: {
    email: {
      marketing: { type: Boolean, default: true },
      security: { type: Boolean, default: true },
      product: { type: Boolean, default: true },
      weeklyDigest: { type: Boolean, default: true },
    },
    push: {
      enabled: { type: Boolean, default: true },
      newInsights: { type: Boolean, default: true },
      opportunities: { type: Boolean, default: true },
      contentReminders: { type: Boolean, default: true },
    },
    inApp: {
      sounds: { type: Boolean, default: true },
      badges: { type: Boolean, default: true },
      previews: { type: Boolean, default: true },
    },
  },
  privacy: {
    profileVisibility: { type: String, enum: ['public', 'private', 'connections'], default: 'public' },
    showOnlineStatus: { type: Boolean, default: true },
    showActivity: { type: Boolean, default: true },
    dataCollection: { type: Boolean, default: true },
    analyticsSharing: { type: Boolean, default: true },
  },
  security: {
    twoFactorEnabled: { type: Boolean, default: false },
    loginNotifications: { type: Boolean, default: true },
    deviceTracking: { type: Boolean, default: true },
    sessionTimeout: { type: Number, default: 24 },
  },
  communication: {
    digestFrequency: { type: String, enum: ['realtime', 'daily', 'weekly', 'never'], default: 'daily' },
    preferredLanguage: { type: String, default: 'en' },
    timezone: { type: String, default: 'UTC' },
  },
}, {
  timestamps: true,
  collection: 'user_preferences',
});

export const UserPreferences = mongoose.model<IUserPreferences>('UserPreferences', UserPreferencesSchema);
export default UserPreferences;
