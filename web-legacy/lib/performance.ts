/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Web Performance Monitoring Utilities
 * Tracks Core Web Vitals and custom performance metrics
 */

export interface PerformanceMetric {
  name: string;
  value: number;
  rating?: 'good' | 'needs-improvement' | 'poor';
  delta?: number;
  id?: string;
  navigationType?: string;
}

export interface WebVitalsMetric {
  id: string;
  name: 'CLS' | 'FCP' | 'LCP' | 'TTFB' | 'INP';
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  navigationType: 'navigate' | 'reload' | 'back-forward' | 'back-forward-cache' | 'prerender' | 'restore';
  entries: PerformanceEntry[];
}

export interface ApiMetric {
  endpoint: string;
  method: string;
  duration: number;
  status?: number;
  timestamp: number;
}

export interface CustomMetric {
  name: string;
  startTime: number;
  duration?: number;
  metadata?: Record<string, any>;
}

// Core Web Vitals thresholds (in milliseconds, except CLS which is unitless)
const THRESHOLDS = {
  LCP: { good: 2500, poor: 4000 },
  CLS: { good: 0.1, poor: 0.25 },
  TTFB: { good: 800, poor: 1800 },
  INP: { good: 200, poor: 500 },
  FCP: { good: 1800, poor: 3000 },
};

/**
 * Get performance rating based on value and thresholds
 */
function getRating(
  name: keyof typeof THRESHOLDS,
  value: number
): 'good' | 'needs-improvement' | 'poor' {
  const threshold = THRESHOLDS[name];
  if (value <= threshold.good) return 'good';
  if (value <= threshold.poor) return 'needs-improvement';
  return 'poor';
}

/**
 * Send metrics to analytics endpoint
 */
async function sendToAnalytics(metric: PerformanceMetric): Promise<void> {
  if (typeof window === 'undefined') return;

  const body = JSON.stringify({
    ...metric,
    url: window.location.href,
    userAgent: navigator.userAgent,
    timestamp: Date.now(),
  });

  // Use sendBeacon if available (non-blocking)
  if (navigator.sendBeacon) {
    navigator.sendBeacon('/api/analytics/performance', body);
  } else {
    // Fallback to fetch with keepalive
    fetch('/api/analytics/performance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch((error) => {
      console.error('Failed to send performance metric:', error);
    });
  }
}

/**
 * Track Core Web Vitals using web-vitals library
 * This expects web-vitals to be installed: npm install web-vitals
 */
export async function trackWebVitals(
  onMetric?: (metric: WebVitalsMetric) => void
): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    const { onCLS, onFCP, onLCP, onTTFB, onINP } = await import('web-vitals');

    const handleMetric = (metric: WebVitalsMetric) => {
      // Log in development
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Performance] ${metric.name}:`, {
          value: metric.value,
          rating: metric.rating,
          delta: metric.delta,
        });
      }

      // Send to analytics in production
      if (process.env.NODE_ENV === 'production') {
        sendToAnalytics({
          name: metric.name,
          value: metric.value,
          rating: metric.rating,
          delta: metric.delta,
          id: metric.id,
          navigationType: metric.navigationType,
        });
      }

      // Call custom handler if provided
      onMetric?.(metric);
    };

    // Track all Core Web Vitals (FID replaced by INP in web-vitals v4)
    onCLS(handleMetric);
    onFCP(handleMetric);
    onLCP(handleMetric);
    onTTFB(handleMetric);
    onINP(handleMetric);
  } catch (error) {
    console.error('Failed to load web-vitals library:', error);
  }
}

/**
 * Report Web Vitals for Next.js
 * Use in pages/_app.tsx: export { reportWebVitals } from '@/lib/performance'
 */
export function reportWebVitals(metric: {
  id: string;
  name: string;
  label: string;
  value: number;
  startTime?: number;
}): void {
  const performanceMetric: PerformanceMetric = {
    name: metric.name,
    value: metric.value,
    id: metric.id,
  };

  // Add rating for supported metrics
  if (metric.name in THRESHOLDS) {
    performanceMetric.rating = getRating(
      metric.name as keyof typeof THRESHOLDS,
      metric.value
    );
  }

  // Log in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Next.js Performance] ${metric.name}:`, {
      value: metric.value,
      label: metric.label,
      rating: performanceMetric.rating,
    });
  }

  // Send to analytics in production
  if (process.env.NODE_ENV === 'production') {
    sendToAnalytics(performanceMetric);
  }
}

/**
 * Custom Performance Marks and Measures
 */
export class PerformanceMonitor {
  private static marks = new Map<string, number>();

  /**
   * Mark the start of a performance measurement
   */
  static mark(name: string): void {
    if (typeof performance === 'undefined') return;

    const markName = `iopps-${name}`;
    performance.mark(markName);
    this.marks.set(name, performance.now());

    if (process.env.NODE_ENV === 'development') {
      console.log(`[Performance Mark] ${name}`);
    }
  }

