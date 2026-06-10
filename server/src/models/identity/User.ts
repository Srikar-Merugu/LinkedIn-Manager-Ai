import mongoose, { Schema, Document, Model } from 'mongoose';
import { AutomationMode, OnboardingStatus, SubscriptionPlan } from '../../types/database';

export interface IUser extends Document {
  email: string;
  passwordHash: string;
  fullName: string;
  avatar?: string;
  subscriptionPlan: SubscriptionPlan;
  subscriptionId?: mongoose.Types.ObjectId;
  onboardingStatus: OnboardingStatus;
  onboardingStep: number;
  automationMode: AutomationMode;
  timezone: string;
  locale: string;
  settings: {
    contentFrequency: 'light' | 'moderate' | 'aggressive';
    preferredPostingTimes: string[];
    blackoutPeriods: Array<{ start: Date; end: Date; reason: string }>;
    notifications: {
      inApp: boolean;
      email: boolean;
      digestFrequency: 'realtime' | 'daily' | 'weekly';
    };
    brand: {
      autoRegenerate: boolean;
      requireApprovalForBrandChanges: boolean;
    };
  };
  usage: {
    totalContentGenerated: number;
    totalContentPublished: number;
    totalAICreditsUsed: number;
    aiCreditsRemaining: number;
    storageUsedBytes: number;
    lastActiveAt: Date;
  };
  metadata: {
    accountAgeDays: number;
    lifetimeValue: number;
    referralCode?: string;
    referredBy?: string;
    tags: string[];
    notes: string;
  };
  lastActiveAt: Date;
  isActive: boolean;
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  passwordHash: {
    type: String,
    required: true,
  },
  fullName: {
    type: String,
    required: true,
    trim: true,
  },
  avatar: String,

  subscriptionPlan: {
    type: String,
    enum: ['free', 'starter', 'professional', 'growth', 'elite'],
    default: 'free',
    index: true,
  },
  subscriptionId: {
    type: Schema.Types.ObjectId,
    ref: 'Subscription',
  },

  onboardingStatus: {
    type: String,
    enum: [
      'not_started',
      'linkedin_connected',
      'resume_uploaded',
      'github_connected',
      'goals_set',
      'brand_dna_generated',
      'complete',
    ],
    default: 'not_started',
    index: true,
  },
  onboardingStep: { type: Number, default: 0 },

  automationMode: {
    type: String,
    enum: ['manual', 'approval', 'autonomous'],
    default: 'manual',
    index: true,
  },

  timezone: { type: String, default: 'UTC' },
  locale: { type: String, default: 'en-US' },

  settings: {
    contentFrequency: { type: String, enum: ['light', 'moderate', 'aggressive'], default: 'moderate' },
    preferredPostingTimes: [String],
    blackoutPeriods: [{
      start: { type: Date, required: true },
      end: { type: Date, required: true },
      reason: String,
    }],
    notifications: {
      inApp: { type: Boolean, default: true },
      email: { type: Boolean, default: true },
      digestFrequency: { type: String, enum: ['realtime', 'daily', 'weekly'], default: 'daily' },
    },
    brand: {
      autoRegenerate: { type: Boolean, default: false },
      requireApprovalForBrandChanges: { type: Boolean, default: true },
    },
  },

  usage: {
    totalContentGenerated: { type: Number, default: 0 },
    totalContentPublished: { type: Number, default: 0 },
    totalAICreditsUsed: { type: Number, default: 0 },
    aiCreditsRemaining: { type: Number, default: 100 },
    storageUsedBytes: { type: Number, default: 0 },
    lastActiveAt: Date,
  },

  metadata: {
    accountAgeDays: Number,
    lifetimeValue: { type: Number, default: 0 },
    referralCode: String,
    referredBy: String,
    tags: [String],
    notes: String,
  },

  lastActiveAt: { type: Date, default: Date.now },
  isActive: { type: Boolean, default: true },
  isDeleted: { type: Boolean, default: false },
  deletedAt: Date,
}, {
  timestamps: true,
  collection: 'users',
});

UserSchema.index({ email: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });
UserSchema.index({ 'settings.notifications.digestFrequency': 1 });
UserSchema.index({ lastActiveAt: -1 });
UserSchema.index({ isActive: 1, subscriptionPlan: 1 });
UserSchema.index({ 'metadata.referralCode': 1 });
UserSchema.index({ isDeleted: 1, createdAt: -1 });

UserSchema.pre('save', function (next) {
  if (this.isModified('createdAt')) {
    this.metadata.accountAgeDays = Math.floor(
      (Date.now() - this.createdAt.getTime()) / (1000 * 60 * 60 * 24)
    );
  }
  this.lastActiveAt = new Date();
  next();
});

UserSchema.methods.hasFeature = function (feature: string): boolean {
  const featureMap: Record<string, SubscriptionPlan[]> = {
    intelligence_report: ['free', 'starter', 'professional', 'growth', 'elite'],
    brand_dna: ['starter', 'professional', 'growth', 'elite'],
    voice_profile: ['starter', 'professional', 'growth', 'elite'],
    content_strategy: ['professional', 'growth', 'elite'],
    ai_generation: ['professional', 'growth', 'elite'],
    opportunity_mining: ['growth', 'elite'],
    autonomous_mode: ['elite'],
    analytics: ['growth', 'elite'],
    google_sheets: ['professional', 'growth', 'elite'],
    priority_ai: ['elite'],
  };
  const plans = featureMap[feature];
  if (!plans) return false;
  return plans.includes(this.subscriptionPlan);
};

UserSchema.methods.canGenerateContent = function (): boolean {
  return this.usage.aiCreditsRemaining > 0;
};

UserSchema.methods.useAICredit = async function (amount = 1): Promise<boolean> {
  if (this.usage.aiCreditsRemaining < amount) return false;
  this.usage.aiCreditsRemaining -= amount;
  this.usage.totalAICreditsUsed += amount;
  await this.save();
  return true;
};

export const User: Model<IUser> = mongoose.model<IUser>('User', UserSchema);
export default User;
