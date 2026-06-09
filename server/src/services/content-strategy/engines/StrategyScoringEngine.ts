import pino from 'pino';

const logger = pino();

interface StrategyToScore {
  growthGoals: Array<{ category: string; goal: string; successMetrics: string[] }>;
  contentMix: Array<{ type: string; percentage: number }>;
  authorityTopics: Array<{ name: string; category: string; currentAuthority: number; targetAuthority: number }>;
  opportunityPlan: any;
  networkingPlan: any;
  frequencyRecommendation: { postsPerWeek: number };
}

interface ScoreDimension {
  overall: number;
  subScores: Record<string, number>;
  evidence: string[];
}

interface StrategyScoreOutput {
  authorityScore: ScoreDimension;
  opportunityScore: ScoreDimension;
  careerAlignmentScore: ScoreDimension;
  audienceFitScore: ScoreDimension;
  executionScore: ScoreDimension;
  overallScore: number;
  scoreBreakdown: Record<string, number>;
  recommendations: string[];
}

export class StrategyScoringEngine {
  evaluate(strategy: StrategyToScore): StrategyScoreOutput {
    logger.info('Scoring content strategy');

    const authorityScore = this.scoreAuthority(strategy);
    const opportunityScore = this.scoreOpportunity(strategy);
    const careerAlignmentScore = this.scoreCareerAlignment(strategy);
    const audienceFitScore = this.scoreAudienceFit(strategy);
    const executionScore = this.scoreExecution(strategy);

    const weights = { authority: 0.25, opportunity: 0.2, careerAlignment: 0.2, audienceFit: 0.15, execution: 0.2 };
    const overallScore = Math.round(
      authorityScore.overall * weights.authority +
      opportunityScore.overall * weights.opportunity +
      careerAlignmentScore.overall * weights.careerAlignment +
      audienceFitScore.overall * weights.audienceFit +
      executionScore.overall * weights.execution
    );

    const scoreBreakdown: Record<string, number> = {
      authority: authorityScore.overall,
      opportunity: opportunityScore.overall,
      careerAlignment: careerAlignmentScore.overall,
      audienceFit: audienceFitScore.overall,
      execution: executionScore.overall,
      overall: overallScore,
    };

    const recommendations: string[] = [];

    if (authorityScore.overall < 60) {
      recommendations.push('Increase authority-building content. Focus on original frameworks and deep-dives that differentiate your expertise.');
    }
    if (opportunityScore.overall < 60) {
      recommendations.push('Strengthen opportunity generation. Add more success stories and opinion-based content that attracts recruiters and collaborators.');
    }
    if (careerAlignmentScore.overall < 60) {
      recommendations.push('Improve career alignment. Ensure content topics map directly to target role requirements and industry demand.');
    }
    if (audienceFitScore.overall < 60) {
      recommendations.push('Better align content with audience needs. Incorporate more educational and actionable content that solves specific audience problems.');
    }
    if (executionScore.overall < 60) {
      recommendations.push('Improve execution feasibility. Reduce posting frequency or batch-create content to maintain consistency without burnout.');
    }

    return { authorityScore, opportunityScore, careerAlignmentScore, audienceFitScore, executionScore, overallScore, scoreBreakdown, recommendations };
  }

  private scoreAuthority(strategy: StrategyToScore): ScoreDimension {
    const dominateTopics = strategy.authorityTopics.filter(t => t.category === 'dominate').length;
    const expandTopics = strategy.authorityTopics.filter(t => t.category === 'expand').length;
    const hasFrameworks = strategy.contentMix.some(m => m.type.includes('Framework') && m.percentage >= 15);
    const hasDeepDives = strategy.contentMix.some(m => m.type.includes('Deep') && m.percentage >= 15);

    const topicDominance = Math.min(100, dominateTopics * 20 + expandTopics * 10);
    const credibility = hasFrameworks ? 80 : 50;
    const differentiation = hasDeepDives ? 75 : 45;
    const overall = Math.round((topicDominance + credibility + differentiation) / 3);

    return {
      overall,
      subScores: { topicDominance, credibility, differentiation },
      evidence: [
        `${dominateTopics} topics identified for authority dominance`,
        hasFrameworks ? 'Original frameworks included in content mix' : 'No original framework content planned',
        hasDeepDives ? 'Technical deep-dive content scheduled' : 'Consider adding deep-dive content for authority building',
      ],
    };
  }

