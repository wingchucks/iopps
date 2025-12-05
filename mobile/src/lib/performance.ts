/**
 * Mobile Performance Monitoring Utilities
 * Tracks app startup, screen renders, API calls, and memory usage
 */

import { Platform } from 'react-native';
import { performanceLogger } from './logger';

export interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

export interface ScreenMetric {
  screenName: string;
  renderTime: number;
  timestamp: number;
}

export interface ApiMetric {
  endpoint: string;
  method: string;
  duration: number;
  status?: number;
  timestamp: number;
}

export interface MemoryInfo {
  usedMemory: number;
  totalMemory: number;
  timestamp: number;
}

/**
 * Send metrics to analytics endpoint
 */
async function sendToAnalytics(metric: PerformanceMetric): Promise<void> {
  if (__DEV__) return; // Don't send in development

  try {
    const response = await fetch(
      `${process.env.EXPO_PUBLIC_API_URL || ''}/api/analytics/performance`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...metric,
          platform: Platform.OS,
          platformVersion: Platform.Version,
          timestamp: Date.now(),
        }),
      }
    );

    if (!response.ok) {
      performanceLogger.error('Failed to send performance metric:', response.status);
    }
  } catch (error) {
    performanceLogger.error('Failed to send performance metric:', error);
  }
}

/**
 * App Startup Tracking
 */
export class AppStartupTracker {
  private static startTime: number | null = null;
  private static initialized = false;

  /**
   * Mark the app startup time (call this as early as possible in App.tsx)
   */
  static markStart(): void {
    if (this.startTime !== null) return;
    this.startTime = Date.now();

    if (__DEV__) {
      performanceLogger.log('[Performance] App startup marked');
    }
  }

  /**
   * Mark the app as fully initialized and calculate startup time
   */
  static markInitialized(): void {
    if (this.initialized || this.startTime === null) return;

    const startupTime = Date.now() - this.startTime;
    this.initialized = true;

    if (__DEV__) {
      performanceLogger.log(`[Performance] App startup completed in ${startupTime}ms`);
    }

    // Send to analytics
    sendToAnalytics({
      name: 'app-startup',
      value: startupTime,
      timestamp: Date.now(),
      metadata: {
        platform: Platform.OS,
      },
    });
  }

  /**
   * Get the current startup duration (useful for debugging)
   */
  static getCurrentDuration(): number | null {
    if (this.startTime === null) return null;
    return Date.now() - this.startTime;
  }

  /**
   * Reset the tracker (useful for testing)
   */
  static reset(): void {
    this.startTime = null;
    this.initialized = false;
  }
}

/**
 * Screen Render Time Tracking
 */
export class ScreenPerformanceTracker {
  private static screenTimes = new Map<string, number>();
  private static metrics: ScreenMetric[] = [];
  private static readonly MAX_METRICS = 100;

  /**
   * Mark the start of screen rendering
   */
  static markScreenStart(screenName: string): void {
    this.screenTimes.set(screenName, Date.now());

    if (__DEV__) {
      performanceLogger.log(`[Performance] Screen render start: ${screenName}`);
    }
  }

  /**
   * Mark the end of screen rendering and calculate duration
   */
  static markScreenEnd(screenName: string): number | null {
    const startTime = this.screenTimes.get(screenName);
    if (!startTime) return null;

    const renderTime = Date.now() - startTime;
    this.screenTimes.delete(screenName);

    const metric: ScreenMetric = {
      screenName,
      renderTime,
      timestamp: Date.now(),
    };

    this.metrics.push(metric);

    // Keep only last MAX_METRICS entries
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics.shift();
    }

    if (__DEV__) {
      performanceLogger.log(`[Performance] Screen render complete: ${screenName} in ${renderTime}ms`);
    }

    // Send to analytics for slow renders (>500ms)
    if (renderTime > 500) {
      sendToAnalytics({
        name: 'screen-render',
        value: renderTime,
        timestamp: Date.now(),
        metadata: {
          screenName,
          platform: Platform.OS,
        },
      });
    }

