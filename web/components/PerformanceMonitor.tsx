'use client';

/**
 * Performance Monitor Component
 * Initializes web vitals tracking and monitors route changes
 */

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { trackWebVitals, PerformanceMonitor as PM, type WebVitalsMetric } from '@/lib/performance';

interface PerformanceMonitorProps {
  /**
   * Whether to enable performance monitoring
   * @default true in production, false in development
   */
  enabled?: boolean;

  /**
   * Callback when a web vital is measured
   */
  onMetric?: (metric: WebVitalsMetric) => void;

  /**
   * Whether to track route changes
   * @default true
   */
  trackRouteChanges?: boolean;
}

export default function PerformanceMonitor({
  enabled = process.env.NODE_ENV === 'production',
  onMetric,
  trackRouteChanges = true,
}: PerformanceMonitorProps) {
  const pathname = usePathname();
  const previousPathname = useRef<string | null>(null);
  const isInitialized = useRef(false);

  // Initialize web vitals tracking on mount
  useEffect(() => {
    if (!enabled || isInitialized.current) return;

    isInitialized.current = true;

    // Track web vitals
    trackWebVitals(onMetric);

    if (process.env.NODE_ENV === 'development') {
      console.log('[PerformanceMonitor] Web vitals tracking initialized');
    }
  }, [enabled, onMetric]);

  // Track route changes
  useEffect(() => {
    if (!enabled || !trackRouteChanges) return;

    // Skip on initial render
    if (previousPathname.current === null) {
      previousPathname.current = pathname;
      return;
    }

    // Route changed
    if (previousPathname.current !== pathname) {
      const startMark = `route-change-${Date.now()}`;

      // Mark the start of the route change
      PM.mark(startMark);

      if (process.env.NODE_ENV === 'development') {
        console.log(`[PerformanceMonitor] Route change: ${previousPathname.current} → ${pathname}`);
      }

      // Measure after a short delay to capture rendering
      const timeoutId = setTimeout(() => {
        const duration = PM.measure('route-change', startMark);

        if (duration !== null) {
          if (process.env.NODE_ENV === 'development') {
            console.log(`[PerformanceMonitor] Route change completed in ${duration.toFixed(2)}ms`);
          }

          // Send custom metric for slow route changes (>1s)
          if (duration > 1000 && process.env.NODE_ENV === 'production') {
            // This will be sent to analytics via the measure method
          }
        }
      }, 100);

      previousPathname.current = pathname;

      return () => clearTimeout(timeoutId);
    }
  }, [pathname, enabled, trackRouteChanges]);

  // This component doesn't render anything
  return null;
}

/**
 * Higher-order component to wrap your app with performance monitoring
 *
 * Usage in app/layout.tsx:
 *
 * import { withPerformanceMonitoring } from '@/components/PerformanceMonitor'
 *
 * function RootLayout({ children }) {
 *   return <html><body>{children}</body></html>
 * }
 *
 * export default withPerformanceMonitoring(RootLayout)
 */
export function withPerformanceMonitoring<P extends object>(
  Component: React.ComponentType<P>,
  options?: PerformanceMonitorProps
) {
  return function PerformanceMonitoredComponent(props: P) {
    return (
      <>
        <PerformanceMonitor {...options} />
        <Component {...props} />
      </>
    );
  };
}

/**
 * Hook to manually track performance metrics
 *
 * Usage:
 *
 * const { mark, measure } = usePerformanceTracking()
 *
 * useEffect(() => {
 *   mark('data-fetch-start')
 *   fetchData().then(() => {
 *     measure('data-fetch', 'data-fetch-start')
 *   })
 * }, [])
 */
export function usePerformanceTracking() {
  const mark = (name: string) => {
    PM.mark(name);
  };

  const measure = (name: string, startMark?: string): number | null => {
    return PM.measure(name, startMark);
  };

  const getDuration = (name: string): number | null => {
    return PM.getDuration(name);
  };

  const clearMark = (name: string) => {
    PM.clearMark(name);
  };

  return {
    mark,
    measure,
    getDuration,
    clearMark,
  };
}

/**
 * Hook to track component render time
 *
 * Usage:
 *
 * function MyComponent() {
 *   useRenderTimeTracking('MyComponent')
 *   return <div>...</div>
 * }
 */
export function useRenderTimeTracking(componentName: string) {
  const renderCount = useRef(0);

  useEffect(() => {
    renderCount.current++;
    const markName = `${componentName}-render-${renderCount.current}`;

    PM.mark(markName);

    // Measure on next tick after render completes
    const timeoutId = setTimeout(() => {
      const duration = PM.measure(`${componentName}-render`, markName);

      if (duration !== null && process.env.NODE_ENV === 'development') {
        console.log(`[Render Time] ${componentName} (render #${renderCount.current}): ${duration.toFixed(2)}ms`);
      }

      // Log warning for slow renders (>100ms)
      if (duration !== null && duration > 100) {
        console.warn(
          `[Performance Warning] ${componentName} took ${duration.toFixed(2)}ms to render`
        );
      }
    }, 0);

    return () => clearTimeout(timeoutId);
  });
}

/**
 * Component that wraps children and tracks their render time
 *
 * Usage:
 *
 * <RenderTimeTracker name="MySection">
 *   <ExpensiveComponent />
 * </RenderTimeTracker>
 */
export function RenderTimeTracker({
  name,
  children,
  warnThreshold = 100,
}: {
  name: string;
  children: React.ReactNode;
  warnThreshold?: number;
}) {
  useRenderTimeTracking(name);

  return <>{children}</>;
}
