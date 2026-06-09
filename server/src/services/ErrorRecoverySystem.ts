import pino from 'pino';

const logger = pino();

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum ErrorCategory {
  NETWORK = 'network',
  AUTH = 'auth',
  RATE_LIMIT = 'rate_limit',
  TIMEOUT = 'timeout',
  PARSING = 'parsing',
  VALIDATION = 'validation',
  DATABASE = 'database',
  API = 'api',
  UNKNOWN = 'unknown',
}

export interface ErrorContext {
  operation: string;
  service: string;
  userId?: string;
  profileId?: string;
  timestamp: Date;
  retryCount: number;
  maxRetries: number;
  error: Error;
  category: ErrorCategory;
  severity: ErrorSeverity;
  metadata?: Record<string, unknown>;
}

export interface RecoveryStrategy {
  shouldRetry: boolean;
  retryDelay: number;
  fallbackAction?: () => Promise<void>;
  circuitBreakDuration?: number;
}

export class ErrorRecoverySystem {
  private errorLog: ErrorContext[];
  private circuitBreakers: Map<string, { open: boolean; openedAt: number; duration: number }>;
  private maxLogSize: number;
  private onCriticalError?: (ctx: ErrorContext) => Promise<void>;

  constructor(maxLogSize = 1000) {
    this.errorLog = [];
    this.circuitBreakers = new Map();
    this.maxLogSize = maxLogSize;
  }

  setCriticalErrorHandler(handler: (ctx: ErrorContext) => Promise<void>): void {
    this.onCriticalError = handler;
  }

  async handleError(
    error: Error,
    context: Omit<ErrorContext, 'timestamp' | 'retryCount' | 'error'>,
    retryCount = 0
  ): Promise<RecoveryStrategy> {
    const ctx: ErrorContext = {
      ...context,
      error,
      timestamp: new Date(),
      retryCount,
    };

    this.logError(ctx);

    const circuitKey = `${context.service}:${context.operation}`;
    if (this.isCircuitBroken(circuitKey)) {
      return {
        shouldRetry: false,
        retryDelay: 0,
        circuitBreakDuration: this.circuitBreakers.get(circuitKey)?.duration,
      };
    }

    const strategy = this.determineStrategy(ctx);

    if (strategy.shouldRetry && strategy.circuitBreakDuration) {
      this.openCircuit(circuitKey, strategy.circuitBreakDuration);
    }

    if (ctx.severity === ErrorSeverity.CRITICAL && this.onCriticalError) {
      await this.onCriticalError(ctx);
    }

    return strategy;
  }

