// src/lib/utils/logger.ts

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogContext {
  [key: string]: unknown;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  namespace: string;
  message: string;
  context?: LogContext;
}

class Logger {
  private namespace: string;
  private debugEnabled: boolean;

  constructor(namespace: string) {
    this.namespace = namespace;
    this.debugEnabled = this.isDebugEnabled(namespace);
  }

  private isDebugEnabled(namespace: string): boolean {
    const env = process.env.NODE_ENV;
    const debugEnv = process.env.RAFF_DEBUG;
    const namespaceDebugEnv = process.env[`RAFF_${namespace.toUpperCase().replace(/-/g, "_")}_DEBUG`];

    // Enable debug in development or if debug flags are set
    return (
      env !== "production" ||
      debugEnv === "true" ||
      namespaceDebugEnv === "true"
    );
  }

  private formatEntry(level: LogLevel, message: string, context?: LogContext): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      namespace: this.namespace,
      message,
      context,
    };
  }

  private write(level: LogLevel, message: string, context?: LogContext): void {
    const entry = this.formatEntry(level, message, context);

    // In production, write as JSON for log aggregation
    if (process.env.NODE_ENV === "production") {
      console.log(JSON.stringify(entry));
      return;
    }

    // In development, write human-readable format
    const prefix = `[${entry.timestamp}] [${entry.level.toUpperCase()}] [${entry.namespace}]`;
    if (context) {
      console.log(prefix, message, context);
    } else {
      console.log(prefix, message);
    }
  }

  debug(message: string, context?: LogContext): void {
    if (!this.debugEnabled) return;
    this.write("debug", message, context);
  }

  info(message: string, context?: LogContext): void {
    this.write("info", message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.write("warn", message, context);
  }

  error(message: string, context?: LogContext): void {
    this.write("error", message, context);
  }

  /**
   * Create a child logger with additional context that will be included in all logs
   */
  child(additionalContext: LogContext): ContextLogger {
    return new ContextLogger(this.namespace, additionalContext);
  }
}

/**
 * Logger that automatically includes context in all log entries
 */
class ContextLogger extends Logger {
  private context: LogContext;

  constructor(namespace: string, context: LogContext) {
    super(namespace);
    this.context = context;
  }

  debug(message: string, additionalContext?: LogContext): void {
    super.debug(message, { ...this.context, ...additionalContext });
  }

  info(message: string, additionalContext?: LogContext): void {
    super.info(message, { ...this.context, ...additionalContext });
  }

  warn(message: string, additionalContext?: LogContext): void {
    super.warn(message, { ...this.context, ...additionalContext });
  }

  error(message: string, additionalContext?: LogContext): void {
    super.error(message, { ...this.context, ...additionalContext });
  }
}

/**
 * Create a logger for a specific namespace
 *
 * @example
 * const logger = createLogger("salla-sync");
 * logger.info("Starting sync", { merchantId: 123 });
 * logger.debug("Processing product", { productId: 456 });
 * logger.error("Sync failed", { error: err.message });
 *
 * // Create a child logger with persistent context
 * const merchantLogger = logger.child({ merchantId: 123 });
 * merchantLogger.info("Sync complete"); // Automatically includes merchantId
 */
export function createLogger(namespace: string): Logger {
  return new Logger(namespace);
}
