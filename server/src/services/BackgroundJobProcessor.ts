import { Queue, Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import pino from 'pino';

const logger = pino();

export enum JobType {
  SYNC_PROFILE = 'sync:profile',
  GENERATE_REPORT = 'generate:report',
  REFRESH_TOKEN = 'refresh:token',
  ANALYZE_ACTIVITY = 'analyze:activity',
  UPDATE_SCORES = 'update:scores',
  CACHE_WARM = 'cache:warm',
  CLEANUP = 'cleanup',
}

export enum JobPriority {
  HIGH = 1,
  MEDIUM = 2,
  LOW = 3,
}

export interface JobData {
  userId?: string;
  profileId?: string;
  operation: string;
  metadata?: Record<string, unknown>;
  timestamp: number;
}

export interface JobResult {
  success: boolean;
  jobId: string;
  jobType: JobType;
  duration: number;
  error?: string;
  result?: unknown;
}

export class BackgroundJobProcessor {
  private queues: Map<JobType, Queue>;
  private workers: Worker[];
  private redis: IORedis;
  private isInitialized: boolean;

  constructor(redisUri: string) {
    this.redis = new IORedis(redisUri, {
      maxRetriesPerRequest: null,
      enableOfflineQueue: false,
    });
    this.redis.on('error', () => {});

    this.queues = new Map();
    this.workers = [];
    this.isInitialized = false;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    const jobTypes = Object.values(JobType);

    for (const jobType of jobTypes) {
      const queue = new Queue(jobType, {
        connection: this.redis as any,
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
          removeOnComplete: {
            age: 86400,
            count: 1000,
          },
          removeOnFail: {
            age: 604800,
            count: 100,
          },
        },
      });

      this.queues.set(jobType, queue);
    }

    this.isInitialized = true;
    logger.info('BackgroundJobProcessor initialized with all queues');
  }

  registerWorker(
    jobType: JobType,
    handler: (job: Job<JobData>) => Promise<JobResult>,
    concurrency = 5
  ): void {
    if (!this.isInitialized) {
      throw new Error('BackgroundJobProcessor not initialized');
    }

    const worker = new Worker<JobData>(
      jobType,
      async (job) => {
        const startTime = Date.now();
        logger.info({ jobId: job.id, jobType }, 'Processing job');

        try {
          const result = await handler(job);
          result.jobId = job.id!;
          result.jobType = jobType;
          result.duration = Date.now() - startTime;
          logger.info({ jobId: job.id, jobType, duration: result.duration }, 'Job completed');
          return result;
        } catch (error) {
          const duration = Date.now() - startTime;
          logger.error({
            jobId: job.id,
            jobType,
            duration,
            error: error instanceof Error ? error.message : String(error),
          }, 'Job failed');
          throw error;
        }
      },
      {
        connection: this.redis as any,
        concurrency,
        lockDuration: 300000,
        stalledInterval: 60000,
        maxStalledCount: 3,
      }
    );

    worker.on('failed', (job, error) => {
      logger.error({
        jobId: job?.id,
        jobType,
        error: error.message,
        attempts: job?.attemptsMade,
      }, 'Job exceeded retry limit');
    });

    worker.on('stalled', (jobId) => {
      logger.warn({ jobId, jobType }, 'Job stalled');
    });

    this.workers.push(worker);
    logger.info({ jobType, concurrency }, 'Worker registered');
  }

  async enqueue(
    jobType: JobType,
    data: Omit<JobData, 'timestamp'>,
    options?: {
      delay?: number;
      priority?: JobPriority;
      jobId?: string;
      deduplicate?: boolean;
    }
  ): Promise<string> {
    const queue = this.queues.get(jobType);
    if (!queue) {
      throw new Error(`Queue ${jobType} not found`);
    }

    const jobId = options?.jobId || uuidv4();
    const jobData: JobData = {
      ...data,
      timestamp: Date.now(),
    };

    if (options?.deduplicate) {
      const existing = await queue.getJob(jobId);
      if (existing) {
        logger.debug({ jobId, jobType }, 'Duplicate job skipped');
        return jobId;
      }
    }

    await queue.add(jobType, jobData, {
      jobId,
      delay: options?.delay || 0,
      priority: options?.priority || JobPriority.MEDIUM,
    });

    logger.info({ jobId, jobType, delay: options?.delay }, 'Job enqueued');
    return jobId;
  }

  async enqueueBulk(
    jobs: Array<{
      jobType: JobType;
      data: Omit<JobData, 'timestamp'>;
      options?: {
        delay?: number;
        priority?: JobPriority;
        jobId?: string;
      };
    }>
  ): Promise<string[]> {
    const jobIds: string[] = [];

    for (const job of jobs) {
      const jobId = await this.enqueue(job.jobType, job.data, job.options);
      jobIds.push(jobId);
    }

    return jobIds;
  }

  async getJobStatus(jobType: JobType, jobId: string): Promise<{
    status: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed';
    progress?: number;
    result?: JobResult;
    error?: string;
  } | null> {
    const queue = this.queues.get(jobType);
    if (!queue) return null;

    const job = await queue.getJob(jobId);
    if (!job) return null;

    const state = await job.getState();

    return {
      status: state as 'waiting' | 'active' | 'completed' | 'failed' | 'delayed',
      progress: job.progress as number | undefined,
      result: job.returnvalue as JobResult | undefined,
      error: job.failedReason,
    };
  }

  async getQueueMetrics(jobType: JobType): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  }> {
    const queue = this.queues.get(jobType);
    if (!queue) {
      return { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 };
    }

    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
    ]);

    return { waiting, active, completed, failed, delayed };
  }

  async removeJob(jobType: JobType, jobId: string): Promise<boolean> {
    const queue = this.queues.get(jobType);
    if (!queue) return false;

    const job = await queue.getJob(jobId);
    if (!job) return false;

    await job.remove();
    return true;
  }

  async pauseQueue(jobType: JobType): Promise<void> {
    const queue = this.queues.get(jobType);
    if (queue) {
      await queue.pause();
      logger.info({ jobType }, 'Queue paused');
    }
  }

  async resumeQueue(jobType: JobType): Promise<void> {
    const queue = this.queues.get(jobType);
    if (queue) {
      await queue.resume();
      logger.info({ jobType }, 'Queue resumed');
    }
  }

  async shutdown(): Promise<void> {
    logger.info('Shutting down BackgroundJobProcessor');

    for (const worker of this.workers) {
      await worker.close();
    }

    for (const [, queue] of this.queues) {
      await queue.close();
    }

    await this.redis.quit();
    this.isInitialized = false;
    logger.info('BackgroundJobProcessor shut down');
  }
}
