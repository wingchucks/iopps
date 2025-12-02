"use client";

import Image from "next/image";
import type { Vendor } from "@/lib/firebase/vendors";

interface VendorHeroProps {
  vendor: Vendor;
}

export function VendorHero({ vendor }: VendorHeroProps) {
  return (
    <div className="relative">
      {/* Cover Image */}
      <div className="relative h-48 w-full overflow-hidden rounded-2xl bg-slate-800 sm:h-64 md:h-80">
        {vendor.coverImage ? (
          <Image
            src={vendor.coverImage}
            alt={`${vendor.businessName || "Shop"} cover`}
            fill
            className="object-cover"
            priority
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-slate-800 to-slate-900" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
      </div>

      {/* Profile Info Overlay */}
      <div className="relative mx-4 -mt-20 sm:-mt-24 md:-mt-28 md:mx-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-6">
          {/* Profile Image */}
          <div className="h-28 w-28 shrink-0 overflow-hidden rounded-2xl border-4 border-[#08090C] bg-slate-800 shadow-xl sm:h-32 sm:w-32 md:h-36 md:w-36">
            {vendor.profileImage ? (
              <Image
                src={vendor.profileImage}
                alt={vendor.businessName || "Shop"}
                width={144}
                height={144}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#14B8A6] to-teal-600 text-4xl font-bold text-white">
                {vendor.businessName?.charAt(0) || "?"}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 pb-2">
            {/* Badges Row */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Verification Badge */}
              {vendor.verificationStatus === "verified" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#14B8A6] px-2.5 py-1 text-xs font-semibold text-slate-900">
                  <svg
                    className="h-3.5 w-3.5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Verified
                </span>
              )}

              {/* Nation Badge */}
              {vendor.nation && (
                <span className="inline-block rounded-full border border-slate-600 bg-slate-800/80 px-3 py-1 text-xs font-medium text-slate-200">
                  {vendor.nation}
                </span>
              )}
            </div>

            {/* Business Name */}
            <h1 className="mt-2 text-2xl font-bold text-slate-50 sm:text-3xl md:text-4xl">
              {vendor.businessName || "Untitled Shop"}
            </h1>

            {/* Tagline */}
            {vendor.tagline && (
              <p className="mt-1 text-base text-slate-300 sm:text-lg">
                {vendor.tagline}
              </p>
            )}

            {/* Location */}
            {vendor.location && (vendor.location.city || vendor.location.province) && (
              <div className="mt-2 flex items-center gap-1 text-sm text-slate-400">
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
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <span>
                  {[vendor.location.city, vendor.location.province]
                    .filter(Boolean)
                    .join(", ")}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function VendorHeroSkeleton() {
  return (
    <div className="relative">
      <div className="h-48 w-full animate-pulse rounded-2xl bg-slate-800 sm:h-64 md:h-80" />
      <div className="relative mx-4 -mt-20 sm:-mt-24 md:-mt-28 md:mx-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-6">
          <div className="h-28 w-28 animate-pulse rounded-2xl bg-slate-700 sm:h-32 sm:w-32 md:h-36 md:w-36" />
          <div className="flex-1 space-y-3 pb-2">
            <div className="flex gap-2">
              <div className="h-6 w-20 animate-pulse rounded-full bg-slate-700" />
              <div className="h-6 w-24 animate-pulse rounded-full bg-slate-700" />
            </div>
            <div className="h-10 w-64 animate-pulse rounded bg-slate-700" />
            <div className="h-5 w-48 animate-pulse rounded bg-slate-700" />
            <div className="h-4 w-32 animate-pulse rounded bg-slate-700" />
          </div>
        </div>
      </div>
    </div>
  );
}