    return renderTime;
  }

  /**
   * Get all tracked screen metrics
   */
  static getMetrics(): ScreenMetric[] {
    return [...this.metrics];
  }

  /**
   * Get average render time for a screen
   */
  static getAverageRenderTime(screenName?: string): number {
    const filteredMetrics = screenName
      ? this.metrics.filter((m) => m.screenName === screenName)
      : this.metrics;

    if (filteredMetrics.length === 0) return 0;

    const total = filteredMetrics.reduce((sum, m) => sum + m.renderTime, 0);
    return total / filteredMetrics.length;
  }

  /**
   * Clear all metrics
   */
  static clearMetrics(): void {
    this.metrics = [];
    this.screenTimes.clear();
  }
}

/**
 * API Performance Tracking
 */
export class ApiPerformanceTracker {
  private static metrics: ApiMetric[] = [];
  private static readonly MAX_METRICS = 100;

  /**
   * Track an API request
   */
  static track(
    endpoint: string,
    method: string,
    duration: number,
    status?: number
  ): void {
    const metric: ApiMetric = {
      endpoint,
      method,
      duration,
      status,
      timestamp: Date.now(),
    };

    this.metrics.push(metric);

    // Keep only last MAX_METRICS entries
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics.shift();
    }

    if (__DEV__) {
      performanceLogger.log(`[API Performance] ${method} ${endpoint}: ${duration}ms`, {
        status,
      });
    }

    // Send to analytics for slow requests (>1s)
    if (duration > 1000) {
      sendToAnalytics({
        name: 'api-response-time',
        value: duration,
        timestamp: Date.now(),
        metadata: {
          endpoint,
          method,
          status,
          platform: Platform.OS,
        },
      });
    }
  }

  /**
   * Get all tracked metrics
   */
  static getMetrics(): ApiMetric[] {
    return [...this.metrics];
  }

  /**
   * Get average response time for an endpoint
   */
  static getAverageResponseTime(endpoint?: string): number {
    const filteredMetrics = endpoint
      ? this.metrics.filter((m) => m.endpoint === endpoint)
      : this.metrics;

    if (filteredMetrics.length === 0) return 0;

    const total = filteredMetrics.reduce((sum, m) => sum + m.duration, 0);
    return total / filteredMetrics.length;
  }

  /**
   * Clear all metrics
   */
  static clearMetrics(): void {
    this.metrics = [];
  }
}

/**
 * Memory Usage Monitoring (Development Only)
 */
export class MemoryMonitor {
  private static metrics: MemoryInfo[] = [];
  private static intervalId: NodeJS.Timeout | null = null;

  /**
   * Start monitoring memory usage
   * Only works in development mode
   */
  static startMonitoring(intervalMs = 5000): void {
    if (!__DEV__) return;
    if (this.intervalId !== null) return;

    performanceLogger.log('[Performance] Starting memory monitoring');

    this.intervalId = setInterval(() => {
      this.captureMemoryUsage();
    }, intervalMs);

    // Capture initial reading
    this.captureMemoryUsage();
  }

  /**
   * Stop monitoring memory usage
   */
  static stopMonitoring(): void {
    if (this.intervalId === null) return;

    clearInterval(this.intervalId);
    this.intervalId = null;

    if (__DEV__) {
      performanceLogger.log('[Performance] Stopped memory monitoring');
    }
  }

  /**
   * Capture current memory usage
   * Note: This is a placeholder. Actual implementation depends on platform
   * For iOS: Use native modules or react-native-device-info
   * For Android: Use native modules or react-native-device-info
   */
  private static captureMemoryUsage(): void {
    // This is a simplified version. In production, you would use:
    // import DeviceInfo from 'react-native-device-info';
    // const usedMemory = await DeviceInfo.getUsedMemory();
    // const totalMemory = await DeviceInfo.getTotalMemory();

    const metric: MemoryInfo = {
      usedMemory: 0, // Placeholder
      totalMemory: 0, // Placeholder
      timestamp: Date.now(),
    };

    this.metrics.push(metric);

    // Keep only last 100 readings
    if (this.metrics.length > 100) {
      this.metrics.shift();
    }

    if (__DEV__ && this.metrics.length % 6 === 0) {
      // Log every ~30 seconds if interval is 5s
      performanceLogger.log('[Memory] Memory usage captured:', metric);
    }
  }

  /**
   * Get all memory metrics
   */
  static getMetrics(): MemoryInfo[] {
    return [...this.metrics];
  }

  /**
   * Get current memory usage
   */
  static getCurrentUsage(): MemoryInfo | null {
    return this.metrics[this.metrics.length - 1] || null;
  }

