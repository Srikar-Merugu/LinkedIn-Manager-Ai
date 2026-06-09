import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IProfileSnapshot extends Document {
  userId: mongoose.Types.ObjectId;
  profileId: mongoose.Types.ObjectId;
  snapshotVersion: number;
  data: {
    headline?: string;
    about?: string;
    experience: Array<{
      title: string;
      company: string;
      startDate?: { month?: number; year: number };
      endDate?: { month?: number; year: number };
      currentlyWorking?: boolean;
      description?: string;
    }>;
    education: Array<{
      school: string;
      degree?: string;
      fieldOfStudy?: string;
    }>;
    skills: string[];
    certifications: string[];
    projects: string[];
    profilePicture?: string;
  };
  hash: string;
  changesSincePrevious: string[];
  createdAt: Date;
}

const ProfileSnapshotSchema = new Schema<IProfileSnapshot>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  profileId: { type: Schema.Types.ObjectId, ref: 'LinkedInProfile', required: true, index: true },
  snapshotVersion: { type: Number, required: true },
  data: {
    headline: String,
    about: String,
    experience: [{
      title: String,
      company: String,
      startDate: { month: Number, year: Number },
      endDate: { month: Number, year: Number },
      currentlyWorking: Boolean,
      description: String,
    }],
    education: [{
      school: String,
      degree: String,
      fieldOfStudy: String,
    }],
    skills: [String],
    certifications: [String],
    projects: [String],
    profilePicture: String,
  },
  hash: { type: String, required: true },
  changesSincePrevious: [String],
  createdAt: { type: Date, default: Date.now },
}, {
  collection: 'profile_snapshots',
});

ProfileSnapshotSchema.index({ profileId: 1, snapshotVersion: -1 });
ProfileSnapshotSchema.index({ userId: 1, createdAt: -1 });
ProfileSnapshotSchema.index({ hash: 1, profileId: 1 });

export const ProfileSnapshot: Model<IProfileSnapshot> = mongoose.model<IProfileSnapshot>('ProfileSnapshot', ProfileSnapshotSchema);
export default ProfileSnapshot;
