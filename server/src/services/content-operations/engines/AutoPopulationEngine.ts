import mongoose from 'mongoose';
import pino from 'pino';
import { ContentCalendar, ICalendarEntry } from '../../../models/strategy/ContentCalendar';

const logger = pino();

interface StrategyInput {
  monthlyPlans: Array<{
    monthNumber: number;
    phase: string;
    contentMix: Array<{ type: string; percentage: number }>;
    weeklyThemes: number[];
  }>;
  weeklyThemes: Array<{
    globalWeekNumber: number;
    title: string;
    focus: string;
    description: string;
    contentIdeas: string[];
    pillarFocus: string[];
    contentTypeMix: Array<{ type: string; count: number }>;
  }>;
  growthGoals: Array<{ category: string; goal: string; successMetrics: string[] }>;
}

interface CalendarConfig {
  bestDays: string[];
  bestTimes: string[];
  recommendedFrequency: number;
  contentMixByDay: Record<string, Array<{ type: string; percentage: number }>>;
}

export interface PopulatedEntry {
  userId: mongoose.Types.ObjectId;
  date: Date;
  topic: string;
  hook: string;
  pillarName: string;
  pillarTopic: string;
  contentType: 'educational' | 'engagement' | 'personal' | 'promotional' | 'story';
  format: 'post' | 'article' | 'carousel' | 'thread' | 'poll' | 'video';
  source: 'generated' | 'opportunity' | 'recycled' | 'ai_suggested';
  status: 'draft' | 'review' | 'approved' | 'scheduled' | 'published' | 'failed' | 'archived';
  timezone: string;
  labels: string[];
}

export class AutoPopulationEngine {
  generate(
    userId: mongoose.Types.ObjectId,
    strategy: StrategyInput,
    config: CalendarConfig,
    daysToGenerate: 30 | 60 | 90 = 90
  ): PopulatedEntry[] {
    logger.info({ days: daysToGenerate }, 'Auto-populating calendar entries');
    const entries: PopulatedEntry[] = [];
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);

    const contentTypeWeights: Array<{ type: string; weight: number }> = [
      { type: 'educational', weight: 30 },
      { type: 'engagement', weight: 25 },
      { type: 'personal', weight: 20 },
      { type: 'story', weight: 15 },
      { type: 'promotional', weight: 10 },
    ];

    const formatOptions = ['post', 'post', 'post', 'post', 'article', 'carousel', 'thread'];
    const contentTypeFromMix = (mix: Array<{ type: string; percentage: number }>): string => {
      if (mix.length === 0) return 'educational';
      const r = Math.random() * 100;
      let cum = 0;
      for (const m of mix) {
        cum += m.percentage;
        if (r <= cum) return m.type;
      }
      return mix[mix.length - 1].type;
    };

    const bestDayIndices = config.bestDays.map(d => dayNames.indexOf(d)).filter(i => i >= 0);
    const usedDays = bestDayIndices.length > 0 ? bestDayIndices : [1, 2, 3, 4];

    let entryCount = 0;
    const maxEntries = daysToGenerate;
    let currentDate = new Date(startDate);

    while (entryCount < maxEntries) {
      const dayOfWeek = currentDate.getDay();
      if (!usedDays.includes(dayOfWeek)) {
        currentDate.setDate(currentDate.getDate() + 1);
        continue;
      }

      const globalWeek = Math.ceil((currentDate.getTime() - startDate.getTime()) / (7 * 86400000));
      const weekTheme = strategy.weeklyThemes.find(t => t.globalWeekNumber === globalWeek) ||
        strategy.weeklyThemes[globalWeek % strategy.weeklyThemes.length];

      const monthPlan = strategy.monthlyPlans.find(m =>
        globalWeek >= (m.monthNumber - 1) * 4 + 1 && globalWeek <= m.monthNumber * 4
      ) || strategy.monthlyPlans[0];

      const contentType = contentTypeFromMix(monthPlan?.contentMix || []) as 'educational' | 'engagement' | 'personal' | 'promotional' | 'story';

      const pillarName = weekTheme?.pillarFocus?.[entryCount % (weekTheme.pillarFocus.length || 1)] || 'General';
      const idea = weekTheme?.contentIdeas?.[entryCount % (weekTheme.contentIdeas.length || 1)] || `Content for ${currentDate.toLocaleDateString()}`;

      entries.push({
        userId,
        date: new Date(currentDate),
        topic: idea,
        hook: `Coming soon: ${idea}`,
        pillarName,
        pillarTopic: weekTheme?.focus || 'General',
        contentType,
        format: formatOptions[entryCount % formatOptions.length] as any,
        source: 'generated',
        status: 'draft',
        timezone: 'UTC',
        labels: [monthPlan?.phase || 'general', pillarName],
      });

      entryCount++;
      if (entryCount >= maxEntries) break;
      currentDate.setDate(currentDate.getDate() + 1);
    }

    logger.info({ totalEntries: entries.length }, 'Calendar entries generated');
    return entries;
  }

  regenerateForOpportunity(
    existingEntries: ICalendarEntry[],
    opportunityEntry: PopulatedEntry,
    insertPosition: Date
  ): { updated: PopulatedEntry[]; shifted: string[] } {
    const shifted: string[] = [];
    const updated = existingEntries.map(entry => {
      if (entry.date >= insertPosition && entry.status === 'draft') {
        const newDate = new Date(entry.date);
        newDate.setDate(newDate.getDate() + 1);
        shifted.push(entry.topic);
        return { ...entry, date: newDate } as any;
      }
      return entry as any;
    });

    updated.push(opportunityEntry);
    updated.sort((a, b) => a.date.getTime() - b.date.getTime());

    return { updated, shifted };
  }
}

export const autoPopulationEngine = new AutoPopulationEngine();
