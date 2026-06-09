import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IOpportunityContent {
  type: string;
  targetAudience: string[];
  topicAreas: string[];
  contentType: string;
  distribution: string[];
  expectedOutcome: string;
}

export interface IOpportunityPlan extends Document {
  userId: mongoose.Types.ObjectId;
  strategyId: mongoose.Types.ObjectId;
  version: number;
  contentToAttract: {
    recruiters: IOpportunityContent[];
    hiringManagers: IOpportunityContent[];
    founders: IOpportunityContent[];
    clients: IOpportunityContent[];
    investors: IOpportunityContent[];
    developers: IOpportunityContent[];
  };
  opportunityForecast: Array<{
    opportunityType: string;
    probability: number;
    timeframe: string;
    contentLever: string;
    expectedSignals: string[];
  }>;
  highImpactContent: Array<{
    title: string;
    rationale: string;
    targetOutcome: string;
    priority: 'high' | 'medium' | 'low';
  }>;
  triggerContent: Array<{
    trigger: string;
    contentTemplate: string;
    targetAudience: string;
    expectedResponse: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const OpportunityContentSchema = new Schema<IOpportunityContent>({
  type: { type: String, required: true },
  targetAudience: [String],
  topicAreas: [String],
  contentType: { type: String, required: true },
  distribution: [String],
  expectedOutcome: { type: String, required: true },
}, { _id: false });

const OpportunityPlanSchema = new Schema<IOpportunityPlan>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  strategyId: { type: Schema.Types.ObjectId, ref: 'ContentStrategyIntelligence', required: true, index: true },
  version: { type: Number, default: 1 },
  contentToAttract: {
    recruiters: [OpportunityContentSchema],
    hiringManagers: [OpportunityContentSchema],
    founders: [OpportunityContentSchema],
    clients: [OpportunityContentSchema],
    investors: [OpportunityContentSchema],
    developers: [OpportunityContentSchema],
  },
  opportunityForecast: [{
    opportunityType: { type: String, required: true },
    probability: { type: Number, required: true, min: 0, max: 100 },
    timeframe: { type: String, required: true },
    contentLever: { type: String, required: true },
    expectedSignals: [String],
  }],
  highImpactContent: [{
    title: { type: String, required: true },
    rationale: { type: String, required: true },
    targetOutcome: { type: String, required: true },
    priority: { type: String, enum: ['high', 'medium', 'low'], required: true },
  }],
  triggerContent: [{
    trigger: { type: String, required: true },
    contentTemplate: { type: String, required: true },
    targetAudience: { type: String, required: true },
    expectedResponse: { type: String, required: true },
  }],
}, {
  timestamps: true,
  collection: 'opportunity_plans',
});

OpportunityPlanSchema.index({ strategyId: 1, version: -1 });

export const OpportunityPlan: Model<IOpportunityPlan> = mongoose.model<IOpportunityPlan>(
  'OpportunityPlan',
  OpportunityPlanSchema
);
export default OpportunityPlan;
