import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IForecastEntry {
  opportunity: string;
  type: 'internship' | 'job' | 'client' | 'collaboration' | 'speaking' | 'acquisition' | 'recruiter_discovery';
  probability: number;
  timeframe: '3_months' | '6_months' | '12_months';
  prerequisites: string[];
  triggerEvents: string[];
  estimatedValue: string;
  confidence: number;
}

export interface IIndustryTrend {
  trend: string;
  impact: 'high' | 'medium' | 'low';
  relevance: number;
  actionItems: string[];
}

export interface IOpportunityForecast extends Document {
  userId: mongoose.Types.ObjectId;
  careerGoalId?: mongoose.Types.ObjectId;
  version: number;

  targetRole: string;

  forecasts: IForecastEntry[];

  trends: IIndustryTrend[];

  summary: {
    threeMonthOpportunities: number;
    sixMonthOpportunities: number;
    twelveMonthOpportunities: number;
    highestProbability: number;
    lowestProbability: number;
    averageProbability: number;
    readinessScore: number;
  };

  recommendations: string[];
  isActive: boolean;
  generatedAt: Date;

  createdAt: Date;
  updatedAt: Date;
}

const ForecastEntrySchema = new Schema({
  opportunity: { type: String, required: true },
  type: {
    type: String,
    enum: ['internship', 'job', 'client', 'collaboration', 'speaking', 'acquisition', 'recruiter_discovery'],
    required: true,
  },
  probability: { type: Number, min: 0, max: 1, required: true },
  timeframe: { type: String, enum: ['3_months', '6_months', '12_months'], required: true },
  prerequisites: [String],
  triggerEvents: [String],
  estimatedValue: String,
  confidence: { type: Number, min: 0, max: 1 },
}, { _id: false });

const IndustryTrendSchema = new Schema({
  trend: { type: String, required: true },
  impact: { type: String, enum: ['high', 'medium', 'low'] },
  relevance: { type: Number, min: 0, max: 1 },
  actionItems: [String],
}, { _id: false });

const OpportunityForecastSchema = new Schema<IOpportunityForecast>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  careerGoalId: { type: Schema.Types.ObjectId, ref: 'CareerGoal' },
  version: { type: Number, default: 1 },

  targetRole: { type: String, required: true },

  forecasts: [ForecastEntrySchema],
  trends: [IndustryTrendSchema],

  summary: {
    threeMonthOpportunities: { type: Number, default: 0 },
    sixMonthOpportunities: { type: Number, default: 0 },
    twelveMonthOpportunities: { type: Number, default: 0 },
    highestProbability: { type: Number, default: 0 },
    lowestProbability: { type: Number, default: 0 },
    averageProbability: { type: Number, default: 0 },
    readinessScore: { type: Number, default: 0, min: 0, max: 100 },
  },

  recommendations: [String],
  isActive: { type: Boolean, default: true },
  generatedAt: { type: Date, default: Date.now },
}, {
  timestamps: true,
  collection: 'opportunity_forecasts',
});

OpportunityForecastSchema.index({ userId: 1, isActive: 1 });

export const OpportunityForecast: Model<IOpportunityForecast> = mongoose.model<IOpportunityForecast>(
  'OpportunityForecast',
  OpportunityForecastSchema
);
export default OpportunityForecast;
