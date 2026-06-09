import pino from 'pino';

const logger = pino();

interface ProfileInput {
  careerGoal?: { primaryGoal?: string; targetRole?: string };
  experience?: Array<{ title: string }>;
  skills?: Array<{ name: string }>;
  audienceData?: { size?: string };
  writingDNA?: { totalWords?: number; sampleCount?: number };
}

interface FrequencyRecommendation {
  postsPerWeek: number;
  reasoning: string;
  dailyBreakdown: string;
  capacityAssessment: string;
}

export class PostFrequencyEngine {
  recommend(profile: ProfileInput): FrequencyRecommendation {
    logger.info('Calculating optimal posting frequency');
    const audienceSize = profile.audienceData?.size || 'small';
    const sampleCount = profile.writingDNA?.sampleCount || 0;
    const hasSamples = sampleCount >= 5;
    const isJobSearch = profile.careerGoal?.primaryGoal === 'job_search' || profile.careerGoal?.primaryGoal === 'career_change';
    const isThoughtLeadership = profile.careerGoal?.primaryGoal === 'thought_leadership';
    const isSmallAudience = audienceSize === 'small' || audienceSize === 'none';
    const expYears = profile.experience?.length || 0;

    let postsPerWeek: number;
    let reasoning: string;

    if (isJobSearch) {
      postsPerWeek = 5;
      reasoning = 'Job seekers benefit from maximum visibility. 5 posts per week ensures daily presence and rapid profile growth for recruiter attention.';
    } else if (isThoughtLeadership && expYears > 5) {
      postsPerWeek = 4;
      reasoning = 'Established professionals should prioritize quality over quantity. 4 posts per week maintains consistent authority without diluting expertise signal.';
    } else if (isSmallAudience) {
      postsPerWeek = 4;
      reasoning = 'Smaller audiences need consistent presence to build momentum. 4 posts per week provides steady growth without overwhelming content creation capacity.';
    } else {
      postsPerWeek = 3;
      reasoning = 'Balanced approach for established profiles. 3 high-quality posts per week maintains visibility while allowing deep work on each piece.';
    }

    if (!hasSamples) {
      postsPerWeek = Math.min(postsPerWeek, 4);
      reasoning += ' Starting with 3-4 posts per week to build writing consistency and gather voice data for optimization.';
    }

    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const dailyBreakdown = postsPerWeek <= 3
      ? `Post on ${days.slice(0, postsPerWeek).join(', ')}`
      : `Post Monday through Friday with ${postsPerWeek - 5} additional weekend post${postsPerWeek > 5 ? 's' : ''}`;

    const capacityAssessment = postsPerWeek <= 3
      ? 'Low capacity required. Each post can be thoroughly researched and crafted.'
      : postsPerWeek <= 4
        ? 'Moderate capacity required. Batch-create content on weekends for weekday publishing.'
        : 'High capacity required. Consider repurposing long-form content into multiple posts, or use AI-assisted drafting.';

    return { postsPerWeek, reasoning, dailyBreakdown, capacityAssessment };
  }
}

export const postFrequencyEngine = new PostFrequencyEngine();
