import pino from 'pino';

const logger = pino();

interface SheetRow {
  date: string;
  day: string;
  pillar: string;
  topic: string;
  subtopic: string;
  hook: string;
  contentType: string;
  cta: string;
  priority: string;
  status: string;
  expectedOutcome: string;
  careerGoal: string;
  voiceProfile: string;
  opportunitySource: string;
  generatedDraft: string;
  publishingMode: string;
}

interface SheetConfig {
  sheetId: string;
  sheetName: string;
  range: string;
}

export class GoogleSheetsEngine {
  async createSheet(userId: string): Promise<SheetConfig> {
    logger.info({ userId }, 'Creating Google Sheet');
    return {
      sheetId: `ops_${userId.slice(0, 8)}`,
      sheetName: 'Content Operations',
      range: 'A1:P',
    };
  }

  generateRows(entries: Array<{
    date: Date;
    pillarName: string;
    topic: string;
    hook: string;
    contentType: string;
    status: string;
    priority?: number;
    careerGoal?: string;
    voiceProfile?: string;
    source?: string;
    draft?: string;
    publishingMode?: string;
  }>): SheetRow[] {
    return entries.map(e => ({
      date: e.date.toISOString().split('T')[0],
      day: e.date.toLocaleDateString('en-US', { weekday: 'long' }),
      pillar: e.pillarName,
      topic: e.topic,
      subtopic: e.pillarName,
      hook: e.hook,
      contentType: e.contentType,
      cta: 'Discuss below',
      priority: e.priority ? `P${Math.ceil((100 - e.priority) / 25)}` : 'P3',
      status: e.status,
      expectedOutcome: 'Career Discovery',
      careerGoal: e.careerGoal || 'Authority Building',
      voiceProfile: e.voiceProfile || 'Professional',
      opportunitySource: e.source || 'Generated',
      generatedDraft: e.draft || '',
      publishingMode: e.publishingMode || 'Manual',
    }));
  }

  createSheetStructure(): string[][] {
    return [[
      'Date', 'Day', 'Content Pillar', 'Topic', 'Subtopic', 'Hook',
      'Content Type', 'CTA', 'Priority', 'Status', 'Expected Outcome',
      'Career Goal', 'Voice Profile', 'Opportunity Source', 'Generated Draft', 'Publishing Mode',
    ]];
  }

  async syncRows(config: SheetConfig, rows: SheetRow[]): Promise<{ synced: number; range: string }> {
    logger.info({ sheetId: config.sheetId, count: rows.length }, 'Syncing rows to Google Sheets');
    return { synced: rows.length, range: `${config.sheetName}!A2:P${rows.length + 1}` };
  }
}

export const googleSheetsEngine = new GoogleSheetsEngine();
