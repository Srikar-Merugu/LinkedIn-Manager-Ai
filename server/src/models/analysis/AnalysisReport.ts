import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAnalysisReport extends Document {
  userId: mongoose.Types.ObjectId;
  linkedinUrl: string;
  githubUrl: string;
  resumeFileName?: string;
  careerGoals: string[];
  portfolioUrl?: string;

  linkedinAnalysis: {
    username: string;
    connected: boolean;
    fullName?: string;
    headline?: string;
    about?: string;
    location?: string;
    experience: any[];
    education: any[];
    skills: string[];
    certifications: any[];
    projects: any[];
    industry?: string;
    connections?: string;
    rawText?: string;
  };

  resumeAnalysis: {
    skills: string[];
    experience: any[];
    education: any[];
    certifications: any[];
    projects: any[];
    summary: string;
    totalExperienceYears: number;
    currentRole: string;
    industries: string[];
  };

  githubAnalysis: {
    username: string;
    connected: boolean;
    languages: string[];
    repos: number;
  };

  scores: {
    technicalLeadership: number;
    contentReadiness: number;
    industryAuthority: number;
    personalBrand: number;
    careerOpportunity: number;
  };

  strengths: { title: string; category: string; description: string; impact: 'high' | 'medium' | 'low'; score: number; evidence: string[] }[];
  weaknesses: { title: string; category: string; description: string; impact: 'high' | 'medium' | 'low'; score: number; evidence: string[] }[];

  contentPillars: { name: string; description: string; score: number; topics: string[]; authorityScore: number; engagementPotential: number; careerAlignment: number }[];

  brandDNA: {
    archetype: string;
    archetypeDescription: string;
    positioning: string;
    uniqueValueProposition: string;
    missionStatement: string;
    targetAudience: string;
    brandTerritory: string[];
    visualDirection: { colorPalette: string[]; style: string; imageryThemes: string[] };
    brandRules: { category: string; rule: string; priority: string }[];
    values: string[];
    originStory: string;
  };

  writingDNA: {
    voiceSignature: string;
    communicationStyle: string;
    toneProfile: { primary: string; secondary: string[] };
    vocabularyProfile: { favoriteWords: string[]; technicalTerms: string[]; avgWordLength: number };
    structureProfile: { avgSentenceLength: number; usesBulletPoints: boolean; usesQuestions: boolean; usesStories: boolean };
    hooks: { type: string; text: string; effectiveness: number }[];
    ctas: { type: string; text: string; effectiveness: number }[];
    formatPreferences: string[];
    emotionalProfile: { curiosity: number; authority: number; empathy: number };
  };

  careerBlueprint: {
    currentPosition: string;
    targetPosition: string;
    careerStage: string;
    skillGaps: { skill: string; currentLevel: string; targetLevel: string; priority: string }[];
    recommendations: { title: string; description: string; timeframe: string; priority: string; actions: string[] }[];
    milestones: { week: number; title: string; description: string; tasks: string[]; status: string }[];
    authorityMap: { topics: string[]; currentAuthority: number; targetAuthority: number };
    networkingPlan: { targetConnections: number; focusAreas: string[]; weeklyActions: string[] };
  };

  strategy90Days: {
    narrative: string;
    monthlyPlans: { month: number; phase: string; focus: string; goals: string[]; contentMix: { type: string; percentage: number }[] }[];
    weeklyThemes: { week: number; theme: string; contentTypes: string[]; topics: string[] }[];
    growthGoals: { category: string; goal: string; metric: string; target: number }[];
    recommendedFrequency: string;
  };

  contentCalendar: {
    entries: { date: string; type: string; pillar: string; topic: string; hook: string; status: string }[];
    queue: { id: string; topic: string; status: string; priority: string; pillar: string }[];
    publishingMode: string;
  };

  quickWins: { action: string; impact: string; effort: string; category: string }[];
  opportunities: { title: string; description: string; score: number; pillar: string; effort: string; timeframe: string }[];

  profileScore: number;
  profileHealth: { section: string; status: 'strong' | 'good' | 'needs_improvement' | 'missing'; details: string }[];
  missingSections: { section: string; priority: 'high' | 'medium' | 'low'; reason: string }[];
  improvements: { title: string; priority: 'high' | 'medium' | 'low'; impact: string; effort: string; description: string }[];
  contentOpportunities: { topic: string; reason: string; engagementScore: number; pillar: string }[];
  aiSummary: string;

  dashboardMetrics: {
    totalPosts: number;
    totalEngagement: number;
    avgEngagementRate: number;
    followerGrowth: number;
    topPostType: string;
    bestDay: string;
  };

  generatedAt: Date;
  updatedAt: Date;
  version: number;
}

