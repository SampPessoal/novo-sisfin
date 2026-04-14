import { Queue, Worker, Job, QueueEvents } from 'bullmq';
import { env } from '../config/env';
import { logger } from '../config/logger';

const connection = {
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  password: env.REDIS_PASSWORD || undefined,
  tls: env.REDIS_TLS === 'true' ? {} : undefined,
};

const queues = new Map<string, Queue>();
const workers = new Map<string, Worker>();

export type JobHandler<T = unknown> = (job: Job<T>) => Promise<void>;

export class QueueService {
  static getQueue(name: string): Queue {
    if (!queues.has(name)) {
      const queue = new Queue(name, {
        connection,
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
          removeOnComplete: { age: 86400, count: 1000 },
          removeOnFail: { age: 604800, count: 5000 },
        },
      });
      queues.set(name, queue);
    }
    return queues.get(name)!;
  }

  static registerWorker<T = unknown>(
    queueName: string,
    handler: JobHandler<T>,
    concurrency = 3,
  ): Worker {
    const worker = new Worker(queueName, handler as JobHandler, {
      connection,
      concurrency,
    });

    worker.on('completed', (job) => {
      logger.info(`Job ${job.id} completed on queue ${queueName}`);
    });

    worker.on('failed', (job, err) => {
      logger.error(`Job ${job?.id} failed on queue ${queueName}`, {
        error: err.message,
        attemptsMade: job?.attemptsMade,
      });
    });

    workers.set(queueName, worker);
    return worker;
  }

  static async addJob<T = unknown>(
    queueName: string,
    jobName: string,
    data: T,
    options?: { priority?: number; delay?: number; attempts?: number },
  ) {
    const queue = QueueService.getQueue(queueName);
    return queue.add(jobName, data, options);
  }

  static async addRepeatable(
    queueName: string,
    jobName: string,
    data: unknown,
    pattern: string,
  ) {
    const queue = QueueService.getQueue(queueName);
    return queue.add(jobName, data, { repeat: { pattern } });
  }

  static async getQueueStats(queueName: string) {
    const queue = QueueService.getQueue(queueName);
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
    ]);
    return { queueName, waiting, active, completed, failed, delayed };
  }

  static async getAllQueuesStats() {
    const queueNames = ['emails', 'boletos', 'nfe', 'relatorios', 'ocr', 'alertas'];
    return Promise.all(queueNames.map((name) => QueueService.getQueueStats(name)));
  }

  static async closeAll() {
    for (const [, worker] of workers) {
      await worker.close();
    }
    for (const [, queue] of queues) {
      await queue.close();
    }
  }
}
