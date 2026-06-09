import mongoose, { Schema, Document, Model } from 'mongoose';

export interface INetworkingTarget {
  name: string;
  reason: string;
  priority: number;
  type: 'mentor' | 'peer' | 'influencer' | 'recruiter' | 'potential_client' | 'collaborator';
  suggestedApproach: string;
  relevanceScore: number;
}

export interface ICommunityRecommendation {
  name: string;
  platform: string;
  type: 'online' | 'in_person' | 'hybrid';
  reason: string;
  url?: string;
  priority: number;
}

export interface IEventRecommendation {
  name: string;
  type: 'conference' | 'meetup' | 'webinar' | 'hackathon' | 'workshop';
  reason: string;
  url?: string;
  priority: number;
  suggestedDate?: Date;
}

export interface INetworkingRecommendation extends Document {
  userId: mongoose.Types.ObjectId;
  careerGoalId?: mongoose.Types.ObjectId;
  version: number;

  targetRole: string;

  targets: INetworkingTarget[];
  communities: ICommunityRecommendation[];
  events: IEventRecommendation[];
  discussions: Array<{
    topic: string;
    platform: string;
    reason: string;
    suggestedAngle: string;
    priority: number;
  }>;

  summary: {
    totalTargets: number;
    highPriorityTargets: number;
    communitiesToJoin: number;
    eventsToAttend: number;
    readinessScore: number;
  };

  recommendations: string[];
  isActive: boolean;
  generatedAt: Date;

  createdAt: Date;
  updatedAt: Date;
}

const NetworkingTargetSchema = new Schema({
  name: { type: String, required: true },
  reason: String,
  priority: { type: Number, min: 1, max: 100 },
  type: { type: String, enum: ['mentor', 'peer', 'influencer', 'recruiter', 'potential_client', 'collaborator'] },
  suggestedApproach: String,
  relevanceScore: { type: Number, min: 0, max: 100 },
}, { _id: false });

const CommunitySchema = new Schema({
  name: { type: String, required: true },
  platform: String,
  type: { type: String, enum: ['online', 'in_person', 'hybrid'] },
  reason: String,
  url: String,
  priority: { type: Number, min: 1, max: 100 },
}, { _id: false });

const EventSchema = new Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ['conference', 'meetup', 'webinar', 'hackathon', 'workshop'] },
  reason: String,
  url: String,
  priority: { type: Number, min: 1, max: 100 },
  suggestedDate: Date,
}, { _id: false });

const DiscussionSchema = new Schema({
  topic: String,
  platform: String,
  reason: String,
  suggestedAngle: String,
  priority: { type: Number, min: 1, max: 100 },
}, { _id: false });

const NetworkingRecommendationSchema = new Schema<INetworkingRecommendation>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  careerGoalId: { type: Schema.Types.ObjectId, ref: 'CareerGoal' },
  version: { type: Number, default: 1 },

  targetRole: { type: String, required: true },

  targets: [NetworkingTargetSchema],
  communities: [CommunitySchema],
  events: [EventSchema],
  discussions: [DiscussionSchema],

  summary: {
    totalTargets: { type: Number, default: 0 },
    highPriorityTargets: { type: Number, default: 0 },
    communitiesToJoin: { type: Number, default: 0 },
    eventsToAttend: { type: Number, default: 0 },
    readinessScore: { type: Number, default: 0 },
  },

  recommendations: [String],
  isActive: { type: Boolean, default: true },
  generatedAt: { type: Date, default: Date.now },
}, {
  timestamps: true,
  collection: 'networking_recommendations',
});

NetworkingRecommendationSchema.index({ userId: 1, isActive: 1 });

export const NetworkingRecommendation: Model<INetworkingRecommendation> =
  mongoose.model<INetworkingRecommendation>(
    'NetworkingRecommendation',
    NetworkingRecommendationSchema
  );
export default NetworkingRecommendation;
