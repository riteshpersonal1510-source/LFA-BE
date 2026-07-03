import mongoose from 'mongoose';
import { logger } from '../utils/logger';
import 'dotenv/config';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  logger.error('MONGODB_URI is not defined in environment variables');
  process.exit(1);
}

let cachedConnection: mongoose.Mongoose | null = null;

const setupConnectionHandlers = () => {
  mongoose.connection.on('connected', () => {
    logger.info({}, 'MongoDB: Connection established');
  });

  mongoose.connection.on('disconnected', () => {
    logger.warn({}, 'MongoDB: Connection lost — auto-reconnect enabled');
  });

  mongoose.connection.on('reconnected', () => {
    logger.info({}, 'MongoDB: Reconnected successfully');
  });

  mongoose.connection.on('error', (err) => {
    logger.error({ err: err.message }, 'MongoDB: Connection error');
  });
};

export const connectDB = async (): Promise<void> => {
  try {
    if (cachedConnection) {
      logger.info('Using existing database connection');
      return;
    }

    setupConnectionHandlers();

    const opts = {
      maxPoolSize: 100,
      minPoolSize: 10,
      maxIdleTimeMS: 30000,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 30000,
      heartbeatFrequencyMS: 10000,
      family: 4,
      retryWrites: true,
      w: 'majority' as const,
      autoIndex: true,
    };

    const maxAttempts = Number(process.env.MONGODB_MAX_RETRIES || 5);
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const connection = await mongoose.connect(MONGODB_URI, opts);
        cachedConnection = connection;
        logger.info({ poolSize: opts.maxPoolSize, minPoolSize: opts.minPoolSize }, 'MongoDB: Connected successfully');
        return;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.warn({ attempt, maxAttempts, error: message }, 'MongoDB: Connection attempt failed');
        if (attempt < maxAttempts) {
          const delayMs = Math.min(2000 * attempt, 10000);
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      }
    }

    throw new Error(`MongoDB connection failed after ${maxAttempts} attempts`);
  } catch (error) {
    const loggedError = error instanceof Error ? error : new Error(String(error));
    logger.error(loggedError, 'MongoDB: Connection failed:');
    throw loggedError;
  }
};

export const disconnectDB = async (): Promise<void> => {
  try {
    if (cachedConnection) {
      await mongoose.disconnect();
      cachedConnection = null;
      logger.info('Database disconnected');
    }
  } catch (error) {
    logger.error(error instanceof Error ? error : new Error(String(error)), 'Error disconnecting database:');
  }
};
