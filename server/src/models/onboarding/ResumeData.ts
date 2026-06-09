import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IResumeEntry {
  title: string;
  organization: string;
  startDate?: string;
  endDate?: string;
  current: boolean;
  description: string;
  highlights: string[];
}

export interface IResumeEducation {
  degree: string;
  institution: string;
  field: string;
  startYear?: number;
  endYear?: number;
  gpa?: string;
}

export interface IResumeData extends Document {
  userId: mongoose.Types.ObjectId;
  clerkId: string;
  onboardingStateId: mongoose.Types.ObjectId;
  originalFileName: string;
  fileType: string;
  fileSize: number;
  rawText: string;
  parsed: {
    skills: string[];
    experience: IResumeEntry[];
    education: IResumeEducation[];
    certifications: string[];
    projects: IResumeEntry[];
    summary?: string;
    languages: string[];
  };
  parsedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ResumeEntrySchema = new Schema<IResumeEntry>({
  title: { type: String, required: true },
  organization: { type: String, required: true },
  startDate: String,
  endDate: String,
  current: { type: Boolean, default: false },
  description: { type: String, default: '' },
  highlights: [String],
}, { _id: false });

const ResumeEducationSchema = new Schema<IResumeEducation>({
  degree: { type: String, required: true },
  institution: { type: String, required: true },
  field: { type: String, required: true },
  startYear: Number,
  endYear: Number,
  gpa: String,
}, { _id: false });

const ResumeDataSchema = new Schema<IResumeData>({
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
  originalFileName: { type: String, required: true },
  fileType: { type: String, required: true },
  fileSize: { type: Number, required: true },
  rawText: { type: String, default: '' },
  parsed: {
    skills: [String],
    experience: [ResumeEntrySchema],
    education: [ResumeEducationSchema],
    certifications: [String],
    projects: [ResumeEntrySchema],
    summary: String,
    languages: [String],
  },
  parsedAt: { type: Date, default: Date.now },
}, {
  timestamps: true,
  collection: 'resume_data',
});

ResumeDataSchema.index({ userId: 1, createdAt: -1 });
ResumeDataSchema.index({ onboardingStateId: 1 });

export const ResumeData: Model<IResumeData> = mongoose.model<IResumeData>('ResumeData', ResumeDataSchema);
export default ResumeData;