const AnalysisReportSchema = new Schema<IAnalysisReport>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  linkedinUrl: { type: String, default: '' },
  githubUrl: { type: String, default: '' },
  resumeFileName: String,
  careerGoals: [String],
  portfolioUrl: { type: String, default: '' },

  linkedinAnalysis: {
    username: { type: String, default: '' },
    connected: { type: Boolean, default: false },
    fullName: { type: String, default: '' },
    headline: { type: String, default: '' },
    about: { type: String, default: '' },
    location: { type: String, default: '' },
    experience: { type: [Schema.Types.Mixed] as any[], default: [] },
    education: { type: [Schema.Types.Mixed] as any[], default: [] },
    skills: { type: [String], default: [] },
    certifications: { type: [Schema.Types.Mixed] as any[], default: [] },
    projects: { type: [Schema.Types.Mixed] as any[], default: [] },
    industry: String,
    connections: { type: String, default: '' },
    rawText: { type: String, default: '' },
  },

  resumeAnalysis: {
    skills: { type: [String], default: [] },
    experience: { type: [Schema.Types.Mixed] as any[], default: [] },
    education: { type: [Schema.Types.Mixed] as any[], default: [] },
    certifications: { type: [Schema.Types.Mixed] as any[], default: [] },
    projects: { type: [Schema.Types.Mixed] as any[], default: [] },
    summary: { type: String, default: '' },
    totalExperienceYears: { type: Number, default: 0 },
    currentRole: { type: String, default: '' },
    industries: { type: [String], default: [] },
  },

  githubAnalysis: {
    username: { type: String, default: '' },
    connected: { type: Boolean, default: false },
    languages: { type: [String], default: [] },
    repos: { type: Number, default: 0 },
  },

  scores: {
    technicalLeadership: { type: Number, default: 0 },
    contentReadiness: { type: Number, default: 0 },
    industryAuthority: { type: Number, default: 0 },
    personalBrand: { type: Number, default: 0 },
    careerOpportunity: { type: Number, default: 0 },
  },

  strengths: { type: [Schema.Types.Mixed] as any[], default: [] },
  weaknesses: { type: [Schema.Types.Mixed] as any[], default: [] },

  contentPillars: { type: [Schema.Types.Mixed] as any[], default: [] },

  brandDNA: {
    archetype: { type: String, default: '' },
    archetypeDescription: { type: String, default: '' },
    positioning: { type: String, default: '' },
    uniqueValueProposition: { type: String, default: '' },
    missionStatement: { type: String, default: '' },
    targetAudience: { type: String, default: '' },
    brandTerritory: { type: [String], default: [] },
    visualDirection: {
      colorPalette: { type: [String], default: [] },
      style: { type: String, default: '' },
      imageryThemes: { type: [String], default: [] },
    },
    brandRules: { type: [Schema.Types.Mixed] as any[], default: [] },
    values: { type: [String], default: [] },
    originStory: { type: String, default: '' },
  },

  writingDNA: {
    voiceSignature: { type: String, default: '' },
    communicationStyle: { type: String, default: '' },
    toneProfile: {
      primary: { type: String, default: 'Professional' },
      secondary: { type: [String], default: [] },
    },
    vocabularyProfile: {
      favoriteWords: { type: [String], default: [] },
      technicalTerms: { type: [String], default: [] },
      avgWordLength: { type: Number, default: 0 },
    },
    structureProfile: {
      avgSentenceLength: { type: Number, default: 0 },
      usesBulletPoints: { type: Boolean, default: false },
      usesQuestions: { type: Boolean, default: false },
      usesStories: { type: Boolean, default: false },
    },
    hooks: { type: [Schema.Types.Mixed] as any[], default: [] },
    ctas: { type: [Schema.Types.Mixed] as any[], default: [] },
    formatPreferences: { type: [String], default: [] },
    emotionalProfile: {
      curiosity: { type: Number, default: 50 },
      authority: { type: Number, default: 50 },
      empathy: { type: Number, default: 50 },
    },
  },

  careerBlueprint: {
    currentPosition: { type: String, default: '' },
    targetPosition: { type: String, default: '' },
    careerStage: { type: String, default: '' },
    skillGaps: { type: [Schema.Types.Mixed] as any[], default: [] },
    recommendations: { type: [Schema.Types.Mixed] as any[], default: [] },
    milestones: { type: [Schema.Types.Mixed] as any[], default: [] },
    authorityMap: {
      topics: { type: [String], default: [] },
      currentAuthority: { type: Number, default: 0 },
      targetAuthority: { type: Number, default: 0 },
    },
    networkingPlan: {
      targetConnections: { type: Number, default: 0 },
      focusAreas: { type: [String], default: [] },
      weeklyActions: { type: [String], default: [] },
    },
  },

  strategy90Days: {
    narrative: { type: String, default: '' },
    monthlyPlans: { type: [Schema.Types.Mixed] as any[], default: [] },
    weeklyThemes: { type: [Schema.Types.Mixed] as any[], default: [] },
    growthGoals: { type: [Schema.Types.Mixed] as any[], default: [] },
    recommendedFrequency: { type: String, default: '3x per week' },
  },

  contentCalendar: {
    entries: { type: [Schema.Types.Mixed] as any[], default: [] },
    queue: { type: [Schema.Types.Mixed] as any[], default: [] },
    publishingMode: { type: String, default: 'manual' },
  },

  quickWins: { type: [Schema.Types.Mixed] as any[], default: [] },
  opportunities: { type: [Schema.Types.Mixed] as any[], default: [] },

  profileScore: { type: Number, default: 0 },
  profileHealth: { type: [Schema.Types.Mixed] as any[], default: [] },
  missingSections: { type: [Schema.Types.Mixed] as any[], default: [] },
  improvements: { type: [Schema.Types.Mixed] as any[], default: [] },
  contentOpportunities: { type: [Schema.Types.Mixed] as any[], default: [] },
  aiSummary: { type: String, default: '' },

  dashboardMetrics: {
    totalPosts: { type: Number, default: 0 },
    totalEngagement: { type: Number, default: 0 },
    avgEngagementRate: { type: Number, default: 0 },
    followerGrowth: { type: Number, default: 0 },
    topPostType: { type: String, default: '' },
    bestDay: { type: String, default: '' },
  },

  generatedAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  version: { type: Number, default: 1 },
}, {
  timestamps: true,
  collection: 'analysis_reports',
});

AnalysisReportSchema.index({ userId: 1 }, { unique: true });
AnalysisReportSchema.index({ updatedAt: -1 });

export const AnalysisReport: Model<IAnalysisReport> = mongoose.model<IAnalysisReport>('AnalysisReport', AnalysisReportSchema);
export default AnalysisReport;
