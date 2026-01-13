'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  MapPinIcon,
  GlobeAltIcon,
  EnvelopeIcon,
  PhoneIcon,
  BuildingOffice2Icon,
  BuildingStorefrontIcon,
  AcademicCapIcon,
  HeartIcon,
  BriefcaseIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  CheckBadgeIcon,
  ShareIcon,
  PencilIcon,
  EyeIcon,
  ArrowTopRightOnSquareIcon,
} from '@heroicons/react/24/outline';
import { PageShell } from '@/components/PageShell';
import { useAuth } from '@/components/AuthProvider';
import type {
  OrganizationProfile,
  OrganizationModule,
  OrgType,
  ExtendedSocialLinks,
} from '@/lib/types';
import { ORG_TYPE_LABELS } from '@/lib/types';

// Tab types
type ProfileTab = 'overview' | 'jobs' | 'programs' | 'offerings' | 'events' | 'funding';

interface Props {
  organization: OrganizationProfile;
}

// Social icons mapping
const SocialIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  instagram: ({ className }) => (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
    </svg>
  ),
  facebook: ({ className }) => (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  ),
  linkedin: ({ className }) => (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
    </svg>
  ),
  tiktok: ({ className }) => (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
    </svg>
  ),
  youtube: ({ className }) => (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
    </svg>
  ),
  twitter: ({ className }) => (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  ),
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

