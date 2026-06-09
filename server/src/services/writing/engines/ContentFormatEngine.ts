import pino from 'pino';
import type { IContentFormatPreference } from '../../../models/writing/WritingDNA';

const logger = pino();

export class ContentFormatEngine {

  analyze(texts: string[]): IContentFormatPreference[] {
    const formatSignals: Array<{
      format: IContentFormatPreference['format'];
      signals: Array<{ pattern: RegExp; weight: number }>;
      label: string;
    }> = [
      {
        format: 'story',
        label: 'Story Posts',
        signals: [
          { pattern: /when i|i remember|one day|last year|years ago|a few (months|weeks|days) ago/i, weight: 3 },
          { pattern: /^i (was|had|started|began|decided)/im, weight: 2 },
          { pattern: /here('s| is) (what happened|the story|my experience)/i, weight: 2 },
          { pattern: /story|journey|experience|lesson/i, weight: 1 },
        ],
      },
      {
        format: 'framework',
        label: 'Framework Posts',
        signals: [
          { pattern: /my (framework|system|process|method|approach) for/i, weight: 3 },
          { pattern: /step \d|step #\d|first|second|third|finally/i, weight: 2 },
          { pattern: /framework|system |methodology|playbook|blueprint/i, weight: 2 },
          { pattern: /how i (approach|think about|organize|structure)/i, weight: 1 },
        ],
      },
      {
        format: 'educational',
        label: 'Educational Posts',
        signals: [
          { pattern: /here('s| is) how|how to|tutorial|guide|walkthrough/i, weight: 3 },
          { pattern: /what is|define|explain|understand the concept/i, weight: 2 },
          { pattern: /learn|teach|understand|master|beginner|starter/i, weight: 1.5 },
          { pattern: /tips|techniques|strategies|best practices/i, weight: 1 },
        ],
      },
      {
        format: 'contrarian',
        label: 'Contrarian Posts',
        signals: [
          { pattern: /unpopular opinion|hot take|controversial|i might get hate/i, weight: 3 },
          { pattern: /everyone (says|talks|thinks|does) .* but/i, weight: 2.5 },
          { pattern: /actually|counter.intuitive|the truth about/i, weight: 2 },
          { pattern: /stop doing|stop believing|don't fall for/i, weight: 2 },
        ],
      },
      {
        format: 'journey',
        label: 'Journey Posts',
        signals: [
          { pattern: /my journey|my path|my story|how i went from/i, weight: 3 },
          { pattern: /from .* to .*/i, weight: 2 },
          { pattern: /x months of|years of|after (months|years) of/i, weight: 2 },
          { pattern: /progress|growth|evolved|transformed|turned into/i, weight: 1 },
        ],
      },
      {
        format: 'career',
        label: 'Career Posts',
        signals: [
          { pattern: /career|job|interview|promotion|resign|laid off|fired|hired/i, weight: 2.5 },
          { pattern: /salary|offer|negotiat|compensation|equity|stock/i, weight: 2 },
          { pattern: /internship|resume|application|hiring|recruiter/i, weight: 2 },
          { pattern: /career advice|career change|career growth/i, weight: 1.5 },
        ],
      },
      {
        format: 'opinion',
        label: 'Opinion Posts',
        signals: [
          { pattern: /i (think|believe|feel|strongly )/i, weight: 2.5 },
          { pattern: /in my opinion|imo|here's my take|my two cents/i, weight: 2.5 },
          { pattern: /change my mind|agree to disagree|debate|discuss/i, weight: 2 },
          { pattern: /heres why|the reason|the problem with/i, weight: 1.5 },
        ],
      },
      {
        format: 'tutorial',
        label: 'Tutorial Posts',
        signals: [
          { pattern: /step.by.step|walkthrough|how to build|how to create/i, weight: 3 },
          { pattern: /code|implementation|setup|install|configure|deploy/i, weight: 2 },
          { pattern: /prerequisite|requirements|you'll need|get started/i, weight: 2 },
          { pattern: /example|demo|sample|starter|template|boilerplate/i, weight: 1.5 },
        ],
      },
      {
        format: 'list',
        label: 'List Posts',
        signals: [
          { pattern: /^\d+\.\s/m, weight: 3 },
          { pattern: /^(top |best |worst |x |\d+ )/im, weight: 2 },
          { pattern: /things i|lessons|mistakes|habits|ways|reasons|signs/i, weight: 2 },
          { pattern: /list|numbered|checklist|rundown|roundup/i, weight: 1 },
        ],
      },
    ];

    const scores = formatSignals.map(fs => {
      let score = 0;
      for (const text of texts) {
        for (const signal of fs.signals) {
          const matches = (text.match(signal.pattern) || []).length;
          score += matches * signal.weight;
        }
      }
      return { format: fs.format, score, label: fs.label };
    });

    const total = scores.reduce((s, sc) => s + sc.score, 0) || 1;
    const sorted = scores.sort((a, b) => b.score - a.score);

    return sorted.map((s, i) => ({
      format: s.format,
      rank: i + 1,
      frequency: Math.round((s.score / total) * 100) / 100,
      avgEngagement: 0,
    }));
  }
}

export const contentFormatEngine = new ContentFormatEngine();