  /**
   * Measure the duration from a mark to now
   */
  static measure(name: string, startMark?: string): number | null {
    if (typeof performance === 'undefined') return null;

    const measureName = `iopps-measure-${name}`;
    const startMarkName = startMark ? `iopps-${startMark}` : `iopps-${name}`;

    try {
      performance.measure(measureName, startMarkName);
      const measure = performance.getEntriesByName(measureName)[0] as PerformanceMeasure;
      const duration = measure.duration;

      if (process.env.NODE_ENV === 'development') {
        console.log(`[Performance Measure] ${name}: ${duration.toFixed(2)}ms`);
      }

      // Send to analytics in production
      if (process.env.NODE_ENV === 'production') {
        sendToAnalytics({
          name: `custom-${name}`,
          value: duration,
        });
      }

      // Clean up
      performance.clearMarks(startMarkName);
      performance.clearMeasures(measureName);
      this.marks.delete(startMark || name);

      return duration;
    } catch (error) {
      console.error(`Failed to measure ${name}:`, error);
      return null;
    }
  }

  /**
   * Get the duration from a mark without clearing it
   */
  static getDuration(name: string): number | null {
    const startTime = this.marks.get(name);
    if (!startTime) return null;
    return performance.now() - startTime;
  }

  /**
   * Clear a specific mark
   */
  static clearMark(name: string): void {
    if (typeof performance === 'undefined') return;
    performance.clearMarks(`iopps-${name}`);
    this.marks.delete(name);
  }

  /**
   * Clear all marks
   */
  static clearAllMarks(): void {
    if (typeof performance === 'undefined') return;
    this.marks.forEach((_, name) => {
      performance.clearMarks(`iopps-${name}`);
    });
    this.marks.clear();
  }
}

/**
 * Track API response times
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

    if (process.env.NODE_ENV === 'development') {
      console.log(`[API Performance] ${method} ${endpoint}: ${duration.toFixed(2)}ms`, {
        status,
      });
    }

    // Send to analytics in production for slow requests (>1s)
    if (process.env.NODE_ENV === 'production' && duration > 1000) {
      sendToAnalytics({
        name: 'api-response-time',
        value: duration,
        rating: duration > 3000 ? 'poor' : duration > 1500 ? 'needs-improvement' : 'good',
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
 * Wrapper for fetch to automatically track API performance
 */
export async function monitoredFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const startTime = performance.now();
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  const method = init?.method || 'GET';

  try {
    const response = await fetch(input, init);
    const duration = performance.now() - startTime;

    ApiPerformanceTracker.track(url, method, duration, response.status);

    return response;
  } catch (error) {
    const duration = performance.now() - startTime;
    ApiPerformanceTracker.track(url, method, duration);
    throw error;
  }
}

/**
 * Get performance navigation timing
 */
export function getNavigationTiming(): Record<string, number> | null {
  if (typeof window === 'undefined' || !window.performance || !window.performance.timing) {
    return null;
  }

  const timing = window.performance.timing;
  const navigationStart = timing.navigationStart;

  return {
    // Network
    dns: timing.domainLookupEnd - timing.domainLookupStart,
    tcp: timing.connectEnd - timing.connectStart,
    request: timing.responseStart - timing.requestStart,
    response: timing.responseEnd - timing.responseStart,

    // Processing
    domParsing: timing.domInteractive - timing.domLoading,
    domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
    domComplete: timing.domComplete - timing.navigationStart,

    // Load
    pageLoad: timing.loadEventEnd - timing.navigationStart,

    // Time to first byte
    ttfb: timing.responseStart - timing.navigationStart,
  };
}

/**
 * Log performance summary (useful for debugging)
 */
export function logPerformanceSummary(): void {
  if (typeof window === 'undefined') return;

  console.group('🚀 Performance Summary');

  // Navigation Timing
  const navTiming = getNavigationTiming();
  if (navTiming) {
    console.log('Navigation Timing:', navTiming);
  }

  // API Performance
  const apiMetrics = ApiPerformanceTracker.getMetrics();
  if (apiMetrics.length > 0) {
    console.log('API Requests:', {
      count: apiMetrics.length,
      average: `${ApiPerformanceTracker.getAverageResponseTime().toFixed(2)}ms`,
    });
  }

  // Resource Timing
  if (performance.getEntriesByType) {
    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    const totalSize = resources.reduce((sum, r) => sum + (r.transferSize || 0), 0);
    console.log('Resources:', {
      count: resources.length,
      totalSize: `${(totalSize / 1024).toFixed(2)} KB`,
    });
  }

  console.groupEnd();
}

/**
 * Initialize performance monitoring
 */
export function initPerformanceMonitoring(): void {
  if (typeof window === 'undefined') return;

  // Track web vitals
  trackWebVitals();

  // Log performance summary in development
  if (process.env.NODE_ENV === 'development') {
    window.addEventListener('load', () => {
      setTimeout(() => {
        logPerformanceSummary();
      }, 0);
    });
  }
}
