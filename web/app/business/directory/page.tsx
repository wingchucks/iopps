'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  XMarkIcon,
  BuildingStorefrontIcon,
  BriefcaseIcon,
  MapPinIcon,
  GlobeAltIcon,
  CheckBadgeIcon,
} from '@heroicons/react/24/outline';
import { PageShell } from '@/components/PageShell';
import { useAuth } from '@/components/AuthProvider';
import { getActiveVendors, getFeaturedVendors } from '@/lib/firebase/shop';
import { listServices } from '@/lib/firestore';
import type { Vendor, Service, NorthAmericanRegion } from '@/lib/types';
import { NORTH_AMERICAN_REGIONS } from '@/lib/types';

type BusinessType = 'all' | 'products' | 'services';

interface DirectoryItem {
  id: string;
  type: 'vendor' | 'service';
  name: string;
  tagline?: string;
  category: string;
  location?: string;
  region: NorthAmericanRegion;
  logoUrl?: string;
  coverImageUrl?: string;
  featured: boolean;
  verified: boolean;
  nation?: string;
  slug?: string;
  servesRemote?: boolean;
  offersShipping?: boolean;
}

export default function BusinessDirectoryPage() {
  const { role } = useAuth();
  const [items, setItems] = useState<DirectoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [businessType, setBusinessType] = useState<BusinessType>('all');
  const [region, setRegion] = useState<NorthAmericanRegion | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Only employers and admins can list businesses
  const canListBusiness = role === 'employer' || role === 'admin';

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const results: DirectoryItem[] = [];

      // Load vendors (products)
      if (businessType === 'all' || businessType === 'products') {
        let vendors = await getActiveVendors({
          region: region || undefined,
          search: search || undefined,
        });

        // Fallback to featured vendors if no active vendors found and no filters applied
        if (vendors.length === 0 && !region && !search) {
          const featuredVendors = await getFeaturedVendors(20);
          vendors = featuredVendors;
        }

        vendors.forEach((vendor: Vendor) => {
          results.push({
            id: vendor.id,
            type: 'vendor',
            name: vendor.businessName,
            tagline: vendor.tagline,
            category: vendor.category,
            location: vendor.location,
            region: vendor.region,
            logoUrl: vendor.logoUrl,
            coverImageUrl: vendor.coverImageUrl,
            featured: vendor.featured,
            verified: vendor.verified,
            nation: vendor.nation,
            slug: vendor.slug,
            offersShipping: vendor.offersShipping,
          });
        });
      }

      // Load services
      if (businessType === 'all' || businessType === 'services') {
        const services = await listServices({
          region: region || undefined,
          search: search || undefined,
        });
        services.forEach((service: Service) => {
          results.push({
            id: service.id,
            type: 'service',
            name: service.businessName,
            tagline: service.tagline,
            category: service.category,
            location: service.location,
            region: service.region,
            logoUrl: service.logoUrl,
            coverImageUrl: service.coverImageUrl,
            featured: service.featured,
            verified: service.verified,
            nation: service.nation,
            servesRemote: service.servesRemote,
          });
        });
      }

      // Sort: featured first, then alphabetically
      results.sort((a, b) => {
        if (a.featured !== b.featured) return a.featured ? -1 : 1;
        return a.name.localeCompare(b.name);
      });

      setItems(results);
    } catch (error) {
      console.error('Failed to load directory:', error);
    } finally {
      setLoading(false);
    }
  }, [businessType, region, search]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const clearFilters = () => {
    setSearch('');
    setBusinessType('all');
    setRegion(null);
  };

  const hasFilters = search || businessType !== 'all' || region;

  const getItemUrl = (item: DirectoryItem) => {
    if (item.type === 'vendor') {
      return `/business/${item.slug}`;
    }
    return `/business/services/${item.id}`;
  };

  return (
    <PageShell>
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 px-6 py-16 sm:px-12 sm:py-24 mb-12 border border-slate-700">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <svg className="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <pattern id="grid" width="8" height="8" patternUnits="userSpaceOnUse">
                <path d="M 8 0 L 0 0 0 8" fill="none" stroke="white" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        {/* Decorative Elements */}
        <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-teal-500/10 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-indigo-500/10 blur-3xl" />

        <div className="relative mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
            Indigenous Business Directory
          </h1>
          <p className="mt-4 text-lg text-slate-300 sm:text-xl">
            Discover and connect with Indigenous-owned businesses across North America.
            Find products, services, and professional expertise all in one place.
          </p>

          {/* Search Bar */}
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <div className="relative flex-1 max-w-md">
              <MagnifyingGlassIcon className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search businesses..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-full bg-slate-800 border border-slate-700 py-3 pl-12 pr-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center justify-center gap-2 rounded-full bg-slate-800 border border-slate-700 px-6 py-3 text-white transition-colors hover:bg-slate-700"
            >
              <FunnelIcon className="h-5 w-5" />
              Filters
              {hasFilters && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-teal-500 text-xs font-bold text-white">
                  !
                </span>
              )}
            </button>
          </div>

          {/* Quick Type Filters */}
          <div className="mt-6 flex justify-center gap-3">
            <button
              onClick={() => setBusinessType('all')}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                businessType === 'all'
                  ? 'bg-white text-slate-900'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              All Businesses
            </button>
            <button
              onClick={() => setBusinessType('products')}
              className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all ${
                businessType === 'products'
                  ? 'bg-teal-500 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <BuildingStorefrontIcon className="h-4 w-4" />
              Products
            </button>
            <button
              onClick={() => setBusinessType('services')}
              className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all ${
                businessType === 'services'
                  ? 'bg-indigo-500 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <BriefcaseIcon className="h-4 w-4" />
              Services
            </button>
          </div>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="mb-8 rounded-2xl bg-slate-800/50 backdrop-blur-sm border border-slate-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Filters</h3>
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 text-sm text-slate-400 hover:text-white transition-colors"
              >
                <XMarkIcon className="h-4 w-4" />
                Clear all
              </button>
            )}
          </div>

          {/* Regions */}
          <div>
            <h4 className="text-sm font-medium text-slate-400 mb-3">Region</h4>
            <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
              <button
                onClick={() => setRegion(null)}
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition-all ${
                  region === null
                    ? 'bg-teal-500 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                All Regions
              </button>
              {NORTH_AMERICAN_REGIONS.slice(0, 20).map((r) => (
                <button
                  key={r}
                  onClick={() => setRegion(r)}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium transition-all ${
                    region === r
                      ? 'bg-teal-500 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Stats Bar */}
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-400">
            {loading ? 'Loading...' : `${items.length} ${items.length === 1 ? 'business' : 'businesses'} found`}
          </span>
          {businessType !== 'all' && (
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
              businessType === 'products'
                ? 'bg-teal-500/10 text-teal-400'
                : 'bg-indigo-500/10 text-indigo-400'
            }`}>
              {businessType === 'products' ? (
                <><BuildingStorefrontIcon className="h-3.5 w-3.5" /> Products Only</>
              ) : (
                <><BriefcaseIcon className="h-3.5 w-3.5" /> Services Only</>
              )}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <Link
            href="/business"
            className="text-sm text-slate-400 hover:text-teal-400 transition-colors"
          >
            Shop Products →
          </Link>
          <span className="text-slate-600">|</span>
          <Link
            href="/business/services"
            className="text-sm text-slate-400 hover:text-indigo-400 transition-colors"
          >
            Browse Services →
          </Link>
        </div>
      </div>

      {/* Directory Grid */}
      {loading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="animate-pulse rounded-2xl bg-slate-800/50 h-72" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl bg-slate-800/50 border border-slate-700 p-12 text-center">
          <div className="mx-auto h-16 w-16 rounded-full bg-slate-700 flex items-center justify-center mb-4">
            <MagnifyingGlassIcon className="h-8 w-8 text-slate-500" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">No businesses found</h3>
          <p className="text-slate-400 mb-4">
            {hasFilters
              ? "Try adjusting your filters or search terms."
              : "Be the first to list your Indigenous-owned business!"}
          </p>
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="inline-flex items-center gap-2 rounded-full bg-teal-500 px-4 py-2 text-sm font-medium text-white hover:bg-teal-600 transition-colors"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((item) => (
            <Link
              key={`${item.type}-${item.id}`}
              href={getItemUrl(item)}
              className={`group relative block overflow-hidden rounded-2xl bg-slate-800/50 backdrop-blur-sm border transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl ${
                item.featured
                  ? item.type === 'vendor'
                    ? 'border-teal-500/50 ring-1 ring-teal-500/20 hover:shadow-teal-500/10'
                    : 'border-indigo-500/50 ring-1 ring-indigo-500/20 hover:shadow-indigo-500/10'
                  : 'border-slate-700/50 hover:border-slate-600'
              }`}
            >
              {/* Cover Image */}
              <div className="relative h-36 overflow-hidden bg-gradient-to-br from-slate-700 to-slate-800">
                {item.coverImageUrl ? (
                  <Image
                    src={item.coverImageUrl}
                    alt={item.name}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                ) : (
                  <div className={`absolute inset-0 bg-gradient-to-br ${
                    item.type === 'vendor' ? 'from-teal-600/20 to-emerald-600/20' : 'from-indigo-600/20 to-purple-600/20'
                  }`} />
                )}

                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent" />

                {/* Type Badge */}
                <div className={`absolute top-3 left-3 flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${
                  item.type === 'vendor'
                    ? 'bg-teal-500/80 text-white'
                    : 'bg-indigo-500/80 text-white'
                }`}>
                  {item.type === 'vendor' ? (
                    <><BuildingStorefrontIcon className="h-3 w-3" /> Products</>
                  ) : (
                    <><BriefcaseIcon className="h-3 w-3" /> Services</>
                  )}
                </div>

                {/* Featured Badge */}
                {item.featured && (
                  <div className="absolute top-3 right-3 flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-2 py-1 text-xs font-semibold text-white">
                    <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  </div>
                )}

                {/* Logo */}
                <div className="absolute -bottom-5 left-4">
                  <div className="h-12 w-12 overflow-hidden rounded-xl border-4 border-slate-900 bg-slate-800 shadow-xl">
                    {item.logoUrl ? (
                      <Image
                        src={item.logoUrl}
                        alt={`${item.name} logo`}
                        width={48}
                        height={48}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className={`flex h-full w-full items-center justify-center text-lg font-bold text-white ${
                        item.type === 'vendor'
                          ? 'bg-gradient-to-br from-teal-500 to-teal-600'
                          : 'bg-gradient-to-br from-indigo-500 to-indigo-600'
                      }`}>
                        {item.name.charAt(0)}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-4 pt-7">
                {/* Business Name */}
                <div className="flex items-start justify-between gap-2">
                  <h3 className={`text-base font-semibold text-white transition-colors line-clamp-1 ${
                    item.type === 'vendor' ? 'group-hover:text-teal-400' : 'group-hover:text-indigo-400'
                  }`}>
                    {item.name}
                  </h3>
                  {item.verified && (
                    <CheckBadgeIcon className={`h-4 w-4 flex-shrink-0 ${
                      item.type === 'vendor' ? 'text-teal-400' : 'text-indigo-400'
                    }`} />
                  )}
                </div>

                {/* Tagline */}
                {item.tagline && (
                  <p className="mt-1 text-xs text-slate-400 line-clamp-1">{item.tagline}</p>
                )}

                {/* Category Badge */}
                <div className="mt-2">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                    item.type === 'vendor'
                      ? 'bg-teal-500/10 text-teal-400'
                      : 'bg-indigo-500/10 text-indigo-400'
                  }`}>
                    {item.category}
                  </span>
                </div>

                {/* Location & Options */}
                <div className="mt-3 flex items-center gap-3 text-xs text-slate-500">
                  {item.location && (
                    <span className="flex items-center gap-1">
                      <MapPinIcon className="h-3 w-3" />
                      {item.location}
                    </span>
                  )}
                  {(item.offersShipping || item.servesRemote) && (
                    <span className="flex items-center gap-1">
                      <GlobeAltIcon className="h-3 w-3" />
                      {item.type === 'vendor' ? 'Ships' : 'Remote'}
                    </span>
                  )}
                </div>

                {/* Nation */}
                {item.nation && (
                  <p className="mt-2 text-xs text-slate-500 italic truncate">{item.nation}</p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* CTA Section - Only show to employers/admins */}
      {canListBusiness && (
        <section className="mt-16 rounded-3xl bg-gradient-to-r from-slate-800 to-slate-800/50 border border-slate-700 p-8 sm:p-12 text-center">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">
            Join Our Business Directory
          </h2>
          <p className="mt-3 text-slate-400 max-w-2xl mx-auto">
            Whether you sell products or offer professional services, list your Indigenous-owned business and connect with customers across North America.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/organization/shop"
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-teal-500 to-emerald-500 px-8 py-3 text-lg font-semibold text-white shadow-lg shadow-teal-500/25 transition-all hover:shadow-xl hover:shadow-teal-500/30 hover:scale-105"
            >
              <BuildingStorefrontIcon className="h-5 w-5" />
              List Products
            </Link>
            <Link
              href="/organization/services/new"
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 px-8 py-3 text-lg font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all hover:shadow-xl hover:shadow-indigo-500/30 hover:scale-105"
            >
              <BriefcaseIcon className="h-5 w-5" />
              List Services
            </Link>
          </div>
        </section>
      )}
    </PageShell>
  );
}
