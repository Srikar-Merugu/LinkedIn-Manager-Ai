import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IGitHubRepo {
  name: string;
  fullName: string;
  description?: string;
  url: string;
  language?: string;
  languages: Record<string, number>;
  stars: number;
  forks: number;
  topics: string[];
  isFork: boolean;
  size: number;
  updatedAt: string;
  readme?: string;
}

export interface IGitHubData extends Document {
  userId: mongoose.Types.ObjectId;
  clerkId: string;
  onboardingStateId: mongoose.Types.ObjectId;
  username: string;
  avatarUrl?: string;
  bio?: string;
  publicRepos: number;
  publicGists: number;
  followers: number;
  following: number;
  totalStars: number;
  totalForks: number;
  topLanguages: Array<{ name: string; percentage: number }>;
  repositories: IGitHubRepo[];
  contributionYears: number[];
  syncedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const GitHubRepoSchema = new Schema<IGitHubRepo>({
  name: { type: String, required: true },
  fullName: { type: String, required: true },
  description: String,
  url: { type: String, required: true },
  language: String,
  languages: { type: Schema.Types.Mixed, default: {} },
  stars: { type: Number, default: 0 },
  forks: { type: Number, default: 0 },
  topics: [String],
  isFork: { type: Boolean, default: false },
  size: { type: Number, default: 0 },
  updatedAt: String,
  readme: String,
}, { _id: false });

const GitHubDataSchema = new Schema<IGitHubData>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  clerkId: { type: String, required: true, index: true },
  onboardingStateId: {
    type: Schema.Types.ObjectId,
    ref: 'OnboardingState',
    required: true,
  },
  username: { type: String, required: true },
  avatarUrl: String,
  bio: String,
  publicRepos: { type: Number, default: 0 },
  publicGists: { type: Number, default: 0 },
  followers: { type: Number, default: 0 },
  following: { type: Number, default: 0 },
  totalStars: { type: Number, default: 0 },
  totalForks: { type: Number, default: 0 },
  topLanguages: [{
    name: String,
    percentage: Number,
  }],
  repositories: [GitHubRepoSchema],
  contributionYears: [Number],
  syncedAt: { type: Date, default: Date.now },
}, {
  timestamps: true,
  collection: 'github_data',
});

GitHubDataSchema.index({ userId: 1 });
GitHubDataSchema.index({ onboardingStateId: 1 });
GitHubDataSchema.index({ username: 1 });

export const GitHubData: Model<IGitHubData> = mongoose.model<IGitHubData>('GitHubData', GitHubDataSchema);
export default GitHubData;
