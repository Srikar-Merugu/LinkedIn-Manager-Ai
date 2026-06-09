import mongoose, { Schema, Document, Model } from 'mongoose';

export type MilestoneType =
  | 'skill_acquired'
  | 'certification'
  | 'project_completed'
  | 'application_sent'
  | 'interview'
  | 'offer'
  | 'client_acquisition'
  | 'audience_milestone'
  | 'content_milestone'
  | 'networking_goal'
  | 'authority_goal'
  | 'career_change';

export interface ICareerMilestoneEntry extends Document {
  userId: mongoose.Types.ObjectId;
  careerGoalId?: mongoose.Types.ObjectId;
  careerBlueprintId?: mongoose.Types.ObjectId;

  type: MilestoneType;
  title: string;
  description: string;

  targetDate?: Date;
  achievedAt?: Date;
  status: 'pending' | 'in_progress' | 'achieved' | 'missed' | 'cancelled';

  metrics: Record<string, number>;
  evidence: string[];
  reflections?: string;
  reward?: string;

  isActive: boolean;
  version: number;

  createdAt: Date;
  updatedAt: Date;
}

const CareerMilestoneSchema = new Schema<ICareerMilestoneEntry>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  careerGoalId: { type: Schema.Types.ObjectId, ref: 'CareerGoal' },
  careerBlueprintId: { type: Schema.Types.ObjectId, ref: 'CareerBlueprint' },

  type: {
    type: String,
    enum: [
      'skill_acquired', 'certification', 'project_completed', 'application_sent',
      'interview', 'offer', 'client_acquisition', 'audience_milestone',
      'content_milestone', 'networking_goal', 'authority_goal', 'career_change',
    ],
    required: true,
    index: true,
  },
  title: { type: String, required: true },
  description: { type: String, required: true },

  targetDate: Date,
  achievedAt: Date,
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'achieved', 'missed', 'cancelled'],
    default: 'pending',
    index: true,
  },

  metrics: { type: Schema.Types.Mixed, default: {} },
  evidence: [String],
  reflections: String,
  reward: String,

  isActive: { type: Boolean, default: true },
  version: { type: Number, default: 1 },
}, {
  timestamps: true,
  collection: 'career_milestones',
});

CareerMilestoneSchema.index({ userId: 1, status: 1, type: 1 });
CareerMilestoneSchema.index({ careerGoalId: 1, status: 1 });
CareerMilestoneSchema.index({ achievedAt: -1 });

export const CareerMilestone: Model<ICareerMilestoneEntry> = mongoose.model<ICareerMilestoneEntry>(
  'CareerMilestone',
  CareerMilestoneSchema
);
export default CareerMilestone;
