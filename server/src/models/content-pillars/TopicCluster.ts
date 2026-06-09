import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ITopicNode {
  name: string;
  level: number;
  parentId?: string;
  order: number;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  relevanceScore: number;
  keywords: string[];
  contentIdeas: string[];
}

export interface ITopicCluster extends Document {
  userId: mongoose.Types.ObjectId;
  pillarId: mongoose.Types.ObjectId;
  pillarName: string;
  version: number;

  nodes: ITopicNode[];
  totalTopics: number;

  summary: {
    beginnerCount: number;
    intermediateCount: number;
    advancedCount: number;
    topKeywords: string[];
    breadthScore: number;
    depthScore: number;
  };

  isActive: boolean;
  generatedAt: Date;

  createdAt: Date;
  updatedAt: Date;
}

const TopicNodeSchema = new Schema({
  name: { type: String, required: true },
  level: { type: Number, required: true },
  parentId: { type: Schema.Types.ObjectId },
  order: { type: Number, required: true },
  description: { type: String, required: true },
  difficulty: { type: String, enum: ['beginner', 'intermediate', 'advanced'], required: true },
  relevanceScore: { type: Number, min: 0, max: 100 },
  keywords: [String],
  contentIdeas: [String],
}, { _id: true });

const TopicClusterSchema = new Schema<ITopicCluster>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  pillarId: { type: Schema.Types.ObjectId, ref: 'ContentPillar', required: true },
  pillarName: { type: String, required: true },
  version: { type: Number, default: 1 },

  nodes: [TopicNodeSchema],
  totalTopics: { type: Number, default: 0 },

  summary: {
    beginnerCount: { type: Number, default: 0 },
    intermediateCount: { type: Number, default: 0 },
    advancedCount: { type: Number, default: 0 },
    topKeywords: [String],
    breadthScore: { type: Number, min: 0, max: 100 },
    depthScore: { type: Number, min: 0, max: 100 },
  },

  isActive: { type: Boolean, default: true },
  generatedAt: { type: Date, default: Date.now },
}, {
  timestamps: true,
  collection: 'topic_clusters',
});

TopicClusterSchema.index({ userId: 1, isActive: 1 });
TopicClusterSchema.index({ pillarId: 1 });

export const TopicCluster: Model<ITopicCluster> = mongoose.model<ITopicCluster>(
  'TopicCluster',
  TopicClusterSchema
);
export default TopicCluster;
