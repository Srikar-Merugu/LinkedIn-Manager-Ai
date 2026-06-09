import mongoose, { Schema, Document } from 'mongoose';

export interface IConnectedAccount extends Document {
  userId: string;
  clerkId: string;
  provider: 'linkedin' | 'google' | 'github';
  providerAccountId: string;
  email: string;
  name: string;
  avatar?: string;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: Date;
  profile?: Record<string, unknown>;
  isPrimary: boolean;
  lastSyncedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ConnectedAccountSchema = new Schema<IConnectedAccount>({
  userId: { type: String, required: true, index: true },
  clerkId: { type: String, required: true, index: true },
  provider: {
    type: String,
    required: true,
    enum: ['linkedin', 'google', 'github'],
  },
  providerAccountId: { type: String, required: true },
  email: { type: String, required: true },
  name: { type: String, required: true },
  avatar: String,
  accessToken: String,
  refreshToken: String,
  tokenExpiresAt: Date,
  profile: { type: Schema.Types.Mixed },
  isPrimary: { type: Boolean, default: false },
  lastSyncedAt: Date,
}, {
  timestamps: true,
  collection: 'connected_accounts',
});

ConnectedAccountSchema.index({ userId: 1, provider: 1 }, { unique: true });
ConnectedAccountSchema.index({ provider: 1, providerAccountId: 1 }, { unique: true });

export const ConnectedAccount = mongoose.model<IConnectedAccount>('ConnectedAccount', ConnectedAccountSchema);
export default ConnectedAccount;
