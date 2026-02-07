"use client";

import { ReactNode } from "react";

type BadgeVariant =
  | "featured"
  | "free"
  | "indigenous-focused"
  | "livestream"
  | "format"
  | "category"
  | "happening-now"
  | "upcoming"
  | "trc92";

type BadgeSize = "sm" | "md";

interface DiscoveryBadgeProps {
  variant: BadgeVariant;
  label?: string;
  size?: BadgeSize;
  icon?: ReactNode;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  featured:
    "bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-lg",
  free: "bg-accent/20 text-[#14B8A6] border border-[#14B8A6]/30",
  "indigenous-focused":
    "bg-accent/20 text-teal-300 border border-accent/30",
  livestream: "bg-red-500 text-white animate-pulse",
  format: "bg-slate-800/60 text-[var(--text-secondary)]",
  category: "bg-accent/20 text-[#14B8A6]",
  "happening-now": "bg-red-500/90 text-white animate-pulse",
  upcoming: "bg-accent/90 text-[var(--text-primary)]",
  trc92: "bg-orange-500/10 text-orange-400 border border-orange-500/30",
};

const sizeStyles: Record<BadgeSize, string> = {
  sm: "px-2 py-0.5 text-xs",
  md: "px-2.5 py-1 text-xs",
};

const defaultLabels: Record<BadgeVariant, string> = {
  featured: "Featured",
  free: "Free",
  "indigenous-focused": "Indigenous-Focused",
  livestream: "Livestream",
  format: "Format",
  category: "Category",
  "happening-now": "Happening Now",
  upcoming: "Upcoming",
  trc92: "TRC #92",
};

export function DiscoveryBadge({
  variant,
  label,
  size = "md",
  icon,
  className = "",
}: DiscoveryBadgeProps) {
  const displayLabel = label || defaultLabels[variant];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
    >
      {icon}
      {variant === "featured" && !icon && (
        <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      )}
      {variant === "livestream" && !icon && (
        <span className="h-2 w-2 rounded-full bg-[var(--card-bg)]" />
      )}
      {variant === "happening-now" && !icon && (
        <span className="h-2 w-2 rounded-full bg-[var(--card-bg)]" />
      )}
      {variant === "trc92" && !icon && (
        <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"
            clipRule="evenodd"
          />
        </svg>
      )}
      {displayLabel}
    </span>
  );
}

// Format-specific badges with color mapping
interface FormatBadgeProps {
  format: "online" | "in-person" | "hybrid" | "virtual" | "self-paced";
  size?: BadgeSize;
}

const formatColors: Record<FormatBadgeProps["format"], string> = {
  online: "bg-blue-500/20 text-blue-300 border border-blue-500/30",
  virtual: "bg-blue-500/20 text-blue-300 border border-blue-500/30",
  "in-person": "bg-accent/20 text-emerald-300 border border-accent/30",
  hybrid: "bg-purple-500/20 text-purple-300 border border-purple-500/30",
  "self-paced": "bg-amber-500/20 text-amber-300 border border-amber-500/30",
};

const formatLabels: Record<FormatBadgeProps["format"], string> = {
  online: "Online",
  virtual: "Virtual",
  "in-person": "In-Person",
  hybrid: "Hybrid",
  "self-paced": "Self-Paced",
};

export function FormatBadge({ format, size = "md" }: FormatBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium ${formatColors[format]} ${sizeStyles[size]}`}
    >
      {formatLabels[format]}
    </span>
  );
}

// Event type badges for community page
interface EventTypeBadgeProps {
  eventType: string;
  size?: BadgeSize;
}

const eventTypeColors: Record<string, string> = {
  "Pow Wow": "bg-purple-500/20 text-purple-300",
  Sports: "bg-green-500/20 text-green-300",
  "Cultural Gathering": "bg-blue-500/20 text-blue-300",
};

export function EventTypeBadge({ eventType, size = "md" }: EventTypeBadgeProps) {
  const colorClass =
    eventTypeColors[eventType] || "bg-slate-500/20 text-[var(--text-secondary)]";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold uppercase tracking-wider ${colorClass} ${sizeStyles[size]}`}
    >
      {eventType || "Event"}
    </span>
  );
}
