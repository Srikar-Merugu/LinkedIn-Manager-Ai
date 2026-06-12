import mongoose from 'mongoose';
import pino from 'pino';
import { QueueItem } from '../../models/content-operations/QueueItem';
import { Post } from '../../models/content-generation/Post';
import { LinkedInChallenge } from '../../models/content-operations/LinkedInChallenge';
import { linkedinPublisher } from '../linkedin/LinkedInPublisher';
import { User } from '../../models/identity/User';

const logger = pino({ name: 'auto-publisher' });

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 5 * 60 * 1000; // 5 minutes

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

      // 1. Find due QueueItems (scheduled + past due)
      const dueQueueItems = await QueueItem.find({
        stage: 'scheduled',
        scheduledAt: { $lte: now, $exists: true, $ne: null },
      }).limit(20).lean();

      // 2. Find due Posts directly (scheduled + past due, no QueueItem)
      const duePosts = await Post.find({
        status: 'scheduled',
        scheduleDate: { $lte: now, $exists: true, $ne: null },
      }).limit(20).lean();

      // 3. Find failed items that should be retried
      const retryItems = await QueueItem.find({
        stage: 'failed',
        retryCount: { $lt: MAX_RETRIES },
        lastRetryAt: { $lte: new Date(now.getTime() - RETRY_DELAY_MS) },
      }).limit(10).lean();

      const totalDue = dueQueueItems.length + duePosts.length + retryItems.length;

      if (totalDue === 0) {
        this.isRunning = false;
        return;
      }

      logger.info({
        queueItems: dueQueueItems.length,
        posts: duePosts.length,
        retries: retryItems.length,
        total: totalDue,
      }, 'AutoPublisher: processing items');

      // Process due QueueItems
      for (const item of dueQueueItems) {
        await this.publishQueueItem(item);
      }

      // Process due Posts (without QueueItem)
      const queuePostIds = new Set(dueQueueItems.map((q: any) => q.postId?.toString()));
      for (const post of duePosts) {
        if (!queuePostIds.has(post._id.toString())) {
          await this.publishPostDirectly(post);
        }
      }

      // Retry failed items
      for (const item of retryItems) {
        await this.retryItem(item);
      }
    } catch (error: any) {
      logger.error({ error: error.message, stack: error.stack }, 'AutoPublisher: check failed');
    } finally {
      this.isRunning = false;
    }
  }

  /* ═══════════════════════════════════════════════════════
     PUBLISH QUEUE ITEM
     ═══════════════════════════════════════════════════════ */

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
        await this.markFailed(item._id, 'No content found');
        return;
      }

      // Mark as publishing
      await QueueItem.findByIdAndUpdate(item._id, { stage: 'scheduled' });

      logger.info({ userId, itemId: item._id, title: item.title }, 'Publishing queue item');

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

        // Update challenge progress
        await this.updateChallengeProgress(userId, item.postId, 'published');

        await User.findByIdAndUpdate(userId, { $inc: { 'usage.totalContentPublished': 1 } });

        logger.info({ userId, itemId: item._id, linkedinPostId: result.linkedinPostId }, 'Published successfully');
      } else {
        await this.markFailed(item._id, result.error || 'Unknown error');
        await this.updateChallengeProgress(userId, item.postId, 'failed');
      }
    } catch (error: any) {
      logger.error({ error: error.message, itemId: item._id }, 'Queue item publish failed');
      await this.markFailed(item._id, error.message);
      await this.updateChallengeProgress(userId, item.postId, 'failed');
    }
  }

  /* ═══════════════════════════════════════════════════════
     PUBLISH POST DIRECTLY
     ═══════════════════════════════════════════════════════ */

  private async publishPostDirectly(post: any): Promise<void> {
    const userId = post.userId.toString();

    try {
      const content = post.fullContent || `${post.hook || ''}\n\n${post.body || ''}\n\n${post.cta || ''}`;

      if (!content.trim()) {
        await Post.findByIdAndUpdate(post._id, { status: 'failed' });
        return;
      }

      logger.info({ userId, postId: post._id, title: post.title }, 'Publishing post directly');

      const result = await linkedinPublisher.publishPost(userId, content);

      if (result.success) {
        await Post.findByIdAndUpdate(post._id, {
          status: 'published',
          publishedAt: new Date(),
          linkedInPostId: result.linkedinPostId,
        });

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

        await this.updateChallengeProgress(userId, post._id, 'published');
        await User.findByIdAndUpdate(userId, { $inc: { 'usage.totalContentPublished': 1 } });

        logger.info({ userId, postId: post._id, linkedinPostId: result.linkedinPostId }, 'Post published successfully');
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

        await this.updateChallengeProgress(userId, post._id, 'failed');
        logger.error({ userId, postId: post._id, error: result.error }, 'Post publish failed');
      }
    } catch (error: any) {
      logger.error({ error: error.message, postId: post._id }, 'Post direct publish failed');

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

      await this.updateChallengeProgress(userId, post._id, 'failed');
    }
  }

  /* ═══════════════════════════════════════════════════════
     RETRY FAILED ITEM
     ═══════════════════════════════════════════════════════ */

  private async retryItem(item: any): Promise<void> {
    const userId = item.userId.toString();

    try {
      logger.info({ userId, itemId: item._id, retryCount: item.retryCount }, 'Retrying failed item');

      // Update challenge calendar entry to retrying
      await this.updateChallengeProgress(userId, item.postId, 'retrying');

      // Re-attempt publish
      let content = '';
      if (item.postId) {
        const post = await Post.findById(item.postId).lean();
        if (post) {
          content = post.fullContent || `${post.hook}\n\n${post.body}\n\n${post.cta}`;
          // Reset post status for retry
          await Post.findByIdAndUpdate(item.postId, { status: 'scheduled' });
        }
      }

      if (!content) {
        await this.markFailed(item._id, 'No content for retry');
        return;
      }

      // Reset queue item for retry
      await QueueItem.findByIdAndUpdate(item._id, {
        stage: 'scheduled',
        lastRetryAt: new Date(),
        $push: { stageHistory: { stage: 'scheduled', enteredAt: new Date(), triggeredBy: 'retry' } },
      });

      const result = await linkedinPublisher.publishPost(userId, content);

      if (result.success) {
        await QueueItem.findByIdAndUpdate(item._id, {
          stage: 'published',
          linkedinPostId: result.linkedinPostId,
          publishedAt: new Date(),
          $push: { stageHistory: { stage: 'published', enteredAt: new Date(), triggeredBy: 'retry' } },
        });

        if (item.postId) {
          await Post.findByIdAndUpdate(item.postId, {
            status: 'published',
            publishedAt: new Date(),
            linkedInPostId: result.linkedinPostId,
          });
        }

        await this.updateChallengeProgress(userId, item.postId, 'published');
        await User.findByIdAndUpdate(userId, { $inc: { 'usage.totalContentPublished': 1 } });

        logger.info({ userId, itemId: item._id, linkedinPostId: result.linkedinPostId }, 'Retry successful');
      } else {
        const newRetryCount = (item.retryCount || 0) + 1;
        await QueueItem.findByIdAndUpdate(item._id, {
          stage: newRetryCount >= MAX_RETRIES ? 'failed' : 'scheduled',
          lastError: result.error,
          retryCount: newRetryCount,
          lastRetryAt: new Date(),
        });

        if (newRetryCount >= MAX_RETRIES) {
          await this.updateChallengeProgress(userId, item.postId, 'failed');
          logger.error({ userId, itemId: item._id, error: result.error, retryCount: newRetryCount }, 'Retry failed — max retries reached');
        }
      }
    } catch (error: any) {
      logger.error({ error: error.message, itemId: item._id }, 'Retry failed');
      const newRetryCount = (item.retryCount || 0) + 1;
      await QueueItem.findByIdAndUpdate(item._id, {
        stage: newRetryCount >= MAX_RETRIES ? 'failed' : 'scheduled',
        lastError: error.message,
        retryCount: newRetryCount,
        lastRetryAt: new Date(),
      });

      if (newRetryCount >= MAX_RETRIES) {
        await this.updateChallengeProgress(userId, item.postId, 'failed');
      }
    }
  }

  /* ═══════════════════════════════════════════════════════
     UPDATE CHALLENGE PROGRESS
     ═══════════════════════════════════════════════════════ */

  private async updateChallengeProgress(userId: string, postId: any, status: string): Promise<void> {
    try {
      if (!postId) return;

      const challenge = await LinkedInChallenge.findOne({ userId: new mongoose.Types.ObjectId(userId) });
      if (!challenge) return;

      const calEntry = challenge.calendar.find((c: any) => c.postId?.toString() === postId.toString());
      if (!calEntry) return;

      const oldStatus = calEntry.status;
      calEntry.status = status as any;

      if (status === 'published') {
        calEntry.publishedAt = new Date();
        calEntry.linkedinPostId = ''; // Will be set from QueueItem
        challenge.stats.postsPublished++;
        if (challenge.stats.postsScheduled > 0) challenge.stats.postsScheduled--;

        // Update streak
        challenge.stats.currentStreak++;
        if (challenge.stats.currentStreak > challenge.stats.longestStreak) {
          challenge.stats.longestStreak = challenge.stats.currentStreak;
        }
      } else if (status === 'failed') {
        challenge.stats.postsFailed++;
        if (challenge.stats.postsScheduled > 0) challenge.stats.postsScheduled--;
      } else if (status === 'retrying') {
        // No stat change
      }

      // Update currentDay to match furthest published day
      const publishedDays = challenge.calendar
        .filter((c: any) => c.status === 'published')
        .map((c: any) => c.day);
      if (publishedDays.length > 0) {
        challenge.currentDay = Math.max(...publishedDays);
      }

      await challenge.save();
    } catch (error: any) {
      logger.error({ error: error.message, userId }, 'Failed to update challenge progress');
    }
  }

  /* ═══════════════════════════════════════════════════════
     UTILITIES
     ═══════════════════════════════════════════════════════ */

  private async markFailed(itemId: mongoose.Types.ObjectId, error: string): Promise<void> {
    await QueueItem.findByIdAndUpdate(itemId, {
      stage: 'failed',
      lastError: error,
      lastRetryAt: new Date(),
      $push: { stageHistory: { stage: 'failed', enteredAt: new Date(), triggeredBy: 'auto_publisher' } },
    });
  }

  async retryFailed(itemId: string): Promise<{ success: boolean; error?: string }> {
    try {
      let item = await QueueItem.findById(itemId);
      if (!item) item = await QueueItem.findOne({ postId: itemId });
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

  async triggerManualCheck(): Promise<{ queueItems: number; posts: number; retries: number; published: number }> {
    const now = new Date();

    const dueQueueItems = await QueueItem.find({
      stage: 'scheduled',
      scheduledAt: { $lte: now },
    }).limit(20).lean();

    const duePosts = await Post.find({
      status: 'scheduled',
      scheduleDate: { $lte: now, $exists: true, $ne: null },
    }).limit(20).lean();

    const retryItems = await QueueItem.find({
      stage: 'failed',
      retryCount: { $lt: MAX_RETRIES },
    }).limit(10).lean();

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

    for (const item of retryItems) {
      await this.retryItem(item);
    }

    return { queueItems: dueQueueItems.length, posts: duePosts.length, retries: retryItems.length, published };
  }
}

export const autoPublisher = new AutoPublisher();
