"use client";

import { CheckBadgeIcon } from "@heroicons/react/24/solid";
import type { IndigenousVerification } from "@/lib/types";

interface IndigenousBadgeProps {
  verification?: IndigenousVerification;
  size?: "sm" | "md" | "lg";
  showTooltip?: boolean;
  className?: string;
}

export default function IndigenousBadge({
  verification,
  size = "md",
  showTooltip = true,
  className = "",
}: IndigenousBadgeProps) {
  // Only show badge for approved verifications
  if (!verification || verification.status !== "approved") {
    return null;
  }

  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6",
  };

  const badgeContent = (
    <div
      className={`inline-flex items-center gap-1 ${className}`}
      title={showTooltip ? "Verified Indigenous Business" : undefined}
    >
      <CheckBadgeIcon
        className={`${sizeClasses[size]} text-amber-500 drop-shadow-[0_0_4px_rgba(245,158,11,0.5)]`}
        aria-label="Verified Indigenous Business"
      />
    </div>
  );

  return badgeContent;
}

// Expanded badge with more details
interface IndigenousBadgeExpandedProps {
  verification: IndigenousVerification;
  className?: string;
}

export function IndigenousBadgeExpanded({
  verification,
  className = "",
}: IndigenousBadgeExpandedProps) {
  if (verification.status !== "approved") {
    return null;
  }

  return (
    <div
      className={`rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-orange-500/5 p-4 ${className}`}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 p-2 rounded-lg bg-amber-500/20">
          <CheckBadgeIcon className="w-6 h-6 text-amber-500" />
        </div>
        <div className="flex-1">
          <h4 className="font-bold text-amber-400 flex items-center gap-2">
            Verified Indigenous Business
          </h4>
          <div className="mt-2 space-y-1 text-sm text-[var(--text-secondary)]">
            {verification.isIndigenousOwned && (
              <p className="flex items-center gap-2">
                <span className="text-amber-400">●</span>
                Indigenous Owned (51%+)
              </p>
            )}
            {verification.isIndigenousLed && (
              <p className="flex items-center gap-2">
                <span className="text-amber-400">●</span>
                Indigenous Leadership
              </p>
            )}
            {verification.nationAffiliation && (
              <p className="flex items-center gap-2">
                <span className="text-amber-400">●</span>
                {verification.nationAffiliation}
              </p>
            )}
            {verification.certifications && verification.certifications.length > 0 && (
              <p className="flex items-center gap-2">
                <span className="text-amber-400">●</span>
                {verification.certifications.join(", ")}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Status badge for pending/rejected states (shown to employer)
interface VerificationStatusBadgeProps {
  verification?: IndigenousVerification;
  className?: string;
}

export function VerificationStatusBadge({
  verification,
  className = "",
}: VerificationStatusBadgeProps) {
  if (!verification) return null;

  const statusConfig = {
    not_requested: null,
    pending: {
      bg: "bg-blue-500/10 border-blue-500/30",
      text: "text-blue-400",
      label: "Verification Pending",
      icon: "⏳",
    },
    approved: {
      bg: "bg-amber-500/10 border-amber-500/30",
      text: "text-amber-400",
      label: "Verified Indigenous Business",
      icon: "✓",
    },
    rejected: {
      bg: "bg-red-500/10 border-red-500/30",
      text: "text-red-400",
      label: "Verification Not Approved",
      icon: "✕",
    },
  };

  const config = statusConfig[verification.status];
  if (!config) return null;

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${config.bg} ${config.text} ${className}`}
    >
      <span>{config.icon}</span>
      {config.label}
    </div>
  );
}
