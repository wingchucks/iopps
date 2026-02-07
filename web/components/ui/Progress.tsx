"use client";

import { cn } from "@/lib/utils";

interface ProgressProps {
  current: number;
  total: number;
  className?: string;
}

export function Progress({ current, total, className }: ProgressProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="flex gap-1.5">
        {Array.from({ length: total }, (_, i) => (
          <div
            key={i}
            className={cn(
              "h-2 w-8 rounded-full transition-colors",
              i < current
                ? "bg-[var(--accent)]"
                : "bg-[var(--border)]"
            )}
          />
        ))}
      </div>
      <span className="text-sm font-medium text-[var(--text-muted)]">
        {current}/{total}
      </span>
    </div>
  );
}

export default Progress;
