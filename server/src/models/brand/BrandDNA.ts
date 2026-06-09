import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IBrandDNAVersion {
  version: number;
  snapshot: Record<string, unknown>;
  createdAt: Date;
  reason: string;
  agentVersion: string;
  confidence: number;
}

export interface IPositioning {
  currentRole: string;
  currentPositioning: string[];
  futurePositioning: string[];
  positioningStatement: string;
}

export interface IUniquenessFactor {
  factor: string;
  evidence: string[];
  category: 'skill_combination' | 'perspective' | 'journey' | 'achievement' | 'approach';
  weight: number;
}

export interface IContentDNATopic {
  topic: string;
  category: 'own' | 'teach' | 'document' | 'debate' | 'experiment';
  confidence: number;
  reasoning: string;
}

export interface IGrowthMilestone {
  title: string;
  description: string;
  timeframe: 'now' | '30_days' | '90_days' | '6_months' | '1_year' | 'long_term';
  priority: 'critical' | 'high' | 'medium' | 'low';
  metrics: Record<string, number>;
}

export interface IBrandRule {
  category: 'voice' | 'content' | 'positioning' | 'engagement' | 'growth';
  rule: string;
  rationale: string;
  priority: 'always' | 'usually' | 'sometimes';
}

export interface IBrandDNA extends Document {
  userId: mongoose.Types.ObjectId;
  profileId?: mongoose.Types.ObjectId;

  archetype: string;
  archetypeConfidence: number;
  archetypeDescription: string;
  secondaryArchetype?: string;
  secondaryArchetypeConfidence?: number;

  positioning?: IPositioning;

  values: Array<{
    name: string;
    weight: number;
    evidence: string[];
    category: 'core' | 'secondary' | 'aspirational';
  }>;

  uniqueValueProposition: string;
  missionStatement: string;
  originStory: string;

  uniquenessFactors?: IUniquenessFactor[];

  targetAudience: {
    primary: string[];
    secondary: string[];
    demographics: Record<string, string>;
    painPoints: string[];
    aspirations: string[];
  };

  brandTerritory: {
    owned: string[];
    adjacent: string[];
    avoid: string[];
    keywords: string[];
    hashtags: string[];
  };

  visualDirection: {
    colorPalette: string[];
    style: string;
    imageryThemes: string[];
  };

  competitorAnalysis: Array<{
    name: string;
    position: string;
    strengths: string[];
    weaknesses: string[];
    differentiation: string;
  }>;

  contentDNA?: {
    topics: IContentDNATopic[];
    contentAuthorityScore: number;
    recommendedContentMix: Record<string, number>;
  };

  growthRoadmap?: {
    milestones: IGrowthMilestone[];
    overallPriority: string;
    focusAreas: string[];
    estimatedTimeline: string;
  };

  brandRules?: IBrandRule[];

  brandScore?: number;
  confidence: number;
  status: 'draft' | 'active' | 'archived';
  version: number;
  versions: IBrandDNAVersion[];
  isActive: boolean;
  regeneratedAt?: Date;
  lastReviewedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

const BrandDNAVersionSchema = new Schema<IBrandDNAVersion>({
  version: { type: Number, required: true },
  snapshot: { type: Schema.Types.Mixed, required: true },
  createdAt: { type: Date, default: Date.now },
  reason: { type: String, required: true },
  agentVersion: { type: String, required: true },
  confidence: { type: Number, required: true, min: 0, max: 1 },
}, { _id: false });

const BrandDNASchema = new Schema<IBrandDNA>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  profileId: { type: Schema.Types.ObjectId, ref: 'LinkedInProfile' },

  archetype: { type: String, required: true },
  archetypeConfidence: { type: Number, required: true, min: 0, max: 1 },
  archetypeDescription: { type: String, required: true },
  secondaryArchetype: String,
  secondaryArchetypeConfidence: { type: Number, min: 0, max: 1 },

  positioning: {
    currentRole: String,
    currentPositioning: [String],
    futurePositioning: [String],
    positioningStatement: String,
  },

