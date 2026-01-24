'use client';

import Link from 'next/link';
import Image from 'next/image';
import {
  CurrencyDollarIcon,
  CalendarIcon,
  MapPinIcon,
  BuildingOfficeIcon,
  CheckBadgeIcon,
} from '@heroicons/react/24/outline';
import type { BusinessGrant } from '@/lib/types';
import { format } from 'date-fns';

interface GrantCardProps {
  grant: BusinessGrant;
  featured?: boolean;
}

export function GrantCard({ grant, featured = false }: GrantCardProps) {
  // Format the amount display
  const formatAmount = () => {
    if (grant.amount?.display) return grant.amount.display;
    if (grant.amount?.max) {
      if (grant.amount.min) {
        return `$${grant.amount.min.toLocaleString()} - $${grant.amount.max.toLocaleString()}`;
      }
      return `Up to $${grant.amount.max.toLocaleString()}`;
    }
    return 'Varies';
  };

  // Format deadline
  const formatDeadline = () => {
    if (!grant.deadline) return null;
    try {
      const date = grant.deadline instanceof Date
        ? grant.deadline
        : typeof grant.deadline === 'string'
        ? new Date(grant.deadline)
        : (grant.deadline as any).toDate?.();
      if (!date || isNaN(date.getTime())) return null;
      return format(date, 'MMM d, yyyy');
    } catch {
      return null;
    }
  };

  const deadline = formatDeadline();

  return (
    <Link
      href={`/business/grants/${grant.slug || grant.id}`}
      className={`group relative block overflow-hidden rounded-2xl bg-slate-800/50 backdrop-blur-sm border transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-emerald-500/10 ${
        featured
          ? 'border-emerald-500/50 ring-1 ring-emerald-500/20'
          : 'border-slate-700/50 hover:border-emerald-500/30'
      }`}
    >
      {/* Header with Provider Logo */}
      <div className="relative h-24 overflow-hidden bg-gradient-to-br from-emerald-600/20 to-teal-600/20">
        {grant.providerLogo ? (
          <Image
            src={grant.providerLogo}
            alt={grant.provider}
            fill
            className="object-cover opacity-20"
          />
        ) : null}

        <div className="absolute inset-0 flex items-center justify-center">
          {grant.providerLogo ? (
            <Image
              src={grant.providerLogo}
              alt={grant.provider}
              width={80}
              height={40}
              className="object-contain"
            />
          ) : (
            <BuildingOfficeIcon className="h-10 w-10 text-emerald-400" />
          )}
        </div>

        {/* Featured Badge */}
        {featured && (
          <div className="absolute top-3 right-3 flex items-center gap-1 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 px-3 py-1 text-xs font-semibold text-white shadow-lg">
            <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            Featured
          </div>
        )}

        {/* Status Badge */}
        <div className={`absolute top-3 left-3 rounded-full px-2.5 py-1 text-xs font-semibold ${
          grant.status === 'active'
            ? 'bg-green-500/20 text-green-400'
            : grant.status === 'upcoming'
            ? 'bg-blue-500/20 text-blue-400'
            : 'bg-red-500/20 text-red-400'
        }`}>
          {grant.status === 'active' ? 'Open' : grant.status === 'upcoming' ? 'Coming Soon' : 'Closed'}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Title */}
        <h3 className="text-lg font-semibold text-white group-hover:text-emerald-400 transition-colors line-clamp-2">
          {grant.title}
        </h3>

        {/* Provider */}
        <p className="mt-1 text-sm text-slate-400 line-clamp-1">
          {grant.provider}
        </p>

        {/* Short Description */}
        {grant.shortDescription && (
          <p className="mt-2 text-sm text-slate-500 line-clamp-2">
            {grant.shortDescription}
          </p>
        )}

        {/* Grant Type Badge */}
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-400 capitalize">
            {grant.grantType.replace('_', ' ')}
          </span>
          {grant.eligibility?.indigenousOwned && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-400">
              <CheckBadgeIcon className="h-3 w-3" />
              Indigenous Priority
            </span>
          )}
        </div>

        {/* Amount & Deadline */}
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
            <CurrencyDollarIcon className="h-4 w-4" />
            {formatAmount()}
          </span>
          {deadline && (
            <span className="flex items-center gap-1 text-slate-500">
              <CalendarIcon className="h-4 w-4" />
              {deadline}
            </span>
          )}
        </div>

        {/* Regions */}
        {grant.eligibility?.provinces && grant.eligibility.provinces.length > 0 && (
          <div className="mt-3 flex items-center gap-1 text-xs text-slate-500">
            <MapPinIcon className="h-3.5 w-3.5" />
            <span className="line-clamp-1">
              {grant.eligibility.provinces.slice(0, 3).join(', ')}
              {grant.eligibility.provinces.length > 3 && ` +${grant.eligibility.provinces.length - 3} more`}
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}
