"use client";

import Link from "next/link";
import { Timestamp } from "firebase/firestore";
import {
  EyeIcon,
  EyeSlashIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";
import { DIRECTORY_STATUS_COPY } from "@/lib/constants/directory-visibility";

interface DirectoryStatusCardProps {
  /**
   * Whether the organization is currently visible in the directory
   */
  isDirectoryVisible: boolean;
  /**
   * When directory visibility expires (null = no expiry / grandfathered)
   */
  directoryVisibleUntil?: Timestamp | Date | null;
  /**
   * Whether the organization has grandfathered (permanent) visibility
   */
  isGrandfathered?: boolean;
}

/**
 * Formats a date for display
 */
function formatDate(date: Timestamp | Date | null | undefined): string {
  if (!date) return "";

  const d = date instanceof Date ? date : date.toDate();
  return d.toLocaleDateString("en-CA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * Directory Status Card for Organization Dashboard
 * Shows the current directory visibility status with appropriate messaging
 */
export default function DirectoryStatusCard({
  isDirectoryVisible,
  directoryVisibleUntil,
  isGrandfathered = false,
}: DirectoryStatusCardProps) {
  // Determine the current status state
  const isVisible = isDirectoryVisible || isGrandfathered;

  // Card styling based on status
  const cardStyles = isVisible
    ? "bg-gradient-to-br from-[#14B8A6]/15 to-teal-600/5 border-[#14B8A6]/30"
    : "bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/30";

  const iconBgStyles = isVisible
    ? "bg-[#14B8A6]/20 text-[#14B8A6]"
    : "bg-amber-500/20 text-amber-400";

  return (
    <div className={`rounded-2xl border p-5 ${cardStyles}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-xl ${iconBgStyles}`}>
            {isGrandfathered ? (
              <ShieldCheckIcon className="w-5 h-5" />
            ) : isVisible ? (
              <EyeIcon className="w-5 h-5" />
            ) : (
              <EyeSlashIcon className="w-5 h-5" />
            )}
          </div>
          <div>
            <h3 className="font-semibold text-slate-50">Directory Status</h3>
            <p className={`text-sm mt-0.5 ${isVisible ? "text-[#14B8A6]" : "text-amber-400"}`}>
              {isGrandfathered
                ? DIRECTORY_STATUS_COPY.GRANDFATHERED.status
                : isVisible
                ? DIRECTORY_STATUS_COPY.VISIBLE.status
                : DIRECTORY_STATUS_COPY.NOT_VISIBLE.status}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4">
        {isGrandfathered ? (
          // Grandfathered status
          <p className="text-sm text-slate-400">
            {DIRECTORY_STATUS_COPY.GRANDFATHERED.subtext}
          </p>
        ) : isVisible ? (
          // Visible with expiry date
          <p className="text-sm text-slate-400">
            {directoryVisibleUntil
              ? DIRECTORY_STATUS_COPY.VISIBLE.subtextTemplate.replace(
                  "{date}",
                  formatDate(directoryVisibleUntil)
                )
              : "Your organization is visible in the directory"}
          </p>
        ) : (
          // Not visible - show CTAs
          <>
            <p className="text-sm text-slate-400 mb-4">
              {DIRECTORY_STATUS_COPY.NOT_VISIBLE.subtext}
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/organization/jobs/new"
                className="inline-flex items-center px-4 py-2 bg-[#14B8A6] text-slate-950 rounded-lg text-sm font-medium hover:bg-[#14B8A6]/90 transition-colors"
              >
                {DIRECTORY_STATUS_COPY.NOT_VISIBLE.ctaPostJob}
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center px-4 py-2 border border-slate-700 bg-slate-800/60 text-slate-100 rounded-lg text-sm font-medium hover:border-[#14B8A6] hover:bg-slate-800 transition-colors"
              >
                {DIRECTORY_STATUS_COPY.NOT_VISIBLE.ctaViewPlans}
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
