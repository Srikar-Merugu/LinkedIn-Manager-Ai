import pino from 'pino';

const logger = pino();

export interface PrioritizationResult {
  rank: number;
  reasoning: string;
}

export class PillarPrioritizationEngine {

  prioritize(
    pillars: Array<{
      name: string;
      description: string;
      category: string;
      authorityScore: number;
      engagementScore: number;
      careerAlignmentScore: number;
    }>
  ): Array<PrioritizationResult & { name: string }> {
    const scored = pillars.map(p => {
      const combined = p.authorityScore * 0.35 + p.engagementScore * 0.25 + p.careerAlignmentScore * 0.40;

      let reasoning = this.generateReasoning(p, combined);

      return {
        name: p.name,
        rank: 0,
        reasoning,
      };
    });

    scored.sort((a, b) => {
      const aScore = pillars.find(p => p.name === a.name)!;
      const bScore = pillars.find(p => p.name === b.name)!;
      const aCombined = aScore.authorityScore * 0.35 + aScore.engagementScore * 0.25 + aScore.careerAlignmentScore * 0.40;
      const bCombined = bScore.authorityScore * 0.35 + bScore.engagementScore * 0.25 + bScore.careerAlignmentScore * 0.40;
      return bCombined - aCombined;
    });

    scored.forEach((p, i) => {
      p.rank = i + 1;
    });

    logger.info({ rankings: scored.map(s => `${s.rank}. ${s.name}`) }, 'Pillars prioritized');

    return scored;
  }

  private generateReasoning(pillar: { name: string; description: string; category: string; authorityScore: number; engagementScore: number; careerAlignmentScore: number }, combined: number): string {
    const parts: string[] = [];

    if (pillar.careerAlignmentScore >= 75) parts.push('Strongly aligned with career goals');
    else if (pillar.careerAlignmentScore >= 50) parts.push('Moderately aligned with career goals');

    if (pillar.authorityScore >= 75) parts.push('High authority potential — you can establish expertise here');
    else if (pillar.authorityScore >= 50) parts.push('Good authority building opportunity');

    if (pillar.engagementScore >= 70) parts.push('Strong engagement potential — this content will resonate');

    if (pillar.category === 'core') parts.push('Core pillar — foundational to your brand');
    else if (pillar.category === 'growth') parts.push('Growth pillar — expands your reach');

    if (parts.length === 0) parts.push('Solid pillar with balanced potential across all dimensions');

    return parts.join('. ') + '.';
  }
}

export const pillarPrioritizationEngine = new PillarPrioritizationEngine();
