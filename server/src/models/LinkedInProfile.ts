import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ILinkedInExperience {
  title: string;
  company: string;
  companyLogo?: string;
  companyUrl?: string;
  location?: string;
  description?: string;
  startDate?: { month?: number; year: number };
  endDate?: { month?: number; year: number };
  currentlyWorking?: boolean;
  employmentType?: string;
  industry?: string;
  durationInMonths?: number;
}

export interface ILinkedInEducation {
  school: string;
  schoolLogo?: string;
  degree?: string;
  fieldOfStudy?: string;
  grade?: string;
  description?: string;
  startDate?: { month?: number; year: number };
  endDate?: { month?: number; year: number };
  activities?: string;
}

export interface ILinkedInProfile extends Document {
  userId: mongoose.Types.ObjectId;
  linkedinId: string;
  accessToken: string;
  refreshToken?: string;
  tokenExpiresAt: Date;

  firstName: string;
  lastName: string;
  headline?: string;
  vanityName?: string;
  profilePicture?: string;
  about?: string;
  email?: string;
  location?: string;
  industry?: string;

  experience: ILinkedInExperience[];
  education: ILinkedInEducation[];

  summary: {
    totalExperienceYears: number;
    totalSkills: number;
    totalCertifications: number;
    totalProjects: number;
    totalActivities: number;
    careerStabilityScore: number;
    skillRelevanceScore: number;
    profileType: string;
    careerStage: string;
  };

  metadata: {
    lastSyncedAt: Date;
    lastProfileFetchAt: Date;
    syncStatus: 'never' | 'syncing' | 'synced' | 'failed' | 'partial';
    syncAttempts: number;
    lastError?: string;
    isComplete: boolean;
    profileStrength: number;
  };

  scores?: {
    profile: mongoose.Types.Decimal128;
    branding: mongoose.Types.Decimal128;
    visibility: mongoose.Types.Decimal128;
    opportunity: mongoose.Types.Decimal128;
    contentReadiness: mongoose.Types.Decimal128;
  };

  intelligenceReport?: {
    generatedAt: Date;
    reportVersion: string;
  };

  createdAt: Date;
  updatedAt: Date;
}

const ExperienceSchema = new Schema<ILinkedInExperience>({
  title: { type: String, required: true },
  company: { type: String, required: true },
  companyLogo: String,
  companyUrl: String,
  location: String,
  description: String,
  startDate: {
    month: Number,
    year: { type: Number, required: true },
  },
  endDate: {
    month: Number,
    year: Number,
  },
  currentlyWorking: { type: Boolean, default: false },
  employmentType: String,
  industry: String,
  durationInMonths: Number,
}, { _id: false });

const EducationSchema = new Schema<ILinkedInEducation>({
  school: { type: String, required: true },
  schoolLogo: String,
  degree: String,
  fieldOfStudy: String,
  grade: String,
  description: String,
  startDate: {
    month: Number,
    year: Number,
  },
  endDate: {
    month: Number,
    year: Number,
  },
  activities: String,
}, { _id: false });

const LinkedInProfileSchema = new Schema<ILinkedInProfile>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  linkedinId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  accessToken: { type: String, required: true, select: false },
  refreshToken: { type: String, select: false },
  tokenExpiresAt: { type: Date, required: true },

  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  headline: String,
  vanityName: { type: String, index: true },
  profilePicture: String,
  about: String,
  email: String,
  location: String,
  industry: String,

  experience: [ExperienceSchema],
  education: [EducationSchema],

  summary: {
    totalExperienceYears: { type: Number, default: 0 },
    totalSkills: { type: Number, default: 0 },
    totalCertifications: { type: Number, default: 0 },
    totalProjects: { type: Number, default: 0 },
    totalActivities: { type: Number, default: 0 },
    careerStabilityScore: { type: Number, default: 0 },
    skillRelevanceScore: { type: Number, default: 0 },
    profileType: { type: String, default: 'standard' },
    careerStage: { type: String, default: 'mid-level' },
  },

  metadata: {
    lastSyncedAt: Date,
    lastProfileFetchAt: Date,
    syncStatus: {
      type: String,
      enum: ['never', 'syncing', 'synced', 'failed', 'partial'],
      default: 'never',
    },
    syncAttempts: { type: Number, default: 0 },
    lastError: String,
    isComplete: { type: Boolean, default: false },
    profileStrength: { type: Number, default: 0, min: 0, max: 100 },
  },

  scores: {
    profile: { type: Schema.Types.Decimal128 },
    branding: { type: Schema.Types.Decimal128 },
    visibility: { type: Schema.Types.Decimal128 },
    opportunity: { type: Schema.Types.Decimal128 },
    contentReadiness: { type: Schema.Types.Decimal128 },
  },

  intelligenceReport: {
    generatedAt: Date,
    reportVersion: String,
  },
}, {
  timestamps: true,
  collection: 'linkedin_profiles',
});

LinkedInProfileSchema.index({ 'metadata.syncStatus': 1 });
LinkedInProfileSchema.index({ 'metadata.lastSyncedAt': -1 });
LinkedInProfileSchema.index({ 'scores.profile': -1 });
LinkedInProfileSchema.index({ industry: 1 });
LinkedInProfileSchema.index({ 'summary.profileType': 1 });
LinkedInProfileSchema.index({ 'summary.careerStage': 1 });

LinkedInProfileSchema.methods.isTokenExpired = function (): boolean {
  return new Date() >= this.tokenExpiresAt;
};

LinkedInProfileSchema.methods.toPublicJSON = function () {
  const obj = this.toObject();
  delete obj.accessToken;
  delete obj.refreshToken;
  return obj;
};

export const LinkedInProfile: Model<ILinkedInProfile> = mongoose.model<ILinkedInProfile>(
  'LinkedInProfile',
  LinkedInProfileSchema
);

export default LinkedInProfile;
