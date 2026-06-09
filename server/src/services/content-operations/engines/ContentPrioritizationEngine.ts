import pino from 'pino';

const logger = pino();

interface ContentItem {
  topic: string;
  pillarName: string;
  contentType: string;
  careerGoal?: string;
  authorityTopics?: string[];
  opportunityType?: string;
  dueDate?: Date;
}

interface PriorityScoreOutput {
  item: ContentItem;
  overall: number;
  dimensions: {
    careerImpact: number;
    authorityImpact: number;
    engagementPotential: number;
    opportunityPotential: number;
    urgency: number;
  };
  reasoning: string;
}

export class ContentPrioritizationEngine {
  score(items: ContentItem[]): PriorityScoreOutput[] {
    logger.info({ count: items.length }, 'Scoring content priorities');
    return items.map(item => {
      const careerImpact = this.scoreCareerImpact(item);
      const authorityImpact = this.scoreAuthorityImpact(item);
      const engagementPotential = this.scoreEngagementPotential(item);
      const opportunityPotential = this.scoreOpportunityPotential(item);
      const urgency = this.scoreUrgency(item);

      const overall = Math.round(
        careerImpact * 0.25 + authorityImpact * 0.25 + engagementPotential * 0.2 + opportunityPotential * 0.2 + urgency * 0.1
      );

      const dimensions = { careerImpact, authorityImpact, engagementPotential, opportunityPotential, urgency };

      const reasoning = this.generateReasoning(item, overall, dimensions);

      return { item, overall, dimensions, reasoning };
    }).sort((a, b) => b.overall - a.overall);
  }

  private scoreCareerImpact(item: ContentItem): number {
    let score = 50;
    if (item.careerGoal === 'job_search') score += 30;
    if (item.careerGoal === 'promotion') score += 25;
    if (item.careerGoal === 'thought_leadership') score += 20;
    if (item.contentType === 'educational' || item.contentType === 'story') score += 10;
    return Math.min(100, score);
  }

  private scoreAuthorityImpact(item: ContentItem): number {
    let score = 40;
    if (item.authorityTopics?.includes(item.pillarName)) score += 30;
    if (item.contentType === 'educational') score += 15;
    if (item.contentType === 'engagement') score += 10;
    if (item.pillarName) score += 10;
    return Math.min(100, score);
  }

  private scoreEngagementPotential(item: ContentItem): number {
    let score = 50;
    if (item.contentType === 'engagement') score += 25;
    if (item.contentType === 'story') score += 20;
    if (item.contentType === 'personal') score += 15;
    if (item.contentType === 'educational') score += 5;
    return Math.min(100, score);
  }

  private scoreOpportunityPotential(item: ContentItem): number {
    let score = 40;
    if (item.opportunityType === 'recruiter') score += 30;
    if (item.opportunityType === 'client') score += 25;
    if (item.opportunityType === 'collaboration') score += 20;
    if (item.contentType === 'story' || item.contentType === 'educational') score += 10;
    return Math.min(100, score);
  }

  private scoreUrgency(item: ContentItem): number {
    if (!item.dueDate) return 30;
    const daysUntilDue = Math.ceil((item.dueDate.getTime() - Date.now()) / (86400000));
    if (daysUntilDue <= 1) return 100;
    if (daysUntilDue <= 3) return 80;
    if (daysUntilDue <= 7) return 60;
    if (daysUntilDue <= 14) return 40;
    return 20;
  }

  private generateReasoning(item: ContentItem, overall: number, dims: any): string {
    const parts: string[] = [];
    if (dims.careerImpact > 70) parts.push('High career impact');
    if (dims.authorityImpact > 70) parts.push('Strong authority builder');
    if (dims.engagementPotential > 70) parts.push('High engagement potential');
    if (dims.opportunityPotential > 70) parts.push('Opportunity driver');
    if (dims.urgency > 70) parts.push('Time-sensitive');
    if (parts.length === 0) parts.push('Standard priority content');
    return parts.join('. ') + '.';
  }
}

export const contentPrioritizationEngine = new ContentPrioritizationEngine();
