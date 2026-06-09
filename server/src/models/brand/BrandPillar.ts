import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPillarMetrics {
  authorityScore: number;
  opportunityScore: number;
  engagementPotential: number;
  careerAlignment: number;
  overallScore: number;
}

export interface IContentPillar extends Document {
  userId: mongoose.Types.ObjectId;
  profileId?: mongoose.Types.ObjectId;
  brandDnaId?: mongoose.Types.ObjectId;
  pillars: Array<{
    name: string;
    description: string;
    topics: string[];
    audience: string[];
    contentFormats: string[];
    postingCadence: string;
    metrics: IPillarMetrics;
    evidence: string[];
  }>;
  confidence: number;
  version: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ContentPillarSchema = new Schema<IContentPillar>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  profileId: { type: Schema.Types.ObjectId, ref: 'LinkedInProfile' },
  brandDnaId: { type: Schema.Types.ObjectId, ref: 'BrandDNA' },
  pillars: [{
    name: { type: String, required: true },
    description: String,
    topics: [String],
    audience: [String],
    contentFormats: [String],
    postingCadence: String,
    metrics: {
      authorityScore: { type: Number, min: 0, max: 100 },
      opportunityScore: { type: Number, min: 0, max: 100 },
      engagementPotential: { type: Number, min: 0, max: 100 },
      careerAlignment: { type: Number, min: 0, max: 100 },
      overallScore: { type: Number, min: 0, max: 100 },
    },
    evidence: [String],
  }],
  confidence: { type: Number, min: 0, max: 1, required: true },
  version: { type: Number, default: 1 },
  isActive: { type: Boolean, default: true },
}, {
  timestamps: true,
  collection: 'content_pillars',
});

ContentPillarSchema.index({ userId: 1, isActive: 1 });
ContentPillarSchema.index({ brandDnaId: 1 });

export const BrandPillar: Model<IContentPillar> = mongoose.model<IContentPillar>(
  'BrandPillar',
  ContentPillarSchema
);
export default BrandPillar;
