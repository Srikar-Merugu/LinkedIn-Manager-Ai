import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IWeeklyTheme extends Document {
  userId: mongoose.Types.ObjectId;
  strategyId: mongoose.Types.ObjectId;
  monthNumber: 1 | 2 | 3;
  weekNumber: 1 | 2 | 3 | 4;
  globalWeekNumber: number;
  version: number;
  title: string;
  focus: string;
  description: string;
  supportingMonthlyGoal: string;
  contentIdeas: string[];
  pillarFocus: string[];
  contentTypeMix: Array<{ type: string; count: number }>;
  status: 'pending' | 'active' | 'completed';
  startDate: Date;
  endDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

const WeeklyThemeSchema = new Schema<IWeeklyTheme>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  strategyId: { type: Schema.Types.ObjectId, ref: 'ContentStrategyIntelligence', required: true, index: true },
  monthNumber: { type: Number, enum: [1, 2, 3], required: true },
  weekNumber: { type: Number, enum: [1, 2, 3, 4], required: true },
  globalWeekNumber: { type: Number, required: true },
  version: { type: Number, default: 1 },
  title: { type: String, required: true },
  focus: { type: String, required: true },
  description: { type: String, required: true },
  supportingMonthlyGoal: { type: String, required: true },
  contentIdeas: [String],
  pillarFocus: [String],
  contentTypeMix: [{
    type: { type: String, required: true },
    count: { type: Number, required: true },
  }],
  status: { type: String, enum: ['pending', 'active', 'completed'], default: 'pending' },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
}, {
  timestamps: true,
  collection: 'weekly_themes',
});

WeeklyThemeSchema.index({ strategyId: 1, globalWeekNumber: 1 }, { unique: true });
WeeklyThemeSchema.index({ userId: 1, status: 1 });

export const WeeklyTheme: Model<IWeeklyTheme> = mongoose.model<IWeeklyTheme>(
  'WeeklyTheme',
  WeeklyThemeSchema
);
export default WeeklyTheme;
