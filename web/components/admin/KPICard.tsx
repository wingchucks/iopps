"use client";

import { useState, useRef, useEffect, ReactNode } from "react";
import {
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  MinusIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";

// ============================================================================
// Types
// ============================================================================

export type KPIColor = "teal" | "blue" | "green" | "purple" | "amber" | "slate";

export interface KPICardProps {
  /** The metric label */
  label: string;
  /** The main value to display */
  value: number | string;
  /** Definition shown in tooltip (e.g., "Total auth accounts") */
  definition?: string;
  /** Change from previous period */
  change?: {
    value: number;
    direction: "up" | "down" | "neutral";
    period?: string; // e.g., "7d"
  };
  /** Icon to display */
  icon?: ReactNode;
  /** Color theme */
  color?: KPIColor;
  /** Loading state */
  loading?: boolean;
  /** Format value as currency */
  currency?: boolean;
  /** Custom suffix (e.g., "%") */
  suffix?: string;
  /** Make card clickable */
  href?: string;
  /** Additional breakdown (e.g., "45 approved + 12 pending") */
  breakdown?: string;
}

// ============================================================================
// Config
// ============================================================================

const colorConfig: Record<
  KPIColor,
  {
    iconBg: string;
    iconColor: string;
    accentColor: string;
  }
> = {
  teal: {
    iconBg: "bg-accent/10",
    iconColor: "text-accent",
    accentColor: "text-accent",
  },
  blue: {
    iconBg: "bg-blue-500/10",
    iconColor: "text-blue-400",
    accentColor: "text-blue-400",
  },
  green: {
    iconBg: "bg-green-500/10",
    iconColor: "text-green-400",
    accentColor: "text-green-400",
  },
  purple: {
    iconBg: "bg-purple-500/10",
    iconColor: "text-purple-400",
    accentColor: "text-purple-400",
  },
  amber: {
    iconBg: "bg-amber-500/10",
    iconColor: "text-amber-400",
    accentColor: "text-amber-400",
  },
  slate: {
    iconBg: "bg-slate-500/10",
    iconColor: "text-[var(--text-muted)]",
    accentColor: "text-[var(--text-muted)]",
  },
};

// ============================================================================
// Tooltip Component
// ============================================================================

interface TooltipProps {
  content: string;
  children: ReactNode;
}

function Tooltip({ content, children }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isVisible && triggerRef.current && tooltipRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const tooltipRect = tooltipRef.current.getBoundingClientRect();

      // Position above the trigger
      setPosition({
        top: -tooltipRect.height - 8,
        left: (triggerRect.width - tooltipRect.width) / 2,
      });
    }
  }, [isVisible]);

  return (
    <div
      ref={triggerRef}
      className="relative inline-flex"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div
          ref={tooltipRef}
          role="tooltip"
          className="absolute z-50 rounded-lg border border-[var(--card-border)] bg-surface px-3 py-2 text-xs text-[var(--text-secondary)] shadow-lg whitespace-nowrap"
          style={{ top: position.top, left: position.left }}
        >
          {content}
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-700" aria-hidden="true" />
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Loading Skeleton
// ============================================================================

function KPICardSkeleton() {
  return (
    <div className="rounded-xl border border-[var(--card-border)] bg-slate-900/60 p-5 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-surface" />
        <div className="h-4 w-20 rounded bg-surface" />
      </div>
      <div className="mt-3 h-8 w-16 rounded bg-surface" />
      <div className="mt-2 h-3 w-12 rounded bg-surface" />
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function KPICard({
  label,
  value,
  definition,
  change,
  icon,
  color = "teal",
  loading = false,
  currency = false,
  suffix,
  href,
  breakdown,
}: KPICardProps) {
  const config = colorConfig[color];

  if (loading) {
    return <KPICardSkeleton />;
  }

  // Format the value
  let displayValue: string;
  if (typeof value === "number") {
    if (currency) {
      displayValue = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value);
    } else {
      displayValue = value.toLocaleString();
    }
  } else {
    displayValue = value;
  }

  if (suffix) {
    displayValue += suffix;
  }

  const Wrapper = href ? "a" : "div";
  const wrapperProps = href ? { href } : {};

  return (
    <Wrapper
      {...wrapperProps}
      className={`block rounded-xl border border-[var(--card-border)] bg-slate-900/60 p-5 transition-colors hover:border-[var(--card-border)] ${
        href ? "cursor-pointer" : ""
      }`}
    >
      {/* Header with icon and label */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {icon && (
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-lg ${config.iconBg}`}
            >
              <span className={config.iconColor}>{icon}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-medium text-[var(--text-muted)]">{label}</span>
            {definition && (
              <Tooltip content={definition}>
                <button
                  type="button"
                  className="focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-1 focus:ring-offset-background rounded"
                  aria-label={`Information: ${definition}`}
                >
                  <InformationCircleIcon className="h-4 w-4 text-slate-600 hover:text-[var(--text-muted)] cursor-help" aria-hidden="true" />
                </button>
              </Tooltip>
            )}
          </div>
        </div>
      </div>

      {/* Main value */}
      <div className="mt-3">
        <span className={`text-3xl font-bold ${config.accentColor}`}>
          {displayValue}
        </span>
      </div>

      {/* Change indicator and/or breakdown */}
      <div className="mt-2 flex items-center gap-2">
        {change && (
          <div className="flex items-center gap-1 text-sm">
            {change.direction === "up" ? (
              <ArrowTrendingUpIcon className="h-4 w-4 text-green-400" aria-hidden="true" />
            ) : change.direction === "down" ? (
              <ArrowTrendingDownIcon className="h-4 w-4 text-red-400" aria-hidden="true" />
            ) : (
              <MinusIcon className="h-4 w-4 text-foreground0" aria-hidden="true" />
            )}
            <span
              className={
                change.direction === "up"
                  ? "text-green-400"
                  : change.direction === "down"
                  ? "text-red-400"
                  : "text-foreground0"
              }
            >
              {change.direction === "up" ? "+" : change.direction === "down" ? "-" : ""}
              {change.value}
            </span>
            {change.period && (
              <span className="text-foreground0">{change.period}</span>
            )}
          </div>
        )}
        {breakdown && (
          <span className="text-xs text-foreground0">{breakdown}</span>
        )}
      </div>
    </Wrapper>
  );
}

// ============================================================================
// KPI Grid Container
// ============================================================================

export interface KPIGridProps {
  children: ReactNode;
  columns?: 3 | 4 | 5 | 6;
}

export function KPIGrid({ children, columns = 5 }: KPIGridProps) {
  const gridClasses = {
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
    5: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5",
    6: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6",
  };

  return (
    <div className={`grid gap-4 ${gridClasses[columns]}`}>
      {children}
    </div>
  );
}
