import mongoose, { Schema, Document, Model } from 'mongoose';

export type OpportunityOutcome = 'pending' | 'in_progress' | 'successful' | 'unsuccessful' | 'irrelevant';
export type ContentSource = 'certification' | 'project' | 'open_source' | 'founder' | 'career' | 'skill' | 'event' | 'other';

export interface IOpportunityPerformance extends Document {
  userId: mongoose.Types.ObjectId;
  opportunityId: mongoose.Types.ObjectId;
  opportunityType: ContentSource;
  title: string;
  source: string;
  dateGenerated: Date;
  dateCompleted?: Date;
  outcome: OpportunityOutcome;
  contentCreated: number;
  contentEngagement: number;
  careerImpact: {
    interviews: number;
    offers: number;
    connections: number;
    messages: number;
  };
  metrics: {
    impressions: number;
    engagement: number;
    followerGain: number;
    authorityGain: number;
  };
  effectivenessScore: number;
  roi: { effort: 'low' | 'medium' | 'high'; return: 'low' | 'medium' | 'high'; score: number };
  notes: string[];
  metadata: { analyzedAt: Date; dataPoints: number };
  createdAt: Date;
  updatedAt: Date;
}

const OpportunityPerformanceSchema = new Schema<IOpportunityPerformance>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  opportunityId: { type: Schema.Types.ObjectId, ref: 'ContentOpportunity', required: true },
  opportunityType: {
    type: String,
    enum: ['certification', 'project', 'open_source', 'founder', 'career', 'skill', 'event', 'other'],
    required: true, index: true,
  },
  title: { type: String, required: true },
  source: { type: String, required: true },
  dateGenerated: { type: Date, required: true },
  dateCompleted: Date,
  outcome: {
    type: String,
    enum: ['pending', 'in_progress', 'successful', 'unsuccessful', 'irrelevant'],
    default: 'pending',
  },
  contentCreated: { type: Number, default: 0 },
  contentEngagement: { type: Number, default: 0 },
  careerImpact: {
    interviews: { type: Number, default: 0 },
    offers: { type: Number, default: 0 },
    connections: { type: Number, default: 0 },
    messages: { type: Number, default: 0 },
  },
  metrics: {
    impressions: { type: Number, default: 0 },
    engagement: { type: Number, default: 0 },
    followerGain: { type: Number, default: 0 },
    authorityGain: { type: Number, default: 0 },
  },
  effectivenessScore: { type: Number, default: 0, min: 0, max: 100 },
  roi: {
    effort: { type: String, enum: ['low', 'medium', 'high'] },
    return: { type: String, enum: ['low', 'medium', 'high'] },
    score: { type: Number, default: 0 },
  },
  notes: [{ type: String }],
  metadata: {
    analyzedAt: { type: Date, default: Date.now },
    dataPoints: { type: Number, default: 0 },
  },
}, { timestamps: true, collection: 'opportunity_performance' });

OpportunityPerformanceSchema.index({ userId: 1, opportunityType: 1 });
OpportunityPerformanceSchema.index({ userId: 1, effectivenessScore: -1 });

export const OpportunityPerformance: Model<IOpportunityPerformance> = mongoose.model<IOpportunityPerformance>('OpportunityPerformance', OpportunityPerformanceSchema);
export default OpportunityPerformance;
