import pino from 'pino';

const logger = pino();

export interface OpportunityResult {
  highOpportunityPillars: Array<{
    name: string;
    score: number;
    reasoning: string;
  }>;
  emergingTrends: string[];
  underservedTopics: string[];
  uniqueAngles: string[];
  recommendations: string[];
}

export class OpportunityEngine {

  analyze(
    pillars: Array<{
      name: string;
      authorityScore: number;
      engagementScore: number;
      careerAlignmentScore: number;
      sourceTopics: string[];
    }>
  ): OpportunityResult {
    const highOpportunityPillars = pillars.map(p => {
      const growthPotential = Math.max(0, 100 - p.authorityScore);
      const engagementGap = Math.max(0, 100 - p.engagementScore);
      const careerWeight = p.careerAlignmentScore;
      const combined = growthPotential * 0.4 + (100 - engagementGap) * 0.3 + careerWeight * 0.3;

      return {
        name: p.name,
        score: Math.round(combined),
        reasoning: this.generateOpportunityReasoning(p, combined),
      };
    }).sort((a, b) => b.score - a.score);

    const emergingTrends = this.detectEmergingTrends(pillars);
    const underservedTopics = this.findUnderservedTopics(pillars);
    const uniqueAngles = this.findUniqueAngles(pillars);

    const recommendations = [
      `Prioritize ${highOpportunityPillars[0]?.name || 'your top pillar'} — highest opportunity for growth`,
      underservedTopics.length > 0 ? `Capture underserved space in ${underservedTopics.slice(0, 2).join(', ')}` : 'Continue building depth in existing pillars',
      `Consider emerging angle: ${uniqueAngles[0] || 'your unique perspective on industry topics'}`,
    ];

    logger.info({ topOpportunity: highOpportunityPillars[0]?.name, trendsFound: emergingTrends.length }, 'Opportunity analysis complete');

    return { highOpportunityPillars, emergingTrends, underservedTopics, uniqueAngles, recommendations };
  }

  private generateOpportunityReasoning(pillar: { name: string; authorityScore: number; engagementScore: number; careerAlignmentScore: number }, score: number): string {
    const parts: string[] = [];
    if (pillar.authorityScore < 50) parts.push('Room to establish authority');
    if (pillar.careerAlignmentScore > 70) parts.push('Strongly aligned with career goals');
    if (pillar.engagementScore > 60) parts.push('Content will resonate with audience');
    if (score > 60) parts.push('High growth potential');
    return parts.join('. ') || 'Balanced opportunity across dimensions';
  }

  private detectEmergingTrends(pillars: Array<{ name: string }>): string[] {
    const trends: string[] = [];
    const namesStr = pillars.map(p => p.name.toLowerCase()).join(' ');

    if (namesStr.includes('ai')) trends.push('AI-powered development workflow');
    if (namesStr.includes('full stack')) trends.push('Full-stack AI integration');
    if (namesStr.includes('career') || namesStr.includes('job')) trends.push('AI-enhanced career development');
    if (namesStr.includes('startup')) trends.push('Lean AI startup methodology');
    if (trends.length === 0) trends.push('Personal branding in the AI era');

    return trends;
  }

  private findUnderservedTopics(pillars: Array<{ name: string; sourceTopics: string[] }>): string[] {
    const allSource = pillars.flatMap(p => p.sourceTopics);
    return [
      'Practical AI implementation patterns',
      'Building in public with metrics',
      'Technical career navigation',
      'Project-based learning journeys',
    ].filter(t => !allSource.some(s => s.toLowerCase().includes(t.toLowerCase())));
  }

  private findUniqueAngles(pillars: Array<{ name: string }>): string[] {
    return [
      `Your personal framework for ${pillars[0]?.name || 'your field'}`,
      `Combining ${pillars.slice(0, 2).map(p => p.name).join(' and ')} for unique insights`,
    ];
  }
}

export const opportunityEngine = new OpportunityEngine();
