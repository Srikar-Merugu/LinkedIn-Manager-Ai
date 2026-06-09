import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IReviewIssue {
  type: 'ai_sounding' | 'overused_phrase' | 'generic_statement' | 'weak_hook' | 'weak_cta' | 'engagement_bait' | 'passive_voice' | 'jargon_overload';
  text: string;
  suggestion: string;
  severity: 'low' | 'medium' | 'high';
  position?: { start: number; end: number };
}

export interface IContentReview extends Document {
  postId: mongoose.Types.ObjectId;
  variationId?: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  issues: IReviewIssue[];
  aiScore: number;
  humanScore: number;
  clicheCount: number;
  aiPhraseCount: number;
  rewriteSuggested: boolean;
  suggestedRewrites: Array<{
    original: string;
    rewrite: string;
    reason: string;
  }>;
  overallAssessment: string;
  createdAt: Date;
}

const ContentReviewSchema = new Schema<IContentReview>({
  postId: { type: Schema.Types.ObjectId, ref: 'Post', required: true, index: true },
  variationId: { type: Schema.Types.ObjectId, ref: 'PostVariation' },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  issues: [{
    type: { type: String, enum: ['ai_sounding', 'overused_phrase', 'generic_statement', 'weak_hook', 'weak_cta', 'engagement_bait', 'passive_voice', 'jargon_overload'], required: true },
    text: String,
    suggestion: String,
    severity: { type: String, enum: ['low', 'medium', 'high'] },
    position: {
      start: Number,
      end: Number,
    },
  }],
  aiScore: { type: Number, default: 0, min: 0, max: 100 },
  humanScore: { type: Number, default: 100, min: 0, max: 100 },
  clicheCount: { type: Number, default: 0 },
  aiPhraseCount: { type: Number, default: 0 },
  rewriteSuggested: { type: Boolean, default: false },
  suggestedRewrites: [{
    original: String,
    rewrite: String,
    reason: String,
  }],
  overallAssessment: String,
}, {
  timestamps: true,
  collection: 'content_reviews',
});

ContentReviewSchema.index({ postId: 1 });
ContentReviewSchema.index({ userId: 1, aiScore: 1 });

export const ContentReview: Model<IContentReview> = mongoose.model<IContentReview>('ContentReview', ContentReviewSchema);
export default ContentReview;
