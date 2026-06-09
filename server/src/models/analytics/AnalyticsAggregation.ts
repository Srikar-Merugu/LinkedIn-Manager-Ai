import mongoose, { Schema, Document, Model } from 'mongoose';
import { AnalyticsPeriod } from '../../types/database';

export interface IMetricValue {
  metric: string;
  value: number;
  previousValue?: number;
  change?: number;
  changePercent?: number;
}

export interface IAnalyticsAggregation extends Document {
  userId: mongoose.Types.ObjectId;
  period: AnalyticsPeriod;
  periodStart: Date;
  periodEnd: Date;

  overview: {
    totalImpressions: number;
    totalReach: number;
    totalEngagement: number;
    totalPosts: number;
    totalFollowers: number;
    followerGrowth: number;
    profileViews: number;
    averageEngagementRate: number;
  };

  content: {
    byFormat: IMetricValue[];
    byPillar: IMetricValue[];
    byType: IMetricValue[];
    byDayOfWeek: IMetricValue[];
    byTimeOfDay: IMetricValue[];
    topPerforming: Array<{
      postId: mongoose.Types.ObjectId;
      title: string;
      engagement: number;
      hook: string;
    }>;
  };

  audience: {
    newFollowers: number;
    topGeographies: Array<{ region: string; count: number }>;
    topIndustries: Array<{ industry: string; count: number }>;
    topRoles: Array<{ role: string; count: number }>;
    followerGrowth: Array<{ date: Date; count: number }>;
  };

  growth: {
    connectionRequestsSent: number;
    connectionRequestsAccepted: number;
    acceptanceRate: number;
    messagesReceived: number;
    profileCompletenessScore: number;
    sssScore: number;
  };

  ai: {
    contentGenerated: number;
    contentPublished: number;
    aiCreditsUsed: number;
    averageQualityScore: number;
    averageVoiceMatch: number;
    totalAICost: number;
  };

  comparisons: {
    vsPreviousPeriod: IMetricValue[];
    vsGoal: IMetricValue[];
    vsBenchmark: IMetricValue[];
  };

  metadata: {
    generatedBy: string;
    agentVersion: string;
    generationTimeMs: number;
    confidence: number;
    dataPoints: number;
  };

  createdAt: Date;
}

const MetricValueSchema = new Schema<IMetricValue>({
  metric: { type: String, required: true },
  value: { type: Number, required: true },
  previousValue: Number,
  change: Number,
  changePercent: Number,
}, { _id: false });

const AnalyticsAggregationSchema = new Schema<IAnalyticsAggregation>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },

  period: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'quarterly'],
    required: true,
    index: true,
  },
  periodStart: { type: Date, required: true },
  periodEnd: { type: Date, required: true },

  overview: {
    totalImpressions: { type: Number, default: 0 },
    totalReach: { type: Number, default: 0 },
    totalEngagement: { type: Number, default: 0 },
    totalPosts: { type: Number, default: 0 },
    totalFollowers: { type: Number, default: 0 },
    followerGrowth: { type: Number, default: 0 },
    profileViews: { type: Number, default: 0 },
    averageEngagementRate: { type: Number, default: 0 },
  },

  content: {
    byFormat: [MetricValueSchema],
    byPillar: [MetricValueSchema],
    byType: [MetricValueSchema],
    byDayOfWeek: [MetricValueSchema],
    byTimeOfDay: [MetricValueSchema],
    topPerforming: [{
      postId: { type: Schema.Types.ObjectId, ref: 'Post' },
      title: String,
      engagement: Number,
      hook: String,
    }],
  },

  audience: {
    newFollowers: { type: Number, default: 0 },
    topGeographies: [{ region: String, count: Number }],
    topIndustries: [{ industry: String, count: Number }],
    topRoles: [{ role: String, count: Number }],
    followerGrowth: [{ date: Date, count: Number }],
  },

  growth: {
    connectionRequestsSent: { type: Number, default: 0 },
    connectionRequestsAccepted: { type: Number, default: 0 },
    acceptanceRate: { type: Number, default: 0 },
    messagesReceived: { type: Number, default: 0 },
    profileCompletenessScore: { type: Number, default: 0 },
    sssScore: { type: Number, default: 0 },
  },

  ai: {
    contentGenerated: { type: Number, default: 0 },
    contentPublished: { type: Number, default: 0 },
    aiCreditsUsed: { type: Number, default: 0 },
    averageQualityScore: { type: Number, default: 0 },
    averageVoiceMatch: { type: Number, default: 0 },
    totalAICost: { type: Number, default: 0 },
  },

  comparisons: {
    vsPreviousPeriod: [MetricValueSchema],
    vsGoal: [MetricValueSchema],
    vsBenchmark: [MetricValueSchema],
  },

  metadata: {
    generatedBy: { type: String, required: true },
    agentVersion: { type: String, required: true },
    generationTimeMs: { type: Number, required: true },
    confidence: { type: Number, required: true, min: 0, max: 1 },
    dataPoints: { type: Number, default: 0 },
  },
}, {
  timestamps: true,
  collection: 'analytics_aggregations',
});

AnalyticsAggregationSchema.index({ userId: 1, period: 1, periodStart: -1 }, { unique: true });
AnalyticsAggregationSchema.index({ userId: 1, periodStart: -1 });
AnalyticsAggregationSchema.index({ period: 1, periodStart: -1 });

AnalyticsAggregationSchema.virtual('engagementRate').get(function () {
  return this.overview.totalImpressions > 0
    ? (this.overview.totalEngagement / this.overview.totalImpressions) * 100
    : 0;
});

AnalyticsAggregationSchema.statics.getLatestForUser = async function (
  userId: string,
  period: AnalyticsPeriod
): Promise<IAnalyticsAggregation | null> {
  return this.findOne({ userId, period })
    .sort({ periodStart: -1 })
    .exec();
};

AnalyticsAggregationSchema.statics.getTrend = async function (
  userId: string,
  period: AnalyticsPeriod,
  limit = 12
): Promise<IAnalyticsAggregation[]> {
  return this.find({ userId, period })
    .sort({ periodStart: -1 })
    .limit(limit)
    .exec();
};

export const AnalyticsAggregation: Model<IAnalyticsAggregation> = mongoose.model<IAnalyticsAggregation>(
  'AnalyticsAggregation',
  AnalyticsAggregationSchema
);
export default AnalyticsAggregation;
