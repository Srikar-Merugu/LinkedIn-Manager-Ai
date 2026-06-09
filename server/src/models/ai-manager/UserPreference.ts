import mongoose, { Schema, Document, Model } from 'mongoose';

export type ProactivityLevel = 'passive' | 'balanced' | 'proactive' | 'aggressive';
export type CommunicationStyle = 'concise' | 'detailed' | 'strategic' | 'coaching';

export interface IUserPreference extends Document {
  userId: mongoose.Types.ObjectId;
  proactivityLevel: ProactivityLevel;
  communicationStyle: CommunicationStyle;
  preferredContext: string[];
  enabledAgents: string[];
  notificationPreferences: {
    recommendations: boolean;
    proactiveAlerts: boolean;
    dailyDigest: boolean;
    weeklyReport: boolean;
  };
  quickActions: string[];
  dismissedRecommendations: mongoose.Types.ObjectId[];
  feedbackHistory: Array<{
    recommendationId: mongoose.Types.ObjectId;
    rating: number;
    comment?: string;
    createdAt: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const UserPreferenceSchema = new Schema<IUserPreference>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
  proactivityLevel: { type: String, enum: ['passive', 'balanced', 'proactive', 'aggressive'], default: 'balanced' },
  communicationStyle: { type: String, enum: ['concise', 'detailed', 'strategic', 'coaching'], default: 'strategic' },
  preferredContext: [{ type: String }],
  enabledAgents: [{ type: String }],
  notificationPreferences: {
    recommendations: { type: Boolean, default: true },
    proactiveAlerts: { type: Boolean, default: true },
    dailyDigest: { type: Boolean, default: false },
    weeklyReport: { type: Boolean, default: true },
  },
  quickActions: [{ type: String }],
  dismissedRecommendations: [{ type: Schema.Types.ObjectId, ref: 'AIRecommendation' }],
  feedbackHistory: [{
    recommendationId: { type: Schema.Types.ObjectId, ref: 'AIRecommendation' },
    rating: { type: Number, min: 1, max: 5 },
    comment: String,
    createdAt: { type: Date, default: Date.now },
  }],
}, {
  timestamps: true,
  collection: 'user_preferences',
});

export const UserPreference: Model<IUserPreference> = mongoose.model<IUserPreference>('UserPreference', UserPreferenceSchema);
export default UserPreference;
