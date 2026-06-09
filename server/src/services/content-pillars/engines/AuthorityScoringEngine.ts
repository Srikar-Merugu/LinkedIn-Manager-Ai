import pino from 'pino';

const logger = pino();

export interface AuthorityScoreResult {
  overall: number;
  knowledgeDepth: number;
  experienceLevel: number;
  differentiation: number;
  audienceDemand: number;
  longTermSustainability: number;
  careerAlignment: number;
  evidence: string[];
}

interface ProfileInput {
  skills?: Array<{ name: string; endorsements?: number }>;
  experience?: Array<{ title: string; description?: string }>;
  projects?: Array<{ title: string; description?: string }>;
  certifications?: Array<{ name: string }>;
  about?: string;
}

export class AuthorityScoringEngine {

  score(pillarName: string, pillarSourceTopics: string[], profile: ProfileInput, existingPillars: string[]): AuthorityScoreResult {
    const knowledgeDepth = this.scoreKnowledgeDepth(pillarName, pillarSourceTopics, profile);
    const experienceLevel = this.scoreExperienceLevel(pillarName, profile);
    const differentiation = this.scoreDifferentiation(pillarName, existingPillars);
    const audienceDemand = this.scoreAudienceDemand(pillarName);
    const longTermSustainability = this.scoreSustainability(pillarName);
    const careerAlignment = this.scoreCareerAlignment(pillarName);

    const evidence = this.collectEvidence(pillarName, profile, knowledgeDepth, experienceLevel);

    const overall = Math.round(
      knowledgeDepth * 0.25 +
      experienceLevel * 0.20 +
      differentiation * 0.15 +
      audienceDemand * 0.15 +
      longTermSustainability * 0.10 +
      careerAlignment * 0.15
    );

    logger.info({ pillar: pillarName, overallScore: overall }, 'Authority scored');

    return {
      overall: Math.min(100, overall),
      knowledgeDepth: Math.min(100, knowledgeDepth),
      experienceLevel: Math.min(100, experienceLevel),
      differentiation: Math.min(100, differentiation),
      audienceDemand: Math.min(100, audienceDemand),
      longTermSustainability: Math.min(100, longTermSustainability),
      careerAlignment: Math.min(100, careerAlignment),
      evidence,
    };
  }

  private scoreKnowledgeDepth(pillar: string, sources: string[], profile: ProfileInput): number {
    const relevantSkills = profile.skills?.filter(s => this.topicMatches(pillar, s.name))?.length || 0;
    const relevantProjects = profile.projects?.filter(p => this.topicMatches(pillar, p.title))?.length || 0;
    const relevantCerts = profile.certifications?.filter(c => this.topicMatches(pillar, c.name))?.length || 0;
    const sourceStrength = sources.length;

    return Math.min(100,
      relevantSkills * 15 +
      relevantProjects * 10 +
      relevantCerts * 10 +
      sourceStrength * 5 +
      20
    );
  }

  private scoreExperienceLevel(pillar: string, profile: ProfileInput): number {
    const exp = profile.experience?.filter(e => this.topicMatches(pillar, e.title))?.length || 0;
    const aboutRelevance = (profile.about?.toLowerCase().includes(pillar.toLowerCase()) ?? false) ? 20 : 0;
    const allExpYears = profile.experience?.length || 0;

    return Math.min(100,
      exp * 20 +
      aboutRelevance +
      Math.min(allExpYears * 5, 20) +
      10
    );
  }

  private scoreDifferentiation(pillar: string, existingPillars: string[]): number {
    const similarExisting = existingPillars.filter(p => this.topicMatches(pillar, p)).length;
    if (similarExisting === 0) return 90;
    if (similarExisting === 1) return 60;
    return 30;
  }

  private scoreAudienceDemand(pillar: string): number {
    const highDemandTopics = ['ai', 'artificial intelligence', 'machine learning', 'full stack',
      'career', 'startup', 'productivity', 'leadership', 'data science'];
    for (const topic of highDemandTopics) {
      if (pillar.toLowerCase().includes(topic)) return 85;
    }
    return 60;
  }

  private scoreSustainability(pillar: string): number {
    const evergreenTerms = ['career', 'leadership', 'growth', 'development', 'design',
      'engineering', 'science', 'architecture', 'management'];
    for (const term of evergreenTerms) {
      if (pillar.toLowerCase().includes(term)) return 90;
    }
    return 65;
  }

  private scoreCareerAlignment(pillar: string): number {
    const careerTerms = ['career', 'job', 'internship', 'growth', 'development',
      'leadership', 'startup', 'business', 'consulting'];
    for (const term of careerTerms) {
      if (pillar.toLowerCase().includes(term)) return 85;
    }
    return 50;
  }

  private collectEvidence(pillar: string, profile: ProfileInput, knowledge: number, experience: number): string[] {
    const evidence: string[] = [];
    const matchingSkills = profile.skills?.filter(s => this.topicMatches(pillar, s.name)) || [];
    if (matchingSkills.length > 0) {
      evidence.push(`${matchingSkills.length} relevant skills: ${matchingSkills.slice(0, 3).map(s => s.name).join(', ')}`);
    }
    if (experience >= 50) evidence.push('Strong experience level supporting authority');
    if (knowledge >= 70) evidence.push('Deep knowledge demonstrated through skills and projects');
    return evidence;
  }

  private topicMatches(pillar: string, text: string): boolean {
    const pillarWords = pillar.toLowerCase().split(/\s+/);
    const textLower = text.toLowerCase();
    return pillarWords.some(w => w.length > 3 && textLower.includes(w)) ||
      textLower.includes(pillar.toLowerCase().slice(0, 5));
  }
}

export const authorityScoringEngine = new AuthorityScoringEngine();
