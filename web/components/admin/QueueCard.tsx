"use client";

import Link from "next/link";
import { ReactNode } from "react";
import {
  ClockIcon,
  ExclamationTriangleIcon,
  ExclamationCircleIcon,
  CreditCardIcon,
  ArrowRightIcon,
} from "@heroicons/react/24/outline";

// ============================================================================
// Types
// ============================================================================

export type QueueType = "pending" | "flagged" | "failed" | "payment";

export interface QueueItem {
  label: string;
  count: number;
  href?: string;
}

export interface QueueCardProps {
  type: QueueType;
  title: string;
  items: QueueItem[];
  href?: string;
  loading?: boolean;
  emptyMessage?: string;
}

// ============================================================================
// Config
// ============================================================================

const queueConfig: Record<
  QueueType,
  {
    icon: typeof ClockIcon;
    iconClass: string;
    bgClass: string;
    borderClass: string;
    countClass: string;
    pulseOnItems: boolean;
  }
> = {
  pending: {
    icon: ClockIcon,
    iconClass: "text-amber-400",
    bgClass: "bg-amber-500/5",
    borderClass: "border-amber-500/20 hover:border-amber-500/40",
    countClass: "text-amber-400",
    pulseOnItems: true,
  },
  flagged: {
    icon: ExclamationTriangleIcon,
    iconClass: "text-red-400",
    bgClass: "bg-red-500/5",
    borderClass: "border-red-500/20 hover:border-red-500/40",
    countClass: "text-red-400",
    pulseOnItems: true,
  },
  failed: {
    icon: ExclamationCircleIcon,
    iconClass: "text-orange-400",
    bgClass: "bg-orange-500/5",
    borderClass: "border-orange-500/20 hover:border-orange-500/40",
    countClass: "text-orange-400",
    pulseOnItems: true,
  },
  payment: {
    icon: CreditCardIcon,
    iconClass: "text-purple-400",
    bgClass: "bg-purple-500/5",
    borderClass: "border-purple-500/20 hover:border-purple-500/40",
    countClass: "text-purple-400",
    pulseOnItems: true,
  },
};

// ============================================================================
// Loading Skeleton
// ============================================================================

function QueueCardSkeleton() {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-slate-800" />
        <div className="h-5 w-32 rounded bg-slate-800" />
      </div>
      <div className="mt-4 space-y-2">
        <div className="h-4 w-24 rounded bg-slate-800" />
        <div className="h-4 w-20 rounded bg-slate-800" />
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function QueueCard({
  type,
  title,
  items,
  href,
  loading = false,
  emptyMessage = "All clear",
}: QueueCardProps) {
  const config = queueConfig[type];
  const Icon = config.icon;
  const totalCount = items.reduce((sum, item) => sum + item.count, 0);
  const hasItems = totalCount > 0;

  if (loading) {
    return <QueueCardSkeleton />;
  }

  const CardWrapper = href
    ? ({ children }: { children: ReactNode }) => (
        <Link href={href} className="block">
          {children}
        </Link>
      )
    : ({ children }: { children: ReactNode }) => <>{children}</>;

  return (
    <CardWrapper>
      <div
        className={`rounded-xl border p-5 transition-colors ${config.bgClass} ${
          config.borderClass
        } ${href ? "cursor-pointer" : ""}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                hasItems && config.pulseOnItems
                  ? `${config.bgClass} animate-pulse`
                  : "bg-slate-800"
              }`}
            >
              <Icon
                className={`h-5 w-5 ${hasItems ? config.iconClass : "text-slate-500"}`}
                aria-hidden="true"
              />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-200">{title}</h3>
              {hasItems ? (
                <p className={`text-xs ${config.countClass}`}>
                  {totalCount} item{totalCount !== 1 ? "s" : ""} need attention
                </p>
              ) : (
                <p className="text-xs text-slate-500">{emptyMessage}</p>
              )}
            </div>
          </div>
          {href && (
            <ArrowRightIcon className="h-4 w-4 text-slate-600" aria-hidden="true" />
          )}
        </div>

        {/* Items */}
        {hasItems && (
          <div className="mt-4 space-y-2">
            {items
              .filter((item) => item.count > 0)
              .map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-slate-400">{item.label}</span>
                  <span className={`font-semibold ${config.countClass}`}>
                    {item.count}
                  </span>
                </div>
              ))}
          </div>
        )}
      </div>
    </CardWrapper>
  );
}

// ============================================================================
// Queue Grid Container
// ============================================================================

export interface QueueGridProps {
  children: ReactNode;
}

export function QueueGrid({ children }: QueueGridProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {children}
    </div>
  );
}
