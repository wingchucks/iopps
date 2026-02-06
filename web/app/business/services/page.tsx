'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { MagnifyingGlassIcon, FunnelIcon, XMarkIcon, BriefcaseIcon } from '@heroicons/react/24/outline';
import { FeedLayout } from '@/components/opportunity-graph';
import { ServiceCard } from '@/components/shop';
import { listServices, getFeaturedServices } from '@/lib/firestore';
import { useAuth } from '@/components/AuthProvider';
import type { Service, ServiceCategory, NorthAmericanRegion } from '@/lib/types';
import { SERVICE_CATEGORIES, NORTH_AMERICAN_REGIONS } from '@/lib/types';

export default function ServicesPage() {
  const { role } = useAuth();
  const [services, setServices] = useState<Service[]>([]);

  // Only show service listing CTA to employers/admins
  const canListServices = role === 'employer' || role === 'admin';
  const [featuredServices, setFeaturedServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<ServiceCategory | null>(null);
  const [region, setRegion] = useState<NorthAmericanRegion | null>(null);
  const [servesRemote, setServesRemote] = useState<boolean | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const loadServices = useCallback(async () => {
    setLoading(true);
    try {
      const [allServices, featured] = await Promise.all([
        listServices({
          category: category || undefined,
          region: region || undefined,
          servesRemote: servesRemote ?? undefined,
          search: search || undefined,
        }),
        getFeaturedServices(3),
      ]);
      setServices(allServices);
      setFeaturedServices(featured);
    } catch (error) {
      console.error('Failed to load services:', error);
    } finally {
      setLoading(false);
    }
  }, [category, region, servesRemote, search]);

  useEffect(() => {
    loadServices();
  }, [loadServices]);

  const clearFilters = () => {
    setSearch('');
    setCategory(null);
    setRegion(null);
    setServesRemote(null);
  };

  const hasFilters = search || category || region || servesRemote !== null;

  return (
    <FeedLayout activeNav="business" fullWidth>
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 px-6 py-16 sm:px-12 sm:py-24 mb-12">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <svg className="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                <path d="M 10 0 L 0 0 0 10" fill="none" stroke="white" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        {/* Decorative Elements */}
        <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-white/20 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-purple-400/20 blur-3xl" />

        <div className="relative mx-auto max-w-3xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-2 text-sm text-indigo-600">
            <BriefcaseIcon className="h-5 w-5" />
            Indigenous Marketplace
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
            Professional Services
          </h1>
          <p className="mt-4 text-lg text-indigo-600 sm:text-xl">
            Connect with Indigenous-owned professional service providers.
            From consulting to legal services, find the expertise you need.
          </p>

          {/* Search Bar */}
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <div className="relative flex-1 max-w-md">
              <MagnifyingGlassIcon className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Search services..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-full bg-white/20 backdrop-blur-sm border border-white/30 py-3 pl-12 pr-4 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/50"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center justify-center gap-2 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 px-6 py-3 text-white transition-colors hover:bg-white/20"
            >
              <FunnelIcon className="h-5 w-5" />
              Filters
              {hasFilters && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-xs font-bold text-indigo-600">
                  !
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="mb-8 rounded-2xl bg-white backdrop-blur-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900">Filters</h3>
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 transition-colors"
              >
                <XMarkIcon className="h-4 w-4" />
                Clear all
              </button>
            )}
          </div>

          {/* Categories */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-slate-500 mb-3">Category</h4>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setCategory(null)}
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition-all ${
                  category === null
                    ? 'bg-indigo-500 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All Categories
              </button>
              {SERVICE_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium transition-all ${
                    category === cat
                      ? 'bg-indigo-500 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Remote Services */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-slate-500 mb-3">Availability</h4>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setServesRemote(null)}
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition-all ${
                  servesRemote === null
                    ? 'bg-indigo-500 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setServesRemote(true)}
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition-all ${
                  servesRemote === true
                    ? 'bg-indigo-500 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Remote Available
              </button>
            </div>
          </div>

          {/* Regions */}
          <div>
            <h4 className="text-sm font-medium text-slate-500 mb-3">Region</h4>
            <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
              <button
                onClick={() => setRegion(null)}
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition-all ${
                  region === null
                    ? 'bg-indigo-500 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
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
                      ? 'bg-indigo-500 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Featured Section */}
      {!hasFilters && featuredServices.length > 0 && (
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-orange-500">
              <svg className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Featured Services</h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featuredServices.map((service) => (
              <ServiceCard key={service.id} service={service} featured />
            ))}
          </div>
        </section>
      )}

      {/* All Services */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-slate-900">
            {hasFilters ? 'Search Results' : 'All Services'}
          </h2>
          <span className="text-sm text-slate-500">
            {loading ? 'Loading...' : `${services.length} ${services.length === 1 ? 'service' : 'services'}`}
          </span>
        </div>

        {loading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="animate-pulse rounded-2xl bg-slate-100 h-72" />
            ))}
          </div>
        ) : services.length === 0 ? (
          <div className="rounded-2xl bg-white border border-slate-200 p-12 text-center">
            <div className="mx-auto h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
              <BriefcaseIcon className="h-8 w-8 text-slate-500" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No services found</h3>
            <p className="text-slate-500 mb-4">
              {hasFilters
                ? "Try adjusting your filters or search terms."
                : "Be the first to list your professional services!"}
            </p>
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="inline-flex items-center gap-2 rounded-full bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-600 transition-colors"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {services.map((service) => (
              <ServiceCard key={service.id} service={service} />
            ))}
          </div>
        )}
      </section>

      {/* CTA Section - Only for employers/admins */}
      {canListServices && (
        <section className="mt-16 rounded-3xl bg-gradient-to-r from-slate-100 to-slate-50 border border-slate-200 p-8 sm:p-12 text-center">
          <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">
            Offer Professional Services?
          </h2>
          <p className="mt-3 text-slate-500 max-w-2xl mx-auto">
            Join our growing network of Indigenous professional service providers. Showcase your expertise and connect with clients across North America.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/organization/services/new"
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 px-8 py-3 text-lg font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all hover:shadow-xl hover:shadow-indigo-500/30 hover:scale-105"
            >
              List Your Services
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
            <Link
              href="/business"
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-8 py-3 text-lg font-semibold text-slate-900 transition-all hover:bg-slate-50"
            >
              Browse Products
            </Link>
          </div>
        </section>
      )}
    </FeedLayout>
  );
}
