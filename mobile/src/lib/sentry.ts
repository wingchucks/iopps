import * as Sentry from "@sentry/react-native";
import { Platform } from "react-native";
import Constants from "expo-constants";

/**
 * Sentry Configuration for React Native (Expo) Mobile Application
 *
 * This module initializes Sentry error monitoring and performance tracking
 * for the mobile application. It should be imported in App.tsx.
 */

export interface SentryUser {
  id: string;
  email?: string;
  username?: string;
  role?: string;
}

/**
 * Initialize Sentry for the mobile application
 * Call this in your App.tsx before rendering the app
 */
export function initSentry() {
  const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;
  const environment = __DEV__ ? "development" : "production";
  const isProduction = !__DEV__;

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

    // Profile sampling rate
    profilesSampleRate: isProduction ? 0.1 : 1.0,

    // Release and distribution tracking
    release: Constants.expoConfig?.version || "unknown",
    dist: Platform.OS === "ios"
      ? Constants.expoConfig?.ios?.buildNumber
      : Constants.expoConfig?.android?.versionCode?.toString(),

    // Enable native crashes
    enableNative: true,
    enableNativeCrashHandling: true,

    // Enable auto session tracking
    enableAutoSessionTracking: true,
    sessionTrackingIntervalMillis: 30000,

    // Error filtering
    beforeSend(event, hint) {
      // Filter out development errors
      if (__DEV__) {
        console.log("Sentry Event (dev mode):", event);
      }

      // Don't send events in development
      if (__DEV__) {
        return null;
      }

      // Filter out certain error types
      const error = hint.originalException;
      if (error && typeof error === "object" && "message" in error) {
        const message = String(error.message);

        // Ignore known noise
        if (
          message.includes("Network request failed") ||
          message.includes("Aborted") ||
          message.includes("timeout of 0ms exceeded")
        ) {
          return null;
        }
      }

      return event;
    },

    // Integrations
    integrations: [
      new Sentry.ReactNativeTracing({
        // Trace navigation
        routingInstrumentation: new Sentry.ReactNavigationInstrumentation(),

        // Enable automatic performance monitoring
        enableStallTracking: true,
        enableAppStartTracking: true,
        enableNativeFramesTracking: true,

        // Trace API requests
        tracePropagationTargets: [
          "localhost",
          /^https:\/\/.*\.vercel\.app/,
          /^https:\/\/.*\.yourdomain\.com/,
        ],
      }),
    ],

    // Breadcrumbs configuration
    maxBreadcrumbs: 50,

    // Debug mode (only in development)
    debug: __DEV__,

    // Attach stack trace to messages
    attachStacktrace: true,

    // Ignore certain errors
    ignoreErrors: [
      "Network request failed",
      "Aborted",
      "timeout of 0ms exceeded",
      "cancelled",
      "Non-Error promise rejection captured",
    ],
  });

  // Set platform context
  Sentry.setContext("device", {
    platform: Platform.OS,
    version: Platform.Version,
    manufacturer: Constants.deviceName,
    model: Constants.platform?.[Platform.OS === "ios" ? "ios" : "android"]?.model,
  });

  // Set app context
  Sentry.setContext("app", {
    name: Constants.expoConfig?.name,
    version: Constants.expoConfig?.version,
    buildNumber: Platform.OS === "ios"
      ? Constants.expoConfig?.ios?.buildNumber
      : Constants.expoConfig?.android?.versionCode,
    expo: Constants.expoConfig?.sdkVersion,
  });

  console.log(`Sentry initialized in ${environment} mode for ${Platform.OS}`);
}

/**
 * Set up navigation tracking for Sentry
 * Call this in your navigation container
 *
 * Example (Expo Router):
 * ```tsx
 * import { useNavigationContainerRef } from 'expo-router';
 *
 * export default function Layout() {
 *   const navigationRef = useNavigationContainerRef();
 *
 *   useEffect(() => {
 *     if (navigationRef) {
 *       setupNavigationTracking(navigationRef);
 *     }
 *   }, [navigationRef]);
 *
 *   return <Slot />;
 * }
 * ```
 */
export function setupNavigationTracking(navigationRef: any) {
  const routingInstrumentation = new Sentry.ReactNavigationInstrumentation();

  routingInstrumentation.registerNavigationContainer(navigationRef);

  return routingInstrumentation;
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
 * Wrap React Native components with Sentry error boundary
 */
export function withSentryErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  options?: {
    fallback?: React.ComponentType<{ error: Error; resetError: () => void }>;
    showDialog?: boolean;
  }
) {
  return Sentry.wrap(Component, {
    touchEventBoundaryProps: { labelName: Component.displayName || Component.name },
  });
}

/**
 * Native crash test (for testing only)
 * DO NOT USE IN PRODUCTION
 */
export function nativeCrash() {
  if (__DEV__) {
    Sentry.nativeCrash();
  } else {
    console.warn("nativeCrash() is only available in development mode");
  }
}

/**
 * Flush Sentry events
 * Useful before app shutdown or navigation
 */
export async function flushSentry(timeout: number = 2000): Promise<boolean> {
  return Sentry.flush(timeout);
}

/**
 * Close Sentry SDK
 * Call this when app is being shut down
 */
export async function closeSentry(timeout: number = 2000): Promise<boolean> {
  return Sentry.close(timeout);
}

// Export Sentry for direct access if needed
export { Sentry };
