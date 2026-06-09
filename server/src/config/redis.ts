import Redis from 'ioredis';
import pino from 'pino';

const logger = pino();

let redisClient: Redis | null = null;

export function getRedisClient(uri: string): Redis {
  if (!redisClient) {
    redisClient = new Redis(uri, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        if (times > 3) return null;
        return Math.min(times * 200, 2000);
      },
      enableOfflineQueue: true,
      lazyConnect: true,
    });

    redisClient.on('error', (err) => {
      logger.error({ err }, 'Redis connection error');
    });

    redisClient.on('connect', () => {
      logger.info('Connected to Redis');
    });
  }

  return redisClient;
}
