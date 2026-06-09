import mongoose, { Schema, Document, Model } from 'mongoose';

export type RecommendationStatus = 'active' | 'dismissed' | 'completed' | 'expired' | 'actioned';
export type RecommendationCategory = 'content' | 'brand' | 'career' | 'analytics' | 'publishing' | 'opportunity' | 'profile' | 'networking' | 'authority';

export interface IAIRecommendation extends Document {
  userId: mongoose.Types.ObjectId;
  sessionId?: mongoose.Types.ObjectId;
  category: RecommendationCategory;
  title: string;
  description: string;
  reasoning: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: RecommendationStatus;
  suggestedAction?: {
    type: string;
    label: string;
    endpoint?: string;
    params?: Record<string, any>;
  };
  sourceData: {
    trigger: string;
    dataPoints: string[];
    confidence: number;
  };
  expiresAt?: Date;
  actionedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AIRecommendationSchema = new Schema<IAIRecommendation>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  sessionId: { type: Schema.Types.ObjectId, ref: 'ChatSession' },
  category: {
    type: String,
    enum: ['content', 'brand', 'career', 'analytics', 'publishing', 'opportunity', 'profile', 'networking', 'authority'],
    required: true, index: true,
  },
  title: { type: String, required: true },
  description: { type: String, required: true },
  reasoning: { type: String, required: true },
  priority: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium', index: true },
  status: { type: String, enum: ['active', 'dismissed', 'completed', 'expired', 'actioned'], default: 'active', index: true },
  suggestedAction: {
    type: { type: String },
    label: String,
    endpoint: String,
    params: { type: Schema.Types.Mixed },
  },
  sourceData: {
    trigger: { type: String, required: true },
    dataPoints: [{ type: String }],
    confidence: { type: Number, default: 0.5 },
  },
  expiresAt: Date,
  actionedAt: Date,
}, {
  timestamps: true,
  collection: 'ai_recommendations',
});

AIRecommendationSchema.index({ userId: 1, status: 1, priority: -1 });
AIRecommendationSchema.index({ userId: 1, category: 1, createdAt: -1 });

export const AIRecommendation: Model<IAIRecommendation> = mongoose.model<IAIRecommendation>('AIRecommendation', AIRecommendationSchema);
export default AIRecommendation;
