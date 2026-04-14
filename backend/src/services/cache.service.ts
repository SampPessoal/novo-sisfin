import Redis from 'ioredis';
import { env } from '../config/env';
import { logger } from '../config/logger';

let redis: Redis | null = null;

function getRedis(): Redis {
  if (!redis) {
    redis = new Redis({
      host: env.REDIS_HOST,
      port: env.REDIS_PORT,
      password: env.REDIS_PASSWORD || undefined,
      tls: env.REDIS_TLS === 'true' ? {} : undefined,
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => Math.min(times * 200, 5000),
    });

    redis.on('error', (err) => {
      logger.error('Redis connection error', { error: err.message });
    });

    redis.on('connect', () => {
      logger.info('Redis connected');
    });
  }
  return redis;
}

export class CacheService {
  private static DEFAULT_TTL = 300;

  static async get<T>(key: string): Promise<T | null> {
    try {
      const data = await getRedis().get(key);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  static async set(key: string, data: unknown, ttl = CacheService.DEFAULT_TTL): Promise<void> {
    try {
      await getRedis().setex(key, ttl, JSON.stringify(data));
    } catch {
      // cache miss is acceptable
    }
  }

  static async del(key: string): Promise<void> {
    try {
      await getRedis().del(key);
    } catch {
      // ignore
    }
  }

  static async delPattern(pattern: string): Promise<void> {
    try {
      const keys = await getRedis().keys(pattern);
      if (keys.length > 0) {
        await getRedis().del(...keys);
      }
    } catch {
      // ignore
    }
  }

  static async healthCheck(): Promise<boolean> {
    try {
      const result = await getRedis().ping();
      return result === 'PONG';
    } catch {
      return false;
    }
  }

  static getClient(): Redis {
    return getRedis();
  }
}
