import mongoose from 'mongoose';
import pino from 'pino';
import { QueueItem } from '../../../models/content-operations/QueueItem';

const logger = pino();

type Stage = 'idea' | 'planned' | 'draft_generated' | 'ready' | 'approved' | 'scheduled' | 'published' | 'analyzed' | 'archived';

const VALID_TRANSITIONS: Record<Stage, Stage[]> = {
  idea: ['planned'],
  planned: ['draft_generated', 'idea'],
  draft_generated: ['ready', 'planned'],
  ready: ['approved', 'draft_generated'],
  approved: ['scheduled', 'ready'],
  scheduled: ['published', 'approved'],
  published: ['analyzed', 'archived'],
  analyzed: ['archived', 'planned'],
  archived: ['idea'],
};

export class WorkflowEngine {
  async advance(queueItemId: mongoose.Types.ObjectId, triggeredBy: string = 'system'): Promise<{ item: any; nextStage: Stage; autoActions: string[] }> {
    const item = await QueueItem.findById(queueItemId);
    if (!item) throw new Error(`Queue item ${queueItemId} not found`);

    const currentStage = item.stage as Stage;
    const allowedNext = VALID_TRANSITIONS[currentStage];

    if (!allowedNext || allowedNext.length === 0) {
      throw new Error(`No valid transitions from stage: ${currentStage}`);
    }

    const autoActions: string[] = [];
    let nextStage: Stage;

    if (item.automationMode === 'autonomous') {
      nextStage = allowedNext[allowedNext.length - 1];
      autoActions.push(`Auto-advanced from ${currentStage} to ${nextStage} (autonomous mode)`);
    } else if (item.automationMode === 'approval') {
      if (currentStage === 'draft_generated') {
        nextStage = 'ready';
        autoActions.push('Draft ready for review');
      } else if (currentStage === 'approved') {
        nextStage = 'scheduled';
        autoActions.push('Approved, auto-scheduled');
      } else {
        nextStage = allowedNext[0];
      }
    } else {
      nextStage = allowedNext[0];
    }

    item.stageHistory.push({
      stage: nextStage,
      enteredAt: new Date(),
      triggeredBy,
    });

    item.stage = nextStage;

    const now = new Date();
    if (nextStage === 'draft_generated') item.draftGeneratedAt = now;
    if (nextStage === 'scheduled') item.scheduledAt = now;
    if (nextStage === 'published') item.publishedAt = now;
    if (nextStage === 'analyzed') item.analyzedAt = now;

    await item.save();
    logger.info({ queueItem: queueItemId, from: currentStage, to: nextStage }, 'Workflow stage advanced');

    return { item, nextStage, autoActions };
  }

  async canTransition(from: Stage, to: Stage): Promise<boolean> {
    const allowed = VALID_TRANSITIONS[from];
    return allowed?.includes(to) || false;
  }

  getAvailableActions(currentStage: Stage): Stage[] {
    return VALID_TRANSITIONS[currentStage] || [];
  }

  getWorkflowProgress(stage: Stage): number {
    const order: Stage[] = ['idea', 'planned', 'draft_generated', 'ready', 'approved', 'scheduled', 'published', 'analyzed'];
    const idx = order.indexOf(stage);
    return idx >= 0 ? Math.round((idx / (order.length - 1)) * 100) : 0;
  }
}

export const workflowEngine = new WorkflowEngine();