  values: [{
    name: { type: String, required: true },
    weight: { type: Number, required: true, min: 0, max: 1 },
    evidence: [String],
    category: { type: String, enum: ['core', 'secondary', 'aspirational'], required: true },
  }],

  uniqueValueProposition: { type: String, required: true },
  missionStatement: { type: String, required: true },
  originStory: { type: String, required: true },

  uniquenessFactors: [{
    factor: String,
    evidence: [String],
    category: { type: String, enum: ['skill_combination', 'perspective', 'journey', 'achievement', 'approach'] },
    weight: { type: Number, min: 0, max: 1 },
  }],

  targetAudience: {
    primary: [String],
    secondary: [String],
    demographics: Schema.Types.Mixed,
    painPoints: [String],
    aspirations: [String],
  },

  brandTerritory: {
    owned: [String],
    adjacent: [String],
    avoid: [String],
    keywords: [String],
    hashtags: [String],
  },

  visualDirection: {
    colorPalette: [String],
    style: String,
    imageryThemes: [String],
  },

  competitorAnalysis: [{
    name: { type: String, required: true },
    position: String,
    strengths: [String],
    weaknesses: [String],
    differentiation: String,
  }],

  contentDNA: {
    topics: [{
      topic: String,
      category: { type: String, enum: ['own', 'teach', 'document', 'debate', 'experiment'] },
      confidence: { type: Number, min: 0, max: 1 },
      reasoning: String,
    }],
    contentAuthorityScore: { type: Number, min: 0, max: 100 },
    recommendedContentMix: Schema.Types.Mixed,
  },

  growthRoadmap: {
    milestones: [{
      title: String,
      description: String,
      timeframe: { type: String, enum: ['now', '30_days', '90_days', '6_months', '1_year', 'long_term'] },
      priority: { type: String, enum: ['critical', 'high', 'medium', 'low'] },
      metrics: Schema.Types.Mixed,
    }],
    overallPriority: String,
    focusAreas: [String],
    estimatedTimeline: String,
  },

  brandRules: [{
    category: { type: String, enum: ['voice', 'content', 'positioning', 'engagement', 'growth'] },
    rule: { type: String, required: true },
    rationale: String,
    priority: { type: String, enum: ['always', 'usually', 'sometimes'] },
  }],

  brandScore: { type: Number, min: 0, max: 100 },
  confidence: { type: Number, required: true, min: 0, max: 1 },
  status: { type: String, enum: ['draft', 'active', 'archived'], default: 'draft', index: true },
  version: { type: Number, default: 1 },
  versions: [BrandDNAVersionSchema],
  isActive: { type: Boolean, default: true },
  regeneratedAt: Date,
  lastReviewedAt: Date,
}, {
  timestamps: true,
  collection: 'brand_dnas',
});

BrandDNASchema.index({ userId: 1, status: 1, version: -1 });
BrandDNASchema.index({ userId: 1, isActive: 1 });
BrandDNASchema.index({ archetype: 1 });
BrandDNASchema.index({ 'brandTerritory.keywords': 1 });

BrandDNASchema.pre('save', function (next) {
  if (this.isModified('uniqueValueProposition') || this.isModified('archetype') || this.isModified('contentDNA')) {
    this.version += 1;
    this.versions.push({
      version: this.version,
      snapshot: this.toObject() as Record<string, unknown>,
      createdAt: new Date(),
      reason: 'auto_version',
      agentVersion: '1.0.0',
      confidence: this.confidence,
    });
    if (this.versions.length > 10) {
      this.versions.shift();
    }
  }
  next();
});

BrandDNASchema.methods.regenerate = async function (
  reason: string,
  agentVersion: string
): Promise<void> {
  this.version += 1;
  this.versions.push({
    version: this.version,
    snapshot: this.toObject() as Record<string, unknown>,
    createdAt: new Date(),
    reason,
    agentVersion,
    confidence: this.confidence,
  });
  this.regeneratedAt = new Date();
  this.status = 'draft';
  if (this.versions.length > 10) {
    this.versions.shift();
  }
};

export const BrandDNA: Model<IBrandDNA> = mongoose.model<IBrandDNA>(
  'BrandDNA',
  BrandDNASchema
);
export default BrandDNA;
