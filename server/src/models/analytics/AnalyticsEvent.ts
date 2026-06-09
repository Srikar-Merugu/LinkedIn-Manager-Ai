import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAnalyticsEvent extends Document {
  userId: mongoose.Types.ObjectId;
  postId?: mongoose.Types.ObjectId;
  contentCalendarId?: mongoose.Types.ObjectId;

  eventType: string;
  timestamp: Date;
  platform: string;
  source: string;

  value: number;
  metadata: Record<string, unknown>;

  correlationId?: string;
  sessionId?: string;

  createdAt: Date;
}

const AnalyticsEventSchema = new Schema<IAnalyticsEvent>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  postId: {
    type: Schema.Types.ObjectId,
    ref: 'Post',
    index: true,
  },
  contentCalendarId: {
    type: Schema.Types.ObjectId,
    ref: 'ContentCalendar',
  },

  eventType: {
    type: String,
    required: true,
    index: true,
  },
  timestamp: {
    type: Date,
    required: true,
    index: true,
  },
  platform: {
    type: String,
    required: true,
    index: true,
  },
  source: {
    type: String,
    required: true,
  },

  value: { type: Number, default: 0 },
  metadata: { type: Schema.Types.Mixed, default: {} },

  correlationId: { type: String, index: true },
  sessionId: String,
}, {
  timestamps: true,
  collection: 'analytics_events',
});

AnalyticsEventSchema.index({ userId: 1, timestamp: -1 });
AnalyticsEventSchema.index({ userId: 1, eventType: 1, timestamp: -1 });
AnalyticsEventSchema.index({ postId: 1, timestamp: -1 });
AnalyticsEventSchema.index({ eventType: 1, timestamp: -1 });
AnalyticsEventSchema.index({ timestamp: -1 }, { expireAfterSeconds: 7776000 });

export const AnalyticsEvent: Model<IAnalyticsEvent> = mongoose.model<IAnalyticsEvent>(
  'AnalyticsEvent',
  AnalyticsEventSchema
);
export default AnalyticsEvent;
