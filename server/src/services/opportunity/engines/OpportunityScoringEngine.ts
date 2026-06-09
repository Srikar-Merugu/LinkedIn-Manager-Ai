import pino from 'pino';

const logger = pino();

interface OpportunityToScore {
  title: string;
  description: string;
  signalType: string;
  source: string;
  angles: Array<{ type: string; estimatedEngagement: number }>;
  relevantPillars: string[];
}

interface OpportunityScoreResult {
  overall: number;
  dimensions: {
    authorityPotential: number;
    careerImpact: number;
    engagementPotential: number;
    networkingPotential: number;
    storyPotential: number;
    educationalPotential: number;
  };
  reasoning: string;
}

export class OpportunityScoringEngine {
  score(opportunity: OpportunityToScore): OpportunityScoreResult {
    logger.info({ title: opportunity.title }, 'Scoring opportunity');

    const authorityPotential = this.scoreAuthorityPotential(opportunity);
    const careerImpact = this.scoreCareerImpact(opportunity);
    const engagementPotential = this.scoreEngagementPotential(opportunity);
    const networkingPotential = this.scoreNetworkingPotential(opportunity);
    const storyPotential = this.scoreStoryPotential(opportunity);
    const educationalPotential = this.scoreEducationalPotential(opportunity);

    const overall = Math.round(
      authorityPotential * 0.2 +
      careerImpact * 0.2 +
      engagementPotential * 0.2 +
      networkingPotential * 0.15 +
      storyPotential * 0.15 +
      educationalPotential * 0.1
    );

    const parts: string[] = [];
    if (authorityPotential > 70) parts.push('Strong authority builder');
    if (careerImpact > 70) parts.push('High career impact');
    if (engagementPotential > 70) parts.push('High engagement potential');
    if (networkingPotential > 70) parts.push('Networking opportunity');
    if (storyPotential > 70) parts.push('Compelling story');
    if (educationalPotential > 70) parts.push('Educational value');

    return {
      overall,
      dimensions: { authorityPotential, careerImpact, engagementPotential, networkingPotential, storyPotential, educationalPotential },
      reasoning: parts.length > 0 ? parts.join('. ') + '.' : 'Moderate opportunity across dimensions.',
    };
  }

  private scoreAuthorityPotential(opp: OpportunityToScore): number {
    let score = 30;
    if (opp.signalType === 'certification' || opp.signalType === 'case_study') score += 40;
    if (opp.signalType === 'open_source') score += 30;
    if (opp.signalType === 'career_change') score += 25;
    if (opp.source === 'portfolio' || opp.source === 'blog') score += 20;
    if (opp.angles.some(a => a.type === 'educational' || a.type === 'framework')) score += 15;
    return Math.min(100, score);
  }

  private scoreCareerImpact(opp: OpportunityToScore): number {
    let score = 30;
    if (opp.signalType === 'career_change') score += 50;
    if (opp.signalType === 'certification') score += 35;
    if (opp.signalType === 'project') score += 25;
    if (opp.source === 'linkedin' || opp.source === 'resume') score += 20;
    if (opp.relevantPillars.some(p => p.toLowerCase().includes('career'))) score += 15;
    return Math.min(100, score);
  }

  private scoreEngagementPotential(opp: OpportunityToScore): number {
    let score = 40;
    const maxEngagement = Math.max(...opp.angles.map(a => a.estimatedEngagement), 0);
    score += Math.round(maxEngagement * 0.4);
    if (opp.angles.some(a => a.type === 'story' || a.type === 'contrarian')) score += 15;
    if (opp.angles.length >= 3) score += 10;
    return Math.min(100, score);
  }

  private scoreNetworkingPotential(opp: OpportunityToScore): number {
    let score = 25;
    if (opp.signalType === 'career_change') score += 40;
    if (opp.signalType === 'open_source') score += 35;
    if (opp.signalType === 'project') score += 25;
    if (opp.source === 'github') score += 20;
    if (opp.angles.some(a => a.type === 'founder' || a.type === 'community')) score += 15;
    return Math.min(100, score);
  }

  private scoreStoryPotential(opp: OpportunityToScore): number {
    let score = 35;
    if (opp.signalType === 'career_change' || opp.signalType === 'milestone') score += 40;
    if (opp.signalType === 'project') score += 25;
    if (opp.angles.some(a => a.type === 'story' || a.type === 'journey')) score += 20;
    if (opp.description.length > 100) score += 10;
    return Math.min(100, score);
  }

  private scoreEducationalPotential(opp: OpportunityToScore): number {
    let score = 30;
    if (opp.angles.some(a => a.type === 'educational' || a.type === 'framework' || a.type === 'technical')) score += 35;
    if (opp.signalType === 'certification') score += 25;
    if (opp.signalType === 'case_study') score += 25;
    if (opp.angles.length >= 3) score += 10;
    return Math.min(100, score);
  }
}

export const opportunityScoringEngine = new OpportunityScoringEngine();
