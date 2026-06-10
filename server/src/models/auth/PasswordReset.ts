import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPasswordReset extends Document {
  email: string;
  token: string;
  expiresAt: Date;
  usedAt?: Date;
  createdAt: Date;
}

const PasswordResetSchema = new Schema<IPasswordReset>({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    index: true,
  },
  token: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expireAfterSeconds: 0 },
  },
  usedAt: Date,
}, {
  timestamps: true,
  collection: 'password_resets',
});

export const PasswordReset: Model<IPasswordReset> = mongoose.model<IPasswordReset>('PasswordReset', PasswordResetSchema);
export default PasswordReset;
