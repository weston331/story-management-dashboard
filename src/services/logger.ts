/**
 * src/services/logger.ts
 * Centralized error & event logging service.
 *
 * In development  → pretty-prints to the console.
 * In production   → ready to forward to a remote sink (Sentry, Logtail, etc.)
 *                   Just replace the TODO comments with your SDK calls.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  timestamp: string;
}

const IS_DEV = import.meta.env.DEV;

// ─── Internal formatter ───────────────────────────────────────────────────────
function formatEntry(entry: LogEntry): string {
  return `[${entry.timestamp}] [${entry.level.toUpperCase()}] ${entry.message}`;
}

// ─── Remote sink (no-op until you wire a real service) ───────────────────────
async function sendToRemote(entry: LogEntry): Promise<void> {
  // TODO: Replace with your logging SDK, e.g.:
  //   Sentry.captureException(entry.context?.error, { extra: entry });
  //   await fetch('https://your-log-endpoint.com/ingest', { method: 'POST', body: JSON.stringify(entry) });
  void entry; // prevent unused-variable warning
}

// ─── Public API ───────────────────────────────────────────────────────────────
function log(level: LogLevel, message: string, context?: Record<string, unknown>): void {
  const entry: LogEntry = {
    level,
    message,
    context,
    timestamp: new Date().toISOString(),
  };

  if (IS_DEV) {
    const formatted = formatEntry(entry);
    switch (level) {
      case 'debug': console.debug(formatted, context ?? ''); break;
      case 'info':  console.info(formatted,  context ?? ''); break;
      case 'warn':  console.warn(formatted,  context ?? ''); break;
      case 'error': console.error(formatted, context ?? ''); break;
    }
  }

  // Always send errors (and warnings in prod) to the remote sink
  if (level === 'error' || (!IS_DEV && level === 'warn')) {
    sendToRemote(entry).catch(() => {/* swallow logging failures */});
  }
}

const logger = {
  debug: (message: string, context?: Record<string, unknown>) => log('debug', message, context),
  info:  (message: string, context?: Record<string, unknown>) => log('info',  message, context),
  warn:  (message: string, context?: Record<string, unknown>) => log('warn',  message, context),
  error: (message: string, context?: Record<string, unknown>) => log('error', message, context),

  /** Convenience: log an Error object with full stack trace */
  capture: (err: unknown, context?: Record<string, unknown>) => {
    const error = err instanceof Error ? err : new Error(String(err));
    log('error', error.message, { ...context, stack: error.stack, error });
  },
};

export default logger;
