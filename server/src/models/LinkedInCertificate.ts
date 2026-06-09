import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ILinkedInCertificate extends Document {
  profileId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  name: string;
  issuingOrganization: string;
  authority?: string;
  licenseNumber?: string;
  url?: string;
  issueDate?: { month?: number; year: number };
  expirationDate?: { month?: number; year: number };
  doesNotExpire: boolean;
  credentialId?: string;
  skills: string[];
  metadata: {
    relevanceScore: number;
    isVerified: boolean;
    prestigeScore: number;
    source: 'imported' | 'manual';
  };
  createdAt: Date;
  updatedAt: Date;
}

const LinkedInCertificateSchema = new Schema<ILinkedInCertificate>({
  profileId: {
    type: Schema.Types.ObjectId,
    ref: 'LinkedInProfile',
    required: true,
    index: true,
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  name: {
    type: String,
    required: true,
  },
  issuingOrganization: {
    type: String,
    required: true,
  },
  authority: String,
  licenseNumber: String,
  url: String,
  issueDate: {
    month: Number,
    year: Number,
  },
  expirationDate: {
    month: Number,
    year: Number,
  },
  doesNotExpire: { type: Boolean, default: false },
  credentialId: String,
  skills: [{ type: String }],
  metadata: {
    relevanceScore: { type: Number, default: 0.5, min: 0, max: 1 },
    isVerified: { type: Boolean, default: false },
    prestigeScore: { type: Number, default: 0, min: 0, max: 1 },
    source: {
      type: String,
      enum: ['imported', 'manual'],
      default: 'imported',
    },
  },
}, {
  timestamps: true,
  collection: 'linkedin_certificates',
});

LinkedInCertificateSchema.index({ profileId: 1 });
LinkedInCertificateSchema.index({ userId: 1 });
LinkedInCertificateSchema.index({ issuingOrganization: 1 });
LinkedInCertificateSchema.index({ 'metadata.prestigeScore': -1 });

export const LinkedInCertificate: Model<ILinkedInCertificate> = mongoose.model<ILinkedInCertificate>(
  'LinkedInCertificate',
  LinkedInCertificateSchema
);

export default LinkedInCertificate;
