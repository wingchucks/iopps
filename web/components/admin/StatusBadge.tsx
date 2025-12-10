"use client";

type StatusVariant =
  | "success"
  | "warning"
  | "error"
  | "info"
  | "neutral"
  | "pending";

interface StatusBadgeProps {
  status: string;
  variant?: StatusVariant;
  className?: string;
}

const variantStyles: Record<StatusVariant, string> = {
  success: "bg-green-500/10 text-green-400",
  warning: "bg-yellow-500/10 text-yellow-400",
  error: "bg-red-500/10 text-red-400",
  info: "bg-blue-500/10 text-blue-400",
  neutral: "bg-slate-500/10 text-slate-400",
  pending: "bg-orange-500/10 text-orange-400",
};

// Auto-detect variant based on common status values
function getAutoVariant(status: string): StatusVariant {
  const lower = status.toLowerCase();

  if (["active", "approved", "hired", "success", "enabled", "verified"].includes(lower)) {
    return "success";
  }
  if (["pending", "submitted", "reviewing", "in_progress"].includes(lower)) {
    return "pending";
  }
  if (["rejected", "disabled", "inactive", "failed", "error", "suspended"].includes(lower)) {
    return "error";
  }
  if (["shortlisted", "reviewed", "processing"].includes(lower)) {
    return "info";
  }
  if (["withdrawn", "cancelled", "paused"].includes(lower)) {
    return "warning";
  }

  return "neutral";
}

export function StatusBadge({ status, variant, className = "" }: StatusBadgeProps) {
  const resolvedVariant = variant || getAutoVariant(status);
  const displayStatus = status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, " ");

  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${variantStyles[resolvedVariant]} ${className}`}
    >
      {displayStatus}
    </span>
  );
}
