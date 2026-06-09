import mongoose, { Schema, Document, Model } from 'mongoose';

export type CareerGoalType = 'internship' | 'job' | 'recruiter' | 'client' | 'partnership' | 'authority' | 'skill' | 'speaking';

export interface IGoalProgress {
  goalId: mongoose.Types.ObjectId;
  title: string;
  targetRole: string;
  progress: number;
  contribution: number;
  contentDriving: Array<{ postId: mongoose.Types.ObjectId; title: string; impact: number }>;
}

export interface ICareerImpactReport extends Document {
  userId: mongoose.Types.ObjectId;
  period: { start: Date; end: Date };
  goals: IGoalProgress[];
  overallScore: number;
  metrics: {
    totalOpportunities: number;
    recruiterInteractions: number;
    clientLeads: number;
    partnershipRequests: number;
    interviewRequests: number;
    jobOffers: number;
    speakingRequests: number;
    authorityScore: number;
  };
  contentContribution: {
    totalPosts: number;
    careerAlignedPosts: number;
    avgCareerAlignmentScore: number;
    topCareerContent: Array<{ postId: mongoose.Types.ObjectId; title: string; contentType: string; impact: number }>;
  };
  growth: {
    followers: number;
    connections: number;
    profileViews: number;
    searchAppearances: number;
  };
  insights: Array<{
    category: string;
    title: string;
    description: string;
    impact: 'positive' | 'negative' | 'neutral';
    recommendation?: string;
  }>;
  recommendations: Array<{ action: string; rationale: string; expectedImpact: string }>;
  generatedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const CareerImpactReportSchema = new Schema<ICareerImpactReport>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  period: {
    start: { type: Date, required: true },
    end: { type: Date, required: true },
  },
  goals: [{
    goalId: { type: Schema.Types.ObjectId, ref: 'CareerGoal' },
    title: String,
    targetRole: String,
    progress: Number,
    contribution: Number,
    contentDriving: [{
      postId: { type: Schema.Types.ObjectId, ref: 'Post' },
      title: String,
      impact: Number,
    }],
  }],
  overallScore: { type: Number, default: 0, min: 0, max: 100 },
  metrics: {
    totalOpportunities: { type: Number, default: 0 },
    recruiterInteractions: { type: Number, default: 0 },
    clientLeads: { type: Number, default: 0 },
    partnershipRequests: { type: Number, default: 0 },
    interviewRequests: { type: Number, default: 0 },
    jobOffers: { type: Number, default: 0 },
    speakingRequests: { type: Number, default: 0 },
    authorityScore: { type: Number, default: 0, min: 0, max: 100 },
  },
  contentContribution: {
    totalPosts: { type: Number, default: 0 },
    careerAlignedPosts: { type: Number, default: 0 },
    avgCareerAlignmentScore: { type: Number, default: 0 },
    topCareerContent: [{
      postId: { type: Schema.Types.ObjectId, ref: 'Post' },
      title: String,
      contentType: String,
      impact: Number,
    }],
  },
  growth: {
    followers: { type: Number, default: 0 },
    connections: { type: Number, default: 0 },
    profileViews: { type: Number, default: 0 },
    searchAppearances: { type: Number, default: 0 },
  },
  insights: [{
    category: String,
    title: String,
    description: String,
    impact: { type: String, enum: ['positive', 'negative', 'neutral'] },
    recommendation: String,
  }],
  recommendations: [{
    action: String,
    rationale: String,
    expectedImpact: String,
  }],
  generatedAt: { type: Date, default: Date.now },
}, { timestamps: true, collection: 'career_impact_reports' });

CareerImpactReportSchema.index({ userId: 1, 'period.start': -1 });

export const CareerImpactReport: Model<ICareerImpactReport> = mongoose.model<ICareerImpactReport>('CareerImpactReport', CareerImpactReportSchema);
export default CareerImpactReport;