  /**
   * Clear all metrics
   */
  static clearMetrics(): void {
    this.metrics = [];
  }
}

/**
 * Custom Performance Markers
 */
export class PerformanceMarker {
  private static marks = new Map<string, number>();

  /**
   * Mark the start of a performance measurement
   */
  static mark(name: string): void {
    this.marks.set(name, Date.now());

    if (__DEV__) {
      performanceLogger.log(`[Performance Mark] ${name}`);
    }
  }

  /**
   * Measure the duration from a mark to now
   */
  static measure(name: string, startMark?: string): number | null {
    const markName = startMark || name;
    const startTime = this.marks.get(markName);

    if (!startTime) {
      performanceLogger.warn(`[Performance] No mark found for: ${markName}`);
      return null;
    }

    const duration = Date.now() - startTime;

    if (__DEV__) {
      performanceLogger.log(`[Performance Measure] ${name}: ${duration}ms`);
    }

    // Send to analytics
    sendToAnalytics({
      name: `custom-${name}`,
      value: duration,
      timestamp: Date.now(),
      metadata: {
        platform: Platform.OS,
      },
    });

    // Clean up
    this.marks.delete(markName);

    return duration;
  }

  /**
   * Get the duration from a mark without clearing it
   */
  static getDuration(name: string): number | null {
    const startTime = this.marks.get(name);
    if (!startTime) return null;
    return Date.now() - startTime;
  }

  /**
   * Clear a specific mark
   */
  static clearMark(name: string): void {
    this.marks.delete(name);
  }

  /**
   * Clear all marks
   */
  static clearAllMarks(): void {
    this.marks.clear();
  }
}

/**
 * Wrapper for fetch to automatically track API performance
 */
export async function monitoredFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const startTime = Date.now();
  const url = typeof input === 'string' ? input : input.toString();
  const method = init?.method || 'GET';

  try {
    const response = await fetch(input, init);
    const duration = Date.now() - startTime;

    ApiPerformanceTracker.track(url, method, duration, response.status);

    return response;
  } catch (error) {
    const duration = Date.now() - startTime;
    ApiPerformanceTracker.track(url, method, duration);
    throw error;
  }
}

/**
 * Initialize performance monitoring for the mobile app
 * Call this early in App.tsx
 */
export function initPerformanceMonitoring(): void {
  // Mark app startup
  AppStartupTracker.markStart();

  // Start memory monitoring in development
  if (__DEV__) {
    MemoryMonitor.startMonitoring(10000); // Every 10 seconds
  }

  if (__DEV__) {
    performanceLogger.log('[Performance] Mobile performance monitoring initialized');
  }
}

/**
 * Log performance summary (useful for debugging)
 */
export function logPerformanceSummary(): void {
  if (!__DEV__) return;

  performanceLogger.log('📱 Performance Summary');

  // App Startup
  const startupDuration = AppStartupTracker.getCurrentDuration();
  if (startupDuration !== null) {
    performanceLogger.log('App Startup:', `${startupDuration}ms`);
  }

  // Screen Metrics
  const screenMetrics = ScreenPerformanceTracker.getMetrics();
  if (screenMetrics.length > 0) {
    performanceLogger.log('Screen Renders:', {
      count: screenMetrics.length,
      average: `${ScreenPerformanceTracker.getAverageRenderTime().toFixed(2)}ms`,
    });
  }

  // API Metrics
  const apiMetrics = ApiPerformanceTracker.getMetrics();
  if (apiMetrics.length > 0) {
    performanceLogger.log('API Requests:', {
      count: apiMetrics.length,
      average: `${ApiPerformanceTracker.getAverageResponseTime().toFixed(2)}ms`,
    });
  }

  // Memory
  const memoryUsage = MemoryMonitor.getCurrentUsage();
  if (memoryUsage) {
    performanceLogger.log('Memory Usage:', memoryUsage);
  }
}

/**
 * Export all trackers for easy access
 */
export const Performance = {
  AppStartup: AppStartupTracker,
  Screen: ScreenPerformanceTracker,
  Api: ApiPerformanceTracker,
  Memory: MemoryMonitor,
  Marker: PerformanceMarker,
  init: initPerformanceMonitoring,
  logSummary: logPerformanceSummary,
};
