import pino from 'pino';

const logger = pino();

export interface MixEntry {
  pillarName: string;
  percentage: number;
  postsPerWeek: number;
  reasoning: string;
}

export class ContentMixEngine {

  distribute(pillars: Array<{ name: string; rank: number; authorityScore: number; engagementScore: number; careerAlignmentScore: number }>): {
    distributions: MixEntry[];
    totalPostsPerWeek: number;
  } {
    const baseFrequency = Math.max(3, Math.min(7, pillars.length));
    const totalPosts = baseFrequency;
    const totalWeight = pillars.reduce((s, p) => s + this.calculateWeight(p), 0);

    const distributions: MixEntry[] = pillars.map(p => {
      const weight = this.calculateWeight(p);
      const percentage = Math.round((weight / totalWeight) * 100);
      const posts = Math.max(1, Math.round((percentage / 100) * totalPosts));

      return {
        pillarName: p.name,
        percentage,
        postsPerWeek: posts,
        reasoning: this.generateReasoning(p, percentage),
      };
    });

    const adjusted = this.normalizePercentages(distributions);

    logger.info({ totalPostsPerWeek: totalPosts, pillars: adjusted.map(d => `${d.pillarName}: ${d.percentage}%`) }, 'Content mix generated');

    return { distributions: adjusted, totalPostsPerWeek: totalPosts };
  }

  private calculateWeight(pillar: { rank: number; authorityScore: number; engagementScore: number; careerAlignmentScore: number }): number {
    return (7 - pillar.rank) * 3 + pillar.authorityScore * 0.3 + pillar.careerAlignmentScore * 0.4 + pillar.engagementScore * 0.3;
  }

  private generateReasoning(pillar: { name: string; rank: number }, percentage: number): string {
    if (percentage >= 30) return 'Primary pillar — highest priority for your brand';
    if (percentage >= 20) return 'Secondary pillar — important for balanced authority building';
    if (percentage >= 10) return 'Supporting pillar — maintains variety and reach';
    return 'Niche pillar — establishes unique positioning';
  }

  private normalizePercentages(distributions: MixEntry[]): MixEntry[] {
    const total = distributions.reduce((s, d) => s + d.percentage, 0);
    if (total === 100) return distributions;

    const diff = 100 - total;
    if (distributions.length > 0) {
      distributions[0].percentage += diff;
    }

    return distributions;
  }
}

export const contentMixEngine = new ContentMixEngine();
