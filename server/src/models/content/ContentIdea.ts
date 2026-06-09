import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IContentIdea extends Document {
  userId: mongoose.Types.ObjectId;
  contentPillarId?: mongoose.Types.ObjectId;
  opportunityId?: mongoose.Types.ObjectId;

  topic: string;
  angle: string;
  reason: string;
  confidence: number;

  suggestedHook?: string;
  suggestedCTA?: string;
  suggestedFormats: string[];
  suggestedAngle: string;
  targetAudience: string;

  keywords: string[];
  hashtags: string[];

  source: 'pillar' | 'opportunity' | 'trend' | 'manual' | 'ai_suggested';
  status: 'active' | 'used' | 'dismissed' | 'expired';

  relatedPosts: mongoose.Types.ObjectId[];
  performance_prediction?: number;

  metadata: {
    generatedBy: string;
    agentVersion: string;
    generationTimeMs: number;
    model: string;
  };

  createdAt: Date;
  updatedAt: Date;
}

const ContentIdeaSchema = new Schema<IContentIdea>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  contentPillarId: {
    type: Schema.Types.ObjectId,
    ref: 'ContentPillar',
  },
  opportunityId: {
    type: Schema.Types.ObjectId,
    ref: 'Opportunity',
  },

  topic: { type: String, required: true },
  angle: { type: String, required: true },
  reason: { type: String, required: true },
  confidence: { type: Number, required: true, min: 0, max: 1 },

  suggestedHook: String,
  suggestedCTA: String,
  suggestedFormats: [String],
  suggestedAngle: { type: String, required: true },
  targetAudience: { type: String, required: true },

  keywords: [String],
  hashtags: [String],

  source: {
    type: String,
    enum: ['pillar', 'opportunity', 'trend', 'manual', 'ai_suggested'],
    required: true,
    index: true,
  },
  status: {
    type: String,
    enum: ['active', 'used', 'dismissed', 'expired'],
    default: 'active',
    index: true,
  },

  relatedPosts: [{
    type: Schema.Types.ObjectId,
    ref: 'Post',
  }],
  performance_prediction: Number,

  metadata: {
    generatedBy: { type: String, required: true },
    agentVersion: { type: String, required: true },
    generationTimeMs: { type: Number, required: true },
    model: { type: String, required: true },
  },
}, {
  timestamps: true,
  collection: 'content_ideas',
});

ContentIdeaSchema.index({ userId: 1, status: 1, confidence: -1 });
ContentIdeaSchema.index({ contentPillarId: 1, status: 1 });
ContentIdeaSchema.index({ keywords: 1 });
ContentIdeaSchema.index({ createdAt: -1 });

ContentIdeaSchema.methods.markUsed = async function (postId: mongoose.Types.ObjectId): Promise<void> {
  this.status = 'used';
  this.relatedPosts.push(postId);
  await this.save();
};

export const ContentIdea: Model<IContentIdea> = mongoose.model<IContentIdea>(
  'ContentIdea',
  ContentIdeaSchema
);
export default ContentIdea;
