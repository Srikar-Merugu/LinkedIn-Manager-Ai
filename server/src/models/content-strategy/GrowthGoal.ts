import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IGrowthGoal extends Document {
  userId: mongoose.Types.ObjectId;
  strategyId: mongoose.Types.ObjectId;
  version: number;
  category: 'audience' | 'authority' | 'career' | 'networking' | 'content' | 'growth';
  goal: string;
  reasoning: string;
  expectedOutcome: string;
  successMetrics: string[];
  priority: 'critical' | 'high' | 'medium' | 'low';
  targetDate?: Date;
  status: 'active' | 'in_progress' | 'achieved' | 'deprioritized';
  progress: number;
  linkedPillars: string[];
  linkedOpportunities: string[];
  createdAt: Date;
  updatedAt: Date;
}

const GrowthGoalSchema = new Schema<IGrowthGoal>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  strategyId: { type: Schema.Types.ObjectId, ref: 'ContentStrategyIntelligence', required: true, index: true },
  version: { type: Number, default: 1 },
  category: { type: String, enum: ['audience', 'authority', 'career', 'networking', 'content', 'growth'], required: true },
  goal: { type: String, required: true },
  reasoning: { type: String, required: true },
  expectedOutcome: { type: String, required: true },
  successMetrics: [String],
  priority: { type: String, enum: ['critical', 'high', 'medium', 'low'], default: 'medium' },
  targetDate: Date,
  status: { type: String, enum: ['active', 'in_progress', 'achieved', 'deprioritized'], default: 'active' },
  progress: { type: Number, default: 0, min: 0, max: 100 },
  linkedPillars: [String],
  linkedOpportunities: [String],
}, {
  timestamps: true,
  collection: 'growth_goals',
});

GrowthGoalSchema.index({ strategyId: 1, category: 1 });
GrowthGoalSchema.index({ userId: 1, status: 1 });

export const GrowthGoal: Model<IGrowthGoal> = mongoose.model<IGrowthGoal>(
  'GrowthGoal',
  GrowthGoalSchema
);
export default GrowthGoal;
