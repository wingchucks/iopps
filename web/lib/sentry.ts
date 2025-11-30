import * as Sentry from "@sentry/nextjs";

/**
 * Sentry Configuration for Next.js Web Application
 *
 * This module initializes Sentry error monitoring and performance tracking
 * for the web application. It should be imported in the app entry point.
 */

export interface SentryUser {
  id: string;
  email?: string;
  username?: string;
  role?: string;
}

/**
 * Initialize Sentry for the web application
 * Call this in your app initialization (e.g., in instrumentation.ts or _app.tsx)
 */
export function initSentry() {
  const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;
  const environment = process.env.NODE_ENV;
  const isProduction = environment === "production";

  // Only initialize if DSN is provided
  if (!SENTRY_DSN) {
    console.warn("Sentry DSN not found. Error monitoring is disabled.");
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,

    // Environment configuration
    environment,
    enabled: isProduction,

    // Performance Monitoring
    tracesSampleRate: isProduction ? 0.1 : 1.0, // 10% in production, 100% in dev

    // Session Replay (optional)
    replaysSessionSampleRate: 0.1, // 10% of sessions
    replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors

    // Release tracking
    release: process.env.NEXT_PUBLIC_APP_VERSION || "unknown",

    // Error filtering
    beforeSend(event, hint) {
      // Filter out development errors
      if (!isProduction) {
        console.log("Sentry Event (dev mode):", event);
      }

      // Don't send events in development
      if (!isProduction) {
        return null;
      }

      // Filter out certain error types
      const error = hint.originalException;
      if (error && typeof error === "object" && "message" in error) {
        const message = String(error.message);

        // Ignore known noise
        if (
          message.includes("ResizeObserver loop") ||
          message.includes("Non-Error promise rejection") ||
          message.includes("ChunkLoadError")
        ) {
          return null;
        }
      }

      return event;
    },

    // Integrations
    integrations: [
      new Sentry.BrowserTracing({
        // Trace navigation and API requests
        tracePropagationTargets: [
          "localhost",
          /^https:\/\/.*\.vercel\.app/,
          /^https:\/\/.*\.yourdomain\.com/,
        ],
      }),
      new Sentry.Replay({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],

    // Breadcrumbs configuration
    maxBreadcrumbs: 50,

    // Debug mode (only in development)
    debug: !isProduction,

    // Ignore certain URLs
    ignoreErrors: [
      // Browser extensions
      "top.GLOBALS",
      "canvas.contentDocument",
      "MyApp_RemoveAllHighlights",
      "atomicFindClose",
      // Network errors
      "NetworkError",
      "Network request failed",
      // Third-party errors
      "fb_xd_fragment",
      "Non-Error promise rejection captured",
    ],
  });

  console.log(`Sentry initialized in ${environment} mode`);
}

/**
 * Set user context for Sentry
 * Call this after user authentication
 */
export function setSentryUser(user: SentryUser) {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.username,
    role: user.role,
  });
}

/**
 * Clear user context from Sentry
 * Call this after user logout
 */
export function clearSentryUser() {
  Sentry.setUser(null);
}

/**
 * Add custom context to Sentry
 */
export function setSentryContext(key: string, context: Record<string, unknown>) {
  Sentry.setContext(key, context);
}

/**
 * Add tags to Sentry events
 */
export function setSentryTag(key: string, value: string) {
  Sentry.setTag(key, value);
}

/**
 * Manually capture an exception
 */
export function captureException(error: Error, context?: Record<string, unknown>) {
  if (context) {
    Sentry.withScope((scope) => {
      Object.entries(context).forEach(([key, value]) => {
        scope.setContext(key, value as Record<string, unknown>);
      });
      Sentry.captureException(error);
    });
  } else {
    Sentry.captureException(error);
  }
}

/**
 * Manually capture a message
 */
export function captureMessage(
  message: string,
  level: Sentry.SeverityLevel = "info"
) {
  Sentry.captureMessage(message, level);
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(
  message: string,
  data?: Record<string, unknown>,
  level: Sentry.SeverityLevel = "info"
) {
  Sentry.addBreadcrumb({
    message,
    level,
    data,
    timestamp: Date.now() / 1000,
  });
}

/**
 * Start a new Sentry transaction for performance monitoring
 */
export function startTransaction(
  name: string,
  op: string
): Sentry.Transaction | undefined {
  return Sentry.startTransaction({
    name,
    op,
  });
}

/**
 * Error boundary helper - wrap async functions to catch errors
 */
export function withSentry<T extends (...args: any[]) => any>(
  fn: T,
  context?: Record<string, unknown>
): T {
  return ((...args: Parameters<T>) => {
    try {
      const result = fn(...args);

      // Handle async functions
      if (result instanceof Promise) {
        return result.catch((error) => {
          captureException(error, context);
          throw error;
        });
      }

      return result;
    } catch (error) {
      captureException(error as Error, context);
      throw error;
    }
  }) as T;
}

/**
 * Profile async operations for performance monitoring
 */
export async function profileAsync<T>(
  name: string,
  operation: () => Promise<T>
): Promise<T> {
  const transaction = startTransaction(name, "function");

  try {
    const result = await operation();
    transaction?.setStatus("ok");
    return result;
  } catch (error) {
    transaction?.setStatus("internal_error");
    captureException(error as Error, { operation: name });
    throw error;
  } finally {
    transaction?.finish();
  }
}

/**
 * Set up global error handlers
 */
export function setupGlobalErrorHandlers() {
  // Unhandled promise rejections
  if (typeof window !== "undefined") {
    window.addEventListener("unhandledrejection", (event) => {
      captureException(
        new Error(`Unhandled Promise Rejection: ${event.reason}`),
        {
          reason: event.reason,
          promise: "unhandledrejection",
        }
      );
    });
  }
}

// Export Sentry for direct access if needed
export { Sentry };
