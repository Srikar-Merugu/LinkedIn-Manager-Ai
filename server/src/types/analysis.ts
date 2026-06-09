export interface ScoringWeights {
  completeness: number;
  quality: number;
  relevance: number;
  engagement: number;
  consistency: number;
}

export interface ProfileTypeConfig {
  type: string;
  weightAdjustments: Partial<ScoringWeights>;
  minimumThresholds: Record<string, number>;
  recommendedActions: string[];
}

export interface AnalysisContext {
  industry?: string;
  role?: string;
  seniority?: string;
  location?: string;
  profileType: string;
  careerStage: string;
}
