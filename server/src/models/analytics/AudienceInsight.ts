import mongoose, { Schema, Document, Model } from 'mongoose';

export type AudienceSegment = 'engaged' | 'new' | 'loyal' | 'opportunity' | 'general';
export type EngagementTier = 'high' | 'medium' | 'low';

export interface IAudienceDemographic {
  industry: string;
  percentage: number;
  engagementRate: number;
}

export interface IAudienceBehavior {
  activeHours: number[];
  activeDays: string[];
  bestTimeToPost: string;
  bestDayToPost: string;
  averageReadTime: number;
  scrollThroughRate: number;
  commentSentiment: number;
}

export interface IAudienceInsight extends Document {
  userId: mongoose.Types.ObjectId;
  segment: AudienceSegment;
  period: { start: Date; end: Date };
  demographics: IAudienceDemographic[];
  behaviors: IAudienceBehavior;
  topContentTypes: Array<{ contentType: string; engagementRate: number; posts: number }>;
  topTopics: Array<{ topic: string; engagementRate: number; impressions: number }>;
  interests: Array<{ category: string; score: number; trend: 'rising' | 'stable' | 'declining' }>;
  engagement: {
    total: number;
    unique: number;
    returning: number;
    conversion: number;
    byType: { likes: number; comments: number; shares: number; saves: number };
  };
  growth: { newFollowers: number; lostFollowers: number; netGrowth: number; growthRate: number };
  insights: Array<{ title: string; description: string; impact: 'positive' | 'negative' | 'neutral'; recommendation?: string }>;
  metadata: { generatedAt: Date; dataPoints: number; confidence: number };
  createdAt: Date;
  updatedAt: Date;
}

const AudienceInsightSchema = new Schema<IAudienceInsight>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  segment: { type: String, enum: ['engaged', 'new', 'loyal', 'opportunity', 'general'], required: true },
  period: {
    start: { type: Date, required: true },
    end: { type: Date, required: true },
  },
  demographics: [{
    industry: String,
    percentage: Number,
    engagementRate: Number,
  }],
  behaviors: {
    activeHours: [{ type: Number }],
    activeDays: [{ type: String }],
    bestTimeToPost: String,
    bestDayToPost: String,
    averageReadTime: Number,
    scrollThroughRate: Number,
    commentSentiment: Number,
  },
  topContentTypes: [{
    contentType: String,
    engagementRate: Number,
    posts: Number,
  }],
  topTopics: [{
    topic: String,
    engagementRate: Number,
    impressions: Number,
  }],
  interests: [{
    category: String,
    score: Number,
    trend: { type: String, enum: ['rising', 'stable', 'declining'] },
  }],
  engagement: {
    total: { type: Number, default: 0 },
    unique: { type: Number, default: 0 },
    returning: { type: Number, default: 0 },
    conversion: { type: Number, default: 0 },
    byType: {
      likes: { type: Number, default: 0 },
      comments: { type: Number, default: 0 },
      shares: { type: Number, default: 0 },
      saves: { type: Number, default: 0 },
    },
  },
  growth: {
    newFollowers: { type: Number, default: 0 },
    lostFollowers: { type: Number, default: 0 },
    netGrowth: { type: Number, default: 0 },
    growthRate: { type: Number, default: 0 },
  },
  insights: [{
    title: String,
    description: String,
    impact: { type: String, enum: ['positive', 'negative', 'neutral'] },
    recommendation: String,
  }],
  metadata: {
    generatedAt: { type: Date, default: Date.now },
    dataPoints: { type: Number, default: 0 },
    confidence: { type: Number, default: 0, min: 0, max: 100 },
  },
}, { timestamps: true, collection: 'audience_insights' });

AudienceInsightSchema.index({ userId: 1, 'period.start': -1 });

export const AudienceInsight: Model<IAudienceInsight> = mongoose.model<IAudienceInsight>('AudienceInsight', AudienceInsightSchema);
export default AudienceInsight;
