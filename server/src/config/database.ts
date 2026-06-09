import mongoose from 'mongoose';
import pino from 'pino';

const logger = pino();

export async function connectDatabase(uri: string): Promise<void> {
  const retries = 3;
  let attempt = 0;

  while (attempt < retries) {
    try {
      await mongoose.connect(uri, {
        maxPoolSize: 10,
        minPoolSize: 2,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        heartbeatFrequencyMS: 10000,
      });

      mongoose.connection.on('error', (err) => {
        logger.error({ err }, 'MongoDB connection error');
      });

      mongoose.connection.on('disconnected', () => {
        logger.warn('MongoDB disconnected. Attempting reconnect...');
      });

      mongoose.connection.on('reconnected', () => {
        logger.info('MongoDB reconnected');
      });

      logger.info('Connected to MongoDB');
      return;
    } catch (error) {
      attempt++;
      logger.error({ error, attempt }, `Failed to connect to MongoDB (attempt ${attempt}/${retries})`);
      if (attempt === retries) {
        throw new Error('Failed to connect to MongoDB after all retries');
      }
      await new Promise((resolve) => setTimeout(resolve, 2000 * attempt));
    }
  }
}
