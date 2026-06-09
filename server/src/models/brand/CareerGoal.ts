import mongoose, { Schema, Document, Model } from 'mongoose';

export type GoalType =
  | 'internship'
  | 'job_search'
  | 'career_change'
  | 'freelancing'
  | 'startup'
  | 'thought_leadership'
  | 'networking'
  | 'personal_branding'
  | 'skill_development';

export interface ICareerMilestone {
  title: string;
  description: string;
  targetDate: Date;
  achievedAt?: Date;
  status: 'pending' | 'in_progress' | 'achieved' | 'missed';
  metrics: Record<string, number>;
}

export interface ICareerGoal extends Document {
  userId: mongoose.Types.ObjectId;
  profileId?: mongoose.Types.ObjectId;

  primaryGoal: GoalType;
  secondaryGoals: GoalType[];
  customGoalDescription?: string;

  targetRole?: string;
  targetRoleLevel?: 'entry' | 'mid' | 'senior' | 'lead' | 'executive';
  targetCompanies: string[];
  targetIndustries: string[];
  targetLocations: string[];

  timeline: {
    shortTerm: string;
    mediumTerm: string;
    longTerm: string;
    targetDate?: Date;
  };

  growthObjectives: Array<{
    category: 'skill' | 'network' | 'content' | 'credential' | 'experience';
    name: string;
    description: string;
    priority: 'critical' | 'high' | 'medium' | 'low';
    status: 'identified' | 'in_progress' | 'achieved';
    targetDate?: Date;
    evidence?: string[];
  }>;

  gapAnalysis: {
    skills: Array<{ name: string; current: number; target: number; priority: number }>;
    network: Array<{ connection: string; reason: string; priority: number }>;
    content: Array<{ topic: string; reason: string; urgency: 'now' | 'soon' | 'later' }>;
    credentials: Array<{ name: string; reason: string; effort: 'low' | 'medium' | 'high' }>;
  };

  milestones: ICareerMilestone[];

  successMetrics: {
    metric: string;
    currentValue: number;
    targetValue: number;
    unit: string;
  }[];

  isActive: boolean;
  status: 'draft' | 'active' | 'completed' | 'archived';
  version: number;
  lastReviewedAt?: Date;
  completedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

const MilestoneSchema = new Schema<ICareerMilestone>({
  title: { type: String, required: true },
  description: { type: String, required: true },
  targetDate: { type: Date, required: true },
  achievedAt: Date,
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'achieved', 'missed'],
    default: 'pending',
  },
  metrics: Schema.Types.Mixed,
}, { _id: false });

const CareerGoalSchema = new Schema<ICareerGoal>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  profileId: {
    type: Schema.Types.ObjectId,
    ref: 'LinkedInProfile',
  },

  primaryGoal: {
    type: String,
    enum: [
      'internship', 'job_search', 'career_change', 'freelancing',
      'startup', 'thought_leadership', 'networking',
      'personal_branding', 'skill_development',
    ],
    required: true,
    index: true,
  },
  secondaryGoals: [{
    type: String,
    enum: [
      'internship', 'job_search', 'career_change', 'freelancing',
      'startup', 'thought_leadership', 'networking',
      'personal_branding', 'skill_development',
    ],
  }],
  customGoalDescription: String,

  targetRole: String,
  targetRoleLevel: {
    type: String,
    enum: ['entry', 'mid', 'senior', 'lead', 'executive'],
  },
  targetCompanies: [String],
  targetIndustries: [String],
  targetLocations: [String],

  timeline: {
    shortTerm: { type: String, required: true },
    mediumTerm: { type: String, required: true },
    longTerm: { type: String, required: true },
    targetDate: Date,
  },

  growthObjectives: [{
    category: {
      type: String,
      enum: ['skill', 'network', 'content', 'credential', 'experience'],
      required: true,
    },
    name: { type: String, required: true },
    description: String,
    priority: { type: String, enum: ['critical', 'high', 'medium', 'low'], required: true },
    status: {
      type: String,
      enum: ['identified', 'in_progress', 'achieved'],
      default: 'identified',
    },
    targetDate: Date,
    evidence: [String],
  }],

  gapAnalysis: {
    skills: [{
      name: String,
      current: { type: Number, min: 0, max: 10 },
      target: { type: Number, min: 0, max: 10 },
      priority: Number,
    }],
    network: [{
      connection: String,
      reason: String,
      priority: Number,
    }],
    content: [{
      topic: String,
      reason: String,
      urgency: { type: String, enum: ['now', 'soon', 'later'] },
    }],
    credentials: [{
      name: String,
      reason: String,
      effort: { type: String, enum: ['low', 'medium', 'high'] },
    }],
  },

  milestones: [MilestoneSchema],

  successMetrics: [{
    metric: String,
    currentValue: Number,
    targetValue: Number,
    unit: String,
  }],

  isActive: { type: Boolean, default: true },
  status: {
    type: String,
    enum: ['draft', 'active', 'completed', 'archived'],
    default: 'active',
    index: true,
  },
  version: { type: Number, default: 1 },
  lastReviewedAt: Date,
  completedAt: Date,
}, {
  timestamps: true,
  collection: 'career_goals',
});

CareerGoalSchema.index({ userId: 1, isActive: 1, status: 1 });
CareerGoalSchema.index({ primaryGoal: 1, status: 1 });
CareerGoalSchema.index({ targetIndustries: 1 });
CareerGoalSchema.index({ targetCompanies: 1 });

CareerGoalSchema.methods.getProgress = function (): number {
  const objectives = this.growthObjectives || [];
  if (objectives.length === 0) return 0;
  const achieved = objectives.filter((o: any) => o.status === 'achieved').length;
  return Math.round((achieved / objectives.length) * 100);
};

CareerGoalSchema.methods.getContentPriorities = function (): string[] {
  return (
    this.gapAnalysis?.content
      ?.filter((c: any) => c.urgency === 'now')
      .map((c: any) => c.topic) || []
  );
};

export const CareerGoal: Model<ICareerGoal> = mongoose.model<ICareerGoal>(
  'CareerGoal',
  CareerGoalSchema
);
export default CareerGoal;
