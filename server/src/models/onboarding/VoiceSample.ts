import mongoose, { Schema, Document, Model } from 'mongoose';

export type VoiceSampleType = 'linkedin_post' | 'blog' | 'writing_sample' | 'other';

export interface IVoiceSample extends Document {
  userId: mongoose.Types.ObjectId;
  clerkId: string;
  onboardingStateId: mongoose.Types.ObjectId;
  sourceType: VoiceSampleType;
  sourceUrl?: string;
  title?: string;
  content: string;
  contentType: 'text' | 'html' | 'markdown';
  wordCount: number;
  analyzed: boolean;
  toneTags: string[];
  styleTags: string[];
  vocabularyLevel?: 'basic' | 'intermediate' | 'advanced' | 'technical';
  rawAnalysis?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const VoiceSampleSchema = new Schema<IVoiceSample>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  clerkId: {
    type: String,
    required: true,
    index: true,
  },
  onboardingStateId: {
    type: Schema.Types.ObjectId,
    ref: 'OnboardingState',
    required: true,
  },
  sourceType: {
    type: String,
    enum: ['linkedin_post', 'blog', 'writing_sample', 'other'],
    required: true,
  },
  sourceUrl: String,
  title: String,
  content: {
    type: String,
    required: true,
  },
  contentType: {
    type: String,
    enum: ['text', 'html', 'markdown'],
    default: 'text',
  },
  wordCount: { type: Number, default: 0 },
  analyzed: { type: Boolean, default: false },
  toneTags: [String],
  styleTags: [String],
  vocabularyLevel: {
    type: String,
    enum: ['basic', 'intermediate', 'advanced', 'technical'],
  },
  rawAnalysis: Schema.Types.Mixed,
}, {
  timestamps: true,
  collection: 'voice_samples',
});

VoiceSampleSchema.index({ userId: 1, sourceType: 1 });
VoiceSampleSchema.index({ onboardingStateId: 1 });
VoiceSampleSchema.index({ analyzed: 1 });

VoiceSampleSchema.pre('save', function (next) {
  if (this.isModified('content')) {
    this.wordCount = this.content.split(/\s+/).filter(Boolean).length;
  }
  next();
});

export const VoiceSample: Model<IVoiceSample> = mongoose.model<IVoiceSample>('VoiceSample', VoiceSampleSchema);
export default VoiceSample;
