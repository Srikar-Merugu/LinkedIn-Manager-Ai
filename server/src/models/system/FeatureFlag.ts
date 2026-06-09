import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IFeatureFlag extends Document {
  name: string;
  key: string;
  description: string;

  enabled: boolean;
  enabledFor: {
    all: boolean;
    plans: string[];
    userIds: mongoose.Types.ObjectId[];
    percentage: number;
  };

  rules: Array<{
    condition: string;
    value: boolean;
    priority: number;
  }>;

  metadata: {
    owner: string;
    createdAt: Date;
    lastModifiedBy: string;
    version: number;
    tags: string[];
  };

  createdAt: Date;
  updatedAt: Date;
}

const FeatureFlagSchema = new Schema<IFeatureFlag>({
  name: { type: String, required: true },
  key: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  description: { type: String, required: true },

  enabled: { type: Boolean, default: false },
  enabledFor: {
    all: { type: Boolean, default: false },
    plans: [String],
    userIds: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    percentage: { type: Number, default: 0, min: 0, max: 100 },
  },

  rules: [{
    condition: { type: String, required: true },
    value: { type: Boolean, required: true },
    priority: { type: Number, required: true },
  }],

  metadata: {
    owner: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    lastModifiedBy: String,
    version: { type: Number, default: 1 },
    tags: [String],
  },
}, {
  timestamps: true,
  collection: 'feature_flags',
});

FeatureFlagSchema.statics.isEnabledForUser = async function (
  key: string,
  userId: string,
  plan: string
): Promise<boolean> {
  const flag = await this.findOne({ key });
  if (!flag) return false;
  if (!flag.enabled) return false;
  if (flag.enabledFor.all) return true;
  if (flag.enabledFor.plans.includes(plan)) return true;
  if (flag.enabledFor.userIds.some((id: mongoose.Types.ObjectId) => id.toString() === userId)) return true;
  return false;
};

export const FeatureFlag: Model<IFeatureFlag> = mongoose.model<IFeatureFlag>(
  'FeatureFlag',
  FeatureFlagSchema
);
export default FeatureFlag;
