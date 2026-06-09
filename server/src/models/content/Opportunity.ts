import mongoose, { Schema, Document, Model } from 'mongoose';
import { OpportunityType, OpportunityStatus } from '../../types/database';

export interface IOpportunity extends Document {
  userId: mongoose.Types.ObjectId;
  profileId?: mongoose.Types.ObjectId;

  type: OpportunityType;
  title: string;
  description: string;
  source: string;
  sourceUrl?: string;

  score: number;
  confidence: number;
  reason: string;
  relevanceToBrand: number;
  potentialEngagement: number;
  effortToProduce: number;

  status: OpportunityStatus;
  priority: 'critical' | 'high' | 'medium' | 'low';

  relatedData: {
    trendingTopic?: string;
    trendMomentum?: number;
    jobTitle?: string;
    companyName?: string;
    connectionName?: string;
    connectionHeadline?: string;
    certificationName?: string;
    certificationUrl?: string;
  };

  generatedContentId?: mongoose.Types.ObjectId;
  relatedIdeas: mongoose.Types.ObjectId[];

  metadata: {
    detectedBy: string;
    agentVersion: string;
    detectionTimeMs: number;
    model: string;
  };

  expiresAt?: Date;
  actionedAt?: Date;
  dismissedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

const OpportunitySchema = new Schema<IOpportunity>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  profileId: {
    type: Schema.Types.ObjectId,
    ref: 'LinkedInProfile',
  },

  type: {
    type: String,
    enum: [
      'trending_topic', 'content_gap', 'job_posting',
      'network_event', 'certification', 'project_idea',
      'collaboration', 'industry_news',
    ],
    required: true,
    index: true,
  },
  title: { type: String, required: true },
  description: { type: String, required: true },
  source: { type: String, required: true },
  sourceUrl: String,

  score: { type: Number, required: true, min: 0, max: 100 },
  confidence: { type: Number, required: true, min: 0, max: 1 },
  reason: { type: String, required: true },
  relevanceToBrand: { type: Number, required: true, min: 0, max: 100 },
  potentialEngagement: { type: Number, required: true, min: 0, max: 100 },
  effortToProduce: { type: Number, required: true, min: 0, max: 100 },

  status: {
    type: String,
    enum: ['new', 'analyzed', 'actioned', 'dismissed', 'expired'],
    default: 'new',
    index: true,
  },
  priority: {
    type: String,
    enum: ['critical', 'high', 'medium', 'low'],
    default: 'medium',
    index: true,
  },

  relatedData: {
    trendingTopic: String,
    trendMomentum: Number,
    jobTitle: String,
    companyName: String,
    connectionName: String,
    connectionHeadline: String,
    certificationName: String,
    certificationUrl: String,
  },

  generatedContentId: { type: Schema.Types.ObjectId, ref: 'Post' },
  relatedIdeas: [{ type: Schema.Types.ObjectId, ref: 'ContentIdea' }],

  metadata: {
    detectedBy: { type: String, required: true },
    agentVersion: { type: String, required: true },
    detectionTimeMs: { type: Number, required: true },
    model: { type: String, required: true },
  },

  expiresAt: Date,
  actionedAt: Date,
  dismissedAt: Date,
}, {
  timestamps: true,
  collection: 'opportunities',
});

OpportunitySchema.index({ userId: 1, status: 1, score: -1 });
OpportunitySchema.index({ userId: 1, priority: 1, status: 1 });
OpportunitySchema.index({ type: 1, status: 1 });
OpportunitySchema.index({ expiresAt: 1 }, {
  expireAfterSeconds: 0,
  partialFilterExpression: { status: 'expired' },
});
OpportunitySchema.index({ score: -1 });
OpportunitySchema.index({ 'relatedData.trendingTopic': 1 });

OpportunitySchema.virtual('valueProposal').get(function () {
  return this.score * this.confidence;
});

OpportunitySchema.methods.getIdea = function (): string {
  return `Create content about "${this.title}". ` +
    `This ${this.type} opportunity scores ${this.score}/100 ` +
    `with ${Math.round(this.confidence * 100)}% confidence. ` +
    `Reason: ${this.reason}`;
};

OpportunitySchema.methods.markActioned = async function (
  contentId: mongoose.Types.ObjectId
): Promise<void> {
  this.status = 'actioned';
  this.generatedContentId = contentId;
  this.actionedAt = new Date();
  await this.save();
};

export const Opportunity: Model<IOpportunity> = mongoose.model<IOpportunity>(
  'Opportunity',
  OpportunitySchema
);
export default Opportunity;
