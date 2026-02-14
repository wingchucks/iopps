"use client";

import { cn } from "@/lib/utils";

interface TagProps {
  children: React.ReactNode;
  variant?: "default" | "warn" | "teal" | "navy";
  size?: "sm" | "md";
  className?: string;
}

const variantStyles = {
  default:
    "bg-[var(--border-lt)] text-[var(--text-secondary)] border-[var(--border)]",
  warn:
    "bg-[var(--amber-bg)] text-[var(--amber)] border-[var(--amber-lt)]",
  teal:
    "bg-[var(--accent-bg)] text-[var(--accent)] border-[var(--accent-lt)]",
  navy:
    "bg-[var(--navy)] text-white border-[var(--navy-lt)]",
};

const sizeStyles = {
  sm: "px-2 py-0.5 text-xs",
  md: "px-3 py-1 text-sm",
};

export function Tag({
  children,
  variant = "default",
  size = "sm",
  className,
}: TagProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-lg border font-medium",
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
    >
      {children}
    </span>
  );
}

export default Tag;
