import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPillarScore extends Document {
  userId: mongoose.Types.ObjectId;
  pillarId?: mongoose.Types.ObjectId;
  version: number;

  authority: {
    overall: number;
    knowledgeDepth: number;
    experienceLevel: number;
    differentiation: number;
    audienceDemand: number;
    longTermSustainability: number;
    careerAlignment: number;
    evidence: string[];
  };

  engagement: {
    overall: number;
    commentPotential: number;
    savePotential: number;
    sharePotential: number;
    discussionPotential: number;
    evidence: string[];
  };

  careerAlignment: {
    overall: number;
    internship: number;
    jobSearch: number;
    freelancing: number;
    startup: number;
    thoughtLeadership: number;
    evidence: string[];
  };

  priority: number;
  reasoning: string;

  isActive: boolean;
  calculatedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AuthorityScoreSchema = new Schema({
  overall: { type: Number, min: 0, max: 100, required: true },
  knowledgeDepth: { type: Number, min: 0, max: 100 },
  experienceLevel: { type: Number, min: 0, max: 100 },
  differentiation: { type: Number, min: 0, max: 100 },
  audienceDemand: { type: Number, min: 0, max: 100 },
  longTermSustainability: { type: Number, min: 0, max: 100 },
  careerAlignment: { type: Number, min: 0, max: 100 },
  evidence: [String],
}, { _id: false });

const EngagementScoreSchema = new Schema({
  overall: { type: Number, min: 0, max: 100, required: true },
  commentPotential: { type: Number, min: 0, max: 100 },
  savePotential: { type: Number, min: 0, max: 100 },
  sharePotential: { type: Number, min: 0, max: 100 },
  discussionPotential: { type: Number, min: 0, max: 100 },
  evidence: [String],
}, { _id: false });

const CareerAlignmentScoreSchema = new Schema({
  overall: { type: Number, min: 0, max: 100, required: true },
  internship: { type: Number, min: 0, max: 100 },
  jobSearch: { type: Number, min: 0, max: 100 },
  freelancing: { type: Number, min: 0, max: 100 },
  startup: { type: Number, min: 0, max: 100 },
  thoughtLeadership: { type: Number, min: 0, max: 100 },
  evidence: [String],
}, { _id: false });

const PillarScoreSchema = new Schema<IPillarScore>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  pillarId: { type: Schema.Types.ObjectId, ref: 'ContentPillar' },
  version: { type: Number, default: 1 },

  authority: { type: AuthorityScoreSchema, required: true },
  engagement: { type: EngagementScoreSchema, required: true },
  careerAlignment: { type: CareerAlignmentScoreSchema, required: true },

  priority: { type: Number, required: true },
  reasoning: { type: String, required: true },

  isActive: { type: Boolean, default: true },
  calculatedAt: { type: Date, default: Date.now },
}, {
  timestamps: true,
  collection: 'pillar_scores',
});

PillarScoreSchema.index({ userId: 1, isActive: 1, priority: 1 });
PillarScoreSchema.index({ pillarId: 1 });

export const PillarScore: Model<IPillarScore> = mongoose.model<IPillarScore>(
  'PillarScore',
  PillarScoreSchema
);
export default PillarScore;
