import mongoose from 'mongoose';
import pino from 'pino';
import { ContentCalendar, ICalendarEntry } from '../../models/strategy/ContentCalendar';
import { QueueItem } from '../../models/content-operations/QueueItem';
import { PublishingMode } from '../../models/content-operations/PublishingMode';
import { CalendarSnapshot } from '../../models/content-operations/CalendarSnapshot';

import { calendarIntelligenceEngine } from './engines/CalendarIntelligenceEngine';
import { autoPopulationEngine, PopulatedEntry } from './engines/AutoPopulationEngine';
import { googleSheetsEngine } from './engines/GoogleSheetsEngine';
import { contentPrioritizationEngine } from './engines/ContentPrioritizationEngine';
import { workflowEngine } from './engines/WorkflowEngine';
import { aiDraftEngine } from './engines/AIDraftEngine';
import { opportunityIntegrationEngine } from './engines/OpportunityIntegrationEngine';
import { automationModeEngine } from './engines/AutomationModeEngine';
import { analyticsFeedbackEngine } from './engines/AnalyticsFeedbackEngine';

const logger = pino();

export interface OperationsReport {
  calendar: {
    totalEntries: number;
    dateRange: { start: Date; end: Date };
    byStatus: Record<string, number>;
    byPillar: Record<string, number>;
  };
  queue: {
    totalItems: number;
    byStage: Record<string, number>;
  };
  sheets: {
    synced: boolean;
    rowCount: number;
    sheetUrl?: string;
  };
  snapshot: {
    version: number;
    id: string;
  };
  generatedAt: string;
}

export class ContentOperatingSystemOrchestrator {

  async generateFullCalendar(userId: string, strategyData: any): Promise<OperationsReport> {
    const userObjectId = new mongoose.Types.ObjectId(userId);
    logger.info({ userId }, 'Generating full content operations calendar');

    const calIntelligence = calendarIntelligenceEngine.analyze(strategyData);

    const populated = autoPopulationEngine.generate(
      userObjectId,
      {
        monthlyPlans: strategyData.overallStrategy?.monthlyPlans || [],
        weeklyThemes: strategyData.weeklyThemes || [],
        growthGoals: strategyData.growthGoals || [],
      },
      calIntelligence,
      90
    );

    const existingEntries = await ContentCalendar.find({ userId: userObjectId, status: { $ne: 'archived' } }).lean();
    const existingDateMap = new Set(existingEntries.map(e => e.date.toISOString().split('T')[0]));

    const newEntries = populated.filter(e => !existingDateMap.has(e.date.toISOString().split('T')[0]));

    const savedEntries: ICalendarEntry[] = [];
    for (const entry of newEntries) {
      const saved = await ContentCalendar.create(entry);
      savedEntries.push(saved);
    }

    const calEntries = await ContentCalendar.find({ userId: userObjectId }).sort({ date: 1 }).lean();
    const priorityResults = contentPrioritizationEngine.score(
      calEntries.map(e => ({
        topic: e.topic,
        pillarName: e.pillarName,
        contentType: e.contentType,
        careerGoal: strategyData.careerGoal?.primaryGoal,
        authorityTopics: strategyData.authorityTopics,
        opportunityType: e.source === 'opportunity' ? 'recruiter' : undefined,
        dueDate: e.date,
      }))
    );

    const queueItems: any[] = [];
    for (const pr of priorityResults) {
      const matchingEntry = calEntries.find(e => e.topic === pr.item.topic);
      if (!matchingEntry) continue;

      const existingQueue = await QueueItem.findOne({ calendarEntryId: matchingEntry._id });
      if (existingQueue) continue;

      const qi = await QueueItem.create({
        userId: userObjectId,
        calendarEntryId: matchingEntry._id,
        stage: 'planned',
        stageHistory: [{ stage: 'planned', enteredAt: new Date(), triggeredBy: 'system' }],
        priority: pr.overall,
        priorityReasoning: pr.reasoning,
        careerImpact: pr.dimensions.careerImpact,
        authorityImpact: pr.dimensions.authorityImpact,
        engagementPotential: pr.dimensions.engagementPotential,
        opportunityPotential: pr.dimensions.opportunityPotential,
        urgency: pr.dimensions.urgency,
        automationMode: 'manual',
        dueDate: matchingEntry.date,
      });
      queueItems.push(qi);
    }

    let sheetsConfig = { sheetId: '', sheetName: '', range: '' };
    try {
      sheetsConfig = await googleSheetsEngine.createSheet(userId);
      const rows = googleSheetsEngine.generateRows(
        calEntries.map(e => ({
          date: e.date,
          pillarName: e.pillarName,
          topic: e.topic,
          hook: e.hook,
          contentType: e.contentType,
          status: e.status,
          source: e.source,
        }))
      );
      await googleSheetsEngine.syncRows(sheetsConfig, rows);
    } catch (err: any) {
      logger.warn({ error: err.message }, 'Google Sheets sync failed, continuing without it');
    }

    const snapshot = await CalendarSnapshot.create({
      userId: userObjectId,
      version: 1,
      snapshotDate: new Date(),
      dateRange: {
        start: calEntries[0]?.date || new Date(),
        end: calEntries[calEntries.length - 1]?.date || new Date(),
      },
      entries: calEntries.map(e => ({
        calendarEntryId: e._id as mongoose.Types.ObjectId,
        date: e.date,
        topic: e.topic,
        status: e.status,
        pillarName: e.pillarName,
        contentType: e.contentType,
        priority: priorityResults.find(p => p.item.topic === e.topic)?.overall || 0,
      })),
      summary: {
        totalEntries: calEntries.length,
        byStatus: this.countBy(calEntries, 'status'),
        byPillar: this.countBy(calEntries, 'pillarName'),
        publishedCount: calEntries.filter(e => e.status === 'published').length,
        draftCount: calEntries.filter(e => e.status === 'draft').length,
        scheduledCount: calEntries.filter(e => e.status === 'scheduled').length,
        coverageDays: Math.ceil((calEntries[calEntries.length - 1]?.date.getTime() - calEntries[0]?.date.getTime()) / 86400000) || 0,
      },
      trigger: 'generation',
    });

    logger.info({ userId, entries: calEntries.length, queueItems: queueItems.length }, 'Content operations calendar complete');

    return {
      calendar: {
        totalEntries: calEntries.length,
        dateRange: { start: calEntries[0]?.date || new Date(), end: calEntries[calEntries.length - 1]?.date || new Date() },
        byStatus: this.countBy(calEntries, 'status'),
        byPillar: this.countBy(calEntries, 'pillarName'),
      },
      queue: {
        totalItems: queueItems.length,
        byStage: this.countBy(queueItems, 'stage'),
      },
      sheets: {
        synced: !!sheetsConfig.sheetId,
        rowCount: calEntries.length,
        sheetUrl: sheetsConfig.sheetId ? `https://docs.google.com/spreadsheets/d/${sheetsConfig.sheetId}` : undefined,
      },
      snapshot: {
        version: snapshot.version,
        id: snapshot._id.toString(),
      },
      generatedAt: new Date().toISOString(),
    };
  }

