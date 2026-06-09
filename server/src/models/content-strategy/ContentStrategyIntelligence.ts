import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IMonthlyPlan {
  monthNumber: 1 | 2 | 3;
  phase: 'positioning' | 'authority' | 'opportunity';
  goals: Array<{ goal: string; reasoning: string; expectedOutcome: string; successMetrics: string[] }>;
  contentMix: Array<{ type: string; percentage: number; reasoning: string }>;
  weeklyThemes: number[];
}

export interface IContentStrategyIntelligence extends Document {
  userId: mongoose.Types.ObjectId;
  brandDnaId?: mongoose.Types.ObjectId;
  writingDnaId?: mongoose.Types.ObjectId;
  careerGoalId?: mongoose.Types.ObjectId;
  version: number;
  status: 'draft' | 'active' | 'archived';
  generationTrigger: string;

  profileSnapshot: {
    experienceLevel: string;
    primarySkills: string[];
    targetRole?: string;
    audienceSize?: string;
  };

  overallStrategy: {
    narrative: string;
    monthlyPlans: IMonthlyPlan[];
    totalWeeks: number;
    recommendedFrequency: number;
    distributionSummary: string;
  };

  growthGoals: Array<{
    category: 'audience' | 'authority' | 'career' | 'networking' | 'content' | 'growth';
    goal: string;
    reasoning: string;
    expectedOutcome: string;
    successMetrics: string[];
    targetDate?: Date;
  }>;

  scores: {
    authorityScore: number;
    opportunityScore: number;
    careerAlignmentScore: number;
    audienceFitScore: number;
    executionScore: number;
    overallScore: number;
  };

  previousVersionId?: mongoose.Types.ObjectId;
  regenerationHistory: Array<{ version: number; trigger: string; timestamp: Date; changes: string[] }>;

  isActive: boolean;
  activatedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const MonthlyPlanSchema = new Schema<IMonthlyPlan>({
  monthNumber: { type: Number, enum: [1, 2, 3], required: true },
  phase: { type: String, enum: ['positioning', 'authority', 'opportunity'], required: true },
  goals: [{
    goal: { type: String, required: true },
    reasoning: { type: String, required: true },
    expectedOutcome: { type: String, required: true },
    successMetrics: [String],
  }],
  contentMix: [{
    type: { type: String, required: true },
    percentage: { type: Number, required: true },
    reasoning: { type: String, required: true },
  }],
  weeklyThemes: [Number],
}, { _id: false });

const ContentStrategyIntelligenceSchema = new Schema<IContentStrategyIntelligence>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  brandDnaId: { type: Schema.Types.ObjectId, ref: 'BrandDNA' },
  writingDnaId: { type: Schema.Types.ObjectId, ref: 'WritingDNA' },
  careerGoalId: { type: Schema.Types.ObjectId, ref: 'CareerGoal' },
  version: { type: Number, default: 1 },
  status: { type: String, enum: ['draft', 'active', 'archived'], default: 'draft', index: true },
  generationTrigger: { type: String, default: 'initial' },

  profileSnapshot: {
    experienceLevel: { type: String, required: true },
    primarySkills: [String],
    targetRole: String,
    audienceSize: String,
  },

  overallStrategy: {
    narrative: { type: String, required: true },
    monthlyPlans: [MonthlyPlanSchema],
    totalWeeks: { type: Number, default: 12 },
    recommendedFrequency: { type: Number, default: 4 },
    distributionSummary: { type: String, required: true },
  },

  growthGoals: [{
    category: { type: String, enum: ['audience', 'authority', 'career', 'networking', 'content', 'growth'], required: true },
    goal: { type: String, required: true },
    reasoning: { type: String, required: true },
    expectedOutcome: { type: String, required: true },
    successMetrics: [String],
    targetDate: Date,
  }],

  scores: {
    authorityScore: { type: Number, default: 0 },
    opportunityScore: { type: Number, default: 0 },
    careerAlignmentScore: { type: Number, default: 0 },
    audienceFitScore: { type: Number, default: 0 },
    executionScore: { type: Number, default: 0 },
    overallScore: { type: Number, default: 0 },
  },

  previousVersionId: { type: Schema.Types.ObjectId, ref: 'ContentStrategyIntelligence' },
  regenerationHistory: [{
    version: Number,
    trigger: String,
    timestamp: { type: Date, default: Date.now },
    changes: [String],
  }],

  isActive: { type: Boolean, default: false },
  activatedAt: Date,
}, {
  timestamps: true,
  collection: 'content_strategy_intelligence',
});

ContentStrategyIntelligenceSchema.index({ userId: 1, isActive: 1 });
ContentStrategyIntelligenceSchema.index({ userId: 1, version: -1 });
ContentStrategyIntelligenceSchema.index({ 'scores.overallScore': -1 });

export const ContentStrategyIntelligence: Model<IContentStrategyIntelligence> = mongoose.model<IContentStrategyIntelligence>(
  'ContentStrategyIntelligence',
  ContentStrategyIntelligenceSchema
);
export default ContentStrategyIntelligence;
