import pino from 'pino';

const logger = pino();

export interface CareerAlignmentResult {
  overall: number;
  internship: number;
  jobSearch: number;
  freelancing: number;
  startup: number;
  thoughtLeadership: number;
  evidence: string[];
}

export class CareerAlignmentEngine {

  score(pillarName: string, pillarDescription: string, pillarCategory: string, careerGoal?: string): CareerAlignmentResult {
    const text = `${pillarName} ${pillarDescription}`.toLowerCase();

    const internship = this.scoreGoal(text, /intern|project|learn|tutorial|journey|student|prepare|skill|build|beginner/i);
    const jobSearch = this.scoreGoal(text, /career|job|interview|skill|portfolio|resume|case.study|result/i);
    const freelancing = this.scoreGoal(text, /client|freelance|case.study|result|portfolio|service|deliver|consult/i);
    const startup = this.scoreGoal(text, /startup|founder|build|product|growth|fundraise|venture|scale/i);
    const thoughtLeadership = this.scoreGoal(text, /thought|leadership|framework|original|perspective|industry|trend|analysis|prediction/i);

    const allScores = [internship, jobSearch, freelancing, startup, thoughtLeadership];
    const overall = Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length);

    const evidence = this.collectEvidence(pillarName, internship, jobSearch, freelancing, startup, thoughtLeadership);

    logger.info({ pillar: pillarName, careerAlignment: overall }, 'Career alignment scored');

    return {
      overall: Math.min(100, overall),
      internship: Math.min(100, internship),
      jobSearch: Math.min(100, jobSearch),
      freelancing: Math.min(100, freelancing),
      startup: Math.min(100, startup),
      thoughtLeadership: Math.min(100, thoughtLeadership),
      evidence,
    };
  }

  private scoreGoal(text: string, pattern: RegExp): number {
    const matches = (text.match(pattern) || []).length;
    return Math.min(100, matches * 15 + 20);
  }

  private collectEvidence(name: string, internship: number, job: number, freelance: number, startup: number, tl: number): string[] {
    const evidence: string[] = [];
    if (internship >= 60) evidence.push('Strong for internship-seekers');
    if (job >= 60) evidence.push('Strong for job search');
    if (freelance >= 60) evidence.push('Strong for freelancers');
    if (startup >= 60) evidence.push('Strong for startup growth');
    if (tl >= 60) evidence.push('Strong for thought leadership');
    return evidence;
  }
}

export const careerAlignmentEngine = new CareerAlignmentEngine();
