'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  XMarkIcon,
  BuildingOffice2Icon,
  BuildingStorefrontIcon,
  AcademicCapIcon,
  HeartIcon,
  MapPinIcon,
  BriefcaseIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  CheckBadgeIcon,
  ChevronRightIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import { PageShell } from '@/components/PageShell';
import { useAuth } from '@/components/AuthProvider';
import { queryDirectory, getFeaturedDirectoryEntries } from '@/lib/firestore/directory';
import type {
  DirectoryEntry,
  DirectoryFilters,
  OrgType,
  OrganizationModule,
} from '@/lib/types';
import { ORG_TYPE_LABELS, NORTH_AMERICAN_REGIONS } from '@/lib/types';

// Canadian provinces only for initial release
const CANADIAN_PROVINCES = NORTH_AMERICAN_REGIONS.slice(0, 13);

// Module labels for filter UI
const MODULE_LABELS: Record<OrganizationModule, { label: string; icon: typeof BriefcaseIcon }> = {
  hire: { label: 'Jobs', icon: BriefcaseIcon },
  sell: { label: 'Products & Services', icon: BuildingStorefrontIcon },
  educate: { label: 'Programs & Scholarships', icon: AcademicCapIcon },
  host: { label: 'Events', icon: CalendarIcon },
  funding: { label: 'Funding', icon: CurrencyDollarIcon },
};

// Organization type icons
const ORG_TYPE_ICONS: Record<OrgType, typeof BuildingOffice2Icon> = {
  EMPLOYER: BuildingOffice2Icon,
  INDIGENOUS_BUSINESS: BuildingStorefrontIcon,
  SCHOOL: AcademicCapIcon,
  NONPROFIT: HeartIcon,
  GOVERNMENT: BuildingOffice2Icon,
  OTHER: BuildingOffice2Icon,
};

// Quick category filters with icons
const QUICK_CATEGORIES = [
  { icon: BuildingStorefrontIcon, label: 'Shops', module: 'sell' as OrganizationModule, color: 'from-teal-500/20 to-emerald-500/20' },
  { icon: BriefcaseIcon, label: 'Hiring', module: 'hire' as OrganizationModule, color: 'from-blue-500/20 to-indigo-500/20' },
  { icon: AcademicCapIcon, label: 'Education', module: 'educate' as OrganizationModule, color: 'from-purple-500/20 to-violet-500/20' },
  { icon: CalendarIcon, label: 'Events', module: 'host' as OrganizationModule, color: 'from-amber-500/20 to-orange-500/20' },
];

// Primary CTA button text based on type
function getPrimaryCTAText(entry: DirectoryEntry): string {
  switch (entry.primaryCTAType) {
    case 'JOBS':
      return `View Jobs (${entry.counts.jobsCount})`;
    case 'OFFERINGS':
      return `View Offerings (${entry.counts.offeringsCount})`;
    case 'PROGRAMS':
      return `View Programs (${entry.counts.programsCount})`;
    case 'EVENTS':
      return `View Events (${entry.counts.eventsCount})`;
    case 'FUNDING':
      return `View Funding (${entry.counts.fundingCount})`;
    default:
      return 'Visit Profile';
  }
}

