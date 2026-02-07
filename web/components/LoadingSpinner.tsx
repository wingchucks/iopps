/**
 * Shared loading spinner component.
 * Replaces ad-hoc inline spinners used across the platform.
 */

interface LoadingSpinnerProps {
  /** Spinner size: "sm" (16px), "md" (32px), "lg" (48px) */
  size?: "sm" | "md" | "lg";
  /** Additional CSS classes */
  className?: string;
  /** Whether to center the spinner in its container */
  centered?: boolean;
}

const SIZE_MAP = {
  sm: "h-4 w-4 border-2",
  md: "h-8 w-8 border-[3px]",
  lg: "h-12 w-12 border-4",
} as const;

export function LoadingSpinner({
  size = "md",
  className = "",
  centered = true,
}: LoadingSpinnerProps) {
  const spinner = (
    <div
      className={`animate-spin rounded-full border-accent border-t-transparent ${SIZE_MAP[size]} ${className}`}
      role="status"
      aria-label="Loading"
    />
  );

  if (!centered) return spinner;

  return (
    <div className="flex items-center justify-center min-h-[200px]">
      {spinner}
    </div>
  );
}
