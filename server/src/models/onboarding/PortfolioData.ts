import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPortfolioEntry {
  title: string;
  description: string;
  url?: string;
  technologies: string[];
  type: 'project' | 'blog' | 'case_study' | 'other';
  date?: string;
  highlights: string[];
}

export interface IPortfolioData extends Document {
  userId: mongoose.Types.ObjectId;
  clerkId: string;
  onboardingStateId: mongoose.Types.ObjectId;
  url: string;
  title?: string;
  description?: string;
  entries: IPortfolioEntry[];
  aboutContent?: string;
  skills: string[];
  rawContent: string;
  syncedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PortfolioEntrySchema = new Schema<IPortfolioEntry>({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  url: String,
  technologies: [String],
  type: {
    type: String,
    enum: ['project', 'blog', 'case_study', 'other'],
    required: true,
  },
  date: String,
  highlights: [String],
}, { _id: false });

const PortfolioDataSchema = new Schema<IPortfolioData>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  clerkId: { type: String, required: true, index: true },
  onboardingStateId: {
    type: Schema.Types.ObjectId,
    ref: 'OnboardingState',
    required: true,
  },
  url: { type: String, required: true },
  title: String,
  description: String,
  entries: [PortfolioEntrySchema],
  aboutContent: String,
  skills: [String],
  rawContent: { type: String, default: '' },
  syncedAt: { type: Date, default: Date.now },
}, {
  timestamps: true,
  collection: 'portfolio_data',
});

PortfolioDataSchema.index({ userId: 1 });
PortfolioDataSchema.index({ onboardingStateId: 1 });

export const PortfolioData: Model<IPortfolioData> = mongoose.model<IPortfolioData>('PortfolioData', PortfolioDataSchema);
export default PortfolioData;
