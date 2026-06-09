import Redis from 'ioredis';
import pino from 'pino';

const logger = pino();

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
  version: number;
}

export class CachingLayer {
  private redis: Redis | null;
  private memoryCache: Map<string, CacheEntry<unknown>>;
  private defaultTtl: number;
  private memoryTtl: number;
  private useRedis: boolean;

  constructor(redisClient: Redis | null, defaultTtl = 300, memoryTtl = 60) {
    this.redis = redisClient;
    this.memoryCache = new Map();
    this.defaultTtl = defaultTtl;
    this.memoryTtl = memoryTtl;
    this.useRedis = redisClient !== null;

    if (this.useRedis) {
      this.startMemoryCleanup();
    }
  }

  async get<T>(key: string): Promise<T | null> {
    const memoryResult = this.getFromMemory<T>(key);
    if (memoryResult !== null) return memoryResult;

    if (!this.useRedis) return null;

    try {
      const raw = await this.redis!.get(this.buildKey(key));
      if (!raw) return null;

      const entry: CacheEntry<T> = JSON.parse(raw);
      if (Date.now() > entry.expiresAt) {
        await this.redis!.del(this.buildKey(key));
        return null;
      }

      this.setMemory(key, entry.data, entry.expiresAt);
      return entry.data;
    } catch (error) {
      logger.warn({ error, key }, 'Cache get failed');
      return null;
    }
  }

  async set<T>(key: string, data: T, ttl?: number): Promise<void> {
    const expiresAt = Date.now() + (ttl ?? this.defaultTtl) * 1000;
    const entry: CacheEntry<T> = { data, expiresAt, version: 1 };

    this.setMemory(key, data, expiresAt);

    if (!this.useRedis) return;

    try {
      await this.redis!.setex(
        this.buildKey(key),
        ttl ?? this.defaultTtl,
        JSON.stringify(entry)
      );
    } catch (error) {
      logger.warn({ error, key }, 'Cache set failed');
    }
  }

  async invalidate(key: string): Promise<void> {
    this.memoryCache.delete(key);

    if (!this.useRedis) return;

    try {
      await this.redis!.del(this.buildKey(key));
    } catch (error) {
      logger.warn({ error, key }, 'Cache invalidation failed');
    }
  }

  async invalidatePattern(pattern: string): Promise<void> {
    if (!this.useRedis) return;

    try {
      const keys = await this.redis!.keys(this.buildKey(pattern));
      if (keys.length > 0) {
        await this.redis!.del(...keys);
      }
    } catch (error) {
      logger.warn({ error, pattern }, 'Cache pattern invalidation failed');
    }
  }

  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) return cached;

    const data = await fetcher();
    await this.set(key, data, ttl);
    return data;
  }

  async exists(key: string): Promise<boolean> {
    if (this.memoryCache.has(key)) return true;
    if (!this.useRedis) return false;

    try {
      const exists = await this.redis!.exists(this.buildKey(key));
      return exists === 1;
    } catch {
      return false;
    }
  }

  async clear(): Promise<void> {
    this.memoryCache.clear();
    if (!this.useRedis) return;

    try {
      const keys = await this.redis!.keys('cache:*');
      if (keys.length > 0) {
        await this.redis!.del(...keys);
      }
    } catch (error) {
      logger.warn({ error }, 'Cache clear failed');
    }
  }

  private getFromMemory<T>(key: string): T | null {
    const entry = this.memoryCache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.memoryCache.delete(key);
      return null;
    }
    return entry.data as T;
  }

  private setMemory(key: string, data: unknown, expiresAt: number): void {
    if (this.memoryCache.size > 1000) {
      const oldestKey = this.memoryCache.keys().next().value;
      if (oldestKey) this.memoryCache.delete(oldestKey);
    }
    this.memoryCache.set(key, { data, expiresAt, version: 1 });
  }

  private startMemoryCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.memoryCache.entries()) {
        if (now > entry.expiresAt) {
          this.memoryCache.delete(key);
        }
      }
    }, this.memoryTtl * 1000);
  }

  private buildKey(key: string): string {
    return `cache:${key}`;
  }
}
