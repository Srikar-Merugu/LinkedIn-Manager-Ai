import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPostVariation extends Document {
  postId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  version: 'A' | 'B' | 'C';
  angle: string;
  hook: string;
  body: string;
  cta: string;
  fullContent: string;
  wordCount: number;
  scores: {
    voice: number;
    career: number;
    quality: number;
    engagement: number;
    overall: number;
  };
  reviewNotes: string[];
  createdAt: Date;
  updatedAt: Date;
}

const PostVariationSchema = new Schema<IPostVariation>({
  postId: { type: Schema.Types.ObjectId, ref: 'Post', required: true, index: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  version: { type: String, enum: ['A', 'B', 'C'], required: true },
  angle: { type: String, required: true },
  hook: { type: String, required: true },
  body: { type: String, required: true },
  cta: { type: String, required: true },
  fullContent: { type: String, required: true },
  wordCount: { type: Number, default: 0 },
  scores: {
    voice: { type: Number, default: 0 },
    career: { type: Number, default: 0 },
    quality: { type: Number, default: 0 },
    engagement: { type: Number, default: 0 },
    overall: { type: Number, default: 0 },
  },
  reviewNotes: [{ type: String }],
}, {
  timestamps: true,
  collection: 'post_variations',
});

PostVariationSchema.index({ postId: 1, version: 1 }, { unique: true });
PostVariationSchema.index({ userId: 1, 'scores.overall': -1 });

export const PostVariation: Model<IPostVariation> = mongoose.model<IPostVariation>('PostVariation', PostVariationSchema);
export default PostVariation;
