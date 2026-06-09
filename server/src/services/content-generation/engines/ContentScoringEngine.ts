import pino from 'pino';

const logger = pino();

export interface ScoringInput {
  voiceMatchScore: number;
  careerAlignmentScore: number;
  qualityScore: number;
  opportunityScore: number;
  engagementScore: number;
  contentType: string;
  topic: string;
  brandMatchScore: number;
}

export interface ScoringResult {
  voice: number;
  authority: number;
  career: number;
  opportunity: number;
  engagement: number;
  overall: number;
  breakdown: Record<string, number>;
  recommendations: string[];
  score: number;
}

const CONTENT_TYPE_WEIGHTS: Record<string, { authority: number; career: number; engagement: number; opportunity: number; voice: number }> = {
  story: { authority: 0.15, career: 0.25, engagement: 0.3, opportunity: 0.15, voice: 0.15 },
  educational: { authority: 0.25, career: 0.15, engagement: 0.2, opportunity: 0.2, voice: 0.2 },
  framework: { authority: 0.3, career: 0.15, engagement: 0.15, opportunity: 0.2, voice: 0.2 },
  contrarian: { authority: 0.2, career: 0.15, engagement: 0.3, opportunity: 0.2, voice: 0.15 },
  journey: { authority: 0.15, career: 0.25, engagement: 0.25, opportunity: 0.2, voice: 0.15 },
  project_breakdown: { authority: 0.3, career: 0.2, engagement: 0.15, opportunity: 0.2, voice: 0.15 },
  case_study: { authority: 0.3, career: 0.2, engagement: 0.15, opportunity: 0.2, voice: 0.15 },
  career_lesson: { authority: 0.15, career: 0.3, engagement: 0.2, opportunity: 0.2, voice: 0.15 },
  founder_update: { authority: 0.25, career: 0.2, engagement: 0.2, opportunity: 0.2, voice: 0.15 },
  build_in_public: { authority: 0.2, career: 0.2, engagement: 0.25, opportunity: 0.2, voice: 0.15 },
  industry_commentary: { authority: 0.35, career: 0.1, engagement: 0.2, opportunity: 0.2, voice: 0.15 },
  thought_leadership: { authority: 0.35, career: 0.15, engagement: 0.15, opportunity: 0.2, voice: 0.15 },
};

export class ContentScoringEngine {
  score(input: ScoringInput): ScoringResult {
    logger.info({ contentType: input.contentType }, 'Computing content scores');

    const weights = CONTENT_TYPE_WEIGHTS[input.contentType] || { authority: 0.2, career: 0.2, engagement: 0.2, opportunity: 0.2, voice: 0.2 };

    const voice = input.voiceMatchScore;
    const authority = this.computeAuthorityScore(input);
    const career = input.careerAlignmentScore;
    const opportunity = input.opportunityScore || Math.round((input.brandMatchScore + input.careerAlignmentScore) / 2);
    const engagement = input.engagementScore;

    const overall = Math.round(
      voice * weights.voice +
      authority * weights.authority +
      career * weights.career +
      opportunity * weights.opportunity +
      engagement * weights.engagement
    );

    const recommendations: string[] = [];
    if (voice < 70) recommendations.push('Adjust vocabulary and tone to better match voice profile');
    if (authority < 70) recommendations.push('Add more specific examples and evidence of expertise');
    if (career < 60) recommendations.push('Connect content more explicitly to career goals');
    if (opportunity < 60) recommendations.push('Strengthen the opportunity angle for professional growth');
    if (engagement < 60) recommendations.push('Improve hook and CTA for better engagement');
    if (overall < 60) recommendations.push('Consider regenerating with different angle or content type');

    return {
      voice, authority, career, opportunity, engagement, overall,
      breakdown: { voice, authority, career, opportunity, engagement, brandMatch: input.brandMatchScore },
      recommendations,
      score: overall,
    };
  }

  private computeAuthorityScore(input: ScoringInput): number {
    return Math.round((input.qualityScore * 0.5 + input.brandMatchScore * 0.3 + (input.engagementScore * 0.2)));
  }
}

export const contentScoringEngine = new ContentScoringEngine();
