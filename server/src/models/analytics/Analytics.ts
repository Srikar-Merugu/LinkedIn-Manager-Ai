import mongoose, { Schema, Document, Model } from 'mongoose';

export type AnalyticsCategory = 'engagement' | 'reach' | 'growth' | 'opportunity' | 'authority' | 'career';
export type AnalyticsSource = 'linkedin' | 'manual' | 'system';
export type MetricType = 'impression' | 'reach' | 'like' | 'comment' | 'share' | 'save' | 'profile_visit' | 'follower' | 'connection' | 'recruiter_interaction' | 'client_lead' | 'opportunity_generated';

export interface IMetric {
  type: MetricType;
  value: number;
  previousValue?: number;
  change?: number;
  changePercent?: number;
}

export interface IAnalytics extends Document {
  userId: mongoose.Types.ObjectId;
  postId?: mongoose.Types.ObjectId;
  category: AnalyticsCategory;
  source: AnalyticsSource;
  period: { start: Date; end: Date };
  metrics: IMetric[];
  engagement: { likes: number; comments: number; shares: number; saves: number; engagementRate: number };
  reach: { impressions: number; uniqueViews: number; reachRate: number };
  growth: { followerGain: number; followerLoss: number; netGrowth: number; connectionRequests: number };
  opportunity: { recruiterInteractions: number; clientLeads: number; opportunitiesGenerated: number; messagesReceived: number };
  authority: { profileVisits: number; searchAppearances: number; articleViews: number; hashtagMentions: number };
  career: { jobOffers: number; interviewRequests: number; partnershipRequests: number; speakingRequests: number };
  rawData: Record<string, any>;
  metadata: { fetchedAt: Date; dataVersion: string; isEstimated: boolean };
  createdAt: Date;
  updatedAt: Date;
}

const AnalyticsSchema = new Schema<IAnalytics>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  postId: { type: Schema.Types.ObjectId, ref: 'Post', index: true },
  category: { type: String, enum: ['engagement', 'reach', 'growth', 'opportunity', 'authority', 'career'], required: true, index: true },
  source: { type: String, enum: ['linkedin', 'manual', 'system'], required: true },
  period: {
    start: { type: Date, required: true },
    end: { type: Date, required: true },
  },
  metrics: [{
    type: { type: String, enum: ['impression', 'reach', 'like', 'comment', 'share', 'save', 'profile_visit', 'follower', 'connection', 'recruiter_interaction', 'client_lead', 'opportunity_generated'], required: true },
    value: { type: Number, required: true },
    previousValue: Number,
    change: Number,
    changePercent: Number,
  }],
  engagement: {
    likes: { type: Number, default: 0 },
    comments: { type: Number, default: 0 },
    shares: { type: Number, default: 0 },
    saves: { type: Number, default: 0 },
    engagementRate: { type: Number, default: 0 },
  },
  reach: {
    impressions: { type: Number, default: 0 },
    uniqueViews: { type: Number, default: 0 },
    reachRate: { type: Number, default: 0 },
  },
  growth: {
    followerGain: { type: Number, default: 0 },
    followerLoss: { type: Number, default: 0 },
    netGrowth: { type: Number, default: 0 },
    connectionRequests: { type: Number, default: 0 },
  },
  opportunity: {
    recruiterInteractions: { type: Number, default: 0 },
    clientLeads: { type: Number, default: 0 },
    opportunitiesGenerated: { type: Number, default: 0 },
    messagesReceived: { type: Number, default: 0 },
  },
  authority: {
    profileVisits: { type: Number, default: 0 },
    searchAppearances: { type: Number, default: 0 },
    articleViews: { type: Number, default: 0 },
    hashtagMentions: { type: Number, default: 0 },
  },
  career: {
    jobOffers: { type: Number, default: 0 },
    interviewRequests: { type: Number, default: 0 },
    partnershipRequests: { type: Number, default: 0 },
    speakingRequests: { type: Number, default: 0 },
  },
  rawData: { type: Schema.Types.Mixed, default: {} },
  metadata: {
    fetchedAt: { type: Date, default: Date.now },
    dataVersion: { type: String, default: '1.0' },
    isEstimated: { type: Boolean, default: false },
  },
}, { timestamps: true, collection: 'analytics' });

AnalyticsSchema.index({ userId: 1, 'period.start': -1 });
AnalyticsSchema.index({ userId: 1, postId: 1 });
AnalyticsSchema.index({ userId: 1, category: 1, 'period.start': -1 });

export const Analytics: Model<IAnalytics> = mongoose.model<IAnalytics>('Analytics', AnalyticsSchema);
export default Analytics;
