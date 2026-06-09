import mongoose, { Schema, Document, Model } from 'mongoose';

export type RecommendationAction = 'create_post' | 'add_to_calendar' | 'update_strategy' | 'notify_user' | 'generate_draft';
export type RecommendationStatus = 'pending' | 'actioned' | 'dismissed' | 'expired';

export interface IOpportunityRecommendation extends Document {
  userId: mongoose.Types.ObjectId;
  opportunityId?: mongoose.Types.ObjectId;
  signalId?: mongoose.Types.ObjectId;
  type: string;
  title: string;
  message: string;
  suggestedActions: RecommendationAction[];
  priority: 'high' | 'medium' | 'low';
  status: RecommendationStatus;
  confidence: number;
  reasoning: string;
  generatedAt: Date;
  actionedAt?: Date;
  dismissedAt?: Date;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const OpportunityRecommendationSchema = new Schema<IOpportunityRecommendation>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  opportunityId: { type: Schema.Types.ObjectId, ref: 'ContentOpportunity' },
  signalId: { type: Schema.Types.ObjectId, ref: 'OpportunitySignal' },
  type: { type: String, required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  suggestedActions: [{ type: String, enum: ['create_post', 'add_to_calendar', 'update_strategy', 'notify_user', 'generate_draft'] }],
  priority: { type: String, enum: ['high', 'medium', 'low'], default: 'medium' },
  status: { type: String, enum: ['pending', 'actioned', 'dismissed', 'expired'], default: 'pending' },
  confidence: { type: Number, default: 0.5, min: 0, max: 1 },
  reasoning: { type: String, default: '' },
  generatedAt: { type: Date, default: Date.now },
  actionedAt: Date,
  dismissedAt: Date,
  metadata: { type: Schema.Types.Mixed, default: {} },
}, {
  timestamps: true,
  collection: 'opportunity_recommendations',
});

OpportunityRecommendationSchema.index({ userId: 1, status: 1, priority: 1 });
OpportunityRecommendationSchema.index({ opportunityId: 1 });
OpportunityRecommendationSchema.index({ generatedAt: -1 });

export const OpportunityRecommendation: Model<IOpportunityRecommendation> = mongoose.model<IOpportunityRecommendation>('OpportunityRecommendation', OpportunityRecommendationSchema);
export default OpportunityRecommendation;
