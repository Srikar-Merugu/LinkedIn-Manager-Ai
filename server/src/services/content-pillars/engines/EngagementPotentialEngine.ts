import pino from 'pino';

const logger = pino();

export interface EngagementScoreResult {
  overall: number;
  commentPotential: number;
  savePotential: number;
  sharePotential: number;
  discussionPotential: number;
  evidence: string[];
}

export class EngagementPotentialEngine {

  score(pillarName: string, pillarDescription: string, pillarCategory: string): EngagementScoreResult {
    const commentPotential = this.scoreCommentPotential(pillarName, pillarDescription, pillarCategory);
    const savePotential = this.scoreSavePotential(pillarName, pillarDescription);
    const sharePotential = this.scoreSharePotential(pillarName, pillarDescription);
    const discussionPotential = this.scoreDiscussionPotential(pillarName, pillarDescription);

    const evidence = this.collectEvidence(pillarName, commentPotential, savePotential, sharePotential, discussionPotential);

    const overall = Math.round(
      commentPotential * 0.30 +
      savePotential * 0.25 +
      sharePotential * 0.25 +
      discussionPotential * 0.20
    );

    logger.info({ pillar: pillarName, engagementScore: overall }, 'Engagement scored');

    return {
      overall: Math.min(100, overall),
      commentPotential: Math.min(100, commentPotential),
      savePotential: Math.min(100, savePotential),
      sharePotential: Math.min(100, sharePotential),
      discussionPotential: Math.min(100, discussionPotential),
      evidence,
    };
  }

  private scoreCommentPotential(name: string, desc: string, category: string): number {
    const controversial = /debate|opinion|contrarian|unpopular|why.*wrong|mistake|failure|lesson/i;
    const questionDriven = /how.*should|what.*think|should.*you|best.*way|what.*work/i;
    const text = `${name} ${desc}`;

    if (controversial.test(text)) return 90;
    if (questionDriven.test(text)) return 80;
    if (category === 'growth') return 70;
    return 55;
  }

  private scoreSavePotential(name: string, desc: string): number {
    const saveWorthy = /guide|framework|system|checklist|template|tutorial|step.by.step|how.to|reference|complete/i;
    const text = `${name} ${desc}`;

    if (saveWorthy.test(text)) return 85;
    return 60;
  }

  private scoreSharePotential(name: string, desc: string): number {
    const shareable = /surprising|unexpected|mind.blowing|eye.opening|controversial|framework|unique|new/i;
    const text = `${name} ${desc}`;

    if (shareable.test(text)) return 80;
    return 55;
  }

  private scoreDiscussionPotential(name: string, desc: string): number {
    const discussionDriven = /industry|future|trend|prediction|analysis|state.of|what.if|debate|opinion|perspective/i;
    const text = `${name} ${desc}`;

    if (discussionDriven.test(text)) return 85;
    return 50;
  }

  private collectEvidence(name: string, comment: number, save: number, share: number, discussion: number): string[] {
    const evidence: string[] = [];
    if (comment >= 70) evidence.push('High comment potential — encourages discussion');
    if (save >= 70) evidence.push('High save potential — educational content');
    if (share >= 70) evidence.push('High share potential — surprising or unique perspective');
    if (discussion >= 70) evidence.push('High discussion potential — industry-relevant topic');
    return evidence;
  }
}

export const engagementPotentialEngine = new EngagementPotentialEngine();
