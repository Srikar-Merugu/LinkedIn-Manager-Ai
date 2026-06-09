import mongoose, { Schema, Document, Model } from 'mongoose';

export type OpportunityStatus = 'new' | 'scored' | 'prioritized' | 'converted' | 'scheduled' | 'published' | 'analyzed' | 'dismissed';
export type OpportunityPriority = 'immediate' | 'this_week' | 'this_month' | 'someday' | 'archived';

export interface IContentAngle {
  type: 'story' | 'framework' | 'educational' | 'contrarian' | 'journey' | 'career' | 'founder' | 'technical';
  title: string;
  hook: string;
  outline: string[];
  estimatedEngagement: number;
}

export interface IContentOpportunity extends Document {
  userId: mongoose.Types.ObjectId;
  signalId?: mongoose.Types.ObjectId;
  source: string;
  type: string;
  title: string;
  description: string;
  keyInsight: string;
  status: OpportunityStatus;
  priority: OpportunityPriority;
  priorityRank: number;
  scores: {
    overall: number;
    authorityPotential: number;
    careerImpact: number;
    engagementPotential: number;
    networkingPotential: number;
    storyPotential: number;
    educationalPotential: number;
  };
  angles: IContentAngle[];
  selectedAngle?: IContentAngle;
  calendarEntryId?: mongoose.Types.ObjectId;
  contentIdeaIds: mongoose.Types.ObjectId[];
  reasoning: string;
  relevantPillars: string[];
  tags: string[];
  isProcessed: boolean;
  processedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ContentAngleSchema = new Schema<IContentAngle>({
  type: { type: String, enum: ['story', 'framework', 'educational', 'contrarian', 'journey', 'career', 'founder', 'technical'], required: true },
  title: { type: String, required: true },
  hook: { type: String, required: true },
  outline: [String],
  estimatedEngagement: { type: Number, default: 0 },
}, { _id: false });

const ContentOpportunitySchema = new Schema<IContentOpportunity>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  signalId: { type: Schema.Types.ObjectId, ref: 'OpportunitySignal' },
  source: { type: String, required: true },
  type: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  keyInsight: { type: String, required: true },
  status: { type: String, enum: ['new', 'scored', 'prioritized', 'converted', 'scheduled', 'published', 'analyzed', 'dismissed'], default: 'new', index: true },
  priority: { type: String, enum: ['immediate', 'this_week', 'this_month', 'someday', 'archived'], default: 'someday', index: true },
  priorityRank: { type: Number, default: 0 },
  scores: {
    overall: { type: Number, default: 0 },
    authorityPotential: { type: Number, default: 0 },
    careerImpact: { type: Number, default: 0 },
    engagementPotential: { type: Number, default: 0 },
    networkingPotential: { type: Number, default: 0 },
    storyPotential: { type: Number, default: 0 },
    educationalPotential: { type: Number, default: 0 },
  },
  angles: [ContentAngleSchema],
  selectedAngle: { type: ContentAngleSchema },
  calendarEntryId: { type: Schema.Types.ObjectId, ref: 'ContentCalendar' },
  contentIdeaIds: [{ type: Schema.Types.ObjectId, ref: 'ContentIdea' }],
  reasoning: { type: String, default: '' },
  relevantPillars: [String],
  tags: [String],
  isProcessed: { type: Boolean, default: false },
  processedAt: Date,
}, {
  timestamps: true,
  collection: 'content_opportunities',
});

ContentOpportunitySchema.index({ userId: 1, status: 1, priorityRank: -1 });
ContentOpportunitySchema.index({ userId: 1, priority: 1, scores: -1 });
ContentOpportunitySchema.index({ signalId: 1 });

export const ContentOpportunity: Model<IContentOpportunity> = mongoose.model<IContentOpportunity>('ContentOpportunity', ContentOpportunitySchema);
export default ContentOpportunity;
