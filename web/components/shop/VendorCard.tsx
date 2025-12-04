'use client';

import Link from 'next/link';
import Image from 'next/image';
import { MapPinIcon, GlobeAltIcon, CheckBadgeIcon } from '@heroicons/react/24/outline';
import type { Vendor } from '@/lib/types';

interface VendorCardProps {
  vendor: Vendor;
  featured?: boolean;
}

export function VendorCard({ vendor, featured = false }: VendorCardProps) {
  return (
    <Link
      href={`/shop/${vendor.slug}`}
      className={`group relative block overflow-hidden rounded-2xl bg-slate-800/50 backdrop-blur-sm border transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-teal-500/10 ${
        featured
          ? 'border-teal-500/50 ring-1 ring-teal-500/20'
          : 'border-slate-700/50 hover:border-teal-500/30'
      }`}
    >
      {/* Cover Image */}
      <div className="relative h-48 overflow-hidden bg-gradient-to-br from-slate-700 to-slate-800">
        {vendor.coverImageUrl ? (
          <Image
            src={vendor.coverImageUrl}
            alt={vendor.businessName}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-teal-600/20 to-purple-600/20" />
        )}

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent" />

        {/* Featured Badge */}
        {featured && (
          <div className="absolute top-3 right-3 flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-3 py-1 text-xs font-semibold text-white shadow-lg">
            <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            Featured
          </div>
        )}

        {/* Logo */}
        <div className="absolute -bottom-6 left-4">
          <div className="h-16 w-16 overflow-hidden rounded-xl border-4 border-slate-900 bg-slate-800 shadow-xl">
            {vendor.logoUrl ? (
              <Image
                src={vendor.logoUrl}
                alt={`${vendor.businessName} logo`}
                width={64}
                height={64}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-teal-500 to-teal-600 text-xl font-bold text-white">
                {vendor.businessName.charAt(0)}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 pt-8">
        {/* Business Name */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-lg font-semibold text-white group-hover:text-teal-400 transition-colors line-clamp-1">
            {vendor.businessName}
          </h3>
          {vendor.verified && (
            <CheckBadgeIcon className="h-5 w-5 flex-shrink-0 text-teal-400" />
          )}
        </div>

        {/* Tagline */}
        {vendor.tagline && (
          <p className="mt-1 text-sm text-slate-400 line-clamp-1">{vendor.tagline}</p>
        )}

        {/* Category Badge */}
        <div className="mt-3">
          <span className="inline-flex items-center rounded-full bg-teal-500/10 px-2.5 py-0.5 text-xs font-medium text-teal-400">
            {vendor.category}
          </span>
        </div>

        {/* Location & Links */}
        <div className="mt-4 flex items-center gap-4 text-xs text-slate-500">
          {vendor.location && (
            <span className="flex items-center gap-1">
              <MapPinIcon className="h-3.5 w-3.5" />
              {vendor.location}
            </span>
          )}
          {vendor.offersShipping && (
            <span className="flex items-center gap-1">
              <GlobeAltIcon className="h-3.5 w-3.5" />
              Offers Shipping
            </span>
          )}
        </div>

        {/* Nation */}
        {vendor.nation && (
          <p className="mt-2 text-xs text-slate-500 italic">{vendor.nation}</p>
        )}
      </div>
    </Link>
  );
}
