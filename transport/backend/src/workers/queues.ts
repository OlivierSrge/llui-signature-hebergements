import { Queue } from 'bullmq';

const redisConnection = {
  host: process.env.REDIS_HOST ?? 'localhost',
  port: parseInt(process.env.REDIS_PORT ?? '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
};

export const ocrQueue = new Queue('ocr-processing', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
  },
});

export const notificationQueue = new Queue('notifications', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'fixed', delay: 1000 },
    removeOnComplete: { count: 500 },
  },
});

export const gpsSyncQueue = new Queue('gps-sync', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 2,
    removeOnComplete: { count: 200 },
  },
});
