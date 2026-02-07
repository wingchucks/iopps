"use client";

import { cn } from "@/lib/utils";

interface Step {
  label: string;
}

interface ProgressBarProps {
  steps: Step[];
  current: number;
  className?: string;
}

export function ProgressBar({ steps, current, className }: ProgressBarProps) {
  return (
    <div className={cn("w-full", className)} role="group" aria-label="Progress">
      <div className="flex">
        {steps.map((step, i) => (
          <div key={step.label} className="flex-1 flex flex-col items-center">
            <div className="relative flex w-full items-center">
              {i > 0 && (
                <div
                  className={cn(
                    "h-0.5 flex-1",
                    i <= current ? "bg-[var(--accent)]" : "bg-[var(--border)]"
                  )}
                />
              )}
              <div
                {...(i === current ? { "aria-current": "step" as const } : {})}
                className={cn(
                  "z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-colors",
                  i < current
                    ? "bg-[var(--accent)] text-white"
                    : i === current
                    ? "border-2 border-[var(--accent)] bg-[var(--accent-bg)] text-[var(--accent)]"
                    : "border-2 border-[var(--border)] bg-[var(--card-bg)] text-[var(--text-muted)]"
                )}
              >
                {i < current ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  i + 1
                )}
              </div>
              {i < steps.length - 1 && (
                <div
                  className={cn(
                    "h-0.5 flex-1",
                    i < current ? "bg-[var(--accent)]" : "bg-[var(--border)]"
                  )}
                />
              )}
            </div>
            <span
              className={cn(
                "mt-2 text-xs font-medium",
                i <= current
                  ? "text-[var(--accent)]"
                  : "text-[var(--text-muted)]"
              )}
            >
              {step.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ProgressBar;
