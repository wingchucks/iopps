"use client";

import { cn } from "@/lib/utils";

type StatusVariant = "default" | "success" | "warning" | "error" | "info";

interface StatusBadgeProps {
  status: string;
  variant?: StatusVariant;
  className?: string;
}

const variantStyles: Record<StatusVariant, string> = {
  success: "bg-green-500/10 text-green-400 border-green-500/20",
  warning: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  error: "bg-red-500/10 text-red-400 border-red-500/20",
  info: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  default: "bg-slate-500/10 text-[var(--text-muted)] border-slate-500/20",
};

/**
 * Auto-detect variant from common status strings.
 *
 * Mapping:
 *   active / approved / published / hired / completed / accepted -> success (green)
 *   pending / review / submitted / reviewing / scheduled          -> warning (amber)
 *   rejected / expired / error / suspended / cancelled / no-show  -> error   (red)
 *   shortlisted / processing / upcoming                           -> info    (blue)
 *   draft / inactive / withdrawn / (anything else)                -> default (gray)
 */
function getAutoVariant(status: string): StatusVariant {
  const lower = status.toLowerCase().replace(/[\s_-]+/g, "");

  if (
    ["active", "approved", "published", "hired", "completed", "accepted", "enabled", "verified", "success", "open"].includes(lower)
  ) {
    return "success";
  }

  if (
    ["pending", "review", "submitted", "reviewing", "scheduled", "inreview", "inprogress", "pendingreview"].includes(lower)
  ) {
    return "warning";
  }

  if (
    ["rejected", "expired", "error", "suspended", "cancelled", "canceled", "noshow", "no-show", "failed", "disabled", "closed"].includes(lower)
  ) {
    return "error";
  }

  if (
    ["shortlisted", "processing", "upcoming", "comingsoon"].includes(lower)
  ) {
    return "info";
  }

  // draft, inactive, withdrawn, unknown
  return "default";
}

/**
 * StatusBadge - A shared pill badge that colours itself based on status.
 *
 * Pass an explicit `variant` to override auto-detection, or let the
 * component infer the colour from the `status` string.
 */
export function StatusBadge({ status, variant, className }: StatusBadgeProps) {
  const resolvedVariant = variant || getAutoVariant(status);
  const displayStatus =
    status.charAt(0).toUpperCase() + status.slice(1).replace(/[_-]/g, " ");

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium",
        variantStyles[resolvedVariant],
        className,
      )}
    >
      {displayStatus}
    </span>
  );
}
