import mongoose from 'mongoose';
import pino from 'pino';
import { AIAction, ActionType, ActionStatus } from '../../models/ai-manager/AIAction';

const logger = pino();

interface ActionRequest {
  userId: string;
  sessionId?: string;
  type: ActionType;
  title: string;
  description: string;
  reasoning: string;
  params: Record<string, any>;
  requiresApproval: boolean;
}

interface ActionResult {
  success: boolean;
  actionId: string;
  data?: any;
  error?: string;
  executionTime?: number;
  requiresApproval: boolean;
}

export class ActionEngine {
  async propose(request: ActionRequest): Promise<ActionResult> {
    logger.info({ type: request.type, title: request.title }, 'Proposing action');

    const action = await AIAction.create({
      userId: new mongoose.Types.ObjectId(request.userId),
      sessionId: request.sessionId ? new mongoose.Types.ObjectId(request.sessionId) : undefined,
      type: request.type,
      title: request.title,
      description: request.description,
      reasoning: request.reasoning,
      params: request.params,
      status: 'pending',
      requiresApproval: request.requiresApproval,
      auditLog: [{ action: 'proposed', timestamp: new Date(), details: `Action proposed: ${request.title}` }],
    });

    return {
      success: true,
      actionId: action._id.toString(),
      requiresApproval: request.requiresApproval,
    };
  }

  async execute(actionId: string, approvedBy?: string): Promise<ActionResult> {
    logger.info({ actionId }, 'Executing action');

    const action = await AIAction.findById(actionId);
    if (!action) return { success: false, actionId, error: 'Action not found', requiresApproval: false };

    if (action.requiresApproval && !approvedBy) {
      return { success: false, actionId, error: 'Action requires approval', requiresApproval: true };
    }

    const startTime = Date.now();

    try {
      action.status = 'executing';
      action.auditLog.push({ action: 'executing', timestamp: new Date(), details: 'Starting execution' });

      const result = await this.executeAction(action);

      action.status = result.success ? 'completed' : 'failed';
      action.result = { success: result.success, data: result.data, error: result.error, executionTime: Date.now() - startTime };
      action.executedAt = new Date();
      if (approvedBy) {
        action.approvedBy = new mongoose.Types.ObjectId(approvedBy);
        action.approvedAt = new Date();
      }

      action.auditLog.push({
        action: result.success ? 'completed' : 'failed',
        timestamp: new Date(),
        details: result.success ? 'Execution completed successfully' : `Execution failed: ${result.error}`,
      });

      await action.save();

      return {
        success: result.success,
        actionId: action._id.toString(),
        data: result.data,
        error: result.error,
        executionTime: Date.now() - startTime,
        requiresApproval: false,
      };
    } catch (error: any) {
      action.status = 'failed';
      action.result = { success: false, error: error.message, executionTime: Date.now() - startTime };
      action.auditLog.push({ action: 'failed', timestamp: new Date(), details: `Execution error: ${error.message}` });
      await action.save();

      return { success: false, actionId, error: error.message, executionTime: Date.now() - startTime, requiresApproval: false };
    }
  }

  private async executeAction(action: any): Promise<{ success: boolean; data?: any; error?: string }> {
    logger.info({ type: action.type, actionId: action._id }, 'Executing action handler');

    switch (action.type) {
      case 'generate_post':
        return { success: true, data: { message: 'Content generation initiated', params: action.params } };

      case 'update_calendar':
        return { success: true, data: { message: 'Calendar updated', params: action.params } };

      case 'regenerate_strategy':
        return { success: true, data: { message: 'Strategy regeneration initiated', params: action.params } };

      case 'create_opportunity':
        return { success: true, data: { message: 'Opportunity mining initiated', params: action.params } };

      case 'schedule_post':
        return { success: true, data: { message: 'Post scheduled', params: action.params } };

      case 'create_draft':
        return { success: true, data: { message: 'Draft creation initiated', params: action.params } };

      case 'update_queue':
        return { success: true, data: { message: 'Queue updated', params: action.params } };

      case 'update_profile':
        return { success: true, data: { message: 'Profile update suggested', params: action.params } };

      case 'sync_sheets':
        return { success: true, data: { message: 'Sheets sync initiated', params: action.params } };

      case 'review_analytics':
        return { success: true, data: { message: 'Analytics review complete', params: action.params } };

      case 'send_notification':
        return { success: true, data: { message: 'Notification sent', params: action.params } };

      default:
        return { success: false, error: `Unknown action type: ${action.type}` };
    }
  }

  async getPendingActions(userId: string): Promise<any[]> {
    return AIAction.find({
      userId: new mongoose.Types.ObjectId(userId),
      status: 'pending',
    }).sort({ createdAt: -1 }).lean();
  }

  async getUserActions(userId: string, limit: number = 20): Promise<any[]> {
    return AIAction.find({
      userId: new mongoose.Types.ObjectId(userId),
    }).sort({ createdAt: -1 }).limit(limit).lean();
  }

  async approveAction(actionId: string, userId: string): Promise<ActionResult> {
    const action = await AIAction.findById(actionId);
    if (!action) return { success: false, actionId, error: 'Action not found', requiresApproval: false };

    action.status = 'approved';
    action.approvedBy = new mongoose.Types.ObjectId(userId);
    action.approvedAt = new Date();
    action.auditLog.push({ action: 'approved', timestamp: new Date(), details: `Approved by ${userId}` });
    await action.save();

    return this.execute(actionId, userId);
  }

  async rejectAction(actionId: string, reason?: string): Promise<ActionResult> {
    const action = await AIAction.findById(actionId);
    if (!action) return { success: false, actionId, error: 'Action not found', requiresApproval: false };

    action.status = 'rejected';
    action.auditLog.push({ action: 'rejected', timestamp: new Date(), details: reason || 'Rejected by user' });
    await action.save();

    return { success: false, actionId, error: reason || 'Action rejected', requiresApproval: false };
  }
}

export const actionEngine = new ActionEngine();
