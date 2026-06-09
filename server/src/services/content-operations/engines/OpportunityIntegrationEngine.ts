import mongoose from 'mongoose';
import pino from 'pino';
import { ContentCalendar } from '../../../models/strategy/ContentCalendar';

const logger = pino();

interface OpportunitySignal {
  type: string;
  title: string;
  description: string;
  relevantPillars: string[];
  suggestedTopic: string;
  suggestedHook: string;
  priority: 'high' | 'medium' | 'low';
}

interface IntegrationResult {
  inserted: number;
  entries: Array<{ date: Date; topic: string }>;
}

export class OpportunityIntegrationEngine {
  async processSignal(
    userId: mongoose.Types.ObjectId,
    signal: OpportunitySignal
  ): Promise<IntegrationResult> {
    logger.info({ userId, signalType: signal.type }, 'Processing opportunity signal');

    const insertDate = this.findInsertDate(signal.priority);
    const entry = await ContentCalendar.create({
      userId,
      date: insertDate,
      topic: signal.suggestedTopic,
      hook: signal.suggestedHook,
      pillarName: signal.relevantPillars[0] || 'General',
      pillarTopic: signal.suggestedTopic,
      contentType: 'educational',
      format: 'post',
      source: 'opportunity',
      status: 'draft',
      draft: '',
      timezone: 'UTC',
      labels: ['opportunity', signal.type],
    });

    return {
      inserted: 1,
      entries: [{ date: insertDate, topic: signal.suggestedTopic }],
    };
  }

  generateOpportunitySignals(changedSignals: {
    newCertification?: { name: string; issuer: string };
    newProject?: { title: string; description: string };
    githubCommit?: { repo: string; message: string };
    linkedInUpdate?: { type: string; content: string };
    analyticsChange?: { metric: string; change: number };
  }): OpportunitySignal[] {
    const signals: OpportunitySignal[] = [];

    if (changedSignals.newCertification) {
      signals.push({
        type: 'certification',
        title: `Achieved ${changedSignals.newCertification.name}`,
        description: `New certification from ${changedSignals.newCertification.issuer}`,
        relevantPillars: ['Career Growth', 'Professional Development'],
        suggestedTopic: `What I learned getting ${changedSignals.newCertification.name}`,
        suggestedHook: `Just earned my ${changedSignals.newCertification.name}. Here's the truth about what it took.`,
        priority: 'high',
      });
    }

    if (changedSignals.newProject) {
      signals.push({
        type: 'project',
        title: `New project: ${changedSignals.newProject.title}`,
        description: changedSignals.newProject.description,
        relevantPillars: ['Projects', 'Building'],
        suggestedTopic: `Building ${changedSignals.newProject.title}`,
        suggestedHook: `I just built ${changedSignals.newProject.title}. Here's what I learned.`,
        priority: 'high',
      });
    }

    if (changedSignals.githubCommit) {
      signals.push({
        type: 'github',
        title: `Updated ${changedSignals.githubCommit.repo}`,
        description: changedSignals.githubCommit.message,
        relevantPillars: ['Development', 'Open Source'],
        suggestedTopic: `Latest update to ${changedSignals.githubCommit.repo}`,
        suggestedHook: `Latest update: ${changedSignals.githubCommit.message}`,
        priority: 'medium',
      });
    }

    if (changedSignals.linkedInUpdate) {
      signals.push({
        type: 'linkedin',
        title: `LinkedIn profile updated: ${changedSignals.linkedInUpdate.type}`,
        description: changedSignals.linkedInUpdate.content,
        relevantPillars: ['Career Growth'],
        suggestedTopic: 'Professional update worth sharing',
        suggestedHook: 'Big update to share with my network.',
        priority: 'medium',
      });
    }

    return signals;
  }

  private findInsertDate(priority: string): Date {
    const d = new Date();
    if (priority === 'high') {
      d.setDate(d.getDate() + 2);
    } else if (priority === 'medium') {
      d.setDate(d.getDate() + 5);
    } else {
      d.setDate(d.getDate() + 10);
    }
    if (d.getDay() === 0) d.setDate(d.getDate() + 1);
    if (d.getDay() === 6) d.setDate(d.getDate() + 2);
    return d;
  }
}

export const opportunityIntegrationEngine = new OpportunityIntegrationEngine();