export function OrganizationProfileClient({ organization: org }: Props) {
  const { user, role } = useAuth();
  const [activeTab, setActiveTab] = useState<ProfileTab>('overview');
  const [copied, setCopied] = useState(false);

  // Check if current user is owner or admin
  const isOwner = user?.uid === org.userId;
  const isAdmin = role === 'admin';
  const canEdit = isOwner || isAdmin;

  // Determine which tabs should be shown
  const enabledModules = org.enabledModules || [];

  const availableTabs = useMemo(() => {
    const tabs: { id: ProfileTab; label: string; icon: typeof BriefcaseIcon }[] = [
      { id: 'overview', label: 'Overview', icon: BuildingOffice2Icon },
    ];

    // Show tabs based on modules and whether there's content or user can edit
    if (enabledModules.includes('hire')) {
      tabs.push({ id: 'jobs', label: 'Jobs', icon: BriefcaseIcon });
    }

    if (enabledModules.includes('educate')) {
      tabs.push({ id: 'programs', label: 'Programs & Scholarships', icon: AcademicCapIcon });
    }

    if (enabledModules.includes('sell')) {
      tabs.push({ id: 'offerings', label: 'Offerings', icon: BuildingStorefrontIcon });
    }

    if (enabledModules.includes('host')) {
      tabs.push({ id: 'events', label: 'Events', icon: CalendarIcon });
    }

    if (enabledModules.includes('funding')) {
      tabs.push({ id: 'funding', label: 'Funding', icon: CurrencyDollarIcon });
    }

    return tabs;
  }, [enabledModules]);

  // Handle share
  const handleShare = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({
          title: org.organizationName,
          text: org.tagline || `Check out ${org.organizationName} on IOPPS`,
          url,
        });
      } else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (err) {
      // User cancelled share
    }
  };

  // Track page view
  useEffect(() => {
    // TODO: Implement analytics tracking
  }, [org.id]);

  const Icon = ORG_TYPE_ICONS[org.orgType || 'EMPLOYER'];
  const links = org.links || {};
  const isIndigenousOwned =
    org.orgType === 'INDIGENOUS_BUSINESS' ||
    org.indigenousVerification?.isIndigenousOwned ||
    org.trcAlignment?.isIndigenousOwned;

  // Check if profile is a draft (not published)
  const isDraft = org.publicationStatus !== 'PUBLISHED';

  return (
    <PageShell className="max-w-7xl">
      {/* Draft Banner */}
      {isDraft && canEdit && (
        <div className="mb-6 rounded-xl bg-amber-500/10 border border-amber-500/20 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <EyeIcon className="h-5 w-5 text-amber-400" />
            <div>
              <p className="text-sm font-medium text-amber-400">Preview Mode</p>
              <p className="text-xs text-amber-400/70">
                This profile is not yet published. Only you can see this page.
              </p>
            </div>
          </div>
          <Link
            href="/organization/onboarding"
            className="rounded-full bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600 transition-colors"
          >
            Publish Profile
          </Link>
        </div>
      )}

      {/* Header Section */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 border border-slate-700 mb-8">
        {/* Banner */}
        <div className="relative h-48 sm:h-64 bg-gradient-to-br from-slate-700 to-slate-800">
          {org.bannerUrl && (
            <Image
              src={org.bannerUrl}
              alt=""
              fill
              className="object-cover"
              priority
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/50 to-transparent" />

          {/* Badges */}
          <div className="absolute top-4 left-4 flex flex-wrap gap-2">
            {isIndigenousOwned && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/90 px-3 py-1 text-sm font-medium text-white">
                <CheckBadgeIcon className="h-4 w-4" />
                Indigenous-Owned
              </span>
            )}
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-900/80 px-3 py-1 text-sm font-medium text-slate-300">
              <Icon className="h-4 w-4" />
              {ORG_TYPE_LABELS[org.orgType || 'EMPLOYER']}
            </span>
          </div>

          {/* Actions */}
          <div className="absolute top-4 right-4 flex gap-2">
            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 rounded-full bg-slate-900/80 px-3 py-1.5 text-sm text-white hover:bg-slate-800 transition-colors"
            >
              <ShareIcon className="h-4 w-4" />
              {copied ? 'Copied!' : 'Share'}
            </button>
            {canEdit && (
              <Link
                href="/organization/profile"
                className="flex items-center gap-1.5 rounded-full bg-teal-500 px-3 py-1.5 text-sm text-white hover:bg-teal-600 transition-colors"
              >
                <PencilIcon className="h-4 w-4" />
                Edit Profile
              </Link>
            )}
          </div>
        </div>

        {/* Profile Info */}
        <div className="relative px-6 pb-6 sm:px-8 sm:pb-8">
          {/* Logo */}
          <div className="absolute -top-16 sm:-top-20">
            <div className="h-24 w-24 sm:h-32 sm:w-32 overflow-hidden rounded-2xl border-4 border-slate-900 bg-slate-800 shadow-xl">
              {org.logoUrl ? (
                <Image
                  src={org.logoUrl}
                  alt={`${org.organizationName} logo`}
                  width={128}
                  height={128}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-teal-500 to-teal-600 text-4xl font-bold text-white">
                  {org.organizationName.charAt(0)}
                </div>
              )}
            </div>
          </div>

          {/* Name and Details */}
          <div className="pt-12 sm:pt-16 sm:ml-36">
            <h1 className="text-2xl sm:text-3xl font-bold text-white">
              {org.organizationName}
            </h1>

            {org.tagline && (
              <p className="mt-2 text-lg text-slate-300">{org.tagline}</p>
            )}

            {/* Location & Industry */}
            <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-slate-400">
              {(org.city || org.province || org.location) && (
                <span className="flex items-center gap-1.5">
                  <MapPinIcon className="h-4 w-4" />
                  {org.city && org.province
                    ? `${org.city}, ${org.province}`
                    : org.location || org.province || org.city}
                </span>
              )}
              {org.industry && (
                <span className="capitalize">{org.industry.replace('-', ' ')}</span>
              )}
              {org.companySize && (
                <span>{org.companySize} employees</span>
              )}
            </div>

            {/* Social Links */}
            <div className="mt-4 flex flex-wrap items-center gap-3">
              {links.website && (
                <a
                  href={links.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 rounded-full bg-slate-800 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                >
                  <GlobeAltIcon className="h-4 w-4" />
                  Website
                  <ArrowTopRightOnSquareIcon className="h-3 w-3" />
                </a>
              )}
              {links.email && (
                <a
                  href={`mailto:${links.email}`}
                  className="flex items-center gap-1.5 rounded-full bg-slate-800 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                >
                  <EnvelopeIcon className="h-4 w-4" />
                  Email
                </a>
              )}
              {links.phone && (
                <a
                  href={`tel:${links.phone}`}
                  className="flex items-center gap-1.5 rounded-full bg-slate-800 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                >
                  <PhoneIcon className="h-4 w-4" />
                  Call
                </a>
              )}
              {Object.entries(links).map(([key, value]) => {
                if (!value || ['website', 'email', 'phone'].includes(key)) return null;
                const IconComponent = SocialIcons[key];
                if (!IconComponent) return null;
                return (
                  <a
                    key={key}
                    href={value}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center rounded-full bg-slate-800 p-2 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                    title={key.charAt(0).toUpperCase() + key.slice(1)}
                  >
                    <IconComponent className="h-4 w-4" />
                  </a>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="mb-8 flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-700/50">
        {availableTabs.map((tab) => {
          const TabIcon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-teal-500 text-white'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <TabIcon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {activeTab === 'overview' && (
          <OverviewTab org={org} canEdit={canEdit} />
        )}
        {activeTab === 'jobs' && (
          <JobsTab org={org} canEdit={canEdit} />
        )}
        {activeTab === 'programs' && (
          <ProgramsTab org={org} canEdit={canEdit} />
        )}
        {activeTab === 'offerings' && (
          <OfferingsTab org={org} canEdit={canEdit} />
        )}
        {activeTab === 'events' && (
          <EventsTab org={org} canEdit={canEdit} />
        )}
        {activeTab === 'funding' && (
          <FundingTab org={org} canEdit={canEdit} />
        )}
      </div>
    </PageShell>
  );
}

// Tab Components
function OverviewTab({ org, canEdit }: { org: OrganizationProfile; canEdit: boolean }) {
  return (
    <div className="grid gap-8 lg:grid-cols-3">
      {/* Main Content */}
      <div className="lg:col-span-2 space-y-8">
        {/* About */}
        <section className="rounded-2xl bg-slate-800/50 border border-slate-700 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">About</h2>
          {org.description ? (
            <div className="prose prose-invert prose-sm max-w-none">
              <p className="text-slate-300 whitespace-pre-wrap">{org.description}</p>
            </div>
          ) : canEdit ? (
            <EmptyStateCard
              title="Add a description"
              description="Tell visitors about your organization, mission, and what makes you unique."
              ctaText="Add Description"
              ctaHref="/organization/profile"
            />
          ) : null}
        </section>

        {/* Story */}
        {(org.story || canEdit) && (
          <section className="rounded-2xl bg-slate-800/50 border border-slate-700 p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Our Story</h2>
            {org.story ? (
              <div className="prose prose-invert prose-sm max-w-none">
                <p className="text-slate-300 whitespace-pre-wrap">{org.story}</p>
              </div>
            ) : canEdit ? (
              <EmptyStateCard
                title="Share your story"
                description="Share your organization's journey, values, and connection to community."
                ctaText="Add Story"
                ctaHref="/organization/profile"
              />
            ) : null}
          </section>
        )}

        {/* TRC Commitment */}
        {org.trcAlignment?.commitmentStatement && (
          <section className="rounded-2xl bg-slate-800/50 border border-slate-700 p-6">
            <h2 className="text-lg font-semibold text-white mb-4">TRC Commitment</h2>
            <p className="text-slate-300">{org.trcAlignment.commitmentStatement}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {org.trcAlignment.hasIndigenousHiringStrategy && (
                <span className="inline-flex items-center gap-1 rounded-full bg-teal-500/10 px-3 py-1 text-xs text-teal-400">
                  <CheckBadgeIcon className="h-3.5 w-3.5" />
                  Indigenous Hiring Strategy
                </span>
              )}
              {org.trcAlignment.leadershipTrainingComplete && (
                <span className="inline-flex items-center gap-1 rounded-full bg-teal-500/10 px-3 py-1 text-xs text-teal-400">
                  <CheckBadgeIcon className="h-3.5 w-3.5" />
                  Leadership Training
                </span>
              )}
            </div>
          </section>
        )}
      </div>

      {/* Sidebar */}
      <div className="space-y-6">
        {/* Quick Facts */}
        <section className="rounded-2xl bg-slate-800/50 border border-slate-700 p-6">
          <h3 className="text-sm font-semibold text-white mb-4">Quick Facts</h3>
          <dl className="space-y-3 text-sm">
            {org.foundedYear && (
              <div className="flex justify-between">
                <dt className="text-slate-400">Founded</dt>
                <dd className="text-white">{org.foundedYear}</dd>
              </div>
            )}
            {org.companySize && (
              <div className="flex justify-between">
                <dt className="text-slate-400">Team Size</dt>
                <dd className="text-white">{org.companySize}</dd>
              </div>
            )}
            {org.industry && (
              <div className="flex justify-between">
                <dt className="text-slate-400">Industry</dt>
                <dd className="text-white capitalize">{org.industry.replace('-', ' ')}</dd>
              </div>
            )}
            {org.nation && (
              <div className="flex justify-between">
                <dt className="text-slate-400">Nation</dt>
                <dd className="text-white">{org.nation}</dd>
              </div>
            )}
          </dl>
        </section>

        {/* Categories */}
        {org.categories && org.categories.length > 0 && (
          <section className="rounded-2xl bg-slate-800/50 border border-slate-700 p-6">
            <h3 className="text-sm font-semibold text-white mb-4">Categories</h3>
            <div className="flex flex-wrap gap-2">
              {org.categories.map((cat) => (
                <span
                  key={cat}
                  className="inline-flex rounded-full bg-slate-700/50 px-3 py-1 text-xs text-slate-300"
                >
                  {cat}
                </span>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function JobsTab({ org, canEdit }: { org: OrganizationProfile; canEdit: boolean }) {
  // TODO: Implement jobs listing
  return (
    <div className="rounded-2xl bg-slate-800/50 border border-slate-700 p-8 text-center">
      {canEdit ? (
        <EmptyStateCard
          title="No jobs posted yet"
          description="Post your first job to start attracting Indigenous talent."
          ctaText="Post a Job"
          ctaHref="/organization/jobs/new"
        />
      ) : (
        <p className="text-slate-400">No job openings at this time.</p>
      )}
    </div>
  );
}

function ProgramsTab({ org, canEdit }: { org: OrganizationProfile; canEdit: boolean }) {
  // TODO: Implement programs listing
  return (
    <div className="rounded-2xl bg-slate-800/50 border border-slate-700 p-8 text-center">
      {canEdit ? (
        <EmptyStateCard
          title="No programs listed"
          description="Add your educational programs and scholarships."
          ctaText="Add Program"
          ctaHref="/organization/education/programs/new"
        />
      ) : (
        <p className="text-slate-400">No programs available at this time.</p>
      )}
    </div>
  );
}

function OfferingsTab({ org, canEdit }: { org: OrganizationProfile; canEdit: boolean }) {
  // TODO: Implement offerings listing
  return (
    <div className="rounded-2xl bg-slate-800/50 border border-slate-700 p-8 text-center">
      {canEdit ? (
        <EmptyStateCard
          title="No offerings listed"
          description="List your products and services for the community to discover."
          ctaText="Add Offering"
          ctaHref="/organization/shop"
        />
      ) : (
        <p className="text-slate-400">No products or services available at this time.</p>
      )}
    </div>
  );
}

function EventsTab({ org, canEdit }: { org: OrganizationProfile; canEdit: boolean }) {
  // TODO: Implement events listing
  return (
    <div className="rounded-2xl bg-slate-800/50 border border-slate-700 p-8 text-center">
      {canEdit ? (
        <EmptyStateCard
          title="No events scheduled"
          description="Create conferences, pow wows, or other events."
          ctaText="Create Event"
          ctaHref="/organization/conferences"
        />
      ) : (
        <p className="text-slate-400">No upcoming events.</p>
      )}
    </div>
  );
}

function FundingTab({ org, canEdit }: { org: OrganizationProfile; canEdit: boolean }) {
  // TODO: Implement funding opportunities listing
  return (
    <div className="rounded-2xl bg-slate-800/50 border border-slate-700 p-8 text-center">
      {canEdit ? (
        <EmptyStateCard
          title="No funding opportunities"
          description="Share grants and funding opportunities for Indigenous businesses."
          ctaText="Add Funding"
          ctaHref="/organization/funding/new"
        />
      ) : (
        <p className="text-slate-400">No funding opportunities available at this time.</p>
      )}
    </div>
  );
}

// Empty State Card Component
function EmptyStateCard({
  title,
  description,
  ctaText,
  ctaHref,
}: {
  title: string;
  description: string;
  ctaText: string;
  ctaHref: string;
}) {
  return (
    <div className="flex flex-col items-center py-4">
      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
      <p className="text-sm text-slate-400 mb-4 max-w-sm text-center">{description}</p>
      <Link
        href={ctaHref}
        className="inline-flex items-center gap-2 rounded-full bg-teal-500 px-4 py-2 text-sm font-medium text-white hover:bg-teal-600 transition-colors"
      >
        {ctaText}
      </Link>
    </div>
  );
}
