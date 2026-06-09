import pino from 'pino';

const logger = pino();

export interface BrandProfile {
  positioning: string;
  audience: string[];
  expertise: string[];
  authorityAreas: string[];
  brandRules: string[];
  brandVoice: string;
  targetIndustries: string[];
  targetRoles: string[];
}

export interface BrandValidationResult {
  passed: boolean;
  inBoundary: boolean;
  positioningMatch: number;
  audienceMatch: number;
  expertiseMatch: number;
  boundaryFlags: Array<{ type: string; message: string; severity: 'low' | 'medium' | 'high' }>;
  recommendations: string[];
  overallScore: number;
}

export class BrandDNAEngine {
  validate(content: string, topic: string, profile: BrandProfile): BrandValidationResult {
    logger.info({ topic }, 'Validating content against brand DNA');

    const boundaryFlags: BrandValidationResult['boundaryFlags'] = [];
    const recommendations: string[] = [];

    const positioningMatch = this.checkPositioning(content, profile);
    const audienceMatch = this.checkAudience(content, profile);
    const expertiseMatch = this.checkExpertise(content, profile);

    if (positioningMatch < 50) {
      boundaryFlags.push({ type: 'positioning', message: `Content doesn't reflect brand positioning: ${profile.positioning}`, severity: 'high' });
      recommendations.push(`Reframe content to align with: ${profile.positioning}`);
    }

    if (expertiseMatch < 40) {
      boundaryFlags.push({ type: 'expertise', message: 'Topic is outside core expertise areas', severity: 'medium' });
      recommendations.push(`Connect topic to expertise areas: ${profile.expertise.slice(0, 3).join(', ')}`);
    }

    const overallScore = Math.round((positioningMatch + audienceMatch + expertiseMatch) / 3);
    const inBoundary = boundaryFlags.length === 0;

    return {
      passed: inBoundary && overallScore >= 60,
      inBoundary, positioningMatch, audienceMatch, expertiseMatch,
      boundaryFlags, recommendations, overallScore,
    };
  }

  private checkPositioning(content: string, profile: BrandProfile): number {
    const content_lower = content.toLowerCase();
    const words = profile.positioning.toLowerCase().split(' ');
    const matched = words.filter(w => w.length > 3 && content_lower.includes(w)).length;
    return Math.min(100, Math.round((matched / Math.max(words.filter(w => w.length > 3).length, 1)) * 100));
  }

  private checkAudience(content: string, profile: BrandProfile): number {
    const content_lower = content.toLowerCase();
    const audienceTerms = [...profile.audience, ...profile.targetIndustries, ...profile.targetRoles];
    if (audienceTerms.length === 0) return 70;
    const matched = audienceTerms.filter(t => content_lower.includes(t.toLowerCase())).length;
    return Math.min(100, Math.round((matched / audienceTerms.length) * 100));
  }

  private checkExpertise(content: string, profile: BrandProfile): number {
    const content_lower = content.toLowerCase();
    const expertiseTerms = [...profile.expertise, ...profile.authorityAreas];
    if (expertiseTerms.length === 0) return 75;
    const matched = expertiseTerms.filter(t => content_lower.includes(t.toLowerCase())).length;
    return Math.min(100, Math.round((matched / expertiseTerms.length) * 100));
  }
}

export const brandDNAEngine = new BrandDNAEngine();
