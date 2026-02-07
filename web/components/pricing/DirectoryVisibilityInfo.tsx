"use client";

import { DIRECTORY_VISIBILITY_INFO } from "@/lib/constants/directory-visibility";

/**
 * Directory Visibility info block for pricing pages
 * Displays consistent messaging about what directory visibility means
 */
export default function DirectoryVisibilityInfo() {
  return (
    <div className="rounded-xl border border-[#14B8A6]/30 bg-accent/5 p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-accent/20">
          <svg
            className="h-5 w-5 text-[#14B8A6]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
            />
          </svg>
        </div>
        <div>
          <h3 className="font-semibold text-[#14B8A6]">
            {DIRECTORY_VISIBILITY_INFO.title}
          </h3>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            {DIRECTORY_VISIBILITY_INFO.body}
          </p>
        </div>
      </div>
    </div>
  );
}
