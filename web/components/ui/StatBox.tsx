"use client";

import { cn } from "@/lib/utils";

interface StatBoxProps {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  className?: string;
}

export function StatBox({ icon, value, label, className }: StatBoxProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-1 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4 text-center",
        className
      )}
    >
      <div className="mb-1 text-[var(--accent)]">{icon}</div>
      <div className="text-2xl font-bold text-[var(--text-primary)]">{value}</div>
      <div className="text-xs text-[var(--text-muted)]">{label}</div>
    </div>
  );
}

export default StatBox;
