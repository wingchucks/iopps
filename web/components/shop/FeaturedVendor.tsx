"use client";

import Link from "next/link";
import Image from "next/image";
import type { Vendor } from "@/lib/firebase/vendors";
import { incrementWebsiteClick } from "@/lib/firebase/vendors";

interface FeaturedVendorProps {
  vendor: Vendor;
  size?: "default" | "compact";
}

export function FeaturedVendor({
  vendor,
  size = "default",
}: FeaturedVendorProps) {
  const handleWebsiteClick = async () => {
    try {
      await incrementWebsiteClick(vendor.id);
    } catch (error) {
      console.error("Failed to track website click:", error);
    }
  };

  if (size === "compact") {
    return (
      <article className="relative overflow-hidden rounded-2xl border border-slate-800 bg-[#08090C]">
        <div className="relative h-40">
          {vendor.coverImage ? (
            <Image
              src={vendor.coverImage}
              alt={vendor.businessName}
              fill
              className="object-cover"
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-slate-800 to-slate-900" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

          {/* Featured Badge */}
          <div className="absolute left-3 top-3">
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/90 px-2.5 py-1 text-xs font-semibold text-slate-900">
              <span>✨</span> Featured
            </span>
          </div>
        </div>

        <div className="p-4">
          <div className="flex items-start gap-3">
            {/* Profile Image */}
            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full border-2 border-slate-700">
              {vendor.profileImage ? (
                <Image
                  src={vendor.profileImage}
                  alt={vendor.businessName}
                  width={48}
                  height={48}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#14B8A6] to-teal-600 text-lg font-semibold text-white">
                  {vendor.businessName.charAt(0)}
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              {vendor.nation && (
                <span className="inline-block rounded-full border border-slate-700 bg-slate-800/50 px-2 py-0.5 text-[10px] font-medium text-slate-300">
                  {vendor.nation}
                </span>
              )}
              <h3 className="mt-1 truncate text-base font-semibold text-slate-50">
                {vendor.businessName}
              </h3>
            </div>
          </div>

          {vendor.tagline && (
            <p className="mt-2 line-clamp-2 text-sm text-slate-400">
              {vendor.tagline}
            </p>
          )}

          <Link
            href={`/shop/${vendor.slug}`}
            className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-[#14B8A6] hover:underline"
          >
            View Profile
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </Link>
        </div>
      </article>
    );
  }

  // Default (large) size
  return (
    <article className="relative overflow-hidden rounded-2xl border border-slate-800 bg-[#08090C]">
      {/* Cover Image with Gradient */}
      <div className="relative h-64 sm:h-80">
        {vendor.coverImage ? (
          <Image
            src={vendor.coverImage}
            alt={vendor.businessName}
            fill
            className="object-cover"
            priority
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-slate-800 to-slate-900" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />

        {/* Featured Badge */}
        <div className="absolute left-4 top-4 sm:left-6 sm:top-6">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/90 px-3 py-1.5 text-sm font-semibold text-slate-900">
            <span className="text-base">✨</span> Today&apos;s Featured Business
          </span>
        </div>

        {/* Content Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            {/* Vendor Info */}
            <div className="flex items-end gap-4">
              {/* Profile Image */}
              <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border-4 border-black/30 shadow-lg sm:h-24 sm:w-24">
                {vendor.profileImage ? (
                  <Image
                    src={vendor.profileImage}
                    alt={vendor.businessName}
                    width={96}
                    height={96}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#14B8A6] to-teal-600 text-3xl font-semibold text-white">
                    {vendor.businessName.charAt(0)}
                  </div>
                )}
              </div>

              <div className="min-w-0 pb-1">
                {/* Nation Badge */}
                {vendor.nation && (
                  <span className="inline-block rounded-full border border-white/20 bg-white/10 px-2.5 py-0.5 text-xs font-medium text-white backdrop-blur-sm">
                    {vendor.nation}
                  </span>
                )}

                {/* Business Name */}
                <h2 className="mt-1.5 text-xl font-bold text-white sm:text-2xl">
                  {vendor.businessName}
                </h2>

                {/* Tagline */}
                {vendor.tagline && (
                  <p className="mt-1 line-clamp-1 text-sm text-white/80 sm:text-base">
                    {vendor.tagline}
                  </p>
                )}

                {/* Verification Badge */}
                {vendor.verificationStatus === "verified" && (
                  <div className="mt-2 flex items-center gap-1 text-[#14B8A6]">
                    <svg
                      className="h-4 w-4"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span className="text-xs font-medium">
                      Verified Indigenous Business
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* CTAs - Desktop */}
            <div className="hidden gap-2 sm:flex">
              {vendor.website && (
                <a
                  href={vendor.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={handleWebsiteClick}
                  className="inline-flex items-center gap-2 rounded-full bg-[#14B8A6] px-5 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-[#14B8A6]/90"
                >
                  Visit Their Store
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    />
                  </svg>
                </a>
              )}
              <Link
                href={`/shop/${vendor.slug}`}
                className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/20"
              >
                See Their Story
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Story Excerpt & CTAs - Mobile */}
      <div className="p-4 sm:hidden">
        {vendor.description && (
          <p className="line-clamp-2 text-sm text-slate-400">
            {vendor.description.slice(0, 150)}
            {vendor.description.length > 150 && "..."}
          </p>
        )}

        <div className="mt-4 flex flex-col gap-2">
          {vendor.website && (
            <a
              href={vendor.website}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleWebsiteClick}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[#14B8A6] px-5 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-[#14B8A6]/90"
            >
              Visit Their Store
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
            </a>
          )}
          <Link
            href={`/shop/${vendor.slug}`}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-700 px-5 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-[#14B8A6] hover:text-[#14B8A6]"
          >
            See Their Story
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </Link>
        </div>
      </div>

      {/* Story Excerpt - Desktop */}
      {vendor.description && (
        <div className="hidden border-t border-slate-800 p-6 sm:block">
          <p className="line-clamp-2 text-slate-400">
            {vendor.description.slice(0, 250)}
            {vendor.description.length > 250 && "..."}
          </p>
        </div>
      )}
    </article>
  );
}

/**
 * Skeleton loader for FeaturedVendor
 */
export function FeaturedVendorSkeleton({
  size = "default",
}: {
  size?: "default" | "compact";
}) {
  if (size === "compact") {
    return (
      <div className="rounded-2xl border border-slate-800 bg-[#08090C]">
        <div className="h-40 animate-pulse rounded-t-2xl bg-slate-800" />
        <div className="p-4 space-y-3">
          <div className="flex items-start gap-3">
            <div className="h-12 w-12 animate-pulse rounded-full bg-slate-800" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-16 animate-pulse rounded-full bg-slate-800" />
              <div className="h-5 w-3/4 animate-pulse rounded bg-slate-800" />
            </div>
          </div>
          <div className="h-4 w-full animate-pulse rounded bg-slate-800" />
          <div className="h-4 w-24 animate-pulse rounded bg-slate-800" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-[#08090C]">
      <div className="relative h-64 animate-pulse bg-slate-800 sm:h-80">
        <div className="absolute left-4 top-4 h-8 w-48 rounded-full bg-slate-700 sm:left-6 sm:top-6" />
        <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6">
          <div className="flex items-end gap-4">
            <div className="h-20 w-20 rounded-xl bg-slate-700 sm:h-24 sm:w-24" />
            <div className="flex-1 space-y-2 pb-1">
              <div className="h-4 w-20 rounded-full bg-slate-700" />
              <div className="h-6 w-48 rounded bg-slate-700" />
              <div className="h-4 w-64 rounded bg-slate-700" />
            </div>
          </div>
        </div>
      </div>
      <div className="hidden border-t border-slate-800 p-6 sm:block">
        <div className="h-4 w-full animate-pulse rounded bg-slate-800" />
        <div className="mt-2 h-4 w-3/4 animate-pulse rounded bg-slate-800" />
      </div>
    </div>
  );
}