  private scoreOpportunity(strategy: StrategyToScore): ScoreDimension {
    const hasOpinionContent = strategy.contentMix.some(m => m.type.includes('Opinion') || m.type.includes('Contrarian'));
    const hasSuccessStories = strategy.contentMix.some(m => m.type.includes('Success'));
    const recruiterAppeal = hasOpinionContent ? 75 : 40;
    const clientAppeal = hasSuccessStories ? 80 : 45;
    const investorAppeal = 50;
    const networkGrowthPotential = strategy.frequencyRecommendation.postsPerWeek >= 4 ? 70 : 55;
    const overall = Math.round((recruiterAppeal + clientAppeal + investorAppeal + networkGrowthPotential) / 4);

    return {
      overall,
      subScores: { recruiterAppeal, clientAppeal, investorAppeal, networkGrowthPotential },
      evidence: [
        hasOpinionContent ? 'Opinion content planned to attract recruiter attention' : 'Add opinion-based content to increase recruiter appeal',
        hasSuccessStories ? 'Success stories included for client attraction' : 'Success stories missing from content mix',
      ],
    };
  }

  private scoreCareerAlignment(strategy: StrategyToScore): ScoreDimension {
    const careerGoals = strategy.growthGoals.filter(g => g.category === 'career').length;
    const hasTargetRoleContent = strategy.contentMix.length > 0;
    const roleFit = careerGoals >= 1 ? 80 : 40;
    const industryRelevance = 75;
    const skillShowcasing = strategy.growthGoals.some(g => g.category === 'authority') ? 80 : 50;
    const narrativeStrength = strategy.growthGoals.some(g => g.category === 'growth') ? 75 : 55;
    const overall = Math.round((roleFit + industryRelevance + skillShowcasing + narrativeStrength) / 4);

    return {
      overall,
      subScores: { roleFit, industryRelevance, skillShowcasing, narrativeStrength },
      evidence: [
        `${careerGoals} career-specific growth goals defined`,
        hasTargetRoleContent ? 'Content mix aligned with career target' : 'Career target not clearly reflected in content mix',
      ],
    };
  }

  private scoreAudienceFit(strategy: StrategyToScore): ScoreDimension {
    const hasEducational = strategy.contentMix.some(m => m.type.includes('Educational'));
    const relevanceToAudience = hasEducational ? 78 : 45;
    const engagementPotential = strategy.contentMix.some(m => m.type.includes('Opinion')) ? 82 : 55;
    const shareability = strategy.contentMix.some(m => m.type.includes('Framework') || m.type.includes('Educational')) ? 75 : 50;
    const overall = Math.round((relevanceToAudience + engagementPotential + shareability) / 3);

    return {
      overall,
      subScores: { relevanceToAudience, engagementPotential, shareability },
      evidence: [
        hasEducational ? 'Educational content planned for audience value' : 'Add educational content to improve audience fit',
        `Engagement potential rated at ${engagementPotential}/100 based on content mix`,
      ],
    };
  }

  private scoreExecution(strategy: StrategyToScore): ScoreDimension {
    const freq = strategy.frequencyRecommendation.postsPerWeek;
    const feasibility = freq <= 4 ? 85 : freq <= 5 ? 65 : 45;
    const consistency = freq >= 3 ? 75 : 50;
    const resourceEfficiency = freq <= 3 ? 85 : 60;

    const totalGoalCategories = new Set(strategy.growthGoals.map(g => g.category)).size;
    const ambitionScore = Math.min(100, totalGoalCategories * 15 + 20);

    const overall = Math.round((feasibility + consistency + resourceEfficiency + ambitionScore) / 4);

    return {
      overall,
      subScores: { feasibility, consistency, resourceEfficiency, ambitionScore },
      evidence: [
        `${freq} posts per week - ${freq <= 4 ? 'sustainable' : 'may require significant time investment'}`,
        `${totalGoalCategories} growth goal categories targeted`,
      ],
    };
  }
}

export const strategyScoringEngine = new StrategyScoringEngine();