  async retryWithBackoff<T>(
    operation: () => Promise<T>,
    context: Omit<ErrorContext, 'timestamp' | 'retryCount' | 'error'>,
    maxRetries = 3
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        const strategy = await this.handleError(lastError, context, attempt);

        if (!strategy.shouldRetry || attempt >= maxRetries) {
          break;
        }

        const delay = strategy.retryDelay * Math.pow(2, attempt - 1) + Math.random() * 1000;
        logger.warn({
          attempt,
          maxRetries,
          delay: Math.round(delay),
          operation: context.operation,
          error: lastError.message,
        }, `Retrying operation after ${Math.round(delay)}ms`);

        await this.sleep(delay);
      }
    }

    throw lastError || new Error('Operation failed after retries');
  }

  getErrorStats(): {
    total: number;
    byCategory: Record<string, number>;
    bySeverity: Record<string, number>;
    byService: Record<string, number>;
  } {
    const stats = {
      total: this.errorLog.length,
      byCategory: {} as Record<string, number>,
      bySeverity: {} as Record<string, number>,
      byService: {} as Record<string, number>,
    };

    for (const error of this.errorLog) {
      stats.byCategory[error.category] = (stats.byCategory[error.category] || 0) + 1;
      stats.bySeverity[error.severity] = (stats.bySeverity[error.severity] || 0) + 1;
      stats.byService[error.service] = (stats.byService[error.service] || 0) + 1;
    }

    return stats;
  }

  getRecentErrors(limit = 10): ErrorContext[] {
    return this.errorLog.slice(-limit);
  }

  categorizeError(error: Error): { category: ErrorCategory; severity: ErrorSeverity } {
    const message = error.message.toLowerCase();

    if (message.includes('rate limit') || message.includes('too many requests')) {
      return { category: ErrorCategory.RATE_LIMIT, severity: ErrorSeverity.MEDIUM };
    }
    if (message.includes('timeout') || message.includes('timed out')) {
      return { category: ErrorCategory.TIMEOUT, severity: ErrorSeverity.MEDIUM };
    }
    if (message.includes('unauthorized') || message.includes('token') || message.includes('auth')) {
      return { category: ErrorCategory.AUTH, severity: ErrorSeverity.HIGH };
    }
    if (message.includes('network') || message.includes('econnrefused') || message.includes('enotfound')) {
      return { category: ErrorCategory.NETWORK, severity: ErrorSeverity.HIGH };
    }
    if (message.includes('validation') || message.includes('invalid')) {
      return { category: ErrorCategory.VALIDATION, severity: ErrorSeverity.LOW };
    }
    if (message.includes('parse') || message.includes('malformed')) {
      return { category: ErrorCategory.PARSING, severity: ErrorSeverity.MEDIUM };
    }
    if (message.includes('mongo') || message.includes('database') || message.includes('connection')) {
      return { category: ErrorCategory.DATABASE, severity: ErrorSeverity.HIGH };
    }

    return { category: ErrorCategory.UNKNOWN, severity: ErrorSeverity.MEDIUM };
  }

  private determineStrategy(ctx: ErrorContext): RecoveryStrategy {
    switch (ctx.category) {
      case ErrorCategory.RATE_LIMIT:
        return {
          shouldRetry: true,
          retryDelay: 60000,
          circuitBreakDuration: 120000,
        };

      case ErrorCategory.TIMEOUT:
        return {
          shouldRetry: true,
          retryDelay: 5000,
        };

      case ErrorCategory.NETWORK:
        return {
          shouldRetry: true,
          retryDelay: 10000,
          circuitBreakDuration: 30000,
        };

      case ErrorCategory.AUTH:
        return {
          shouldRetry: false,
          retryDelay: 0,
        };

      case ErrorCategory.PARSING:
        return {
          shouldRetry: false,
          retryDelay: 0,
        };

      case ErrorCategory.VALIDATION:
        return {
          shouldRetry: false,
          retryDelay: 0,
        };

      case ErrorCategory.DATABASE:
        return {
          shouldRetry: true,
          retryDelay: 2000,
          circuitBreakDuration: 10000,
        };

      default:
        return {
          shouldRetry: ctx.severity !== ErrorSeverity.CRITICAL,
          retryDelay: 5000,
        };
    }
  }

  private isCircuitBroken(key: string): boolean {
    const breaker = this.circuitBreakers.get(key);
    if (!breaker) return false;
    if (!breaker.open) return false;

    if (Date.now() - breaker.openedAt > breaker.duration) {
      this.circuitBreakers.delete(key);
      logger.info({ key }, 'Circuit breaker closed');
      return false;
    }

    return true;
  }

  private openCircuit(key: string, duration: number): void {
    this.circuitBreakers.set(key, {
      open: true,
      openedAt: Date.now(),
      duration,
    });
    logger.warn({ key, duration }, 'Circuit breaker opened');
  }

  private logError(ctx: ErrorContext): void {
    this.errorLog.push(ctx);
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog.shift();
    }

    logger.error({
      operation: ctx.operation,
      service: ctx.service,
      category: ctx.category,
      severity: ctx.severity,
      message: ctx.error.message,
      userId: ctx.userId,
    }, `Error in ${ctx.service}: ${ctx.operation}`);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
