import mongoose, { Schema, Document, Model } from 'mongoose';
import { SubscriptionPlan } from '../../types/database';

export interface ISubscription extends Document {
  userId: mongoose.Types.ObjectId;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  plan: SubscriptionPlan;
  status: 'active' | 'canceled' | 'past_due' | 'incomplete' | 'trialing' | 'paused';
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  trialEndsAt?: Date;
  canceledAt?: Date;
  billing: {
    interval: 'month' | 'year';
    amount: number;
    currency: string;
    lastInvoiceId?: string;
    lastPaymentDate?: Date;
    nextPaymentDate?: Date;
  };
  features: {
    maxContentGenerations: number;
    maxPostsPerDay: number;
    aiCreditsPerMonth: number;
    hasAnalytics: boolean;
    hasOpportunityMining: boolean;
    hasAutonomousMode: boolean;
    hasPrioritySupport: boolean;
    hasCustomVoice: boolean;
  };
  usage: {
    contentGenerationsThisPeriod: number;
    postsPublishedThisPeriod: number;
    aiCreditsUsedThisPeriod: number;
  };
  metadata: {
    couponApplied?: string;
    promoCode?: string;
    notes: string;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SubscriptionSchema = new Schema<ISubscription>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true,
  },
  stripeCustomerId: {
    type: String,
    required: true,
    index: true,
  },
  stripeSubscriptionId: {
    type: String,
    required: true,
    unique: true,
  },
  plan: {
    type: String,
    enum: ['free', 'starter', 'professional', 'growth', 'elite'],
    required: true,
    index: true,
  },
  status: {
    type: String,
    enum: ['active', 'canceled', 'past_due', 'incomplete', 'trialing', 'paused'],
    required: true,
    default: 'active',
    index: true,
  },
  currentPeriodStart: { type: Date, required: true },
  currentPeriodEnd: { type: Date, required: true },
  trialEndsAt: Date,
  canceledAt: Date,
  billing: {
    interval: { type: String, enum: ['month', 'year'], required: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'usd' },
    lastInvoiceId: String,
    lastPaymentDate: Date,
    nextPaymentDate: Date,
  },
  features: {
    maxContentGenerations: { type: Number, default: 10 },
    maxPostsPerDay: { type: Number, default: 1 },
    aiCreditsPerMonth: { type: Number, default: 100 },
    hasAnalytics: { type: Boolean, default: false },
    hasOpportunityMining: { type: Boolean, default: false },
    hasAutonomousMode: { type: Boolean, default: false },
    hasPrioritySupport: { type: Boolean, default: false },
    hasCustomVoice: { type: Boolean, default: false },
  },
  usage: {
    contentGenerationsThisPeriod: { type: Number, default: 0 },
    postsPublishedThisPeriod: { type: Number, default: 0 },
    aiCreditsUsedThisPeriod: { type: Number, default: 0 },
  },
  metadata: {
    couponApplied: String,
    promoCode: String,
    notes: String,
  },
  isActive: { type: Boolean, default: true },
}, {
  timestamps: true,
  collection: 'subscriptions',
});

SubscriptionSchema.index({ stripeCustomerId: 1, status: 1 });
SubscriptionSchema.index({ status: 1, currentPeriodEnd: 1 });
SubscriptionSchema.index({ plan: 1, status: 1 });

SubscriptionSchema.methods.isInPeriod = function (): boolean {
  const now = new Date();
  return now >= this.currentPeriodStart && now <= this.currentPeriodEnd;
};

SubscriptionSchema.methods.hasRemainingCredits = function (): boolean {
  return this.usage.aiCreditsUsedThisPeriod < this.features.aiCreditsPerMonth;
};

SubscriptionSchema.virtual('isTrialing').get(function () {
  return this.status === 'trialing';
});

SubscriptionSchema.virtual('daysRemaining').get(function () {
  return Math.ceil(
    (this.currentPeriodEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
});

export const Subscription: Model<ISubscription> = mongoose.model<ISubscription>(
  'Subscription',
  SubscriptionSchema
);
export default Subscription;
