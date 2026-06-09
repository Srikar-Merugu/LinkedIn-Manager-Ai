import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IBlueprintSection {
  title: string;
  description: string;
  tasks: Array<{
    name: string;
    description: string;
    priority: 'critical' | 'high' | 'medium' | 'low';
    effort: 'low' | 'medium' | 'high';
    timeframe: 'week1-2' | 'week3-4' | 'week5-6' | 'week7-8' | 'week9-10' | 'week11-12';
    completed: boolean;
  }>;
  metrics: Record<string, number>;
}

export interface ICareerBlueprint extends Document {
  userId: mongoose.Types.ObjectId;
  careerGoalId?: mongoose.Types.ObjectId;
  version: number;

  currentPosition: string;
  targetPosition: string;
  careerStage: string;
  confidence: number;

  sections: {
    skillDevelopment: IBlueprintSection;
    contentPlan: IBlueprintSection;
    networkingPlan: IBlueprintSection;
    authorityBuilding: IBlueprintSection;
    applicationStrategy?: IBlueprintSection;
  };

  milestones: Array<{
    week: number;
    title: string;
    description: string;
    deliverables: string[];
    status: 'pending' | 'in_progress' | 'completed';
  }>;

  progress: {
    overall: number;
    skillsCompleted: number;
    contentCompleted: number;
    networkingCompleted: number;
    authorityCompleted: number;
  };

  isActive: boolean;
  generatedAt: Date;
  completedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

const BlueprintTaskSchema = new Schema({
  name: { type: String, required: true },
  description: String,
  priority: { type: String, enum: ['critical', 'high', 'medium', 'low'] },
  effort: { type: String, enum: ['low', 'medium', 'high'] },
  timeframe: {
    type: String,
    enum: ['week1-2', 'week3-4', 'week5-6', 'week7-8', 'week9-10', 'week11-12'],
  },
  completed: { type: Boolean, default: false },
}, { _id: false });

const BlueprintSectionSchema = new Schema({
  title: { type: String, required: true },
  description: String,
  tasks: [BlueprintTaskSchema],
  metrics: Schema.Types.Mixed,
}, { _id: false });

const CareerBlueprintSchema = new Schema<ICareerBlueprint>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  careerGoalId: { type: Schema.Types.ObjectId, ref: 'CareerGoal' },
  version: { type: Number, default: 1 },

  currentPosition: { type: String, required: true },
  targetPosition: { type: String, required: true },
  careerStage: { type: String, required: true },
  confidence: { type: Number, min: 0, max: 1, required: true },

  sections: {
    skillDevelopment: { type: BlueprintSectionSchema, required: true },
    contentPlan: { type: BlueprintSectionSchema, required: true },
    networkingPlan: { type: BlueprintSectionSchema, required: true },
    authorityBuilding: { type: BlueprintSectionSchema, required: true },
    applicationStrategy: BlueprintSectionSchema,
  },

  milestones: [{
    week: { type: Number, required: true },
    title: { type: String, required: true },
    description: String,
    deliverables: [String],
    status: {
      type: String, enum: ['pending', 'in_progress', 'completed'], default: 'pending',
    },
  }],

  progress: {
    overall: { type: Number, default: 0, min: 0, max: 100 },
    skillsCompleted: { type: Number, default: 0 },
    contentCompleted: { type: Number, default: 0 },
    networkingCompleted: { type: Number, default: 0 },
    authorityCompleted: { type: Number, default: 0 },
  },

  isActive: { type: Boolean, default: true },
  generatedAt: { type: Date, default: Date.now },
  completedAt: Date,
}, {
  timestamps: true,
  collection: 'career_blueprints',
});

CareerBlueprintSchema.index({ userId: 1, isActive: 1 });
CareerBlueprintSchema.index({ careerGoalId: 1 });

export const CareerBlueprint: Model<ICareerBlueprint> = mongoose.model<ICareerBlueprint>(
  'CareerBlueprint',
  CareerBlueprintSchema
);
export default CareerBlueprint;
