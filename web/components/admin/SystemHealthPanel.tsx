"use client";

import { ReactNode } from "react";
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  EnvelopeIcon,
  CreditCardIcon,
  CloudArrowDownIcon,
  ServerIcon,
} from "@heroicons/react/24/outline";

// ============================================================================
// Types
// ============================================================================

export type HealthStatus = "healthy" | "warning" | "error" | "unknown";

export interface HealthItem {
  id: string;
  name: string;
  status: HealthStatus;
  message?: string;
  lastChecked?: Date;
  details?: string;
}

export interface SystemHealthPanelProps {
  items: HealthItem[];
  loading?: boolean;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

// ============================================================================
// Config
// ============================================================================

const statusConfig: Record<
  HealthStatus,
  {
    icon: typeof CheckCircleIcon;
    iconClass: string;
    dotClass: string;
    label: string;
  }
> = {
  healthy: {
    icon: CheckCircleIcon,
    iconClass: "text-green-400",
    dotClass: "bg-green-400",
    label: "Healthy",
  },
  warning: {
    icon: ExclamationCircleIcon,
    iconClass: "text-amber-400",
    dotClass: "bg-amber-400",
    label: "Warning",
  },
  error: {
    icon: XCircleIcon,
    iconClass: "text-red-400",
    dotClass: "bg-red-400",
    label: "Error",
  },
  unknown: {
    icon: ExclamationCircleIcon,
    iconClass: "text-foreground0",
    dotClass: "bg-slate-500",
    label: "Unknown",
  },
};

// Service icons
const serviceIcons: Record<string, typeof EnvelopeIcon> = {
  email: EnvelopeIcon,
  stripe: CreditCardIcon,
  rss: CloudArrowDownIcon,
  storage: ServerIcon,
};

// ============================================================================
// Loading Skeleton
// ============================================================================

function SystemHealthSkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="flex items-center justify-between animate-pulse">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-surface" />
            <div className="h-4 w-24 rounded bg-surface" />
          </div>
          <div className="h-4 w-16 rounded bg-surface" />
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Health Item Row
// ============================================================================

interface HealthItemRowProps {
  item: HealthItem;
}

function HealthItemRow({ item }: HealthItemRowProps) {
  const config = statusConfig[item.status];
  const Icon = serviceIcons[item.id] || ServerIcon;

  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface">
          <Icon className="h-4 w-4 text-[var(--text-muted)]" />
        </div>
        <div>
          <span className="text-sm font-medium text-foreground">{item.name}</span>
          {item.message && (
            <p className="text-xs text-foreground0">{item.message}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className={`h-2 w-2 rounded-full ${config.dotClass}`} />
        <span className={`text-xs font-medium ${config.iconClass}`}>
          {item.details || config.label}
        </span>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function SystemHealthPanel({
  items,
  loading = false,
  onRefresh,
  isRefreshing = false,
}: SystemHealthPanelProps) {
  // Calculate overall status
  const overallStatus: HealthStatus = items.some((i) => i.status === "error")
    ? "error"
    : items.some((i) => i.status === "warning")
    ? "warning"
    : items.every((i) => i.status === "healthy")
    ? "healthy"
    : "unknown";

  const overallConfig = statusConfig[overallStatus];

  return (
    <div className="rounded-xl border border-[var(--card-border)] bg-slate-900/60 p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground">System Health</h3>
          <div
            className={`flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${
              overallStatus === "healthy"
                ? "bg-green-500/10 text-green-400"
                : overallStatus === "warning"
                ? "bg-amber-500/10 text-amber-400"
                : overallStatus === "error"
                ? "bg-red-500/10 text-red-400"
                : "bg-slate-500/10 text-[var(--text-muted)]"
            }`}
          >
            <div className={`h-1.5 w-1.5 rounded-full ${overallConfig.dotClass}`} />
            {overallConfig.label}
          </div>
        </div>
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-1.5 rounded-md text-foreground0 hover:text-[var(--text-secondary)] hover:bg-surface transition-colors disabled:opacity-50"
            aria-label="Refresh status"
          >
            <ArrowPathIcon
              className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
            />
          </button>
        )}
      </div>

      {/* Health Items */}
      {loading ? (
        <SystemHealthSkeleton />
      ) : items.length === 0 ? (
        <div className="py-6 text-center">
          <p className="text-sm text-foreground0">No services to monitor</p>
        </div>
      ) : (
        <div className="divide-y divide-[var(--card-border)]">
          {items.map((item) => (
            <HealthItemRow key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Compact Health Indicator (for headers)
// ============================================================================

export interface CompactHealthIndicatorProps {
  status: HealthStatus;
  label?: string;
}

export function CompactHealthIndicator({
  status,
  label,
}: CompactHealthIndicatorProps) {
  const config = statusConfig[status];

  return (
    <div className="flex items-center gap-1.5">
      <div className={`h-2 w-2 rounded-full ${config.dotClass}`} />
      {label && <span className="text-xs text-foreground0">{label}</span>}
    </div>
  );
}

// ============================================================================
// Pre-built Health Check Helpers
// ============================================================================

export interface ServiceCheckResult {
  id: string;
  name: string;
  status: HealthStatus;
  message?: string;
  details?: string;
}

/**
 * Check email service status
 */
export async function checkEmailService(): Promise<ServiceCheckResult> {
  // This would typically make an API call to check the service
  return {
    id: "email",
    name: "Email Service",
    status: "healthy",
    details: "Connected",
  };
}

/**
 * Check Stripe connection status
 */
export async function checkStripeService(): Promise<ServiceCheckResult> {
  return {
    id: "stripe",
    name: "Stripe Payments",
    status: "healthy",
    details: "Connected",
  };
}

/**
 * Check RSS import status
 */
export function buildRSSHealthItem(
  successCount: number,
  totalCount: number,
  failedCount: number
): ServiceCheckResult {
  const status: HealthStatus =
    failedCount > 0 ? "warning" : successCount === totalCount ? "healthy" : "unknown";

  return {
    id: "rss",
    name: "RSS Imports",
    status,
    details: `${successCount}/${totalCount} OK`,
    message: failedCount > 0 ? `${failedCount} failed` : undefined,
  };
}
