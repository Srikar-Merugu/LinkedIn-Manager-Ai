import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IDistributionEntry {
  pillarId: mongoose.Types.ObjectId;
  pillarName: string;
  percentage: number;
  postsPerWeek: number;
  reasoning: string;
}

export interface IContentDistribution extends Document {
  userId: mongoose.Types.ObjectId;
  version: number;

  distributions: IDistributionEntry[];

  summary: {
    totalPostsPerWeek: number;
    primaryPillar: string;
    primaryPercentage: number;
    varietyScore: number;
  };

  recommendations: string[];
  isActive: boolean;
  generatedAt: Date;

  createdAt: Date;
  updatedAt: Date;
}

const DistributionEntrySchema = new Schema({
  pillarId: { type: Schema.Types.ObjectId, ref: 'ContentPillar', required: true },
  pillarName: { type: String, required: true },
  percentage: { type: Number, min: 0, max: 100, required: true },
  postsPerWeek: { type: Number, min: 0 },
  reasoning: { type: String, required: true },
}, { _id: false });

const ContentDistributionSchema = new Schema<IContentDistribution>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  version: { type: Number, default: 1 },

  distributions: [DistributionEntrySchema],

  summary: {
    totalPostsPerWeek: { type: Number, default: 0 },
    primaryPillar: { type: String, default: '' },
    primaryPercentage: { type: Number, default: 0 },
    varietyScore: { type: Number, min: 0, max: 100 },
  },

  recommendations: [String],
  isActive: { type: Boolean, default: true },
  generatedAt: { type: Date, default: Date.now },
}, {
  timestamps: true,
  collection: 'content_distributions',
});

ContentDistributionSchema.index({ userId: 1, isActive: 1 });

export const ContentDistribution: Model<IContentDistribution> = mongoose.model<IContentDistribution>(
  'PillarContentDistribution',
  ContentDistributionSchema
);
export default ContentDistribution;
