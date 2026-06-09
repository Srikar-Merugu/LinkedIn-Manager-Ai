import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IMonthlyStrategy extends Document {
  userId: mongoose.Types.ObjectId;
  strategyId: mongoose.Types.ObjectId;
  monthNumber: 1 | 2 | 3;
  phase: 'positioning' | 'authority' | 'opportunity';
  version: number;
  goals: Array<{
    category: string;
    goal: string;
    reasoning: string;
    expectedOutcome: string;
    successMetrics: string[];
  }>;
  contentMix: Array<{
    type: string;
    percentage: number;
    count: number;
    reasoning: string;
  }>;
  weeklyThemeIds: mongoose.Types.ObjectId[];
  status: 'pending' | 'active' | 'completed';
  startDate: Date;
  endDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

const MonthlyStrategySchema = new Schema<IMonthlyStrategy>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  strategyId: { type: Schema.Types.ObjectId, ref: 'ContentStrategyIntelligence', required: true, index: true },
  monthNumber: { type: Number, enum: [1, 2, 3], required: true },
  phase: { type: String, enum: ['positioning', 'authority', 'opportunity'], required: true },
  version: { type: Number, default: 1 },
  goals: [{
    category: { type: String, required: true },
    goal: { type: String, required: true },
    reasoning: { type: String, required: true },
    expectedOutcome: { type: String, required: true },
    successMetrics: [String],
  }],
  contentMix: [{
    type: { type: String, required: true },
    percentage: { type: Number, required: true },
    count: { type: Number, required: true },
    reasoning: { type: String, required: true },
  }],
  weeklyThemeIds: [{ type: Schema.Types.ObjectId, ref: 'WeeklyTheme' }],
  status: { type: String, enum: ['pending', 'active', 'completed'], default: 'pending' },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
}, {
  timestamps: true,
  collection: 'monthly_strategies',
});

MonthlyStrategySchema.index({ strategyId: 1, monthNumber: 1 }, { unique: true });

export const MonthlyStrategy: Model<IMonthlyStrategy> = mongoose.model<IMonthlyStrategy>(
  'MonthlyStrategy',
  MonthlyStrategySchema
);
export default MonthlyStrategy;
