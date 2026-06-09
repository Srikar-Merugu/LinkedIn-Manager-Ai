import mongoose, { Schema, Document, Model } from 'mongoose';
import { NotificationChannel, NotificationType } from '../../types/database';

export interface INotification extends Document {
  userId: mongoose.Types.ObjectId;
  type: NotificationType;
  channel: NotificationChannel;

  title: string;
  body: string;
  data: Record<string, unknown>;

  priority: 'low' | 'normal' | 'high' | 'urgent';
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'clicked' | 'failed';

  actionUrl?: string;
  imageUrl?: string;
  metadata: {
    source: string;
    correlationId?: string;
    sentAt?: Date;
    deliveredAt?: Date;
    readAt?: Date;
    clickedAt?: Date;
    failedAt?: Date;
    failureReason?: string;
    retryCount: number;
  };

  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  type: {
    type: String,
    enum: [
      'content_ready', 'opportunity_found', 'weekly_report',
      'strategy_updated', 'publish_success', 'publish_failed',
      'milestone_reached', 'ai_input_needed', 'subscription',
    ],
    required: true,
    index: true,
  },
  channel: {
    type: String,
    enum: ['in_app', 'email', 'push'],
    required: true,
    index: true,
  },

  title: { type: String, required: true },
  body: { type: String, required: true },
  data: { type: Schema.Types.Mixed, default: {} },

  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal',
  },
  status: {
    type: String,
    enum: ['pending', 'sent', 'delivered', 'read', 'clicked', 'failed'],
    default: 'pending',
    index: true,
  },

  actionUrl: String,
  imageUrl: String,

  metadata: {
    source: { type: String, required: true },
    correlationId: String,
    sentAt: Date,
    deliveredAt: Date,
    readAt: Date,
    clickedAt: Date,
    failedAt: Date,
    failureReason: String,
    retryCount: { type: Number, default: 0 },
  },

  expiresAt: { type: Date, index: { expireAfterSeconds: 0 } },
}, {
  timestamps: true,
  collection: 'notifications',
});

NotificationSchema.index({ userId: 1, status: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, type: 1, createdAt: -1 });
NotificationSchema.index({ status: 1, createdAt: -1 });
NotificationSchema.index({ channel: 1, status: 1 });

NotificationSchema.methods.markSent = async function (): Promise<void> {
  this.status = 'sent';
  this.metadata.sentAt = new Date();
  await this.save();
};

NotificationSchema.methods.markDelivered = async function (): Promise<void> {
  this.status = 'delivered';
  this.metadata.deliveredAt = new Date();
  await this.save();
};

NotificationSchema.methods.markRead = async function (): Promise<void> {
  this.status = 'read';
  this.metadata.readAt = new Date();
  await this.save();
};

NotificationSchema.methods.markClicked = async function (): Promise<void> {
  this.status = 'clicked';
  this.metadata.clickedAt = new Date();
  await this.save();
};

NotificationSchema.methods.markFailed = async function (reason: string): Promise<void> {
  this.status = 'failed';
  this.metadata.failedAt = new Date();
  this.metadata.failureReason = reason;
  this.metadata.retryCount += 1;
  await this.save();
};

export const Notification: Model<INotification> = mongoose.model<INotification>(
  'Notification',
  NotificationSchema
);
export default Notification;
