import mongoose, { Schema, Document, Model } from 'mongoose';

export interface INetworkingTarget {
  type: 'creator' | 'recruiter' | 'hiring_manager' | 'founder' | 'investor' | 'peer' | 'mentor';
  rationale: string;
  engagementStrategy: string;
  suggestedTopics: string[];
  platforms: string[];
}

export interface INetworkingPlan extends Document {
  userId: mongoose.Types.ObjectId;
  strategyId: mongoose.Types.ObjectId;
  version: number;
  targets: INetworkingTarget[];
  communities: Array<{
    name: string;
    platform: string;
    rationale: string;
    suggestedTopics: string[];
    engagementFrequency: string;
  }>;
  discussionsToJoin: Array<{
    topic: string;
    rationale: string;
    suggestedAngle: string;
    platforms: string[];
  }>;
  creatorsToFollow: Array<{
    name: string;
    rationale: string;
    contentType: string;
    engagementTactic: string;
  }>;
  weeklyEngagementPlan: Array<{
    week: number;
    focus: string;
    actions: string[];
    expectedOutcome: string;
  }>;
  reach: {
    projectedNewConnections: number;
    projectedEngagements: number;
    targetIndustries: string[];
  };
  createdAt: Date;
  updatedAt: Date;
}

const NetworkingTargetSchema = new Schema<INetworkingTarget>({
  type: { type: String, enum: ['creator', 'recruiter', 'hiring_manager', 'founder', 'investor', 'peer', 'mentor'], required: true },
  rationale: { type: String, required: true },
  engagementStrategy: { type: String, required: true },
  suggestedTopics: [String],
  platforms: [String],
}, { _id: false });

const NetworkingPlanSchema = new Schema<INetworkingPlan>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  strategyId: { type: Schema.Types.ObjectId, ref: 'ContentStrategyIntelligence', required: true, index: true },
  version: { type: Number, default: 1 },
  targets: [NetworkingTargetSchema],
  communities: [{
    name: { type: String, required: true },
    platform: { type: String, required: true },
    rationale: { type: String, required: true },
    suggestedTopics: [String],
    engagementFrequency: { type: String, required: true },
  }],
  discussionsToJoin: [{
    topic: { type: String, required: true },
    rationale: { type: String, required: true },
    suggestedAngle: { type: String, required: true },
    platforms: [String],
  }],
  creatorsToFollow: [{
    name: { type: String, required: true },
    rationale: { type: String, required: true },
    contentType: { type: String, required: true },
    engagementTactic: { type: String, required: true },
  }],
  weeklyEngagementPlan: [{
    week: { type: Number, required: true },
    focus: { type: String, required: true },
    actions: [String],
    expectedOutcome: { type: String, required: true },
  }],
  reach: {
    projectedNewConnections: { type: Number, default: 0 },
    projectedEngagements: { type: Number, default: 0 },
    targetIndustries: [String],
  },
}, {
  timestamps: true,
  collection: 'networking_plans',
});

NetworkingPlanSchema.index({ strategyId: 1, version: -1 });

export const NetworkingPlan: Model<INetworkingPlan> = mongoose.model<INetworkingPlan>(
  'NetworkingPlan',
  NetworkingPlanSchema
);
export default NetworkingPlan;
