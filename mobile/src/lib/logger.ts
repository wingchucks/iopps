/**
 * Production-ready logger utility
 * - Silences logs in production builds
 * - Routes errors to Sentry when available
 * - Provides consistent logging interface
 */

import * as Sentry from "@sentry/react-native";

const isDev = __DEV__;

type LogLevel = "log" | "info" | "warn" | "error" | "debug";

interface LoggerOptions {
  /** Force logging even in production (use sparingly) */
  force?: boolean;
  /** Additional context to attach to error reports */
  context?: Record<string, unknown>;
  /** Tags for categorizing in Sentry */
  tags?: Record<string, string>;
}

class Logger {
  private prefix: string;

  constructor(prefix?: string) {
    this.prefix = prefix ? `[${prefix}]` : "";
  }

  private formatMessage(message: string): string {
    return this.prefix ? `${this.prefix} ${message}` : message;
  }

  /**
   * Standard log - only shows in development
   */
  log(message: string, ...args: unknown[]): void {
    if (isDev) {
      console.log(this.formatMessage(message), ...args);
    }
  }

  /**
   * Info log - only shows in development
   */
  info(message: string, ...args: unknown[]): void {
    if (isDev) {
      console.info(this.formatMessage(message), ...args);
    }
  }

  /**
   * Debug log - only shows in development
   */
  debug(message: string, ...args: unknown[]): void {
    if (isDev) {
      console.debug(this.formatMessage(message), ...args);
    }
  }

  /**
   * Warning - shows in development, breadcrumb in production
   */
  warn(message: string, options?: LoggerOptions): void {
    const formattedMessage = this.formatMessage(message);

    if (isDev || options?.force) {
      console.warn(formattedMessage);
    }

    // Add breadcrumb in production for debugging
    if (!isDev) {
      Sentry.addBreadcrumb({
        category: "warning",
        message: formattedMessage,
        level: "warning",
        data: options?.context,
      });
    }
  }

  /**
   * Error - always logs, sends to Sentry in production
   */
  error(
    message: string,
    error?: Error | unknown,
    options?: LoggerOptions
  ): void {
    const formattedMessage = this.formatMessage(message);

    // Always log errors in development
    if (isDev) {
      console.error(formattedMessage, error);
    }

    // Send to Sentry in production
    if (!isDev) {
      if (error instanceof Error) {
        Sentry.captureException(error, {
          tags: options?.tags,
          extra: {
            message: formattedMessage,
            ...options?.context,
          },
        });
      } else {
        Sentry.captureMessage(formattedMessage, {
          level: "error",
          tags: options?.tags,
          extra: {
            error,
            ...options?.context,
          },
        });
      }
    }
  }

  /**
   * Track an event (analytics-style)
   */
  track(eventName: string, properties?: Record<string, unknown>): void {
    if (isDev) {
      console.log(`[Track] ${eventName}`, properties);
    }

    // Add breadcrumb for tracking
    Sentry.addBreadcrumb({
      category: "track",
      message: eventName,
      level: "info",
      data: properties,
    });
  }

  /**
   * Create a child logger with a specific prefix
   */
  child(prefix: string): Logger {
    const childPrefix = this.prefix
      ? `${this.prefix.slice(1, -1)}:${prefix}`
      : prefix;
    return new Logger(childPrefix);
  }
}

// Default logger instance
export const logger = new Logger();

// Factory function for creating prefixed loggers
export const createLogger = (prefix: string): Logger => new Logger(prefix);

// Pre-configured loggers for common modules
export const authLogger = createLogger("Auth");
export const apiLogger = createLogger("API");
export const notificationLogger = createLogger("Notifications");
export const cacheLogger = createLogger("Cache");
export const performanceLogger = createLogger("Performance");
export const storageLogger = createLogger("Storage");
export const biometricsLogger = createLogger("Biometrics");
export const navigationLogger = createLogger("Navigation");

export default logger;
