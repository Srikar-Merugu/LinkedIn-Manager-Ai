import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAuthorityTopic {
  name: string;
  category: 'dominate' | 'expand' | 'explore' | 'avoid';
  currentAuthority: number;
  targetAuthority: number;
  milestones: Array<{ description: string; timeframe: string }>;
  contentSuggestions: string[];
}

export interface IAuthorityRoadmap extends Document {
  userId: mongoose.Types.ObjectId;
  strategyId: mongoose.Types.ObjectId;
  version: number;
  topics: IAuthorityTopic[];
  growthPath: string[];
  monthlyPriorities: Array<{
    month: number;
    focus: string;
    topics: string[];
    targetOutcome: string;
  }>;
  competitiveGap: Array<{
    topic: string;
    currentStanding: string;
    targetStanding: string;
    strategy: string;
  }>;
  overallAuthorityProjection: number;
  createdAt: Date;
  updatedAt: Date;
}

const AuthorityTopicSchema = new Schema<IAuthorityTopic>({
  name: { type: String, required: true },
  category: { type: String, enum: ['dominate', 'expand', 'explore', 'avoid'], required: true },
  currentAuthority: { type: Number, default: 0, min: 0, max: 100 },
  targetAuthority: { type: Number, default: 0, min: 0, max: 100 },
  milestones: [{
    description: String,
    timeframe: String,
  }],
  contentSuggestions: [String],
}, { _id: false });

const AuthorityRoadmapSchema = new Schema<IAuthorityRoadmap>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  strategyId: { type: Schema.Types.ObjectId, ref: 'ContentStrategyIntelligence', required: true, index: true },
  version: { type: Number, default: 1 },
  topics: [AuthorityTopicSchema],
  growthPath: [String],
  monthlyPriorities: [{
    month: { type: Number, required: true },
    focus: { type: String, required: true },
    topics: [String],
    targetOutcome: { type: String, required: true },
  }],
  competitiveGap: [{
    topic: { type: String, required: true },
    currentStanding: { type: String, required: true },
    targetStanding: { type: String, required: true },
    strategy: { type: String, required: true },
  }],
  overallAuthorityProjection: { type: Number, default: 0 },
}, {
  timestamps: true,
  collection: 'authority_roadmaps',
});

AuthorityRoadmapSchema.index({ strategyId: 1, version: -1 });

export const AuthorityRoadmap: Model<IAuthorityRoadmap> = mongoose.model<IAuthorityRoadmap>(
  'AuthorityRoadmap',
  AuthorityRoadmapSchema
);
export default AuthorityRoadmap;
