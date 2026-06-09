import pino from 'pino';

const logger = pino();

interface PrioritizableOpportunity {
  title: string;
  overallScore: number;
  signalType: string;
  source: string;
  dimensions: Record<string, number>;
  reasoning: string;
}

type PriorityLabel = 'immediate' | 'this_week' | 'this_month' | 'someday' | 'archived';

export interface PrioritizationResult {
  opportunity: PrioritizableOpportunity;
  priority: PriorityLabel;
  rank: number;
  justification: string;
}

export class OpportunityPrioritizationEngine {
  prioritize(opportunities: PrioritizableOpportunity[]): PrioritizationResult[] {
    logger.info({ count: opportunities.length }, 'Prioritizing opportunities');

    const scored = opportunities.map(o => ({
      ...o,
      weightedScore: this.computeWeightedScore(o),
    }));

    scored.sort((a, b) => b.weightedScore - a.weightedScore);

    return scored.map((o, i) => {
      const priority = this.determinePriority(o, i, scored.length);
      return {
        opportunity: o,
        priority,
        rank: i + 1,
        justification: this.generateJustification(o, priority),
      };
    });
  }

  private computeWeightedScore(o: PrioritizableOpportunity): number {
    const careerWeight = o.signalType === 'career_change' ? 1.3 : 1;
    const sourceWeight = o.source === 'linkedin' || o.source === 'resume' ? 1.2 : 1;
    return o.overallScore * careerWeight * sourceWeight;
  }

  private determinePriority(o: PrioritizableOpportunity, index: number, total: number): PriorityLabel {
    if (o.overallScore >= 80 && index < Math.ceil(total * 0.15)) return 'immediate';
    if (o.overallScore >= 65 && index < Math.ceil(total * 0.35)) return 'this_week';
    if (o.overallScore >= 45) return 'this_month';
    if (o.overallScore >= 25) return 'someday';
    return 'archived';
  }

  private generateJustification(o: PrioritizableOpportunity, priority: PriorityLabel): string {
    switch (priority) {
      case 'immediate':
        return `High-scoring opportunity (${o.overallScore}/100) that should be posted as soon as possible. ${o.reasoning}`;
      case 'this_week':
        return `Strong opportunity (${o.overallScore}/100) worth publishing within the week. Best aligned with current strategy.`;
      case 'this_month':
        return `Solid opportunity (${o.overallScore}/100) to include in this month's content plan. Good supporting material.`;
      case 'someday':
        return `Moderate opportunity (${o.overallScore}/100). Worth revisiting when higher-priority content is published.`;
      case 'archived':
        return `Low-scoring opportunity (${o.overallScore}/100). Archived for future reconsideration if context changes.`;
    }
  }
}

export const opportunityPrioritizationEngine = new OpportunityPrioritizationEngine();
