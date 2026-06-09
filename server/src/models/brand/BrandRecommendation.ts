import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IBrandRecommendationEntry {
  category: 'content' | 'positioning' | 'audience' | 'skills' | 'network' | 'visibility';
  priority: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  rationale: string;
  actionItems: string[];
  expectedImpact: string;
  effort: 'low' | 'medium' | 'high';
  timeframe: string;
  metrics: Record<string, number>;
}

export interface IBrandRecommendation extends Document {
  userId: mongoose.Types.ObjectId;
  profileId?: mongoose.Types.ObjectId;
  brandDnaId?: mongoose.Types.ObjectId;
  recommendations: IBrandRecommendationEntry[];
  totalRecommendations: number;
  confidence: number;
  version: number;
  isActive: boolean;
  generatedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const BrandRecommendationSchema = new Schema<IBrandRecommendation>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  profileId: { type: Schema.Types.ObjectId, ref: 'LinkedInProfile' },
  brandDnaId: { type: Schema.Types.ObjectId, ref: 'BrandDNA' },
  recommendations: [{
    category: {
      type: String,
      enum: ['content', 'positioning', 'audience', 'skills', 'network', 'visibility'],
      required: true,
    },
    priority: { type: String, enum: ['critical', 'high', 'medium', 'low'], required: true },
    title: { type: String, required: true },
    description: String,
    rationale: String,
    actionItems: [String],
    expectedImpact: String,
    effort: { type: String, enum: ['low', 'medium', 'high'] },
    timeframe: String,
    metrics: Schema.Types.Mixed,
  }],
  totalRecommendations: { type: Number, default: 0 },
  confidence: { type: Number, min: 0, max: 1, required: true },
  version: { type: Number, default: 1 },
  isActive: { type: Boolean, default: true },
  generatedAt: { type: Date, default: Date.now },
}, {
  timestamps: true,
  collection: 'brand_recommendations',
});

BrandRecommendationSchema.index({ userId: 1, isActive: 1 });
BrandRecommendationSchema.index({ brandDnaId: 1 });
BrandRecommendationSchema.index({ 'recommendations.priority': 1 });

export const BrandRecommendation: Model<IBrandRecommendation> = mongoose.model<IBrandRecommendation>(
  'BrandRecommendation',
  BrandRecommendationSchema
);
export default BrandRecommendation;
