"use client";

import { cn } from "@/lib/utils";

interface EBtnProps {
  icon: React.ReactNode;
  label?: string;
  "aria-label"?: string;
  count?: number;
  active?: boolean;
  onClick?: () => void;
  className?: string;
}

export function EBtn({
  icon,
  label,
  "aria-label": ariaLabel,
  count,
  active = false,
  onClick,
  className,
}: EBtnProps) {
  return (
    <button
      onClick={onClick}
      aria-label={ariaLabel || label}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
        active
          ? "bg-[var(--accent-bg)] text-[var(--accent)]"
          : "text-[var(--text-muted)] hover:bg-[var(--border-lt)] hover:text-[var(--text-secondary)]",
        className
      )}
    >
      {icon}
      {count !== undefined && <span>{count}</span>}
      {label && <span className="hidden sm:inline">{label}</span>}
    </button>
  );
}

export default EBtn;
