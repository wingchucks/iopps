"use client";

import Link from "next/link";
import Image from "next/image";
import type { Vendor } from "@/lib/firebase/vendors";

interface VendorCardProps {
  vendor: Vendor;
  showQuickLink?: boolean;
  size?: "default" | "compact";
}

export function VendorCard({
  vendor,
  showQuickLink = true,
  size = "default",
}: VendorCardProps) {
  const isCompact = size === "compact";

  return (
    <article
      className={`group relative rounded-2xl border border-slate-800 bg-[#08090C] shadow-lg shadow-black/30 transition hover:-translate-y-1 hover:border-[#14B8A6]/70 ${
        isCompact ? "p-3" : "p-4"
      }`}
    >
      {/* Cover Image */}
      <div
        className={`relative overflow-hidden rounded-xl bg-slate-900 ${
          isCompact ? "aspect-[4/3]" : "aspect-[4/3]"
        }`}
      >
        {vendor.coverImage ? (
          <Image
            src={vendor.coverImage}
            alt={vendor.businessName}
            fill
            className="object-cover transition group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900">
            <span className="text-4xl text-slate-600">
              {vendor.businessName.charAt(0)}
            </span>
          </div>
        )}

        {/* Profile Image Overlay */}
        <div className="absolute -bottom-4 left-4">
          <div
            className={`overflow-hidden rounded-full border-2 border-[#08090C] bg-slate-800 ${
              isCompact ? "h-12 w-12" : "h-14 w-14"
            }`}
          >
            {vendor.profileImage ? (
              <Image
                src={vendor.profileImage}
                alt={vendor.businessName}
                width={isCompact ? 48 : 56}
                height={isCompact ? 48 : 56}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#14B8A6] to-teal-600 text-lg font-semibold text-white">
                {vendor.businessName.charAt(0)}
              </div>
            )}
          </div>
        </div>

        {/* Verification Badge */}
        {vendor.verificationStatus === "verified" && (
          <div className="absolute right-2 top-2">
            <div className="flex items-center gap-1 rounded-full bg-[#14B8A6]/90 px-2 py-0.5 text-[10px] font-semibold text-slate-900">
              <svg
                className="h-3 w-3"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              Verified
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className={`${isCompact ? "mt-5 space-y-1" : "mt-6 space-y-2"}`}>
        {/* Nation Badge */}
        {vendor.nation && (
          <span className="inline-block rounded-full border border-slate-700 bg-slate-800/50 px-2 py-0.5 text-[10px] font-medium text-slate-300">
            {vendor.nation}
          </span>
        )}

        {/* Business Name */}
        <h3
          className={`font-semibold text-slate-50 ${
            isCompact ? "text-base" : "text-lg"
          }`}
        >
          <Link
            href={`/shop/${vendor.slug}`}
            className="hover:text-[#14B8A6] transition"
          >
            {vendor.businessName}
          </Link>
        </h3>

        {/* Tagline */}
        {vendor.tagline && (
          <p
            className={`line-clamp-2 text-slate-400 ${
              isCompact ? "text-xs" : "text-sm"
            }`}
          >
            {vendor.tagline}
          </p>
        )}

        {/* Quick Actions */}
        {showQuickLink && vendor.website && (
          <div className="pt-2">
            <a
              href={vendor.website}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium text-[#14B8A6] hover:underline"
            >
              Visit Website
              <svg
                className="h-3 w-3"
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
          </div>
        )}
      </div>

      {/* Full card link overlay for accessibility */}
      <Link
        href={`/shop/${vendor.slug}`}
        className="absolute inset-0 z-10"
        aria-label={`View ${vendor.businessName}'s profile`}
      >
        <span className="sr-only">View profile</span>
      </Link>
    </article>
  );
}

/**
 * Skeleton loader for VendorCard
 */
export function VendorCardSkeleton({
  size = "default",
}: {
  size?: "default" | "compact";
}) {
  const isCompact = size === "compact";

  return (
    <div
      className={`rounded-2xl border border-slate-800 bg-[#08090C] ${
        isCompact ? "p-3" : "p-4"
      }`}
    >
      <div
        className={`animate-pulse rounded-xl bg-slate-800 ${
          isCompact ? "aspect-[4/3]" : "aspect-[4/3]"
        }`}
      />
      <div className={`${isCompact ? "mt-5" : "mt-6"} space-y-3`}>
        <div className="h-4 w-16 animate-pulse rounded-full bg-slate-800" />
        <div className="h-5 w-3/4 animate-pulse rounded bg-slate-800" />
        <div className="space-y-1.5">
          <div className="h-3 w-full animate-pulse rounded bg-slate-800" />
          <div className="h-3 w-2/3 animate-pulse rounded bg-slate-800" />
        </div>
      </div>
    </div>
  );
}
