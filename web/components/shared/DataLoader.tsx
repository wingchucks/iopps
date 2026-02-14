'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { AlertCircle, RefreshCw, Inbox } from 'lucide-react';

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-6 animate-pulse">
      <div className="flex items-center gap-4 mb-4">
        <div className="h-10 w-10 rounded-full bg-surface" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-1/3 rounded bg-surface" />
          <div className="h-3 w-1/4 rounded bg-surface" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-3 w-full rounded bg-surface" />
        <div className="h-3 w-5/6 rounded bg-surface" />
        <div className="h-3 w-2/3 rounded bg-surface" />
      </div>
    </div>
  );
}

interface DataLoaderProps<T> {
  loading: boolean;
  error?: Error | string | null;
  data?: T | null;
  children: (data: T) => ReactNode;
  timeoutMs?: number;
  skeletonCount?: number;
  emptyMessage?: string;
  emptyDescription?: string;
  emptyIcon?: ReactNode;
  emptyAction?: { label: string; onClick: () => void };
  onRetry?: () => void;
  className?: string;
}

export function DataLoader<T>({
  loading, error, data, children, timeoutMs = 10000, skeletonCount = 3,
  emptyMessage = 'Nothing here yet', emptyDescription, emptyIcon, emptyAction, onRetry, className = '',
}: DataLoaderProps<T>) {
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: reset timeout state when loading changes
    if (!loading) { setTimedOut(false); return; }
     
    setTimedOut(false);
    const timer = setTimeout(() => setTimedOut(true), timeoutMs);
    return () => clearTimeout(timer);
  }, [loading, timeoutMs]);

  const errorMessage = error ? (typeof error === 'string' ? error : error.message) : timedOut ? 'This is taking longer than expected.' : null;

  if (errorMessage || (loading && timedOut)) {
    return (
      <div className={`rounded-xl border border-red-200 bg-red-50/50 p-6 ${className}`}>
        <div className="flex flex-col items-center text-center gap-3">
          <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
            <AlertCircle className="h-6 w-6 text-red-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-red-900">{timedOut ? 'Loading timed out' : 'Something went wrong'}</p>
            <p className="text-sm text-red-600 mt-1">{errorMessage}</p>
          </div>
          {onRetry && (
            <button onClick={onRetry} className="inline-flex items-center gap-2 rounded-lg bg-white border border-red-200 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 transition-colors">
              <RefreshCw className="h-4 w-4" /> Try again
            </button>
          )}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={`space-y-4 ${className}`}>
        {Array.from({ length: skeletonCount }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    );
  }

  const isEmpty = data === null || data === undefined || (Array.isArray(data) && data.length === 0);
  if (isEmpty) {
    return (
      <div className={`rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-10 ${className}`}>
        <div className="flex flex-col items-center text-center gap-3">
          <div className="h-14 w-14 rounded-full bg-surface flex items-center justify-center text-[var(--text-muted)]">
            {emptyIcon || <Inbox className="h-7 w-7" />}
          </div>
          <p className="text-sm font-medium text-foreground">{emptyMessage}</p>
          {emptyDescription && <p className="text-sm text-[var(--text-muted)]">{emptyDescription}</p>}
          {emptyAction && (
            <button onClick={emptyAction.onClick} className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 transition-colors">
              {emptyAction.label}
            </button>
          )}
        </div>
      </div>
    );
  }

  return <div className={className}>{children(data as T)}</div>;
}
