import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IIntelligenceReport extends Document {
  userId: mongoose.Types.ObjectId;
  profileId: mongoose.Types.ObjectId;
  version: number;
  report: Record<string, unknown>;
  expiresAt: Date;
  createdAt: Date;
}

const IntelligenceReportSchema = new Schema<IIntelligenceReport>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  profileId: { type: Schema.Types.ObjectId, ref: 'LinkedInProfile', required: true, index: true },
  version: { type: Number, default: 1 },
  report: { type: Schema.Types.Mixed, required: true },
  expiresAt: { type: Date, required: true, index: true },
}, {
  timestamps: true,
  collection: 'intelligence_reports',
});

IntelligenceReportSchema.index({ profileId: 1, version: -1 });
IntelligenceReportSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const IntelligenceReport: Model<IIntelligenceReport> = mongoose.model<IIntelligenceReport>('IntelligenceReport', IntelligenceReportSchema);
export default IntelligenceReport;
