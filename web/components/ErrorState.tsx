"use client";

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  testId?: string;
  className?: string;
}

/**
 * ErrorState - Displays an error message with optional retry action
 *
 * Use for actual errors (network failures, server errors, etc.).
 * Do NOT use for empty data scenarios - use EmptyState instead.
 */
export function ErrorState({
  title = "Something went wrong",
  description = "We encountered a problem loading this content. Please try again.",
  onRetry,
  testId,
  className = "",
}: ErrorStateProps) {
  return (
    <div
      className={`mx-auto flex max-w-xl flex-col items-center justify-center rounded-2xl border border-red-900/30 bg-red-950/20 px-6 py-12 text-center ${className}`}
      data-testid={testId}
    >
      <div className="mb-4 rounded-full bg-red-900/30 p-4 text-red-400">
        <svg
          className="h-12 w-12"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
          />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      <p className="mt-2 max-w-md text-sm text-[var(--text-muted)]">{description}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-6 inline-flex items-center gap-2 rounded-full border border-[var(--card-border)] bg-surface px-6 py-3 font-semibold text-white transition-all hover:border-[var(--card-border)] hover:bg-slate-700"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
            />
          </svg>
          Try Again
        </button>
      )}
    </div>
  );
}