export default function BusinessesPage() {
  const { role } = useAuth();
  const [entries, setEntries] = useState<DirectoryEntry[]>([]);
  const [featuredEntry, setFeaturedEntry] = useState<DirectoryEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Selected filter states
  const [selectedOrgTypes, setSelectedOrgTypes] = useState<OrgType[]>([]);
  const [selectedProvince, setSelectedProvince] = useState<string>('');
  const [selectedModules, setSelectedModules] = useState<OrganizationModule[]>([]);
  const [indigenousOwned, setIndigenousOwned] = useState(false);

  const canCreateOrg = role === 'employer' || role === 'admin';

  // Build filters object
  const activeFilters = useMemo((): DirectoryFilters => ({
    search: search || undefined,
    orgType: selectedOrgTypes.length > 0 ? selectedOrgTypes : undefined,
    province: selectedProvince || undefined,
    modules: selectedModules.length > 0 ? selectedModules : undefined,
    isIndigenousOwned: indigenousOwned || undefined,
  }), [search, selectedOrgTypes, selectedProvince, selectedModules, indigenousOwned]);

  const hasFilters = useMemo(() => {
    return !!(
      search ||
      selectedOrgTypes.length > 0 ||
      selectedProvince ||
      selectedModules.length > 0 ||
      indigenousOwned
    );
  }, [search, selectedOrgTypes, selectedProvince, selectedModules, indigenousOwned]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const results = await queryDirectory(activeFilters, 'name_asc', 1, 100);
      let items = results.entries;

      // If no results and no filters, show featured
      if (items.length === 0 && !hasFilters) {
        items = await getFeaturedDirectoryEntries(24);
      }

      setEntries(items);

      // Set Business of the Day - first Indigenous-owned business or first featured
      if (!hasFilters && items.length > 0) {
        const indigenousBusiness = items.find(e => e.isIndigenousOwned);
        setFeaturedEntry(indigenousBusiness || items[0]);
      } else {
        setFeaturedEntry(null);
      }
    } catch (error) {
      console.error('Failed to load directory:', error);
      setEntries([]);
      setFeaturedEntry(null);
    } finally {
      setLoading(false);
    }
  }, [activeFilters, hasFilters]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const clearFilters = () => {
    setSearchInput('');
    setSearch('');
    setSelectedOrgTypes([]);
    setSelectedProvince('');
    setSelectedModules([]);
    setIndigenousOwned(false);
  };

  const toggleOrgType = (type: OrgType) => {
    setSelectedOrgTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const toggleModule = (module: OrganizationModule) => {
    setSelectedModules((prev) =>
      prev.includes(module) ? prev.filter((m) => m !== module) : [...prev, module]
    );
  };

  // Filter out the featured entry from the main grid
  const gridEntries = featuredEntry
    ? entries.filter(e => e.id !== featuredEntry.id)
    : entries;

  return (
    <div className="min-h-screen text-slate-100">
      {/* Hero Section with Gradient */}
      <section className="relative overflow-hidden">
        {/* Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-teal-600 via-cyan-500 to-blue-500" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-30" />

        <div className="relative mx-auto max-w-6xl px-4 py-10 sm:py-16">
          {/* Eyebrow */}
          <p className="text-sm font-semibold uppercase tracking-wider text-white/80 mb-2">
            Indigenous Business Directory
          </p>

          {/* Title */}
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-3">
            Discover Indigenous Businesses
          </h1>

          {/* Subtitle */}
          <p className="text-white/80 max-w-2xl mb-8">
            Explore Indigenous-owned businesses, employers, schools, and organizations across Canada.
            Find products, services, jobs, and opportunities.
          </p>

          {/* Search Bar */}
          <div className="flex flex-col sm:flex-row gap-3 max-w-2xl mb-6">
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/60" />
              <input
                type="text"
                placeholder="Search businesses..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full rounded-full bg-white/10 backdrop-blur-sm border border-white/20 py-3 pl-12 pr-4 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/50"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center justify-center gap-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 px-6 py-3 text-white transition-colors hover:bg-white/20"
            >
              <FunnelIcon className="h-5 w-5" />
              Filters
              {hasFilters && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-xs font-bold text-teal-600">
                  !
                </span>
              )}
            </button>
          </div>

          {/* Quick Category Filters */}
          <div className="flex flex-wrap gap-2">
            {QUICK_CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isSelected = selectedModules.includes(cat.module);
              return (
                <button
                  key={cat.module}
                  onClick={() => toggleModule(cat.module)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    isSelected
                      ? 'bg-white text-teal-700 shadow-lg'
                      : 'bg-white/10 text-white hover:bg-white/20 border border-white/10'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <PageShell>
        {/* Filters Panel */}
        {showFilters && (
          <div className="mb-8 rounded-2xl bg-slate-800/50 backdrop-blur-sm border border-slate-700 p-6 space-y-6">
            <div className="flex items-center justify-between">
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

            {/* Organization Type Filter */}
            <div>
              <h4 className="text-sm font-medium text-slate-400 mb-3">Business Type</h4>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(ORG_TYPE_LABELS) as OrgType[]).map((type) => {
                  const Icon = ORG_TYPE_ICONS[type];
                  const isSelected = selectedOrgTypes.includes(type);
                  return (
                    <button
                      key={type}
                      onClick={() => toggleOrgType(type)}
                      className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-all ${
                        isSelected
                          ? 'bg-teal-500 text-white'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {ORG_TYPE_LABELS[type]}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Province Filter */}
            <div>
              <h4 className="text-sm font-medium text-slate-400 mb-3">Province</h4>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedProvince('')}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium transition-all ${
                    !selectedProvince
                      ? 'bg-teal-500 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  All Provinces
                </button>
                {CANADIAN_PROVINCES.map((province) => (
                  <button
                    key={province}
                    onClick={() => setSelectedProvince(province)}
                    className={`rounded-full px-3 py-1.5 text-sm font-medium transition-all ${
                      selectedProvince === province
                        ? 'bg-teal-500 text-white'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    {province}
                  </button>
                ))}
              </div>
            </div>

            {/* Offerings Filter */}
            <div>
              <h4 className="text-sm font-medium text-slate-400 mb-3">What They Offer</h4>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(MODULE_LABELS) as OrganizationModule[]).map((module) => {
                  const { label, icon: Icon } = MODULE_LABELS[module];
                  const isSelected = selectedModules.includes(module);
                  return (
                    <button
                      key={module}
                      onClick={() => toggleModule(module)}
                      className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-all ${
                        isSelected
                          ? 'bg-indigo-500 text-white'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Indigenous-Owned Filter */}
            <div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={indigenousOwned}
                  onChange={(e) => setIndigenousOwned(e.target.checked)}
                  className="h-5 w-5 rounded border-slate-600 bg-slate-700 text-teal-500 focus:ring-teal-500 focus:ring-offset-0"
                />
                <span className="text-sm font-medium text-white">
                  Indigenous-owned only
                </span>
              </label>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <>
            {/* Business of the Day Skeleton */}
            <section className="mb-8">
              <div className="rounded-2xl border border-teal-500/20 bg-gradient-to-br from-teal-500/10 via-slate-900 to-slate-900 p-6">
                <div className="animate-pulse h-24 bg-slate-800/50 rounded-lg" />
              </div>
            </section>

            {/* Grid Skeleton */}
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[...Array(9)].map((_, i) => (
                <div key={i} className="animate-pulse rounded-2xl bg-slate-800/50 h-80" />
              ))}
            </div>
          </>
        ) : (
          <>
            {/* Business of the Day - Only show when no filters */}
            {featuredEntry && !hasFilters && (
              <section className="mb-8">
                <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-teal-500/10 via-slate-900 to-slate-900 border border-teal-500/20 p-6 transition-all hover:border-teal-500/40">
                  {/* Badge */}
                  <div className="flex items-center gap-1.5 text-amber-400 text-xs font-bold mb-4">
                    <SparklesIcon className="h-4 w-4" />
                    Business of the Day
                  </div>

                  <Link href={`/businesses/${featuredEntry.slug}`} className="block group">
                    <div className="flex items-start gap-4">
                      {/* Logo */}
                      <div className="h-16 w-16 rounded-xl overflow-hidden bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center shrink-0 shadow-lg">
                        {featuredEntry.logoUrl ? (
                          <Image
                            src={featuredEntry.logoUrl}
                            alt={featuredEntry.name}
                            width={64}
                            height={64}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="text-2xl font-bold text-white">
                            {featuredEntry.name.charAt(0)}
                          </span>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="text-xl font-bold text-white group-hover:text-teal-400 transition-colors">
                              {featuredEntry.name}
                            </h3>
                            <p className="text-sm text-slate-400 line-clamp-1 mt-0.5">
                              {featuredEntry.tagline || ORG_TYPE_LABELS[featuredEntry.orgType]}
                            </p>
                          </div>
                          {featuredEntry.isIndigenousOwned && (
                            <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2 py-1 text-xs font-medium text-amber-400">
                              <CheckBadgeIcon className="h-3 w-3" />
                              Indigenous-Owned
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 mt-3">
                          {featuredEntry.nation && (
                            <span className="text-xs text-teal-400">
                              {featuredEntry.nation}
                            </span>
                          )}
                          {(featuredEntry.city || featuredEntry.province) && (
                            <span className="flex items-center gap-1 text-xs text-slate-500">
                              <MapPinIcon className="h-3 w-3" />
                              {[featuredEntry.city, featuredEntry.province].filter(Boolean).join(', ')}
                            </span>
                          )}
                        </div>

                        {/* Module badges */}
                        <div className="flex items-center gap-2 mt-3 flex-wrap">
                          {featuredEntry.enabledModules.includes('hire') && featuredEntry.counts.jobsCount > 0 && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-blue-400">
                              <BriefcaseIcon className="h-3 w-3" />
                              {featuredEntry.counts.jobsCount} Jobs
                            </span>
                          )}
                          {featuredEntry.enabledModules.includes('sell') && featuredEntry.counts.offeringsCount > 0 && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-teal-500/10 px-2 py-0.5 text-xs font-medium text-teal-400">
                              <BuildingStorefrontIcon className="h-3 w-3" />
                              {featuredEntry.counts.offeringsCount} Offerings
                            </span>
                          )}
                        </div>
                      </div>

                      <ChevronRightIcon className="h-5 w-5 text-slate-500 group-hover:text-teal-400 group-hover:translate-x-1 transition-all shrink-0" />
                    </div>
                  </Link>
                </div>
              </section>
            )}

            {/* Stats Bar */}
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-4 flex-wrap">
                <span className="text-sm text-slate-400">
                  {entries.length} {entries.length === 1 ? 'business' : 'businesses'} found
                </span>
                {hasFilters && (
                  <div className="flex flex-wrap gap-2">
                    {selectedOrgTypes.map((type) => (
                      <span
                        key={type}
                        className="inline-flex items-center gap-1 rounded-full bg-teal-500/10 px-2.5 py-1 text-xs font-medium text-teal-400"
                      >
                        {ORG_TYPE_LABELS[type]}
                        <button onClick={() => toggleOrgType(type)}>
                          <XMarkIcon className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                    {selectedModules.map((module) => (
                      <span
                        key={module}
                        className="inline-flex items-center gap-1 rounded-full bg-indigo-500/10 px-2.5 py-1 text-xs font-medium text-indigo-400"
                      >
                        {MODULE_LABELS[module].label}
                        <button onClick={() => toggleModule(module)}>
                          <XMarkIcon className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                    {selectedProvince && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/10 px-2.5 py-1 text-xs font-medium text-purple-400">
                        {selectedProvince}
                        <button onClick={() => setSelectedProvince('')}>
                          <XMarkIcon className="h-3 w-3" />
                        </button>
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Empty State */}
            {entries.length === 0 ? (
              <div className="rounded-2xl bg-slate-800/50 border border-slate-700 p-12 text-center">
                <div className="mx-auto h-16 w-16 rounded-full bg-slate-700 flex items-center justify-center mb-4">
                  <MagnifyingGlassIcon className="h-8 w-8 text-slate-500" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">No businesses found</h3>
                <p className="text-slate-400 mb-4">
                  {hasFilters
                    ? 'Try adjusting your filters or search terms.'
                    : 'Be the first to list your business!'}
                </p>
                {hasFilters ? (
                  <button
                    onClick={clearFilters}
                    className="inline-flex items-center gap-2 rounded-full bg-teal-500 px-4 py-2 text-sm font-medium text-white hover:bg-teal-600 transition-colors"
                  >
                    Clear filters
                  </button>
                ) : canCreateOrg ? (
                  <Link
                    href="/organization/onboarding"
                    className="inline-flex items-center gap-2 rounded-full bg-teal-500 px-4 py-2 text-sm font-medium text-white hover:bg-teal-600 transition-colors"
                  >
                    Create Your Profile
                  </Link>
                ) : null}
              </div>
            ) : (
              /* Directory Grid */
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {gridEntries.map((entry) => (
                  <BusinessCard key={entry.id} entry={entry} />
                ))}
              </div>
            )}
          </>
        )}

        {/* CTA Section */}
        {canCreateOrg && (
          <section className="mt-16 rounded-3xl bg-gradient-to-r from-slate-800 to-slate-800/50 border border-slate-700 p-8 sm:p-12 text-center">
            <h2 className="text-2xl font-bold text-white sm:text-3xl">
              List Your Business
            </h2>
            <p className="mt-3 text-slate-400 max-w-2xl mx-auto">
              Join our directory of Indigenous businesses. Whether you&apos;re selling products,
              hiring, offering programs, or hosting events - get discovered by our community.
            </p>
            <div className="mt-6">
              <Link
                href="/organization/onboarding"
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-teal-500 to-emerald-500 px-8 py-3 text-lg font-semibold text-white shadow-lg shadow-teal-500/25 transition-all hover:shadow-xl hover:shadow-teal-500/30 hover:scale-105"
              >
                Create Your Profile
              </Link>
            </div>
          </section>
        )}
      </PageShell>
    </div>
  );
}

// Business Card Component - unified card for all business types
function BusinessCard({ entry }: { entry: DirectoryEntry }) {
  const Icon = ORG_TYPE_ICONS[entry.orgType];
  const ctaText = getPrimaryCTAText(entry);

  return (
    <Link
      href={`/businesses/${entry.slug}`}
      className="group relative block overflow-hidden rounded-2xl bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:border-slate-600"
    >
      {/* Header with Logo */}
      <div className="relative h-28 bg-gradient-to-br from-slate-700 to-slate-800">
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent" />

        {/* Indigenous-Owned Badge */}
        {entry.isIndigenousOwned && (
          <div className="absolute top-3 left-3 flex items-center gap-1 rounded-full bg-amber-500/90 px-2 py-1 text-xs font-medium text-white">
            <CheckBadgeIcon className="h-3 w-3" />
            Indigenous-Owned
          </div>
        )}

        {/* Org Type Badge */}
        <div className="absolute top-3 right-3 flex items-center gap-1 rounded-full bg-slate-900/80 px-2.5 py-1 text-xs font-medium text-slate-300">
          <Icon className="h-3 w-3" />
          {ORG_TYPE_LABELS[entry.orgType]}
        </div>

        {/* Logo */}
        <div className="absolute -bottom-6 left-4">
          <div className="h-14 w-14 overflow-hidden rounded-xl border-4 border-slate-900 bg-slate-800 shadow-xl">
            {entry.logoUrl ? (
              <Image
                src={entry.logoUrl}
                alt={`${entry.name} logo`}
                width={56}
                height={56}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-teal-500 to-teal-600 text-xl font-bold text-white">
                {entry.name.charAt(0)}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 pt-9">
        {/* Business Name */}
        <h3 className="text-lg font-semibold text-white transition-colors group-hover:text-teal-400 line-clamp-1">
          {entry.name}
        </h3>

        {/* Tagline */}
        {entry.tagline && (
          <p className="mt-1 text-sm text-slate-400 line-clamp-2">{entry.tagline}</p>
        )}

        {/* Location */}
        {(entry.city || entry.province) && (
          <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
            <MapPinIcon className="h-3.5 w-3.5" />
            {[entry.city, entry.province].filter(Boolean).join(', ')}
          </div>
        )}

        {/* Module Indicators */}
        <div className="mt-4 flex items-center gap-2 flex-wrap">
          {entry.enabledModules.includes('hire') && entry.counts.jobsCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-blue-400">
              <BriefcaseIcon className="h-3 w-3" />
              {entry.counts.jobsCount} Jobs
            </span>
          )}
          {entry.enabledModules.includes('sell') && entry.counts.offeringsCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-teal-500/10 px-2 py-0.5 text-xs font-medium text-teal-400">
              <BuildingStorefrontIcon className="h-3 w-3" />
              {entry.counts.offeringsCount} Offerings
            </span>
          )}
          {entry.enabledModules.includes('educate') && entry.counts.programsCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/10 px-2 py-0.5 text-xs font-medium text-purple-400">
              <AcademicCapIcon className="h-3 w-3" />
              {entry.counts.programsCount} Programs
            </span>
          )}
          {entry.enabledModules.includes('host') && entry.counts.eventsCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-400">
              <CalendarIcon className="h-3 w-3" />
              {entry.counts.eventsCount} Events
            </span>
          )}
        </div>

        {/* Primary CTA */}
        <div className="mt-4 pt-4 border-t border-slate-700/50">
          <span className="inline-flex items-center gap-1 text-sm font-medium text-teal-400 group-hover:text-teal-300 transition-colors">
            {ctaText}
            <ChevronRightIcon className="h-4 w-4" />
          </span>
        </div>
      </div>
    </Link>
  );
}
