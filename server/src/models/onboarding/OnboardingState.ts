import mongoose, { Schema, Document, Model } from 'mongoose';
import type { OnboardingStep } from '../../types/database';

export interface IStepData {
  step: OnboardingStep;
  completedAt?: Date;
  skipped: boolean;
  data: Record<string, unknown>;
}

export interface IConnectedSource {
  connected: boolean;
  syncedAt?: Date;
  error?: string;
}

export interface ILinkedInSource extends IConnectedSource {
  profileId?: string;
  accessToken?: string;
}

export interface IGitHubSource extends IConnectedSource {
  username?: string;
  repos?: number;
  languages?: string[];
}

export interface IResumeSource extends IConnectedSource {
  fileId?: string;
  fileName?: string;
  fileSize?: number;
}

export interface IPortfolioSource extends IConnectedSource {
  url?: string;
  pages?: number;
}

export interface IOnboardingState extends Document {
  userId: mongoose.Types.ObjectId;
  clerkId: string;
  status: 'in_progress' | 'completed' | 'abandoned';
  currentStep: OnboardingStep;
  completedSteps: OnboardingStep[];
  stepData: IStepData[];
  connectedSources: {
    linkedin: ILinkedInSource;
    github: IGitHubSource;
    resume: IResumeSource;
    portfolio: IPortfolioSource;
  };
  linkedinUrl?: string;
  githubUrl?: string;
  careerGoals: string[];
  postingFrequency: 'never' | 'occasionally' | 'monthly' | 'weekly' | 'daily';
  analysisStatus: 'pending' | 'in_progress' | 'completed' | 'failed';
  analysisProgress: number;
  analysisLog: string[];
  analysisStartedAt?: Date;
  analysisCompletedAt?: Date;
  analysisResult?: Record<string, any>;
  brandDnaGenerated: boolean;
  voiceSamplesCount: number;
  startedAt: Date;
  completedAt?: Date;
  onboardingCompleteRedirected: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const OnboardingStateSchema = new Schema<IOnboardingState>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  clerkId: {
    type: String,
    required: true,
    index: true,
  },
  status: {
    type: String,
    enum: ['in_progress', 'completed', 'abandoned'],
    default: 'in_progress',
    index: true,
  },
  currentStep: {
    type: String,
    enum: [
      'welcome', 'linkedin_pdf', 'connect_linkedin', 'upload_resume', 'connect_github',
      'connect_portfolio', 'career_goals', 'content_experience',
      'voice_training', 'ai_analysis', 'results',
    ],
    default: 'welcome',
  },
  completedSteps: [{
    type: String,
    enum: [
      'welcome', 'linkedin_pdf', 'connect_linkedin', 'upload_resume', 'connect_github',
      'connect_portfolio', 'career_goals', 'content_experience',
      'voice_training', 'ai_analysis', 'results',
    ],
  }],
  stepData: [{
    step: {
      type: String,
      enum: [
        'welcome', 'linkedin_pdf', 'connect_linkedin', 'upload_resume', 'connect_github',
        'connect_portfolio', 'career_goals', 'content_experience',
        'voice_training', 'ai_analysis', 'results',
      ],
      required: true,
    },
    completedAt: Date,
    skipped: { type: Boolean, default: false },
    data: { type: Schema.Types.Mixed, default: {} },
  }],
  connectedSources: {
    linkedin: {
      connected: { type: Boolean, default: false },
      profileId: String,
      accessToken: String,
      syncedAt: Date,
      error: String,
    },
    github: {
      connected: { type: Boolean, default: false },
      username: String,
      repos: Number,
      languages: [String],
      syncedAt: Date,
      error: String,
    },
    resume: {
      connected: { type: Boolean, default: false },
      fileId: String,
      fileName: String,
      fileSize: Number,
      syncedAt: Date,
      error: String,
    },
    portfolio: {
      connected: { type: Boolean, default: false },
      url: String,
      pages: Number,
      syncedAt: Date,
      error: String,
    },
  },
  careerGoals: [String],
  linkedinUrl: { type: String, default: '' },
  githubUrl: { type: String, default: '' },
  postingFrequency: {
    type: String,
    enum: ['never', 'occasionally', 'monthly', 'weekly', 'daily'],
  },
  analysisStatus: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'failed'],
    default: 'pending',
  },
  analysisProgress: { type: Number, default: 0, min: 0, max: 100 },
  analysisLog: [String],
  analysisStartedAt: Date,
  analysisCompletedAt: Date,
  analysisResult: { type: Schema.Types.Mixed, default: null },
  brandDnaGenerated: { type: Boolean, default: false },
  voiceSamplesCount: { type: Number, default: 0 },
  startedAt: { type: Date, default: Date.now },
  completedAt: Date,
  onboardingCompleteRedirected: { type: Boolean, default: false },
}, {
  timestamps: true,
  collection: 'onboarding_states',
});

OnboardingStateSchema.index({ userId: 1, status: 1 });
OnboardingStateSchema.index({ clerkId: 1 }, { unique: true });
OnboardingStateSchema.index({ status: 1, updatedAt: -1 });
OnboardingStateSchema.index({ analysisStatus: 1, updatedAt: 1 });

export const OnboardingState: Model<IOnboardingState> = mongoose.model<IOnboardingState>('OnboardingState', OnboardingStateSchema);
export default OnboardingState;
