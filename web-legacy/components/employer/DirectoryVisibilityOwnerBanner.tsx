"use client";

import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { OWNER_BANNER_COPY } from "@/lib/constants/directory-visibility";

interface DirectoryVisibilityOwnerBannerProps {
  /**
   * The user ID of the organization owner
   */
  ownerId: string;
  /**
   * Whether the organization is currently visible in the directory
   */
  isDirectoryVisible: boolean;
  /**
   * Whether the organization has grandfathered (permanent) visibility
   */
  isGrandfathered?: boolean;
}

/**
 * Owner-only banner shown on public organization profile
 * Only visible to the organization owner when directory visibility is inactive
 */
export default function DirectoryVisibilityOwnerBanner({
  ownerId,
  isDirectoryVisible,
  isGrandfathered = false,
}: DirectoryVisibilityOwnerBannerProps) {
  const { user } = useAuth();

  // Only show to the owner
  if (!user || user.uid !== ownerId) {
    return null;
  }

  // Don't show if organization is visible (either actively or grandfathered)
  if (isDirectoryVisible || isGrandfathered) {
    return null;
  }

  return (
    <div className="mb-6 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-amber-500/20">
          <svg
            className="h-5 w-5 text-amber-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
            />
          </svg>
        </div>
        <div className="flex-1">
          <p className="font-semibold text-amber-300">Not Visible in Directory</p>
          <p className="mt-1 text-sm text-amber-200/80">
            {OWNER_BANNER_COPY.message}
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            <Link
              href="/organization/jobs/new"
              className="inline-flex items-center rounded-lg bg-amber-500/20 px-4 py-2 text-sm font-medium text-amber-300 hover:bg-amber-500/30 transition-colors"
            >
              Post a Job
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center rounded-lg border border-amber-500/30 px-4 py-2 text-sm font-medium text-amber-300 hover:bg-amber-500/10 transition-colors"
            >
              View Plans
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
