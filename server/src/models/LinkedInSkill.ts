import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ILinkedInSkill extends Document {
  profileId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  name: string;
  endorsements: number;
  isTopSkill: boolean;
  category?: string;
  source: 'imported' | 'inferred' | 'suggested';
  confidence: number;
  isVerified: boolean;
  lastEndorsedAt?: Date;
  metadata: {
    isActive: boolean;
    relevanceScore: number;
    marketDemandScore: number;
    lastValidatedAt: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

const LinkedInSkillSchema = new Schema<ILinkedInSkill>({
  profileId: {
    type: Schema.Types.ObjectId,
    ref: 'LinkedInProfile',
    required: true,
    index: true,
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  name: {
    type: String,
    required: true,
  },
  endorsements: {
    type: Number,
    default: 0,
    min: 0,
  },
  isTopSkill: {
    type: Boolean,
    default: false,
  },
  category: String,
  source: {
    type: String,
    enum: ['imported', 'inferred', 'suggested'],
    default: 'imported',
  },
  confidence: {
    type: Number,
    default: 1.0,
    min: 0,
    max: 1,
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  lastEndorsedAt: Date,
  metadata: {
    isActive: { type: Boolean, default: true },
    relevanceScore: { type: Number, default: 0.5, min: 0, max: 1 },
    marketDemandScore: { type: Number, default: 0.5, min: 0, max: 1 },
    lastValidatedAt: { type: Date, default: Date.now },
  },
}, {
  timestamps: true,
  collection: 'linkedin_skills',
});

LinkedInSkillSchema.index({ profileId: 1, name: 1 }, { unique: true });
LinkedInSkillSchema.index({ profileId: 1, endorsements: -1 });
LinkedInSkillSchema.index({ name: 1 });
LinkedInSkillSchema.index({ 'metadata.relevanceScore': -1 });
LinkedInSkillSchema.index({ isTopSkill: 1 });

export const LinkedInSkill: Model<ILinkedInSkill> = mongoose.model<ILinkedInSkill>(
  'LinkedInSkill',
  LinkedInSkillSchema
);

export default LinkedInSkill;
