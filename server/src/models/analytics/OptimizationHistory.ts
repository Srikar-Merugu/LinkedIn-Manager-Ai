import mongoose, { Schema, Document, Model } from 'mongoose';

export type OptimizationType = 'content_mix' | 'publishing_schedule' | 'pillar_priority' | 'content_strategy' | 'voice_tuning' | 'audience_targeting' | 'opportunity_focus' | 'career_alignment';
export type OptimizationSource = 'ai_decision' | 'recommendation' | 'manual' | 'system';
export type OptimizationStatus = 'proposed' | 'applied' | 'reverted' | 'failed';

export interface IMetricChange {
  metric: string;
  before: number;
  after: number;
  change: number;
  changePercent: number;
}

export interface IOptimizationHistory extends Document {
  userId: mongoose.Types.ObjectId;
  type: OptimizationType;
  source: OptimizationSource;
  status: OptimizationStatus;
  title: string;
  description: string;
  changes: Array<{
    field: string;
    from: any;
    to: any;
    rationale: string;
  }>;
  trigger: {
    event: string;
    recommendationId?: mongoose.Types.ObjectId;
    reason: string;
    metrics: Array<{ name: string; value: number; threshold: number }>;
  };
  expectedImpact: string;
  actualImpact?: {
    positive: boolean;
    metrics: IMetricChange[];
    summary: string;
    measuredAt: Date;
  };
  appliedAt: Date;
  revertedAt?: Date;
  revertedReason?: string;
  metadata: { duration: number; confidence: number; abTested: boolean };
  createdAt: Date;
  updatedAt: Date;
}

const OptimizationHistorySchema = new Schema<IOptimizationHistory>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: {
    type: String,
    enum: ['content_mix', 'publishing_schedule', 'pillar_priority', 'content_strategy', 'voice_tuning', 'audience_targeting', 'opportunity_focus', 'career_alignment'],
    required: true, index: true,
  },
  source: { type: String, enum: ['ai_decision', 'recommendation', 'manual', 'system'], required: true },
  status: { type: String, enum: ['proposed', 'applied', 'reverted', 'failed'], default: 'proposed', index: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  changes: [{
    field: String,
    from: Schema.Types.Mixed,
    to: Schema.Types.Mixed,
    rationale: String,
  }],
  trigger: {
    event: String,
    recommendationId: { type: Schema.Types.ObjectId, ref: 'StrategyRecommendation' },
    reason: String,
    metrics: [{
      name: String,
      value: Number,
      threshold: Number,
    }],
  },
  expectedImpact: { type: String },
  actualImpact: {
    positive: Boolean,
    metrics: [{
      metric: String,
      before: Number,
      after: Number,
      change: Number,
      changePercent: Number,
    }],
    summary: String,
    measuredAt: Date,
  },
  appliedAt: Date,
  revertedAt: Date,
  revertedReason: String,
  metadata: {
    duration: { type: Number, default: 0 },
    confidence: { type: Number, default: 0, min: 0, max: 100 },
    abTested: { type: Boolean, default: false },
  },
}, { timestamps: true, collection: 'optimization_history' });

OptimizationHistorySchema.index({ userId: 1, type: 1, status: 1 });
OptimizationHistorySchema.index({ userId: 1, appliedAt: -1 });

export const OptimizationHistory: Model<IOptimizationHistory> = mongoose.model<IOptimizationHistory>('OptimizationHistory', OptimizationHistorySchema);
export default OptimizationHistory;
