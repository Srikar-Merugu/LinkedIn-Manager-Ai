import mongoose from 'mongoose';
import pino from 'pino';
import { ContentCalendar } from '../../../models/strategy/ContentCalendar';

const logger = pino();

interface CalendarInsertInput {
  userId: mongoose.Types.ObjectId;
  title: string;
  hook: string;
  pillarName: string;
  pillarTopic: string;
  contentType: string;
  priority: 'immediate' | 'this_week' | 'this_month';
}

interface CalendarIntegrationResult {
  inserted: boolean;
  entryId?: mongoose.Types.ObjectId;
  date: Date;
  message: string;
}

export class CalendarIntegrationEngine {
  async insert(userId: mongoose.Types.ObjectId, input: CalendarInsertInput): Promise<CalendarIntegrationResult> {
    logger.info({ title: input.title, priority: input.priority }, 'Inserting opportunity into calendar');

    const insertDate = this.calculateInsertDate(input.priority);
    const dayOfWeek = insertDate.getDay();

    if (dayOfWeek === 0) insertDate.setDate(insertDate.getDate() + 1);
    if (dayOfWeek === 6) insertDate.setDate(insertDate.getDate() + 2);

    const existing = await ContentCalendar.findOne({
      userId,
      date: {
        $gte: new Date(insertDate.getFullYear(), insertDate.getMonth(), insertDate.getDate()),
        $lt: new Date(insertDate.getFullYear(), insertDate.getMonth(), insertDate.getDate() + 1),
      },
    });

    if (existing) {
      insertDate.setDate(insertDate.getDate() + 1);
    }

    const entry = await ContentCalendar.create({
      userId,
      date: insertDate,
      topic: input.title,
      hook: input.hook,
      draft: '',
      pillarName: input.pillarName,
      pillarTopic: input.pillarTopic,
      contentType: input.contentType as any,
      format: 'post',
      source: 'opportunity',
      status: 'draft',
      isDraft: true,
      timezone: 'UTC',
      labels: ['opportunity', input.priority],
    });

    return {
      inserted: true,
      entryId: entry._id as mongoose.Types.ObjectId,
      date: insertDate,
      message: `Inserted "${input.title}" into calendar on ${insertDate.toLocaleDateString()}`,
    };
  }

  async insertMultiple(userId: mongoose.Types.ObjectId, inputs: CalendarInsertInput[]): Promise<CalendarIntegrationResult[]> {
    const results: CalendarIntegrationResult[] = [];
    for (const input of inputs) {
      const result = await this.insert(userId, input);
      results.push(result);
    }
    return results;
  }

  private calculateInsertDate(priority: string): Date {
    const d = new Date();
    switch (priority) {
      case 'immediate': d.setDate(d.getDate() + 1); break;
      case 'this_week': d.setDate(d.getDate() + 3); break;
      case 'this_month': d.setDate(d.getDate() + 10); break;
      default: d.setDate(d.getDate() + 7);
    }
    return d;
  }
}

export const calendarIntegrationEngine = new CalendarIntegrationEngine();
