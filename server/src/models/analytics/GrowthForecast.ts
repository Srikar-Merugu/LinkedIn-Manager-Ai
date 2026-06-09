import mongoose, { Schema, Document, Model } from 'mongoose';

export type ForecastPeriod = '30_days' | '90_days' | '12_months';
export type ForecastStatus = 'pending' | 'completed' | 'failed';

export interface IMetricProjection {
  metric: string;
  currentValue: number;
  projectedValue: number;
  lowerBound: number;
  upperBound: number;
  confidenceInterval: number;
  growthRate: number;
  seasonalityFactor: number;
}

export interface IGoalProjection {
  goal: string;
  currentProgress: number;
  projectedDate: Date;
  onTrack: boolean;
  probability: number;
  recommendedActions: string[];
}

export interface IGrowthForecast extends Document {
  userId: mongoose.Types.ObjectId;
  period: ForecastPeriod;
  status: ForecastStatus;
  generatedAt: Date;
  projections: {
    followers: IMetricProjection;
    engagement: IMetricProjection;
    reach: IMetricProjection;
    authority: IMetricProjection;
    opportunities: IMetricProjection;
  };
  goalProjections: IGoalProjection[];
  predictions: Array<{
    category: string;
    title: string;
    description: string;
    probability: number;
    timeframe: string;
    impact: 'high' | 'medium' | 'low';
    signals: string[];
  }>;
  assumptions: Array<{ factor: string; impact: number; description: string }>;
  risks: Array<{ risk: string; probability: number; impact: number; mitigation: string }>;
  metadata: {
    modelVersion: string;
    dataPoints: number;
    accuracy: number;
    recalculationNeeded: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

const GrowthForecastSchema = new Schema<IGrowthForecast>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  period: { type: String, enum: ['30_days', '90_days', '12_months'], required: true },
  status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
  generatedAt: { type: Date, default: Date.now },
  projections: {
    followers: {
      metric: { type: String, default: 'followers' },
      currentValue: Number,
      projectedValue: Number,
      lowerBound: Number,
      upperBound: Number,
      confidenceInterval: Number,
      growthRate: Number,
      seasonalityFactor: Number,
    },
    engagement: {
      metric: { type: String, default: 'engagement' },
      currentValue: Number,
      projectedValue: Number,
      lowerBound: Number,
      upperBound: Number,
      confidenceInterval: Number,
      growthRate: Number,
      seasonalityFactor: Number,
    },
    reach: {
      metric: { type: String, default: 'reach' },
      currentValue: Number,
      projectedValue: Number,
      lowerBound: Number,
      upperBound: Number,
      confidenceInterval: Number,
      growthRate: Number,
      seasonalityFactor: Number,
    },
    authority: {
      metric: { type: String, default: 'authority' },
      currentValue: Number,
      projectedValue: Number,
      lowerBound: Number,
      upperBound: Number,
      confidenceInterval: Number,
      growthRate: Number,
      seasonalityFactor: Number,
    },
    opportunities: {
      metric: { type: String, default: 'opportunities' },
      currentValue: Number,
      projectedValue: Number,
      lowerBound: Number,
      upperBound: Number,
      confidenceInterval: Number,
      growthRate: Number,
      seasonalityFactor: Number,
    },
  },
  goalProjections: [{
    goal: String,
    currentProgress: Number,
    projectedDate: Date,
    onTrack: Boolean,
    probability: Number,
    recommendedActions: [String],
  }],
  predictions: [{
    category: String,
    title: String,
    description: String,
    probability: Number,
    timeframe: String,
    impact: { type: String, enum: ['high', 'medium', 'low'] },
    signals: [String],
  }],
  assumptions: [{
    factor: String,
    impact: Number,
    description: String,
  }],
  risks: [{
    risk: String,
    probability: Number,
    impact: Number,
    mitigation: String,
  }],
  metadata: {
    modelVersion: { type: String, default: '1.0' },
    dataPoints: { type: Number, default: 0 },
    accuracy: { type: Number, default: 0, min: 0, max: 100 },
    recalculationNeeded: { type: Boolean, default: false },
  },
}, { timestamps: true, collection: 'growth_forecasts' });

GrowthForecastSchema.index({ userId: 1, period: 1, 'generatedAt': -1 });

export const GrowthForecast: Model<IGrowthForecast> = mongoose.model<IGrowthForecast>('GrowthForecast', GrowthForecastSchema);
export default GrowthForecast;
