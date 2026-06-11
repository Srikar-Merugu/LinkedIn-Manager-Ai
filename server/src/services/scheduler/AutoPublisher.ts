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

      // 1. Find due items from QueueItem collection
      const dueQueueItems = await QueueItem.find({
        stage: 'scheduled',
        scheduledAt: { $lte: now },
      }).limit(20).lean();

      // 2. Find due posts directly from posts collection (scheduled + past due)
      const duePosts = await Post.find({
        status: 'scheduled',
        scheduleDate: { $lte: now, $exists: true, $ne: null },
      }).limit(20).lean();

      const totalDue = dueQueueItems.length + duePosts.length;

      if (totalDue === 0) {
        this.isRunning = false;
        return;
      }

      logger.info({ queueItems: dueQueueItems.length, posts: duePosts.length, total: totalDue }, 'AutoPublisher: found due items');

      // Process QueueItem entries
      for (const item of dueQueueItems) {
        await this.publishQueueItem(item);
      }

      // Process Post entries (that don't already have a QueueItem)
      const queuePostIds = new Set(dueQueueItems.map((q: any) => q.postId?.toString()));
      for (const post of duePosts) {
        if (!queuePostIds.has(post._id.toString())) {
          await this.publishPostDirectly(post);
        }
      }
    } catch (error: any) {
      logger.error({ error: error.message, stack: error.stack }, 'AutoPublisher: check failed');
    } finally {
      this.isRunning = false;
    }
  }

  private async publishQueueItem(item: any): Promise<void> {
    const userId = item.userId.toString();

    try {
      let content = '';

      if (item.postId) {
        const post = await Post.findById(item.postId).lean();
        if (post) {
          content = post.fullContent || `${post.hook}\n\n${post.body}\n\n${post.cta}`;
        }
      }

      if (!content && item.title) content = item.title;

      if (!content) {
        await this.markQueueItemFailed(item._id, 'No content found');
        return;
      }

      // Mark as publishing
      await QueueItem.findByIdAndUpdate(item._id, { stage: 'scheduled' });

      logger.info({ userId, itemId: item._id, title: item.title }, 'AutoPublisher: publishing queue item');

      const result = await linkedinPublisher.publishPost(userId, content);

      if (result.success) {
        await QueueItem.findByIdAndUpdate(item._id, {
          stage: 'published',
          linkedinPostId: result.linkedinPostId,
          publishedAt: new Date(),
          $push: { stageHistory: { stage: 'published', enteredAt: new Date(), triggeredBy: 'auto_publisher' } },
        });

        if (item.postId) {
          await Post.findByIdAndUpdate(item.postId, {
            status: 'published',
            publishedAt: new Date(),
            linkedInPostId: result.linkedinPostId,
          });
        }

        await User.findByIdAndUpdate(userId, { $inc: { 'usage.totalContentPublished': 1 } });

        logger.info({ userId, itemId: item._id, linkedinPostId: result.linkedinPostId }, 'AutoPublisher: published successfully');
      } else {
        await this.markQueueItemFailed(item._id, result.error || 'Unknown error');
      }
    } catch (error: any) {
      logger.error({ error: error.message, itemId: item._id }, 'AutoPublisher: queue item publish failed');
      await this.markQueueItemFailed(item._id, error.message);
    }
  }

  private async publishPostDirectly(post: any): Promise<void> {
    const userId = post.userId.toString();

    try {
      const content = post.fullContent || `${post.hook || ''}\n\n${post.body || ''}\n\n${post.cta || ''}`;

      if (!content.trim()) {
        await Post.findByIdAndUpdate(post._id, {
          status: 'failed',
        });
        return;
      }

      // Mark as publishing
      await Post.findByIdAndUpdate(post._id, { status: 'scheduled' });

      logger.info({ userId, postId: post._id, title: post.title }, 'AutoPublisher: publishing post directly');

      const result = await linkedinPublisher.publishPost(userId, content);

      if (result.success) {
        await Post.findByIdAndUpdate(post._id, {
          status: 'published',
          publishedAt: new Date(),
          linkedInPostId: result.linkedinPostId,
        });

        // Create or update QueueItem for tracking
        await QueueItem.findOneAndUpdate(
          { userId: new mongoose.Types.ObjectId(userId), postId: post._id },
          {
            stage: 'published',
            linkedinPostId: result.linkedinPostId,
            publishedAt: new Date(),
            title: post.title,
            $push: { stageHistory: { stage: 'published', enteredAt: new Date(), triggeredBy: 'auto_publisher' } },
          },
          { upsert: true, new: true }
        );

        await User.findByIdAndUpdate(userId, { $inc: { 'usage.totalContentPublished': 1 } });

        logger.info({ userId, postId: post._id, linkedinPostId: result.linkedinPostId }, 'AutoPublisher: post published successfully');
      } else {
        await Post.findByIdAndUpdate(post._id, { status: 'failed' });

        await QueueItem.findOneAndUpdate(
          { userId: new mongoose.Types.ObjectId(userId), postId: post._id },
          {
            stage: 'failed',
            lastError: result.error,
            title: post.title,
            $push: { stageHistory: { stage: 'failed', enteredAt: new Date(), triggeredBy: 'auto_publisher' } },
          },
          { upsert: true, new: true }
        );

        logger.error({ userId, postId: post._id, error: result.error }, 'AutoPublisher: post publish failed');
      }
    } catch (error: any) {
      logger.error({ error: error.message, postId: post._id }, 'AutoPublisher: post direct publish failed');

      await Post.findByIdAndUpdate(post._id, { status: 'failed' });

      await QueueItem.findOneAndUpdate(
        { userId: new mongoose.Types.ObjectId(userId), postId: post._id },
        {
          stage: 'failed',
          lastError: error.message,
          title: post.title,
          $push: { stageHistory: { stage: 'failed', enteredAt: new Date(), triggeredBy: 'auto_publisher' } },
        },
        { upsert: true, new: true }
      );
    }
  }

  private async markQueueItemFailed(itemId: mongoose.Types.ObjectId, error: string): Promise<void> {
    await QueueItem.findByIdAndUpdate(itemId, {
      stage: 'failed',
      lastError: error,
      $push: { stageHistory: { stage: 'failed', enteredAt: new Date(), triggeredBy: 'auto_publisher' } },
    });
  }

  async retryFailed(itemId: string): Promise<{ success: boolean; error?: string }> {
    try {
      let item = await QueueItem.findById(itemId);
      if (!item) {
        // Try finding by postId
        item = await QueueItem.findOne({ postId: itemId });
      }
      if (!item) return { success: false, error: 'Queue item not found' };
      if (item.stage !== 'failed') return { success: false, error: 'Item is not in failed state' };

      item.stage = 'scheduled';
      item.scheduledAt = new Date();
      item.lastError = undefined;
      item.stageHistory.push({ stage: 'scheduled', enteredAt: new Date(), triggeredBy: 'retry' });
      await item.save();

      if (item.postId) {
        await Post.findByIdAndUpdate(item.postId, { status: 'scheduled', scheduleDate: new Date() });
      }

      await this.publishQueueItem(item.toObject());

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async triggerManualCheck(): Promise<{ queueItems: number; posts: number; published: number }> {
    const now = new Date();

    const dueQueueItems = await QueueItem.find({
      stage: 'scheduled',
      scheduledAt: { $lte: now },
    }).limit(20).lean();

    const duePosts = await Post.find({
      status: 'scheduled',
      scheduleDate: { $lte: now, $exists: true, $ne: null },
    }).limit(20).lean();

    let published = 0;

    for (const item of dueQueueItems) {
      await this.publishQueueItem(item);
      published++;
    }

    const queuePostIds = new Set(dueQueueItems.map((q: any) => q.postId?.toString()));
    for (const post of duePosts) {
      if (!queuePostIds.has(post._id.toString())) {
        await this.publishPostDirectly(post);
        published++;
      }
    }

    return { queueItems: dueQueueItems.length, posts: duePosts.length, published };
  }
}

export const autoPublisher = new AutoPublisher();
