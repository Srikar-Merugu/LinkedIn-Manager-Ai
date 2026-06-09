import mongoose from 'mongoose';
import pino from 'pino';
import { Post } from '../../../models/content-generation/Post';

const logger = pino();

export type AnalyticsEvent = 'post_published' | 'analytics_updated' | 'opportunity_completed' | 'calendar_updated' | 'strategy_changed';

export interface EventPayload {
  type: AnalyticsEvent;
  userId: string;
  data: Record<string, any>;
  timestamp: Date;
}

export interface EventResult {
  handled: boolean;
  triggered: string[];
  message: string;
}

export class EventSystem {
  private handlers: Map<AnalyticsEvent, Array<(payload: EventPayload) => Promise<void>>> = new Map();

  constructor() {
    this.registerDefaultHandlers();
  }

  async trigger(type: AnalyticsEvent, userId: string, data: Record<string, any> = {}): Promise<EventResult> {
    logger.info({ type, userId }, 'Analytics event triggered');

    const payload: EventPayload = { type, userId, data, timestamp: new Date() };
    const handlers = this.handlers.get(type) || [];
    const triggered: string[] = [];

    for (const handler of handlers) {
      try {
        await handler(payload);
        triggered.push(handler.name || 'anonymous');
      } catch (error: any) {
        logger.error({ error, type }, 'Event handler failed');
      }
    }

    return {
      handled: triggered.length > 0,
      triggered,
      message: triggered.length > 0
        ? `${triggered.length} handler(s) executed for ${type}`
        : `No handlers registered for ${type}`,
    };
  }

  on(type: AnalyticsEvent, handler: (payload: EventPayload) => Promise<void>): void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, []);
    }
    this.handlers.get(type)!.push(handler);
  }

  private registerDefaultHandlers(): void {
    this.on('post_published', async (payload) => {
      logger.info({ userId: payload.userId }, 'Post published event - queuing performance analysis');
    });

    this.on('analytics_updated', async (payload) => {
      logger.info({ userId: payload.userId }, 'Analytics updated - triggering content performance analysis');
    });

    this.on('opportunity_completed', async (payload) => {
      logger.info({ userId: payload.userId }, 'Opportunity completed - updating opportunity performance tracking');
    });

    this.on('calendar_updated', async (payload) => {
      logger.info({ userId: payload.userId }, 'Calendar updated - reviewing content mix');
    });

    this.on('strategy_changed', async (payload) => {
      logger.info({ userId: payload.userId }, 'Strategy changed - triggering full analytics cycle');
    });
  }

  async triggerPostPublished(postId: string, userId: string): Promise<EventResult> {
    const post = await Post.findById(postId).lean();
    return this.trigger('post_published', userId, {
      postId,
      contentType: post?.contentType,
      title: post?.title,
      status: post?.status,
    });
  }

  async triggerAnalyticsUpdated(userId: string, source: string): Promise<EventResult> {
    return this.trigger('analytics_updated', userId, { source, updatedAt: new Date() });
  }

  async triggerOpportunityCompleted(opportunityId: string, userId: string, outcome: string): Promise<EventResult> {
    return this.trigger('opportunity_completed', userId, { opportunityId, outcome });
  }

  async triggerCalendarUpdated(userId: string, changes: any): Promise<EventResult> {
    return this.trigger('calendar_updated', userId, { changes });
  }

  async triggerStrategyChanged(userId: string, reason: string): Promise<EventResult> {
    return this.trigger('strategy_changed', userId, { reason, changedAt: new Date() });
  }
}

export const eventSystem = new EventSystem();
