import pino from 'pino';

const logger = pino();

export interface CareerAlignmentInput {
  content: string;
  topic: string;
  careerGoals: Array<{
    type: string;
    target: string;
    description: string;
    timeline: string;
  }>;
  currentRole: string;
  targetRole?: string;
}

export interface CareerAlignmentResult {
  score: number;
  goalAlignment: Array<{ goal: string; score: number; reasoning: string }>;
  overallAlignment: string;
  recommendations: string[];
  supportsCareerProgression: boolean;
}

export class CareerAlignmentEngine {
  evaluate(input: CareerAlignmentInput): CareerAlignmentResult {
    logger.info({ topic: input.topic }, 'Evaluating career alignment');

    const goalAlignment: CareerAlignmentResult['goalAlignment'] = [];
    let totalScore = 0;

    input.careerGoals.forEach(goal => {
      const score = this.scoreAlignment(input, goal);
      totalScore += score;
      goalAlignment.push({
        goal: goal.type,
        score,
        reasoning: this.generateReasoning(goal, score),
      });
    });

    const avgScore = input.careerGoals.length > 0
      ? Math.round(totalScore / input.careerGoals.length)
      : 50;

    const recommendations: string[] = [];
    if (avgScore < 60) {
      recommendations.push(`Connect ${input.topic} more explicitly to your ${input.targetRole || 'target role'}`);
      recommendations.push('Add specific examples that demonstrate relevant skills');
    }
    if (avgScore >= 70 && input.targetRole) {
      recommendations.push(`Strong alignment with ${input.targetRole} — add explicit callout to this career path`);
    }

    return {
      score: avgScore,
      goalAlignment,
      overallAlignment: avgScore >= 70 ? 'Strong' : avgScore >= 50 ? 'Moderate' : 'Weak',
      recommendations,
      supportsCareerProgression: avgScore >= 60,
    };
  }

  private scoreAlignment(input: CareerAlignmentInput, goal: { type: string; target: string; description: string; timeline: string }): number {
    const content_lower = input.content.toLowerCase();
    let score = 50;

    const goalTerms = [
      ...goal.target.toLowerCase().split(' '),
      ...goal.description.toLowerCase().split(' '),
      goal.type.toLowerCase(),
    ];

    const matched = goalTerms.filter(t => t.length > 3 && content_lower.includes(t)).length;
    score += (matched / Math.max(goalTerms.filter(t => t.length > 3).length, 1)) * 30;

    if (input.targetRole && content_lower.includes(input.targetRole.toLowerCase())) score += 10;
    if (content_lower.includes('learn') || content_lower.includes('grow')) score += 5;
    if (content_lower.includes('career') || content_lower.includes('professional')) score += 5;

    return Math.min(100, score);
  }

  private generateReasoning(goal: { type: string; target: string; description: string }, score: number): string {
    if (score >= 80) return `Strongly supports ${goal.type} goal: ${goal.description}`;
    if (score >= 60) return `Moderately supports ${goal.type} goal: ${goal.target}`;
    return `Weakly connected to ${goal.type}: ${goal.target} — consider adding more explicit relevance`;
  }
}

export const careerAlignmentEngine = new CareerAlignmentEngine();
