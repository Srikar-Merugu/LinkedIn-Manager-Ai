import pino from 'pino';

const isProduction = process.env.NODE_ENV === 'production';

export function createLogger(name?: string): pino.Logger {
  return pino({
    level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
    transport: isProduction
      ? undefined
      : {
          target: 'pino-pretty',
          options: { forceColor: true },
        },
  });
}

export const logger = createLogger();
