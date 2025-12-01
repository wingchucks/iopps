"use client";

import Link from "next/link";
import { type Vendor } from "@/lib/firebase/vendors";

interface BusinessOfTheDayProps {
  vendor: Vendor;
  reason?: string;
}

export function BusinessOfTheDay({ vendor, reason }: BusinessOfTheDayProps) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-[#14B8A6]/30 bg-gradient-to-br from-[#14B8A6]/10 to-[#08090C]">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <svg className="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="1" fill="currentColor" />
          </pattern>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      <div className="relative flex flex-col gap-6 p-6 md:flex-row md:items-center md:p-8">
        {/* Badge */}
        <div className="absolute -right-2 -top-2 md:right-4 md:top-4">
          <div className="flex items-center gap-1.5 rounded-full bg-[#14B8A6] px-3 py-1.5 text-xs font-semibold text-slate-900">
            <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            Business of the Day
          </div>
        </div>

        {/* Vendor Image */}
        <Link
          href={`/shop/${vendor.slug}`}
          className="shrink-0 overflow-hidden rounded-xl"
        >
          {vendor.profileImage ? (
            <img
              src={vendor.profileImage}
              alt={vendor.businessName}
              className="h-40 w-40 object-cover transition-transform hover:scale-105 md:h-48 md:w-48"
            />
          ) : (
            <div className="flex h-40 w-40 items-center justify-center bg-slate-800 text-4xl font-bold text-slate-600 md:h-48 md:w-48">
              {vendor.businessName.charAt(0)}
            </div>
          )}
        </Link>

        {/* Content */}
        <div className="flex-1">
          {/* Header */}
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <Link
                href={`/shop/${vendor.slug}`}
                className="text-xl font-bold text-slate-100 hover:text-[#14B8A6] md:text-2xl"
              >
                {vendor.businessName}
              </Link>

              {/* Nation & Location */}
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-400">
                {vendor.nation && (
                  <span className="flex items-center gap-1.5">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {vendor.nation}
                  </span>
                )}
                {vendor.location?.city && vendor.location?.province && (
                  <span>
                    {vendor.location.city}, {vendor.location.province}
                  </span>
                )}
              </div>
            </div>

            {/* Verified Badge */}
            {vendor.verificationStatus === "verified" && (
              <div className="shrink-0 rounded-full bg-blue-500/10 p-2" title="Verified Vendor">
                <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
            )}
          </div>

          {/* Tagline */}
          {vendor.tagline && (
            <p className="mt-3 text-slate-300">{vendor.tagline}</p>
          )}

          {/* Why Featured */}
          {reason && (
            <div className="mt-3 rounded-lg bg-slate-900/50 px-3 py-2">
              <p className="text-sm italic text-slate-400">
                &ldquo;{reason}&rdquo;
              </p>
            </div>
          )}

          {/* Tags */}
          <div className="mt-4 flex flex-wrap gap-2">
            {vendor.categories?.slice(0, 3).map((category) => (
              <span
                key={category}
                className="rounded-full bg-slate-800 px-2.5 py-1 text-xs text-slate-400"
              >
                {category}
              </span>
            ))}
            {vendor.acceptsCustomOrders && (
              <span className="rounded-full bg-[#14B8A6]/10 px-2.5 py-1 text-xs text-[#14B8A6]">
                Custom Orders
              </span>
            )}
          </div>

          {/* Actions */}
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Link
              href={`/shop/${vendor.slug}`}
              className="inline-flex items-center gap-2 rounded-xl bg-[#14B8A6] px-5 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-[#0D9488]"
            >
              View Storefront
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
            {vendor.website && (
              <a
                href={vendor.website}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-5 py-2.5 text-sm font-medium text-slate-300 transition hover:border-slate-600 hover:text-white"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                Website
              </a>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * Skeleton loader for Business of the Day
 */
export function BusinessOfTheDaySkeleton() {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-slate-800 bg-[#08090C]">
      <div className="flex flex-col gap-6 p-6 md:flex-row md:items-center md:p-8">
        {/* Badge Skeleton */}
        <div className="absolute right-4 top-4">
          <div className="h-7 w-36 animate-pulse rounded-full bg-slate-800" />
        </div>

        {/* Image Skeleton */}
        <div className="h-40 w-40 shrink-0 animate-pulse rounded-xl bg-slate-800 md:h-48 md:w-48" />

        {/* Content Skeleton */}
        <div className="flex-1">
          <div className="h-7 w-48 animate-pulse rounded bg-slate-800" />
          <div className="mt-2 h-4 w-32 animate-pulse rounded bg-slate-800" />
          <div className="mt-4 h-5 w-full max-w-md animate-pulse rounded bg-slate-800" />
          <div className="mt-4 flex gap-2">
            <div className="h-6 w-16 animate-pulse rounded-full bg-slate-800" />
            <div className="h-6 w-20 animate-pulse rounded-full bg-slate-800" />
            <div className="h-6 w-24 animate-pulse rounded-full bg-slate-800" />
          </div>
          <div className="mt-5 flex gap-3">
            <div className="h-10 w-36 animate-pulse rounded-xl bg-slate-800" />
            <div className="h-10 w-28 animate-pulse rounded-xl bg-slate-800" />
          </div>
        </div>
      </div>
    </section>
  );
}
