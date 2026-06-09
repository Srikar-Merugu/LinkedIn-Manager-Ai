import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISkillGapEntry {
  skill: string;
  category: 'technical' | 'soft' | 'domain' | 'tool' | 'credential';
  currentLevel: number;
  targetLevel: number;
  gap: number;
  priority: number;
  marketDemand: 'high' | 'medium' | 'low';
  effort: 'low' | 'medium' | 'high';
  learningResources: Array<{
    name: string;
    type: 'course' | 'book' | 'project' | 'certification' | 'mentor';
    url?: string;
    estimatedHours: number;
  }>;
}

export interface ISkillGapReport extends Document {
  userId: mongoose.Types.ObjectId;
  careerGoalId?: mongoose.Types.ObjectId;
  version: number;

  targetRole: string;
  careerStage: string;

  skills: ISkillGapEntry[];

  summary: {
    totalGaps: number;
    criticalGaps: number;
    highPriorityGaps: number;
    mediumPriorityGaps: number;
    averageGap: number;
    estimatedLearningHours: number;
    readinessScore: number;
  };

  recommendations: string[];
  isActive: boolean;
  generatedAt: Date;

  createdAt: Date;
  updatedAt: Date;
}

const LearningResourceSchema = new Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ['course', 'book', 'project', 'certification', 'mentor'] },
  url: String,
  estimatedHours: Number,
}, { _id: false });

const SkillGapEntrySchema = new Schema({
  skill: { type: String, required: true },
  category: { type: String, enum: ['technical', 'soft', 'domain', 'tool', 'credential'], required: true },
  currentLevel: { type: Number, min: 0, max: 10, required: true },
  targetLevel: { type: Number, min: 0, max: 10, required: true },
  gap: { type: Number, min: 0, max: 10 },
  priority: { type: Number, min: 1, max: 100 },
  marketDemand: { type: String, enum: ['high', 'medium', 'low'] },
  effort: { type: String, enum: ['low', 'medium', 'high'] },
  learningResources: [LearningResourceSchema],
}, { _id: false });

const SkillGapReportSchema = new Schema<ISkillGapReport>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  careerGoalId: { type: Schema.Types.ObjectId, ref: 'CareerGoal' },
  version: { type: Number, default: 1 },

  targetRole: { type: String, required: true },
  careerStage: { type: String, required: true },

  skills: [SkillGapEntrySchema],

  summary: {
    totalGaps: { type: Number, default: 0 },
    criticalGaps: { type: Number, default: 0 },
    highPriorityGaps: { type: Number, default: 0 },
    mediumPriorityGaps: { type: Number, default: 0 },
    averageGap: { type: Number, default: 0 },
    estimatedLearningHours: { type: Number, default: 0 },
    readinessScore: { type: Number, min: 0, max: 100, default: 0 },
  },

  recommendations: [String],
  isActive: { type: Boolean, default: true },
  generatedAt: { type: Date, default: Date.now },
}, {
  timestamps: true,
  collection: 'skill_gap_reports',
});

SkillGapReportSchema.index({ userId: 1, isActive: 1 });

export const SkillGapReport: Model<ISkillGapReport> = mongoose.model<ISkillGapReport>(
  'SkillGapReport',
  SkillGapReportSchema
);
export default SkillGapReport;
