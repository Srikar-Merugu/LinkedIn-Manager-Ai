import pino from 'pino';

const logger = pino();

interface ProfileInput {
  careerGoal?: { primaryGoal?: string; targetRole?: string };
  experience?: Array<{ title: string }>;
  skills?: Array<{ name: string }>;
  audienceData?: { size?: string; engagement?: string };
  analytics?: { topPerformingDays?: string[]; avgEngagementByDay?: Record<string, number>; bestPostingTimes?: string[] };
  contentPillars?: Array<{ name: string; authorityScore?: number }>;
}

interface CalendarIntelligenceOutput {
  bestDays: string[];
  bestTimes: string[];
  recommendedFrequency: number;
  contentMixByDay: Record<string, Array<{ type: string; percentage: number }>>;
  timeWindows: Array<{ day: string; windows: string[] }>;
  reasoning: string;
}

export class CalendarIntelligenceEngine {
  analyze(profile: ProfileInput): CalendarIntelligenceOutput {
    logger.info('Analyzing calendar intelligence');
    const historicalDays = profile.analytics?.topPerformingDays || [];
    const historicalTimes = profile.analytics?.bestPostingTimes || [];
    const engagementByDay = profile.analytics?.avgEngagementByDay || {};
    const audienceSize = profile.audienceData?.size || 'small';
    const isJobSearch = profile.careerGoal?.primaryGoal === 'job_search';

    const allDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    let bestDays: string[];
    if (historicalDays.length >= 3) {
      bestDays = historicalDays;
    } else if (isJobSearch) {
      bestDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    } else if (audienceSize === 'large') {
      bestDays = ['Tuesday', 'Wednesday', 'Thursday'];
    } else {
      bestDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday'];
    }

    const bestTimes: string[] = historicalTimes.length > 0
      ? historicalTimes
      : isJobSearch
        ? ['07:30', '12:00', '17:30']
        : ['08:00', '12:30', '18:00'];

    const recommendedFrequency = profile.contentPillars?.length
      ? Math.min(profile.contentPillars.length + 1, 7)
      : isJobSearch ? 5 : 4;

    const contentMixByDay: Record<string, Array<{ type: string; percentage: number }>> = {};
    for (const day of bestDays) {
      contentMixByDay[day] = [
        { type: 'educational', percentage: 30 },
        { type: 'engagement', percentage: 25 },
        { type: 'personal', percentage: 20 },
        { type: 'story', percentage: 15 },
        { type: 'promotional', percentage: 10 },
      ];
    }

    const timeWindows = bestDays.map(day => ({
      day,
      windows: bestTimes,
    }));

    const totalDays = bestDays.length;
    const reasoning = `Optimal schedule: ${totalDays} days/week at ${bestTimes.join(', ')}. ` +
      `${historicalDays.length > 0 ? 'Historical data shows best performance on ' + bestDays.join(', ') + '. ' : ''}` +
      `Frequency of ${recommendedFrequency} posts/week supports ${isJobSearch ? 'maximum visibility for job search' : 'balanced authority building'}.`;

    return { bestDays, bestTimes, recommendedFrequency, contentMixByDay, timeWindows, reasoning };
  }
}

export const calendarIntelligenceEngine = new CalendarIntelligenceEngine();
