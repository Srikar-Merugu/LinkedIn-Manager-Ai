import mongoose, { Schema, Document, Model } from 'mongoose';

export type AuthorityAreaStatus = 'strong' | 'growing' | 'weak' | 'future';

export interface IAuthorityArea {
  topic: string;
  status: AuthorityAreaStatus;
  currentScore: number;
  targetScore: number;
  pillar: string;
  trends: string[];
  opportunities: string[];
  competingVoices: string[];
  uniqueAngle: string;
}

export interface IAuthorityMap extends Document {
  userId: mongoose.Types.ObjectId;
  version: number;

  areas: IAuthorityArea[];

  summary: {
    strongAreas: number;
    growingAreas: number;
    weakAreas: number;
    futureAreas: number;
    totalAreas: number;
    highestScore: number;
    lowestScore: number;
    averageScore: number;
  };

  visualMap: {
    concentric: Array<{
      ring: number;
      label: string;
      topics: string[];
    }>;
  };

  recommendations: string[];
  isActive: boolean;
  generatedAt: Date;

  createdAt: Date;
  updatedAt: Date;
}

const AuthorityAreaSchema = new Schema({
  topic: { type: String, required: true },
  status: { type: String, enum: ['strong', 'growing', 'weak', 'future'], required: true },
  currentScore: { type: Number, min: 0, max: 100 },
  targetScore: { type: Number, min: 0, max: 100 },
  pillar: String,
  trends: [String],
  opportunities: [String],
  competingVoices: [String],
  uniqueAngle: { type: String },
}, { _id: false });

const ConcentricRingSchema = new Schema({
  ring: { type: Number, required: true },
  label: { type: String, required: true },
  topics: [String],
}, { _id: false });

const AuthorityMapSchema = new Schema<IAuthorityMap>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  version: { type: Number, default: 1 },

  areas: [AuthorityAreaSchema],

  summary: {
    strongAreas: { type: Number, default: 0 },
    growingAreas: { type: Number, default: 0 },
    weakAreas: { type: Number, default: 0 },
    futureAreas: { type: Number, default: 0 },
    totalAreas: { type: Number, default: 0 },
    highestScore: { type: Number, default: 0 },
    lowestScore: { type: Number, default: 0 },
    averageScore: { type: Number, default: 0 },
  },

  visualMap: {
    concentric: [ConcentricRingSchema],
  },

  recommendations: [String],
  isActive: { type: Boolean, default: true },
  generatedAt: { type: Date, default: Date.now },
}, {
  timestamps: true,
  collection: 'pillar_authority_maps',
});

AuthorityMapSchema.index({ userId: 1, isActive: 1 });

export const AuthorityMap: Model<IAuthorityMap> = mongoose.model<IAuthorityMap>(
  'PillarAuthorityMap',
  AuthorityMapSchema
);
export default AuthorityMap;
