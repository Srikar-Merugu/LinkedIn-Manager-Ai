import mongoose from 'mongoose';
import pino from 'pino';
import { QueueItem } from '../../models/content-operations/QueueItem';
import { Post } from '../../models/content-generation/Post';
import { linkedinPublisher } from '../linkedin/LinkedInPublisher';
import { User } from '../../models/identity/User';

const logger = pino();

export class AutoPublisher {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;
  private readonly CHECK_INTERVAL = 60 * 1000; // 1 minute

  start(): void {
    if (this.intervalId) {
      logger.info('AutoPublisher already running');
      return;
    }

    logger.info('Starting AutoPublisher scheduler (every 60s)');
    this.intervalId = setInterval(() => this.checkAndPublish(), this.CHECK_INTERVAL);
    // Run immediately on start
    this.checkAndPublish();
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      logger.info('AutoPublisher scheduler stopped');
    }
  }

  async checkAndPublish(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;

    try {
      const now = new Date();

      // Find all queue items that are scheduled and due
      const dueItems = await QueueItem.find({
        stage: 'scheduled',
        scheduledAt: { $lte: now },
      }).limit(10).lean();

      if (dueItems.length === 0) {
        this.isRunning = false;
        return;
      }

      logger.info({ count: dueItems.length }, 'AutoPublisher: found due items');

      for (const item of dueItems) {
        await this.publishItem(item);
      }
    } catch (error: any) {
      logger.error({ error: error.message }, 'AutoPublisher: check failed');
    } finally {
      this.isRunning = false;
    }
  }

  private async publishItem(item: any): Promise<void> {
    const userId = item.userId.toString();

    try {
      // Get the post content
      let content = '';

      if (item.postId) {
        const post = await Post.findById(item.postId).lean();
        if (post) {
          content = post.fullContent || `${post.hook}\n\n${post.body}\n\n${post.cta}`;
        }
      }

      // Fallback to title if no content
      if (!content && item.title) {
        content = item.title;
      }

      if (!content) {
        await this.markFailed(item._id, 'No content found for this queue item');
        return;
      }

      logger.info({ userId, itemId: item._id, title: item.title }, 'AutoPublisher: publishing');

      // Publish to LinkedIn
      const result = await linkedinPublisher.publishPost(userId, content);

      if (result.success) {
        // Update queue item
        await QueueItem.findByIdAndUpdate(item._id, {
          stage: 'published',
          linkedinPostId: result.linkedinPostId,
          publishedAt: new Date(),
          $push: {
            stageHistory: {
              stage: 'published',
              enteredAt: new Date(),
              triggeredBy: 'auto_publisher',
            },
          },
        });

        // Update user usage
        await User.findByIdAndUpdate(userId, {
          $inc: { 'usage.totalContentPublished': 1 },
        });

        // Update post status if linked
        if (item.postId) {
          await Post.findByIdAndUpdate(item.postId, {
            status: 'published',
          });
        }

        logger.info({ userId, itemId: item._id, linkedinPostId: result.linkedinPostId }, 'AutoPublisher: published successfully');
      } else {
        await this.markFailed(item._id, result.error || 'Unknown publish error');
      }
    } catch (error: any) {
      logger.error({ error: error.message, itemId: item._id }, 'AutoPublisher: publish failed');
      await this.markFailed(item._id, error.message);
    }
  }

  private async markFailed(itemId: mongoose.Types.ObjectId, error: string): Promise<void> {
    await QueueItem.findByIdAndUpdate(itemId, {
      stage: 'failed',
      lastError: error,
      $push: {
        stageHistory: {
          stage: 'failed',
          enteredAt: new Date(),
          triggeredBy: 'auto_publisher',
        },
      },
    });
  }

  async retryFailed(itemId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const item = await QueueItem.findById(itemId);
      if (!item) return { success: false, error: 'Queue item not found' };
      if (item.stage !== 'failed') return { success: false, error: 'Item is not in failed state' };

      // Reset to scheduled
      item.stage = 'scheduled';
      item.scheduledAt = new Date();
      item.lastError = undefined;
      item.stageHistory.push({
        stage: 'scheduled',
        enteredAt: new Date(),
        triggeredBy: 'retry',
      });
      await item.save();

      // Trigger immediate publish
      await this.publishItem(item.toObject());

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}

export const autoPublisher = new AutoPublisher();
