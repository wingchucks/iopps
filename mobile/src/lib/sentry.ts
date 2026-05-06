import * as Sentry from "@sentry/react-native";
import type { ComponentType } from "react";
import type { Span } from "@sentry/core";
import { Platform } from "react-native";
import Constants from "expo-constants";

/**
 * Sentry Configuration for React Native (Expo) Mobile Application
 */

export interface SentryUser {
  id: string;
  email?: string;
  username?: string;
  role?: string;
}

const navigationIntegration = Sentry.reactNavigationIntegration();

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
    environment,
    enabled: isProduction,
    tracesSampleRate: isProduction ? 0.1 : 1.0,
    profilesSampleRate: isProduction ? 0.1 : 1.0,
    release: Constants.expoConfig?.version || "unknown",
    dist: Platform.OS === "ios"
      ? Constants.expoConfig?.ios?.buildNumber
      : Constants.expoConfig?.android?.versionCode?.toString(),
    enableNative: true,
    enableNativeCrashHandling: true,
    enableAutoSessionTracking: true,
    sessionTrackingIntervalMillis: 30000,

    beforeSend(event, hint) {
      if (__DEV__) {
        console.log("Sentry Event (dev mode):", event);
        return null;
      }

      const error = hint.originalException;
      if (error && typeof error === "object" && "message" in error) {
        const message = String(error.message);
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

    integrations: [
      Sentry.reactNativeTracingIntegration({
        shouldCreateSpanForRequest: (url: string) =>
          url.includes("localhost") ||
          /^https:\/\/.*\.vercel\.app/.test(url) ||
          /^https:\/\/.*\.iopps\.ca/.test(url),
      }),
      navigationIntegration,
    ],

    maxBreadcrumbs: 50,
    debug: __DEV__,
    attachStacktrace: true,
    ignoreErrors: [
      "Network request failed",
      "Aborted",
      "timeout of 0ms exceeded",
      "cancelled",
      "Non-Error promise rejection captured",
    ],
  });

  Sentry.setContext("device", {
    platform: Platform.OS,
    version: Platform.Version,
    manufacturer: Constants.deviceName,
    model: Constants.platform?.[Platform.OS === "ios" ? "ios" : "android"]?.model,
  });

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

/** Set up navigation tracking for Sentry. */
export function setupNavigationTracking(navigationRef: unknown) {
  navigationIntegration.registerNavigationContainer(navigationRef);
  return navigationIntegration;
}

export function setSentryUser(user: SentryUser) {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.username,
    role: user.role,
  });
}

export function clearSentryUser() {
  Sentry.setUser(null);
}

export function setSentryContext(key: string, context: Record<string, unknown>) {
  Sentry.setContext(key, context);
}

export function setSentryTag(key: string, value: string) {
  Sentry.setTag(key, value);
}

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

export function captureMessage(
  message: string,
  level: Sentry.SeverityLevel = "info"
) {
  Sentry.captureMessage(message, level);
}

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

/** Start a new Sentry span for performance monitoring. */
export function startTransaction(name: string, op: string): Span | undefined {
  return Sentry.startInactiveSpan({ name, op });
}

export function withSentry<T extends (...args: any[]) => any>(
  fn: T,
  context?: Record<string, unknown>
): T {
  return ((...args: Parameters<T>) => {
    try {
      const result = fn(...args);

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

export async function profileAsync<T>(
  name: string,
  operation: () => Promise<T>
): Promise<T> {
  const transaction = startTransaction(name, "function");

  try {
    const result = await operation();
    transaction?.setStatus({ code: 1, message: "ok" });
    return result;
  } catch (error) {
    transaction?.setStatus({ code: 2, message: "internal_error" });
    captureException(error as Error, { operation: name });
    throw error;
  } finally {
    transaction?.end();
  }
}

export function withSentryErrorBoundary<P extends object>(
  Component: ComponentType<P>,
  options?: {
    fallback?: ComponentType<{ error: Error; resetError: () => void }>;
    showDialog?: boolean;
  }
) {
  void options;
  return Sentry.wrap(Component as ComponentType<Record<string, unknown>>) as ComponentType<P>;
}

export function nativeCrash() {
  if (__DEV__) {
    Sentry.nativeCrash();
  } else {
    console.warn("nativeCrash() is only available in development mode");
  }
}

export async function flushSentry(timeout: number = 2000): Promise<boolean> {
  void timeout;
  return Sentry.flush();
}

export async function closeSentry(timeout: number = 2000): Promise<boolean> {
  void timeout;
  await Sentry.close();
  return true;
}

export { Sentry };
