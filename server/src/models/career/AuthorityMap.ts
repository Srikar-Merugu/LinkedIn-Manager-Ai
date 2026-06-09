import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAuthorityTopic {
  topic: string;
  category: 'own' | 'adjacent' | 'avoid';
  priority: number;
  currentAuthority: number;
  targetAuthority: number;
  contentIdeas: string[];
  keywords: string[];
  competingVoices: string[];
}

export interface IAuthorityMap extends Document {
  userId: mongoose.Types.ObjectId;
  careerGoalId?: mongoose.Types.ObjectId;
  version: number;

  targetRole: string;
  careerStage: string;

  topics: IAuthorityTopic[];

  summary: {
    ownedTopics: number;
    adjacentTopics: number;
    avoidedTopics: number;
    highestAuthority: string;
    biggestGap: string;
    readinessScore: number;
  };

  authorityRoadmap: Array<{
    phase: string;
    timeframe: string;
    focus: string[];
    deliverables: string[];
    successMetrics: string[];
  }>;

  recommendations: string[];
  isActive: boolean;
  generatedAt: Date;

  createdAt: Date;
  updatedAt: Date;
}

const AuthorityTopicSchema = new Schema({
  topic: { type: String, required: true },
  category: { type: String, enum: ['own', 'adjacent', 'avoid'], required: true },
  priority: { type: Number, min: 1, max: 100 },
  currentAuthority: { type: Number, min: 0, max: 100 },
  targetAuthority: { type: Number, min: 0, max: 100 },
  contentIdeas: [String],
  keywords: [String],
  competingVoices: [String],
}, { _id: false });

const AuthorityRoadmapPhaseSchema = new Schema({
  phase: { type: String, required: true },
  timeframe: String,
  focus: [String],
  deliverables: [String],
  successMetrics: [String],
}, { _id: false });

const AuthorityMapSchema = new Schema<IAuthorityMap>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  careerGoalId: { type: Schema.Types.ObjectId, ref: 'CareerGoal' },
  version: { type: Number, default: 1 },

  targetRole: { type: String, required: true },
  careerStage: { type: String, required: true },

  topics: [AuthorityTopicSchema],

  summary: {
    ownedTopics: { type: Number, default: 0 },
    adjacentTopics: { type: Number, default: 0 },
    avoidedTopics: { type: Number, default: 0 },
    highestAuthority: { type: String, default: '' },
    biggestGap: { type: String, default: '' },
    readinessScore: { type: Number, default: 0 },
  },

  authorityRoadmap: [AuthorityRoadmapPhaseSchema],
  recommendations: [String],
  isActive: { type: Boolean, default: true },
  generatedAt: { type: Date, default: Date.now },
}, {
  timestamps: true,
  collection: 'authority_maps',
});

AuthorityMapSchema.index({ userId: 1, isActive: 1 });

export const AuthorityMap: Model<IAuthorityMap> = mongoose.model<IAuthorityMap>(
  'AuthorityMap',
  AuthorityMapSchema
);
export default AuthorityMap;
