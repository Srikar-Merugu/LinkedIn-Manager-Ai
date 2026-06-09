import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IStrategyScore extends Document {
  userId: mongoose.Types.ObjectId;
  strategyId: mongoose.Types.ObjectId;
  version: number;
  authorityScore: {
    overall: number;
    topicDominance: number;
    credibility: number;
    differentiation: number;
    evidence: string[];
  };
  opportunityScore: {
    overall: number;
    recruiterAppeal: number;
    clientAppeal: number;
    investorAppeal: number;
    networkGrowthPotential: number;
    evidence: string[];
  };
  careerAlignmentScore: {
    overall: number;
    roleFit: number;
    industryRelevance: number;
    skillShowcasing: number;
    narrativeStrength: number;
    evidence: string[];
  };
  audienceFitScore: {
    overall: number;
    relevanceToAudience: number;
    engagementPotential: number;
    shareability: number;
    evidence: string[];
  };
  executionScore: {
    overall: number;
    feasibility: number;
    consistency: number;
    resourceEfficiency: number;
    evidence: string[];
  };
  overallScore: number;
  scoreBreakdown: Record<string, number>;
  recommendations: string[];
  createdAt: Date;
  updatedAt: Date;
}

const StrategyScoreSchema = new Schema<IStrategyScore>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  strategyId: { type: Schema.Types.ObjectId, ref: 'ContentStrategyIntelligence', required: true, index: true },
  version: { type: Number, default: 1 },
  authorityScore: {
    overall: { type: Number, default: 0 },
    topicDominance: { type: Number, default: 0 },
    credibility: { type: Number, default: 0 },
    differentiation: { type: Number, default: 0 },
    evidence: [String],
  },
  opportunityScore: {
    overall: { type: Number, default: 0 },
    recruiterAppeal: { type: Number, default: 0 },
    clientAppeal: { type: Number, default: 0 },
    investorAppeal: { type: Number, default: 0 },
    networkGrowthPotential: { type: Number, default: 0 },
    evidence: [String],
  },
  careerAlignmentScore: {
    overall: { type: Number, default: 0 },
    roleFit: { type: Number, default: 0 },
    industryRelevance: { type: Number, default: 0 },
    skillShowcasing: { type: Number, default: 0 },
    narrativeStrength: { type: Number, default: 0 },
    evidence: [String],
  },
  audienceFitScore: {
    overall: { type: Number, default: 0 },
    relevanceToAudience: { type: Number, default: 0 },
    engagementPotential: { type: Number, default: 0 },
    shareability: { type: Number, default: 0 },
    evidence: [String],
  },
  executionScore: {
    overall: { type: Number, default: 0 },
    feasibility: { type: Number, default: 0 },
    consistency: { type: Number, default: 0 },
    resourceEfficiency: { type: Number, default: 0 },
    evidence: [String],
  },
  overallScore: { type: Number, default: 0 },
  scoreBreakdown: { type: Schema.Types.Mixed, default: {} },
  recommendations: [String],
}, {
  timestamps: true,
  collection: 'strategy_scores',
});

StrategyScoreSchema.index({ strategyId: 1, version: -1 });

export const StrategyScore: Model<IStrategyScore> = mongoose.model<IStrategyScore>(
  'StrategyScore',
  StrategyScoreSchema
);
export default StrategyScore;
