import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from './logger.js';

const MAX_RETRIES = 10;
const RETRY_DELAY_MS = 3000;

export async function connectDatabase(): Promise<void> {
  let attempt = 0;

  while (attempt < MAX_RETRIES) {
    try {
      attempt++;
      logger.info({ attempt, maxRetries: MAX_RETRIES }, 'Attempting MongoDB connection...');

      await mongoose.connect(env.MONGODB_URI, {
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        family: 4,
      });

      logger.info('MongoDB connected successfully');

      mongoose.connection.on('error', (err) => {
        logger.error({ err }, 'MongoDB connection error');
      });

      mongoose.connection.on('disconnected', () => {
        logger.warn('MongoDB disconnected');
      });

      mongoose.connection.on('reconnected', () => {
        logger.info('MongoDB reconnected');
      });

      return;
    } catch (err) {
      logger.error({ err, attempt }, `MongoDB connection attempt ${attempt} failed`);
      if (attempt >= MAX_RETRIES) {
        logger.error('Exhausted MongoDB connection retries. Exiting.');
        process.exit(1);
      }
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    }
  }
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
  logger.info('MongoDB disconnected cleanly');
}

export function isDatabaseReady(): boolean {
  return mongoose.connection.readyState === 1;
}
