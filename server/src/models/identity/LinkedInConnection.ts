import mongoose, { Schema, Document, Model } from 'mongoose';
import crypto from 'crypto';

export interface ILinkedInConnection extends Document {
  userId: mongoose.Types.ObjectId;
  linkedinUserId: string;
  email: string;
  fullName: string;
  profileUrl: string;
  accessTokenEncrypted: string;
  refreshTokenEncrypted: string;
  tokenExpiresAt: Date;
  scope: string;
  isConnected: boolean;
  lastUsedAt?: Date;
  lastRefreshAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ENCRYPTION_KEY = (process.env.ENCRYPTION_KEY || 'default-encryption-key-32-chars!!').substring(0, 32);
const IV_LENGTH = 16;

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decrypt(encryptedText: string): string {
  if (!encryptedText || !encryptedText.includes(':')) return '';
  const parts = encryptedText.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const encrypted = Buffer.from(parts[1], 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let decrypted = decipher.update(encrypted);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}

const LinkedInConnectionSchema = new Schema<ILinkedInConnection>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  linkedinUserId: { type: String, required: true },
  email: { type: String, default: '' },
  fullName: { type: String, default: '' },
  profileUrl: { type: String, default: '' },
  accessTokenEncrypted: { type: String, required: true },
  refreshTokenEncrypted: { type: String, default: '' },
  tokenExpiresAt: { type: Date, required: true },
  scope: { type: String, default: 'openid profile email w_member_social' },
  isConnected: { type: Boolean, default: true },
  lastUsedAt: Date,
  lastRefreshAt: Date,
}, {
  timestamps: true,
  collection: 'linkedin_connections',
});

LinkedInConnectionSchema.index({ userId: 1 }, { unique: true });
LinkedInConnectionSchema.index({ linkedinUserId: 1 });

export const LinkedInConnection: Model<ILinkedInConnection> = mongoose.model<ILinkedInConnection>('LinkedInConnection', LinkedInConnectionSchema);
export default LinkedInConnection;
