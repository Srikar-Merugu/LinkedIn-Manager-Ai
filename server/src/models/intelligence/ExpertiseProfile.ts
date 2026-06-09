import mongoose, { Schema, Document, Model } from 'mongoose';
import type { ExpertiseLevel } from '../../types/linkedin';

export interface IExpertiseProfile extends Document {
  userId: mongoose.Types.ObjectId;
  profileId: mongoose.Types.ObjectId;
  primary: IExpertiseAreaSchema[];
  secondary: IExpertiseAreaSchema[];
  emerging: IExpertiseAreaSchema[];
  hidden: IExpertiseAreaSchema[];
  confidence: number;
  summary: string;
  analyzedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IExpertiseAreaSchema {
  name: string;
  level: ExpertiseLevel;
  confidence: number;
  evidence: string[];
  yearsExperience: number;
  relatedSkills: string[];
  contentIdeas: string[];
}

const ExpertiseAreaSubSchema = new Schema<IExpertiseAreaSchema>({
  name: { type: String, required: true },
  level: {
    type: String,
    enum: ['primary', 'secondary', 'emerging', 'hidden'],
    required: true,
  },
  confidence: { type: Number, required: true, min: 0, max: 1 },
  evidence: [String],
  yearsExperience: { type: Number, default: 0 },
  relatedSkills: [String],
  contentIdeas: [String],
}, { _id: false });

const ExpertiseProfileSchema = new Schema<IExpertiseProfile>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  profileId: { type: Schema.Types.ObjectId, ref: 'LinkedInProfile', required: true, index: true },
  primary: [ExpertiseAreaSubSchema],
  secondary: [ExpertiseAreaSubSchema],
  emerging: [ExpertiseAreaSubSchema],
  hidden: [ExpertiseAreaSubSchema],
  confidence: { type: Number, default: 0, min: 0, max: 1 },
  summary: { type: String, default: '' },
  analyzedAt: { type: Date, default: Date.now },
}, {
  timestamps: true,
  collection: 'expertise_profiles',
});

ExpertiseProfileSchema.index({ profileId: 1 });
ExpertiseProfileSchema.index({ userId: 1 });

export const ExpertiseProfile: Model<IExpertiseProfile> = mongoose.model<IExpertiseProfile>('ExpertiseProfile', ExpertiseProfileSchema);
export default ExpertiseProfile;
