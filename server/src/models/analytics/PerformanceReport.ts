import mongoose, { Schema, Document, Model } from 'mongoose';

export type ReportType = 'weekly' | 'monthly' | 'quarterly' | 'custom';
export type ReportStatus = 'generating' | 'completed' | 'failed';

export interface ITopContent {
  postId: mongoose.Types.ObjectId;
  title: string;
  contentType: string;
  score: number;
  metrics: { impressions: number; engagement: number; growth: number };
  rank: number;
}

export interface IPerformanceInsight {
  category: string;
  title: string;
  description: string;
  impact: 'positive' | 'negative' | 'neutral';
  severity: 'low' | 'medium' | 'high' | 'critical';
  metric: string;
  value: number;
  previousValue: number;
  change: number;
  recommendation?: string;
}

export interface IPerformanceReport extends Document {
  userId: mongoose.Types.ObjectId;
  type: ReportType;
  status: ReportStatus;
  period: { start: Date; end: Date };
  summary: {
    totalPosts: number;
    totalEngagement: number;
    totalReach: number;
    followerGrowth: number;
    avgEngagementRate: number;
    topPost: { title: string; engagement: number } | null;
    score: number;
  };
  topContent: ITopContent[];
  bottomContent: ITopContent[];
  insights: IPerformanceInsight[];
  growth: {
    followers: { start: number; end: number; net: number; percent: number };
    engagement: { start: number; end: number; net: number; percent: number };
    reach: { start: number; end: number; net: number; percent: number };
    authority: { start: number; end: number; net: number; percent: number };
  };
  pillarPerformance: Array<{ pillar: string; posts: number; engagement: number; reach: number; score: number; trend: 'up' | 'down' | 'stable' }>;
  recommendations: string[];
  generatedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PerformanceReportSchema = new Schema<IPerformanceReport>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { type: String, enum: ['weekly', 'monthly', 'quarterly', 'custom'], required: true, index: true },
  status: { type: String, enum: ['generating', 'completed', 'failed'], default: 'generating' },
  period: {
    start: { type: Date, required: true },
    end: { type: Date, required: true },
  },
  summary: {
    totalPosts: { type: Number, default: 0 },
    totalEngagement: { type: Number, default: 0 },
    totalReach: { type: Number, default: 0 },
    followerGrowth: { type: Number, default: 0 },
    avgEngagementRate: { type: Number, default: 0 },
    topPost: {
      title: String,
      engagement: Number,
    },
    score: { type: Number, default: 0, min: 0, max: 100 },
  },
  topContent: [{
    postId: { type: Schema.Types.ObjectId, ref: 'Post' },
    title: String,
    contentType: String,
    score: Number,
    metrics: {
      impressions: Number,
      engagement: Number,
      growth: Number,
    },
    rank: Number,
  }],
  bottomContent: [{
    postId: { type: Schema.Types.ObjectId, ref: 'Post' },
    title: String,
    contentType: String,
    score: Number,
    metrics: {
      impressions: Number,
      engagement: Number,
      growth: Number,
    },
    rank: Number,
  }],
  insights: [{
    category: String,
    title: String,
    description: String,
    impact: { type: String, enum: ['positive', 'negative', 'neutral'] },
    severity: { type: String, enum: ['low', 'medium', 'high', 'critical'] },
    metric: String,
    value: Number,
    previousValue: Number,
    change: Number,
    recommendation: String,
  }],
  growth: {
    followers: { start: { type: Number, default: 0 }, end: { type: Number, default: 0 }, net: { type: Number, default: 0 }, percent: { type: Number, default: 0 } },
    engagement: { start: { type: Number, default: 0 }, end: { type: Number, default: 0 }, net: { type: Number, default: 0 }, percent: { type: Number, default: 0 } },
    reach: { start: { type: Number, default: 0 }, end: { type: Number, default: 0 }, net: { type: Number, default: 0 }, percent: { type: Number, default: 0 } },
    authority: { start: { type: Number, default: 0 }, end: { type: Number, default: 0 }, net: { type: Number, default: 0 }, percent: { type: Number, default: 0 } },
  },
  pillarPerformance: [{
    pillar: String,
    posts: Number,
    engagement: Number,
    reach: Number,
    score: Number,
    trend: { type: String, enum: ['up', 'down', 'stable'] },
  }],
  recommendations: [{ type: String }],
  generatedAt: { type: Date, default: Date.now },
}, { timestamps: true, collection: 'performance_reports' });

PerformanceReportSchema.index({ userId: 1, type: 1, 'period.start': -1 });

export const PerformanceReport: Model<IPerformanceReport> = mongoose.model<IPerformanceReport>('PerformanceReport', PerformanceReportSchema);
export default PerformanceReport;
