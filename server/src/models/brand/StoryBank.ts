import mongoose, { Schema, Document, Model } from 'mongoose';

export type StoryType = 'challenge' | 'failure' | 'success' | 'lesson' | 'experiment' | 'milestone' | 'career_turn';

export interface IStoryEntry {
  title: string;
  type: StoryType;
  summary: string;
  fullNarrative?: string;
  tags: string[];
  emotions: string[];
  extractedFrom: 'linkedin_about' | 'linkedin_experience' | 'linkedin_post' | 'resume' | 'voice_sample' | 'onboarding';
  confidence: number;
  applicablePillars: string[];
  contentIdeas: string[];
}

export interface IStoryBank extends Document {
  userId: mongoose.Types.ObjectId;
  profileId?: mongoose.Types.ObjectId;
  brandDnaId?: mongoose.Types.ObjectId;
  stories: IStoryEntry[];
  totalStories: number;
  confidence: number;
  version: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const StoryEntrySchema = new Schema<IStoryEntry>({
  title: { type: String, required: true },
  type: {
    type: String,
    enum: ['challenge', 'failure', 'success', 'lesson', 'experiment', 'milestone', 'career_turn'],
    required: true,
  },
  summary: { type: String, required: true },
  fullNarrative: String,
  tags: [String],
  emotions: [String],
  extractedFrom: {
    type: String,
    enum: ['linkedin_about', 'linkedin_experience', 'linkedin_post', 'resume', 'voice_sample', 'onboarding'],
    required: true,
  },
  confidence: { type: Number, min: 0, max: 1, required: true },
  applicablePillars: [String],
  contentIdeas: [String],
}, { _id: false });

const StoryBankSchema = new Schema<IStoryBank>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  profileId: { type: Schema.Types.ObjectId, ref: 'LinkedInProfile' },
  brandDnaId: { type: Schema.Types.ObjectId, ref: 'BrandDNA' },
  stories: [StoryEntrySchema],
  totalStories: { type: Number, default: 0 },
  confidence: { type: Number, min: 0, max: 1, required: true },
  version: { type: Number, default: 1 },
  isActive: { type: Boolean, default: true },
}, {
  timestamps: true,
  collection: 'story_banks',
});

StoryBankSchema.index({ userId: 1, isActive: 1 });
StoryBankSchema.index({ brandDnaId: 1 });
StoryBankSchema.index({ 'stories.type': 1 });

export const StoryBank: Model<IStoryBank> = mongoose.model<IStoryBank>(
  'StoryBank',
  StoryBankSchema
);
export default StoryBank;
