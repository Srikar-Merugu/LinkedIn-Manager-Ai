import mongoose, { Schema, Document, Model } from 'mongoose';

export type RecommendationCategory = 'content_mix' | 'publishing' | 'strategy' | 'pillar' | 'growth' | 'authority' | 'opportunity' | 'engagement' | 'audience';
export type RecommendationPriority = 'critical' | 'high' | 'medium' | 'low';
export type RecommendationStatus = 'active' | 'implemented' | 'accepted' | 'dismissed' | 'expired';
export type AutoApplyScope = 'calendar' | 'strategy' | 'publishing' | 'pillar_priorities';

export interface IRecommendationAction {
  type: 'update_calendar' | 'update_strategy' | 'adjust_mix' | 'change_publishing' | 'update_priorities' | 'create_content' | 'archive_content' | 'notify_user';
  params: Record<string, any>;
  autoApply: boolean;
  autoApplyScope?: AutoApplyScope;
  explanation: string;
}

export interface IStrategyRecommendation extends Document {
  userId: mongoose.Types.ObjectId;
  category: RecommendationCategory;
  priority: RecommendationPriority;
  status: RecommendationStatus;
  title: string;
  description: string;
  reasoning: string;
  evidence: string[];
  metrics: Array<{ name: string; current: number; target: number; gap: number }>;
  impact: { expected: string; confidence: number; timeframe: string };
  action: IRecommendationAction;
  appliedAt?: Date;
  appliedBy?: string;
  result?: { success: boolean; metric?: string; change?: number };
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const StrategyRecommendationSchema = new Schema<IStrategyRecommendation>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  category: {
    type: String,
    enum: ['content_mix', 'publishing', 'strategy', 'pillar', 'growth', 'authority', 'opportunity', 'engagement', 'audience'],
    required: true, index: true,
  },
  priority: { type: String, enum: ['critical', 'high', 'medium', 'low'], required: true, index: true },
  status: {
    type: String, enum: ['active', 'implemented', 'accepted', 'dismissed', 'expired'],
    default: 'active', index: true,
  },
  title: { type: String, required: true },
  description: { type: String, required: true },
  reasoning: { type: String, required: true },
  evidence: [{ type: String }],
  metrics: [{
    name: String,
    current: Number,
    target: Number,
    gap: Number,
  }],
  impact: {
    expected: String,
    confidence: { type: Number, min: 0, max: 100 },
    timeframe: String,
  },
  action: {
    type: { type: String, enum: ['update_calendar', 'update_strategy', 'adjust_mix', 'change_publishing', 'update_priorities', 'create_content', 'archive_content', 'notify_user'], required: true },
    params: { type: Schema.Types.Mixed, default: {} },
    autoApply: { type: Boolean, default: false },
    autoApplyScope: { type: String, enum: ['calendar', 'strategy', 'publishing', 'pillar_priorities'] },
    explanation: String,
  },
  appliedAt: Date,
  appliedBy: String,
  result: {
    success: Boolean,
    metric: String,
    change: Number,
  },
  expiresAt: { type: Date, default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
}, { timestamps: true, collection: 'strategy_recommendations' });

StrategyRecommendationSchema.index({ userId: 1, status: 1, priority: -1 });
StrategyRecommendationSchema.index({ userId: 1, category: 1, status: 1 });

export const StrategyRecommendation: Model<IStrategyRecommendation> = mongoose.model<IStrategyRecommendation>('StrategyRecommendation', StrategyRecommendationSchema);
export default StrategyRecommendation;