  async advanceQueueItem(queueItemId: string, triggeredBy: string = 'user'): Promise<any> {
    const result = await workflowEngine.advance(new mongoose.Types.ObjectId(queueItemId), triggeredBy);
    const item = await QueueItem.findById(queueItemId).populate('calendarEntryId');
    return { ...result, item };
  }

  async generateDraftForEntry(calendarEntryId: string, profileData: any): Promise<any> {
    const entry = await ContentCalendar.findById(calendarEntryId);
    if (!entry) throw new Error('Calendar entry not found');

    const draft = aiDraftEngine.generate({
      topic: entry.topic,
      pillarName: entry.pillarName,
      contentType: entry.contentType,
      hook: entry.hook,
      brandVoice: profileData.brandDNA?.voiceSignature,
      targetRole: profileData.careerGoal?.targetRole,
      careerGoal: profileData.careerGoal?.primaryGoal,
    });

    entry.hook = draft.hook;
    entry.draft = draft.post;
    await entry.save();

    return { entry, draft };
  }

  async processOpportunity(userId: string, changedSignals: any): Promise<any> {
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const signals = opportunityIntegrationEngine.generateOpportunitySignals(changedSignals);
    const results: any[] = [];

    for (const signal of signals) {
      const result = await opportunityIntegrationEngine.processSignal(userObjectId, signal);
      results.push(result);
    }

    return { signalsProcessed: results.length, results };
  }

  async syncToSheets(userId: string): Promise<any> {
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const entries = await ContentCalendar.find({ userId: userObjectId }).sort({ date: 1 }).lean();

    const config = await googleSheetsEngine.createSheet(userId);
    const rows = googleSheetsEngine.generateRows(
      entries.map(e => ({
        date: e.date,
        pillarName: e.pillarName,
        topic: e.topic,
        hook: e.hook,
        contentType: e.contentType,
        status: e.status,
        source: e.source,
      }))
    );
    const result = await googleSheetsEngine.syncRows(config, rows);

    return { config, result, totalRows: rows.length };
  }

  async getAnalyticsFeedback(userId: string): Promise<any> {
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const entries = await ContentCalendar.find({
      userId: userObjectId,
      status: 'published',
      'performance.impressions': { $exists: true },
    }).lean();

    return analyticsFeedbackEngine.analyze(
      entries.map(e => ({
        calendarEntryId: e._id.toString(),
        date: e.date,
        topic: e.topic,
        pillarName: e.pillarName,
        contentType: e.contentType,
        impressions: e.performance?.impressions,
        likes: e.performance?.likes,
        comments: e.performance?.comments,
        shares: e.performance?.shares,
        saves: e.performance?.saves,
        engagementRate: e.performance?.engagementRate,
      }))
    );
  }

  private countBy(items: any[], field: string): Record<string, number> {
    return items.reduce((acc: Record<string, number>, item: any) => {
      const key = item[field] || 'unknown';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
  }
}

export const contentOperatingSystemOrchestrator = new ContentOperatingSystemOrchestrator();
