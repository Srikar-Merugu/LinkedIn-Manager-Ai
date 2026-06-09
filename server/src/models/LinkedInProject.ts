import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ILinkedInProject extends Document {
  profileId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  url?: string;
  members: string[];
  startDate?: { month?: number; year: number };
  endDate?: { month?: number; year: number };
  currentlyWorking: boolean;
  skills: string[];
  mediaUrls: string[];
  isFeatured: boolean;
  metadata: {
    relevanceScore: number;
    completenessScore: number;
    isVerified: boolean;
    source: 'imported' | 'manual' | 'inferred';
  };
  createdAt: Date;
  updatedAt: Date;
}

const LinkedInProjectSchema = new Schema<ILinkedInProject>({
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
  title: {
    type: String,
    required: true,
  },
  description: String,
  url: String,
  members: [{ type: String }],
  startDate: {
    month: Number,
    year: Number,
  },
  endDate: {
    month: Number,
    year: Number,
  },
  currentlyWorking: { type: Boolean, default: false },
  skills: [{ type: String }],
  mediaUrls: [{ type: String }],
  isFeatured: { type: Boolean, default: false },
  metadata: {
    relevanceScore: { type: Number, default: 0.5, min: 0, max: 1 },
    completenessScore: { type: Number, default: 0, min: 0, max: 1 },
    isVerified: { type: Boolean, default: false },
    source: {
      type: String,
      enum: ['imported', 'manual', 'inferred'],
      default: 'imported',
    },
  },
}, {
  timestamps: true,
  collection: 'linkedin_projects',
});

LinkedInProjectSchema.index({ profileId: 1, isFeatured: -1 });
LinkedInProjectSchema.index({ userId: 1 });
LinkedInProjectSchema.index({ skills: 1 });
LinkedInProjectSchema.index({ 'metadata.relevanceScore': -1 });

export const LinkedInProject: Model<ILinkedInProject> = mongoose.model<ILinkedInProject>(
  'LinkedInProject',
  LinkedInProjectSchema
);

export default LinkedInProject;
