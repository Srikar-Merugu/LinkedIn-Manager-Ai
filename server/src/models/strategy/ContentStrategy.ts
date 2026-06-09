import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IStrategyWeek {
  weekNumber: number;
  theme: string;
  focus: string;
  objectives: string[];
  contentMix: Array<{ pillarId: string; pillarName: string; count: number }>;
  startDate: Date;
  endDate: Date;
}

export interface IContentStrategy extends Document {
  userId: mongoose.Types.ObjectId;
  brandDnaId?: mongoose.Types.ObjectId;
  voiceProfileId?: mongoose.Types.ObjectId;
  careerGoalId?: mongoose.Types.ObjectId;

  version: number;
  status: 'draft' | 'active' | 'completed' | 'archived';

  narrativeArc: string;
  monthlyFocus: string[];

  weeks: IStrategyWeek[];

  contentObjectives: Array<{
    objective: string;
    pillar: string;
    metric: string;
    target: number;
    deadline: Date;
  }>;

  growthObjectives: Array<{
    objective: string;
    category: string;
    metric: string;
    target: number;
    deadline: Date;
  }>;

  optimizationRules: Array<{
    condition: string;
    action: string;
    trigger: string;
    lastApplied?: Date;
  }>;

  calendar: {
    generatedAt: Date;
    sheetsId?: string;
    sheetsUrl?: string;
    lastSyncedAt?: Date;
  };

  performance: {
    projectedReach: number;
    projectedEngagement: number;
    actualReach?: number;
    actualEngagement?: number;
    viralContentCount: number;
    topPerformingPosts: string[];
  };

  metadata: {
    generatedBy: string;
    agentVersion: string;
    generationTimeMs: number;
    confidence: number;
    feedbackScore?: number;
  };

  isActive: boolean;
  activatedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const StrategyWeekSchema = new Schema<IStrategyWeek>({
  weekNumber: { type: Number, required: true },
  theme: { type: String, required: true },
  focus: { type: String, required: true },
  objectives: [String],
  contentMix: [{
    pillarId: String,
    pillarName: String,
    count: { type: Number, required: true },
  }],
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
}, { _id: false });

const ContentStrategySchema = new Schema<IContentStrategy>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  brandDnaId: { type: Schema.Types.ObjectId, ref: 'BrandDNA' },
  voiceProfileId: { type: Schema.Types.ObjectId, ref: 'VoiceProfile' },
  careerGoalId: { type: Schema.Types.ObjectId, ref: 'CareerGoal' },

  version: { type: Number, default: 1 },
  status: {
    type: String,
    enum: ['draft', 'active', 'completed', 'archived'],
    default: 'draft',
    index: true,
  },

  narrativeArc: { type: String, required: true },
  monthlyFocus: [String],

  weeks: [StrategyWeekSchema],

  contentObjectives: [{
    objective: { type: String, required: true },
    pillar: { type: String, required: true },
    metric: { type: String, required: true },
    target: { type: Number, required: true },
    deadline: { type: Date, required: true },
  }],

  growthObjectives: [{
    objective: { type: String, required: true },
    category: { type: String, required: true },
    metric: { type: String, required: true },
    target: { type: Number, required: true },
    deadline: { type: Date, required: true },
  }],

  optimizationRules: [{
    condition: { type: String, required: true },
    action: { type: String, required: true },
    trigger: { type: String, required: true },
    lastApplied: Date,
  }],

  calendar: {
    generatedAt: { type: Date, default: Date.now },
    sheetsId: String,
    sheetsUrl: String,
    lastSyncedAt: Date,
  },

  performance: {
    projectedReach: { type: Number, default: 0 },
    projectedEngagement: { type: Number, default: 0 },
    actualReach: Number,
    actualEngagement: Number,
    viralContentCount: { type: Number, default: 0 },
    topPerformingPosts: [String],
  },

  metadata: {
    generatedBy: { type: String, required: true },
    agentVersion: { type: String, required: true },
    generationTimeMs: { type: Number, required: true },
    confidence: { type: Number, required: true, min: 0, max: 1 },
    feedbackScore: Number,
  },

  isActive: { type: Boolean, default: false },
  activatedAt: Date,
  completedAt: Date,
}, {
  timestamps: true,
  collection: 'content_strategies',
});

ContentStrategySchema.index({ userId: 1, isActive: 1 });
ContentStrategySchema.index({ userId: 1, status: 1, version: -1 });
ContentStrategySchema.index({ 'weeks.weekNumber': 1 });
ContentStrategySchema.index({ 'metadata.confidence': -1 });

ContentStrategySchema.virtual('progress').get(function () {
  if (!this.weeks?.length) return 0;
  const now = new Date();
  const elapsed = this.weeks.filter((w: any) => w.endDate <= now).length;
  return Math.round((elapsed / this.weeks.length) * 100);
});

ContentStrategySchema.methods.getCurrentWeek = function (): IStrategyWeek | null {
  const now = new Date();
  return this.weeks?.find((w: any) => w.startDate <= now && w.endDate >= now) || null;
};

ContentStrategySchema.methods.getUpcomingWeeks = function (count = 4): IStrategyWeek[] {
  const now = new Date();
  return (
    this.weeks
      ?.filter((w: any) => w.startDate >= now)
      .slice(0, count) || []
  );
};

export const ContentStrategy: Model<IContentStrategy> = mongoose.model<IContentStrategy>(
  'ContentStrategy',
  ContentStrategySchema
);
export default ContentStrategy;
