import { logger } from '../utils/logger';

export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffFactor: number;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  backoffFactor: 2,
};

const TRANSIENT_PATTERNS = [
  'timeout', 'timed out', 'timeout exceeded',
  'econnrefused', 'econnreset', 'enetunreach',
  'network error', 'network timeout',
  'etimedout', 'esockettimedout',
  'socket hang up', 'socket closed',
  'read ecONNRESET', 'write ecONNRESET',
  'service unavailable', '503', '502', '429',
  'too many requests', 'rate limit', 'rate_limit',
  'dns lookup', 'dns resolution',
  'playwright', 'target closed', 'page closed',
  'crash', 'protocol error',
  'navigation failed', 'navigation timeout',
  'detached', 'session closed',
  'context was destroyed', 'browser has disconnected',
  'servernotfound', 'server not found',
  'captcha', 'unusual traffic',
  'intermittent', 'temporary',
  'could not connect', 'connection refused',
  'connection closed', 'connection reset',
  'busy', 'not ready', 'still loading',
  'retryable', 'try again',
];

const PERMANENT_PATTERNS = [
  'invalid query', 'invalid keyword',
  'invalid location', 'invalid source',
  'empty keyword', 'empty location',
  'validation failed', 'bad request',
  'no results found', 'empty response',
  'invalid selector', 'invalid input',
  'not found', '404',
  'forbidden', '403',
  'unauthorized', '401', 'auth_expired',
  'invalid credentials', 'authentication failed',
  'invalid url format', 'malformed',
  'invalid argument', 'invalid parameters',
  'no such element', 'element not found',
  'database error', 'duplicate key',
  'schema validation', 'validation error',
  'invalid lead id', 'missing required',
  'country not supported', 'source not supported',
];

export function classifyError(error: unknown): {
  isTransient: boolean;
  category: 'transient' | 'permanent' | 'unknown';
  normalizedMessage: string;
} {
  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();

  for (const pattern of PERMANENT_PATTERNS) {
    if (lower.includes(pattern)) {
      return { isTransient: false, category: 'permanent', normalizedMessage: message };
    }
  }

  for (const pattern of TRANSIENT_PATTERNS) {
    if (lower.includes(pattern)) {
      return { isTransient: true, category: 'transient', normalizedMessage: message };
    }
  }

  return { isTransient: true, category: 'unknown', normalizedMessage: message };
}

export function calculateDelay(attempt: number, config: RetryConfig = DEFAULT_RETRY_CONFIG): number {
  const delay = config.baseDelayMs * Math.pow(config.backoffFactor, attempt);
  return Math.min(delay, config.maxDelayMs);
}

export async function executeWithRetry<T>(
  fn: () => Promise<T>,
  context: { operation: string; leadId?: string; sessionId?: string; source?: string },
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
): Promise<{ success: boolean; data: T | null; error: string | null; retriesUsed: number; permanent: boolean }> {
  let lastError: string | null = null;
  let permanent = false;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      const result = await fn();

      if (attempt > 0) {
        logger.info({
          ...context,
          attempt: attempt + 1,
        }, 'Recovery: Succeeded on retry');
      }

      return { success: true, data: result, error: null, retriesUsed: attempt, permanent: false };
    } catch (error: unknown) {
      lastError = error instanceof Error ? error.message : String(error);
      const classification = classifyError(error);

      if (!classification.isTransient) {
        permanent = true;
        logger.info({
          ...context,
          error: lastError,
          category: classification.category,
          attempt: attempt + 1,
        }, 'Recovery: Permanent error, not retrying');
        break;
      }

      if (attempt < config.maxRetries) {
        const delay = calculateDelay(attempt, config);
        logger.warn({
          ...context,
          error: lastError,
          attempt: attempt + 1,
          nextRetryInMs: delay,
        }, 'Recovery: Will retry');

        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  return { success: false, data: null, error: lastError, retriesUsed: config.maxRetries, permanent };
}
