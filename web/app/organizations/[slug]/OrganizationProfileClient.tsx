'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
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
  UserGroupIcon,
  ShieldCheckIcon,
  VideoCameraIcon,
  XMarkIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { FeedLayout } from '@/components/opportunity-graph/dynamic';
import { useAuth } from '@/components/AuthProvider';
import CompanyIntroVideo from '@/components/employer/CompanyIntroVideo';
import EmployerInterviewSection from '@/components/employer/EmployerInterviewSection';
import type {
  OrganizationProfile,
  OrgType,
  EmployerProfile,
  JobPosting,
  Scholarship,
  Service,
  Conference,
  PowwowEvent,
  BusinessGrant,
} from '@/lib/types';
import { ORG_TYPE_LABELS } from '@/lib/types';
import {
  listEmployerJobs,
  listEmployerScholarships,
  listUserServices,
  listEmployerConferences,
  listEmployerPowwows,
  listOrganizationGrants,
  getTeamMembers,
} from '@/lib/firestore';
import {
  updateOrganizationProfile,
  validateIntroVideoUrl,
  detectVideoProvider,
} from '@/lib/firestore/organizations';
import type { TeamMember } from '@/lib/types';
import dynamic from 'next/dynamic';
import {
  Cog6ToothIcon,
  ChartBarIcon,
  DocumentTextIcon as DocIcon,
  CreditCardIcon,
  WrenchScrewdriverIcon,
} from '@heroicons/react/24/outline';
import {
  CreateJobPanel,
  CreateEventPanel,
  CreateScholarshipPanel,
  CreateProductPanel,
  CreateTrainingPanel,
  CreateFundingPanel,
} from '@/components/organization/create-panels';

// Lazy-load admin tab components (only loaded when manage mode is on)
const OrgApplicationsTab = dynamic(() => import('@/components/organization/profile/OrgApplicationsTab'), {
  loading: () => <div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" /></div>,
});
const OrgAnalyticsTab = dynamic(() => import('@/components/organization/profile/OrgAnalyticsTab'), {
  loading: () => <div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" /></div>,
});
const OrgBillingTab = dynamic(() => import('@/components/organization/profile/OrgBillingTab'), {
  loading: () => <div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" /></div>,
});
const OrgTeamTab = dynamic(() => import('@/components/organization/profile/OrgTeamTab'), {
  loading: () => <div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" /></div>,
});
const OrgSettingsTab = dynamic(() => import('@/components/organization/profile/OrgSettingsTab'), {
  loading: () => <div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" /></div>,
});

// Tab types
type ProfileTab = 'overview' | 'jobs' | 'programs' | 'offerings' | 'events' | 'funding'
  | 'applications' | 'analytics' | 'billing' | 'team' | 'settings';

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
  const router = useRouter();
  const { user, role, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<ProfileTab>('overview');
  const [copied, setCopied] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [hasActiveServices, setHasActiveServices] = useState(true); // Default true to avoid flicker
  const [jobCount, setJobCount] = useState(0);
  const [eventCount, setEventCount] = useState(0);
  const [scholarshipCount, setScholarshipCount] = useState(0);

  // Manage mode state (persisted in localStorage)
  const [manageMode, setManageMode] = useState(false);

  // Initialize manage mode from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('iopps_manage_mode');
      if (stored === 'true' && canEdit) {
        setManageMode(true);
      }
    } catch {
      // localStorage not available
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleManageMode = () => {
    const next = !manageMode;
    setManageMode(next);
    try {
      localStorage.setItem('iopps_manage_mode', String(next));
    } catch {
      // localStorage not available
    }
    // If switching off manage mode and on an admin tab, go back to overview
    if (!next && ['applications', 'analytics', 'billing', 'team', 'settings'].includes(activeTab)) {
      setActiveTab('overview');
    }
  };

  // Intro video editing state
  const [introVideoUrl, setIntroVideoUrl] = useState(org.introVideoUrl || '');
  const [showIntroVideoModal, setShowIntroVideoModal] = useState(false);
  const [introVideoInput, setIntroVideoInput] = useState('');
  const [introVideoError, setIntroVideoError] = useState('');
  const [savingIntroVideo, setSavingIntroVideo] = useState(false);

  // Create panel state
  const [openPanel, setOpenPanel] = useState<'job' | 'event' | 'scholarship' | 'product' | 'training' | 'funding' | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const handlePanelSuccess = () => {
    setRefreshKey((k) => k + 1);
  };

  // Story is read-only on public profile - editing happens via Edit Profile
  const currentStory = org.story || '';

  // Check if current user is owner or admin
  const isOwner = user?.uid === org.userId;
  const isAdmin = role === 'admin';
  const canEdit = isOwner || isAdmin;

  // Check if org has active services (for tab visibility)
  useEffect(() => {
    async function checkActiveServices() {
      if (canEdit) return; // Owner always sees tab
      try {
        const services = await listUserServices(org.userId);
        const activeCount = services.filter(s => s.status === 'active').length;
        setHasActiveServices(activeCount > 0);
      } catch {
        setHasActiveServices(false);
      }
    }
    checkActiveServices();
  }, [org.userId, canEdit]);

  // Fetch counts for header stats
  useEffect(() => {
    async function fetchCounts() {
      try {
        const [jobs, conferences, powwows, scholarships] = await Promise.all([
          listEmployerJobs(org.userId),
          listEmployerConferences(org.userId),
          listEmployerPowwows(org.userId),
          listEmployerScholarships(org.userId),
        ]);
        setJobCount(jobs.filter(j => j.active).length);
        setEventCount(
          conferences.filter(c => c.active).length +
          powwows.filter(p => p.active).length
        );
        setScholarshipCount(scholarships.filter(s => s.active).length);
      } catch {
        setJobCount(0);
        setEventCount(0);
        setScholarshipCount(0);
      }
    }
    fetchCounts();
  }, [org.userId]);

  // Check if profile requires authentication to view
  const isPrivateProfile = org.publicationStatus !== 'PUBLISHED' || org.status !== 'approved';

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

    if (enabledModules.includes('sell') && (canEdit || hasActiveServices)) {
      tabs.push({ id: 'offerings', label: 'Products & Services', icon: BuildingStorefrontIcon });
    }

    if (enabledModules.includes('host')) {
      tabs.push({ id: 'events', label: 'Events', icon: CalendarIcon });
    }

    if (enabledModules.includes('funding')) {
      tabs.push({ id: 'funding', label: 'Funding', icon: CurrencyDollarIcon });
    }

    // Admin-only tabs (visible when canEdit AND manage mode is on)
    if (canEdit && manageMode) {
      if (enabledModules.includes('hire')) {
        tabs.push({ id: 'applications', label: 'Applications', icon: DocIcon });
      }
      tabs.push({ id: 'analytics', label: 'Analytics', icon: ChartBarIcon });
      tabs.push({ id: 'billing', label: 'Billing', icon: CreditCardIcon });
      tabs.push({ id: 'team', label: 'Team', icon: UserGroupIcon });
      tabs.push({ id: 'settings', label: 'Settings', icon: Cog6ToothIcon });
    }

    return tabs;
  }, [enabledModules, canEdit, hasActiveServices, manageMode]);

  // Track page view
  useEffect(() => {
    // TODO: Implement analytics tracking
  }, [org.id]);

  // Redirect if user logs out while viewing a private profile
  useEffect(() => {
    if (!loading && isPrivateProfile && !canEdit) {
      // User logged out or doesn't have access - redirect to businesses list
      setIsRedirecting(true);
      router.replace('/businesses');
    }
  }, [loading, isPrivateProfile, canEdit, router]);

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
    } catch {
      // User cancelled share
    }
  };

  // Open intro video modal
  const handleOpenIntroVideoModal = () => {
    setIntroVideoInput(introVideoUrl || '');
    setIntroVideoError('');
    setShowIntroVideoModal(true);
  };

  // Save intro video
  const handleSaveIntroVideo = async () => {
    const trimmedUrl = introVideoInput.trim();

    // Validate URL
    const error = validateIntroVideoUrl(trimmedUrl);
    if (error) {
      setIntroVideoError(error);
      return;
    }

    setSavingIntroVideo(true);
    try {
      await updateOrganizationProfile(org.userId, {
        introVideoUrl: trimmedUrl || null,
      });
      setIntroVideoUrl(trimmedUrl);
      setShowIntroVideoModal(false);
    } catch (err) {
      console.error('Error saving intro video:', err);
      setIntroVideoError('Failed to save. Please try again.');
    } finally {
      setSavingIntroVideo(false);
    }
  };

  // Remove intro video
  const handleRemoveIntroVideo = async () => {
    setSavingIntroVideo(true);
    try {
      await updateOrganizationProfile(org.userId, {
        introVideoUrl: null,
      });
      setIntroVideoUrl('');
      setShowIntroVideoModal(false);
    } catch (err) {
      console.error('Error removing intro video:', err);
      setIntroVideoError('Failed to remove. Please try again.');
    } finally {
      setSavingIntroVideo(false);
    }
  };

  // Show nothing while redirecting or if user doesn't have access to private profile
  if (isRedirecting || (!loading && isPrivateProfile && !canEdit)) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-accent border-r-transparent"></div>
          <p className="mt-4 text-foreground0">Redirecting...</p>
        </div>
      </div>
    );
  }

  const Icon = ORG_TYPE_ICONS[org.orgType || 'EMPLOYER'];
  const links = org.links || {};
  const isIndigenousOwned =
    org.orgType === 'INDIGENOUS_BUSINESS' ||
    org.indigenousVerification?.isIndigenousOwned ||
    org.trcAlignment?.isIndigenousOwned;

  // Check if profile is a draft (not published)
  const isDraft = org.publicationStatus !== 'PUBLISHED';

  return (
    <FeedLayout activeNav="organizations" fullWidth>
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

      {/* Dormant/Hidden Banner - shown to owners when org is approved but not directory-visible */}
      {!isDraft && canEdit && org.status === 'approved' && org.isDirectoryVisible === false && (
        <div className="mb-6 rounded-xl bg-surface border border-[var(--border)] p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <EyeIcon className="h-5 w-5 text-foreground0 mt-0.5 sm:mt-0 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-[var(--text-secondary)]">Hidden from Directory</p>
              <p className="text-xs text-foreground0">
                Your organization is not visible in the public directory.
                {org.visibilityReason === 'expired' && (
                  <> Post a job or subscribe to a plan to appear in search results.</>
                )}
              </p>
            </div>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <button
              onClick={() => setOpenPanel('job')}
              className="flex-1 sm:flex-none text-center rounded-full bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent transition-colors"
            >
              Post a Job
            </button>
            <Link
              href="/pricing"
              className="flex-1 sm:flex-none text-center rounded-full bg-slate-600 px-4 py-2 text-sm font-medium text-white hover:bg-slate-500 transition-colors"
            >
              View Plans
            </Link>
          </div>
        </div>
      )}

      {/* Manage Mode Banner */}
      {canEdit && manageMode && (
        <div className="mb-6 rounded-xl bg-amber-500/10 border border-amber-500/20 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <WrenchScrewdriverIcon className="h-5 w-5 text-amber-400" />
            <div>
              <p className="text-sm font-medium text-amber-400">Manage Mode</p>
              <p className="text-xs text-amber-400/70">
                Admin tabs are visible. Only you can see Applications, Analytics, Billing, Team, and Settings.
              </p>
            </div>
          </div>
          <button
            onClick={toggleManageMode}
            className="rounded-full bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600 transition-colors"
          >
            Exit Manage Mode
          </button>
        </div>
      )}

      {/* Header Section */}
      <div className="relative overflow-hidden rounded-none sm:rounded-3xl bg-gradient-to-br from-slate-100 via-white to-slate-100 border-b sm:border border-[var(--border)] mb-8">
        {/* Banner - full width on mobile */}
        <div className="relative h-48 sm:h-64 bg-gradient-to-br from-slate-100 to-slate-200">
          {org.bannerUrl && (
            <Image
              src={`${org.bannerUrl}${org.bannerUrl.includes('?') ? '&' : '?'}v=${(org as unknown as Record<string, { seconds?: number }>).bannerUpdatedAt?.seconds || Date.now()}`}
              alt=""
              fill
              className="object-cover"
              priority
              unoptimized
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-white via-white/50 to-transparent" />

          {/* Badges */}
          <div className="absolute top-4 left-4 flex flex-wrap gap-2">
            {isIndigenousOwned && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/90 px-3 py-1 text-sm font-medium text-white shadow-lg">
                <CheckBadgeIcon className="h-4 w-4" />
                Indigenous-Owned
              </span>
            )}
            {org.indigenousVerification?.status === 'approved' && (
              <span className="inline-flex items-center gap-1 rounded-full bg-accent/90 px-3 py-1 text-sm font-medium text-white shadow-lg">
                <CheckBadgeIcon className="h-4 w-4" />
                Verified
              </span>
            )}
            {jobCount > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-accent/90 px-3 py-1 text-sm font-medium text-white shadow-lg">
                <BriefcaseIcon className="h-4 w-4" />
                Hiring
              </span>
            )}
            {org.trcAlignment?.commitmentStatement && (
              <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/90 px-3 py-1 text-sm font-medium text-white shadow-lg">
                TRC Committed
              </span>
            )}
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--card-bg)]/80 px-3 py-1 text-sm font-medium text-[var(--text-secondary)]">
              <Icon className="h-4 w-4" />
              {ORG_TYPE_LABELS[org.orgType || 'EMPLOYER']}
            </span>
          </div>

          {/* Actions - icon-only on mobile, full labels on desktop */}
          <div className="absolute top-4 right-4 flex flex-wrap gap-1.5 sm:gap-2 max-w-[50%] sm:max-w-none justify-end">
            {(org.contactEmail || org.contactPhone) && (
              <a
                href={org.contactEmail ? `mailto:${org.contactEmail}` : `tel:${org.contactPhone}`}
                className="flex items-center gap-1.5 rounded-full bg-accent px-2 sm:px-3 py-1.5 text-sm font-medium text-white hover:bg-accent transition-colors"
                aria-label="Contact this organization"
              >
                <EnvelopeIcon className="h-4 w-4" />
                <span className="hidden sm:inline">Contact</span>
              </a>
            )}
            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 rounded-full bg-[var(--card-bg)]/80 px-2 sm:px-3 py-1.5 text-sm text-[var(--text-primary)] hover:bg-surface transition-colors"
              aria-label={copied ? 'Link copied to clipboard' : 'Share this organization profile'}
            >
              <ShareIcon className="h-4 w-4" />
              <span className="hidden sm:inline">{copied ? 'Copied!' : 'Share'}</span>
            </button>
            {canEdit && (
              <button
                onClick={toggleManageMode}
                className={`flex items-center gap-1.5 rounded-full px-2 sm:px-3 py-1.5 text-sm font-medium transition-colors ${
                  manageMode
                    ? 'bg-amber-500 text-white hover:bg-amber-600'
                    : 'bg-[var(--card-bg)]/80 text-[var(--text-primary)] hover:bg-surface'
                }`}
                aria-label={manageMode ? 'Exit manage mode' : 'Enter manage mode to access admin tabs'}
                aria-pressed={manageMode}
              >
                <WrenchScrewdriverIcon className="h-4 w-4" />
                <span className="hidden sm:inline">{manageMode ? 'Exit Manage' : 'Manage'}</span>
              </button>
            )}
            {canEdit && (
              <Link
                href="/organization/profile"
                className="flex items-center gap-1.5 rounded-full bg-accent px-2 sm:px-3 py-1.5 text-sm text-white hover:bg-accent transition-colors"
                aria-label="Edit organization profile"
              >
                <PencilIcon className="h-4 w-4" />
                <span className="hidden sm:inline">Edit Profile</span>
              </Link>
            )}
          </div>
        </div>

        {/* Profile Info */}
        <div className="relative px-4 pb-6 sm:px-8 sm:pb-8">
          {/* Logo - overlaps banner */}
          <div className="absolute -top-12 sm:-top-20 left-4 sm:left-8">
            <div className="h-20 w-20 sm:h-32 sm:w-32 overflow-hidden rounded-2xl border-4 border-white bg-surface shadow-xl">
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
          <div className="pt-12 sm:pt-16 sm:ml-36 text-center sm:text-left">
            <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">
              {org.organizationName}
            </h1>

            {org.tagline && (
              <p className="mt-2 text-lg text-[var(--text-secondary)]">{org.tagline}</p>
            )}

            {/* Stats Row */}
            {(jobCount > 0 || eventCount > 0 || scholarshipCount > 0 || org.createdAt) && (
              <div className="mt-4 flex flex-wrap items-center justify-center sm:justify-start gap-6">
                {jobCount > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10">
                      <BriefcaseIcon className="h-4 w-4 text-accent" />
                    </div>
                    <div>
                      <p className="text-lg font-bold text-[var(--text-primary)]">{jobCount}</p>
                      <p className="text-xs text-foreground0">Active Jobs</p>
                    </div>
                  </div>
                )}
                {eventCount > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10">
                      <CalendarIcon className="h-4 w-4 text-purple-400" />
                    </div>
                    <div>
                      <p className="text-lg font-bold text-[var(--text-primary)]">{eventCount}</p>
                      <p className="text-xs text-foreground0">Events</p>
                    </div>
                  </div>
                )}
                {scholarshipCount > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10">
                      <AcademicCapIcon className="h-4 w-4 text-amber-400" />
                    </div>
                    <div>
                      <p className="text-lg font-bold text-[var(--text-primary)]">{scholarshipCount}</p>
                      <p className="text-xs text-foreground0">Scholarships</p>
                    </div>
                  </div>
                )}
                {org.createdAt && (
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface">
                      <CheckBadgeIcon className="h-4 w-4 text-foreground0" />
                    </div>
                    <div>
                      <p className="text-lg font-bold text-[var(--text-primary)]">
                        {typeof org.createdAt === 'object' && 'toDate' in org.createdAt
                          ? org.createdAt.toDate().getFullYear()
                          : new Date(org.createdAt as unknown as string).getFullYear()}
                      </p>
                      <p className="text-xs text-foreground0">Member Since</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Location & Industry */}
            <div className="mt-4 flex flex-wrap items-center justify-center sm:justify-start gap-4 text-sm text-foreground0">
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
            <div className="mt-4 flex flex-wrap items-center justify-center sm:justify-start gap-3">
              {links.website && (
                <a
                  href={links.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 text-sm text-[var(--text-secondary)] hover:bg-surface hover:text-[var(--text-primary)] transition-colors"
                >
                  <GlobeAltIcon className="h-4 w-4" />
                  Website
                  <ArrowTopRightOnSquareIcon className="h-3 w-3" />
                </a>
              )}
              {links.email && (
                <a
                  href={`mailto:${links.email}`}
                  className="flex items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 text-sm text-[var(--text-secondary)] hover:bg-surface hover:text-[var(--text-primary)] transition-colors"
                >
                  <EnvelopeIcon className="h-4 w-4" />
                  Email
                </a>
              )}
              {links.phone && (
                <a
                  href={`tel:${links.phone}`}
                  className="flex items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 text-sm text-[var(--text-secondary)] hover:bg-surface hover:text-[var(--text-primary)] transition-colors"
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
                    className="flex items-center justify-center rounded-full bg-surface p-2 text-[var(--text-secondary)] hover:bg-surface hover:text-[var(--text-primary)] transition-colors"
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

      {/* Tabs Navigation - horizontally scrollable on mobile */}
      <div
        className="mb-8 flex items-center gap-2 overflow-x-auto scrollbar-none pb-2 border-b border-[var(--border)] -mx-4 px-4 sm:mx-0 sm:px-0"
        role="tablist"
        aria-label="Organization profile sections"
      >
        {availableTabs.map((tab, index) => {
          const TabIcon = tab.icon;
          const isAdminTab = ['applications', 'analytics', 'billing', 'team', 'settings'].includes(tab.id);
          const prevTab = index > 0 ? availableTabs[index - 1] : null;
          const prevIsPublic = prevTab ? !['applications', 'analytics', 'billing', 'team', 'settings'].includes(prevTab.id) : false;
          const showDivider = isAdminTab && prevIsPublic;

          return (
            <div key={tab.id} className="flex items-center shrink-0">
              {showDivider && (
                <div className="mx-1 h-6 w-px bg-amber-500/30" aria-hidden="true" />
              )}
              <button
                role="tab"
                aria-selected={activeTab === tab.id}
                aria-controls={`orgpanel-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 whitespace-nowrap rounded-full px-3 sm:px-4 py-2 text-sm font-medium transition-all shrink-0 ${
                  activeTab === tab.id
                    ? isAdminTab
                      ? 'bg-amber-500 text-white'
                      : 'bg-accent text-white'
                    : isAdminTab
                      ? 'text-amber-400/70 hover:bg-amber-500/10 hover:text-amber-400'
                      : 'text-foreground0 hover:bg-surface hover:text-[var(--text-primary)]'
                }`}
              >
                <TabIcon className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
              </button>
            </div>
          );
        })}
      </div>

      {/* Tab Content - crossfade animation on tab change */}
      <div className="min-h-[400px]" key={activeTab} id={`orgpanel-${activeTab}`} role="tabpanel" aria-labelledby={`tab-${activeTab}`}>
        <div className="animate-crossfade">
        {activeTab === 'overview' && (
          <OverviewTab
            org={org}
            canEdit={canEdit}
            currentStory={currentStory}
            jobCount={jobCount}
            introVideoUrl={introVideoUrl}
            onEditIntroVideo={handleOpenIntroVideoModal}
          />
        )}
        {activeTab === 'jobs' && (
          <JobsTab org={org} canEdit={canEdit} onOpenPanel={() => setOpenPanel('job')} refreshKey={refreshKey} />
        )}
        {activeTab === 'programs' && (
          <ProgramsTab org={org} canEdit={canEdit} onOpenScholarship={() => setOpenPanel('scholarship')} onOpenTraining={() => setOpenPanel('training')} refreshKey={refreshKey} />
        )}
        {activeTab === 'offerings' && (
          <OfferingsTab org={org} canEdit={canEdit} onOpenPanel={() => setOpenPanel('product')} refreshKey={refreshKey} />
        )}
        {activeTab === 'events' && (
          <EventsTab org={org} canEdit={canEdit} onOpenPanel={() => setOpenPanel('event')} refreshKey={refreshKey} />
        )}
        {activeTab === 'funding' && (
          <FundingTab org={org} canEdit={canEdit} onOpenPanel={() => setOpenPanel('funding')} refreshKey={refreshKey} />
        )}
        {/* Admin Tabs */}
        {activeTab === 'applications' && canEdit && manageMode && (
          <OrgApplicationsTab />
        )}
        {activeTab === 'analytics' && canEdit && manageMode && (
          <OrgAnalyticsTab />
        )}
        {activeTab === 'billing' && canEdit && manageMode && (
          <OrgBillingTab />
        )}
        {activeTab === 'team' && canEdit && manageMode && (
          <OrgTeamTab />
        )}
        {activeTab === 'settings' && canEdit && manageMode && (
          <OrgSettingsTab />
        )}
        </div>
      </div>

      {/* Intro Video Modal */}
      {showIntroVideoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" role="presentation">
          <div className="relative w-full max-w-lg rounded-2xl bg-[var(--card-bg)] border border-[var(--border)] p-6 shadow-xl animate-slide-up" role="dialog" aria-modal="true" aria-label={introVideoUrl ? 'Edit intro video' : 'Add intro video'}>
            {/* Close button */}
            <button
              onClick={() => setShowIntroVideoModal(false)}
              className="absolute top-4 right-4 text-foreground0 hover:text-[var(--text-primary)]"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>

            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">
              {introVideoUrl ? 'Edit Intro Video' : 'Add Intro Video'}
            </h2>
            <p className="text-sm text-foreground0 mb-6">
              Add a short YouTube or Vimeo video to introduce your organization
            </p>

            {/* URL Input */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                Video URL
              </label>
              <div className="relative">
                <VideoCameraIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-foreground0" />
                <input
                  type="url"
                  value={introVideoInput}
                  onChange={(e) => {
                    setIntroVideoInput(e.target.value);
                    setIntroVideoError('');
                  }}
                  placeholder="https://youtube.com/watch?v=... or https://vimeo.com/..."
                  className={`w-full rounded-xl bg-surface border pl-10 pr-4 py-3 text-[var(--text-primary)] placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 ${
                    introVideoError ? 'border-red-500' : 'border-[var(--border)] focus:border-accent'
                  }`}
                />
              </div>
              {introVideoError ? (
                <p className="mt-1 text-xs text-red-400">{introVideoError}</p>
              ) : (
                <p className="mt-1 text-xs text-foreground0">
                  Paste a YouTube or Vimeo link (short intro recommended)
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between gap-3">
              <div>
                {introVideoUrl && (
                  <button
                    onClick={handleRemoveIntroVideo}
                    disabled={savingIntroVideo}
                    className="flex items-center gap-1 text-sm text-red-400 hover:text-red-300 disabled:opacity-50"
                  >
                    <TrashIcon className="h-4 w-4" />
                    Remove Video
                  </button>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowIntroVideoModal(false)}
                  className="px-4 py-2 text-sm font-medium text-foreground0 hover:text-[var(--text-primary)]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveIntroVideo}
                  disabled={savingIntroVideo}
                  className="flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent disabled:opacity-50 transition-colors"
                >
                  {savingIntroVideo ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Saving...
                    </>
                  ) : (
                    'Save'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Panels */}
      {canEdit && (
        <>
          <CreateJobPanel
            isOpen={openPanel === 'job'}
            onClose={() => setOpenPanel(null)}
            onSuccess={handlePanelSuccess}
          />
          <CreateEventPanel
            isOpen={openPanel === 'event'}
            onClose={() => setOpenPanel(null)}
            onSuccess={handlePanelSuccess}
          />
          <CreateScholarshipPanel
            isOpen={openPanel === 'scholarship'}
            onClose={() => setOpenPanel(null)}
            onSuccess={handlePanelSuccess}
          />
          <CreateProductPanel
            isOpen={openPanel === 'product'}
            onClose={() => setOpenPanel(null)}
            onSuccess={handlePanelSuccess}
          />
          <CreateTrainingPanel
            isOpen={openPanel === 'training'}
            onClose={() => setOpenPanel(null)}
            onSuccess={handlePanelSuccess}
          />
          <CreateFundingPanel
            isOpen={openPanel === 'funding'}
            onClose={() => setOpenPanel(null)}
            onSuccess={handlePanelSuccess}
          />
        </>
      )}

    </FeedLayout>
  );
}

// Helper to format relative time
function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`;
  }
  if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return `${months} ${months === 1 ? 'month' : 'months'} ago`;
  }
  const years = Math.floor(diffDays / 365);
  return `${years} ${years === 1 ? 'year' : 'years'} ago`;
}

// Tab Components
function OverviewTab({
  org,
  canEdit,
  currentStory,
  jobCount,
  introVideoUrl,
  onEditIntroVideo,
}: {
  org: OrganizationProfile;
  canEdit: boolean;
  currentStory: string;
  jobCount: number;
  introVideoUrl: string;
  onEditIntroVideo: () => void;
}) {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loadingTeam, setLoadingTeam] = useState(false);

  // Fetch team members if owner
  useEffect(() => {
    if (!canEdit) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- synchronous init before async fetch is intentional
    setLoadingTeam(true);
    getTeamMembers(org.userId)
      .then(setTeamMembers)
      .catch(() => setTeamMembers([]))
      .finally(() => setLoadingTeam(false));
  }, [canEdit, org.userId]);

  // Format member since date
  const memberSince = org.createdAt
    ? (typeof org.createdAt === 'object' && 'toDate' in org.createdAt
        ? org.createdAt.toDate()
        : new Date(org.createdAt as unknown as string))
    : null;

  // Check for verification details
  const verification = org.indigenousVerification;
  const hasVerificationDetails = verification?.status === 'approved' && (
    verification.nationAffiliation ||
    verification.certifications?.length ||
    verification.isIndigenousLed
  );

  // Check for TRC details beyond just the statement
  const trc = org.trcAlignment;
  const hasTrcDetails = trc && (
    trc.hasIndigenousHiringStrategy ||
    trc.leadershipTrainingComplete ||
    trc.isIndigenousOwned ||
    trc.commitmentStatement
  );

  return (
    <div className="grid gap-8 lg:grid-cols-3">
      {/* Main Content */}
      <div className="lg:col-span-2 space-y-8">
        {/* About */}
        <section className="rounded-2xl bg-[var(--card-bg)] border border-[var(--border)] p-6">
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">About</h2>
          {org.description ? (
            <div className="prose prose-sm max-w-none">
              <p className="text-[var(--text-secondary)] whitespace-pre-wrap">{org.description}</p>
            </div>
          ) : canEdit ? (
            <EmptyStateCard
              title="Add a description"
              description="Tell visitors about your organization, mission, and what makes you unique."
              ctaText="Add Description"
              ctaHref="/organization/profile"
              icon={<BuildingOffice2Icon className="h-7 w-7" />}
            />
          ) : null}
        </section>

        {/* Story */}
        {(currentStory || canEdit) && (
          <section className="rounded-2xl bg-[var(--card-bg)] border border-[var(--border)] p-6">
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Our Story</h2>
            {currentStory ? (
              <div className="prose prose-sm max-w-none">
                <p className="text-[var(--text-secondary)] whitespace-pre-wrap">{currentStory}</p>
              </div>
            ) : canEdit ? (
              <EmptyStateCard
                title="Share your story"
                description="Share your organization's journey, values, and connection to community."
                ctaText="Edit Profile"
                ctaHref="/organization/onboarding?step=3"
                icon={<HeartIcon className="h-7 w-7" />}
              />
            ) : null}
          </section>
        )}

        {/* Company Intro Video */}
        {org.companyIntroVideo?.videoUrl && (
          <CompanyIntroVideo
            video={org.companyIntroVideo}
            organizationName={org.organizationName}
          />
        )}

        {/* 10-Second Intro Video */}
        {introVideoUrl ? (
          <section className="rounded-2xl bg-[var(--card-bg)] border border-[var(--border)] p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
                <VideoCameraIcon className="h-5 w-5 text-accent" />
                Quick Intro
              </h2>
              {canEdit && (
                <button
                  onClick={onEditIntroVideo}
                  className="text-sm text-accent hover:text-teal-300 flex items-center gap-1"
                >
                  <PencilIcon className="h-4 w-4" />
                  Edit
                </button>
              )}
            </div>
            <CompanyIntroVideo
              video={{
                videoUrl: introVideoUrl,
                videoProvider: detectVideoProvider(introVideoUrl) || 'youtube',
                title: '10-Second Intro',
              }}
              organizationName={org.organizationName}
            />
          </section>
        ) : canEdit ? (
          <section className="rounded-2xl border-2 border-dashed border-[var(--border)] bg-[var(--background)] p-6">
            <div className="text-center py-4">
              <div className="mx-auto h-12 w-12 rounded-full bg-surface flex items-center justify-center mb-3">
                <VideoCameraIcon className="h-6 w-6 text-foreground0" />
              </div>
              <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-1">Add a 10-Second Intro Video</h3>
              <p className="text-sm text-foreground0 mb-4">
                Help visitors get to know your organization quickly with a short intro video
              </p>
              <button
                onClick={onEditIntroVideo}
                className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent transition-colors"
              >
                <VideoCameraIcon className="h-4 w-4" />
                Add Intro Video
              </button>
            </div>
          </section>
        ) : null}

        {/* Employer Interviews */}
        {org.interviews && org.interviews.length > 0 && (
          <EmployerInterviewSection employer={org as unknown as EmployerProfile} />
        )}

        {/* Indigenous Verification Details */}
        {hasVerificationDetails && (
          <section className="rounded-2xl bg-gradient-to-br from-amber-50 to-white border border-amber-500/20 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20">
                <ShieldCheckIcon className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">Verified Indigenous Business</h2>
                {verification?.reviewedAt && (
                  <p className="text-xs text-foreground0">
                    Verified {typeof verification.reviewedAt === 'object' && 'toDate' in verification.reviewedAt
                      ? verification.reviewedAt.toDate().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                      : ''}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-3">
              {verification?.nationAffiliation && (
                <div className="flex items-center gap-2">
                  <span className="text-foreground0 text-sm">Nation:</span>
                  <span className="text-[var(--text-primary)] font-medium">{verification.nationAffiliation}</span>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {verification?.isIndigenousOwned && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1.5 text-sm text-amber-400 border border-amber-500/20">
                    <CheckBadgeIcon className="h-4 w-4" />
                    Majority Indigenous-Owned (51%+)
                  </span>
                )}
                {verification?.isIndigenousLed && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1.5 text-sm text-amber-400 border border-amber-500/20">
                    <CheckBadgeIcon className="h-4 w-4" />
                    Indigenous Leadership
                  </span>
                )}
              </div>

              {verification?.certifications && verification.certifications.length > 0 && (
                <div className="pt-3 border-t border-[var(--border)]">
                  <p className="text-xs text-foreground0 mb-2">Certifications</p>
                  <div className="flex flex-wrap gap-2">
                    {verification.certifications.map((cert) => (
                      <span
                        key={cert}
                        className="inline-flex items-center rounded-full bg-surface px-3 py-1 text-xs text-[var(--text-secondary)]"
                      >
                        {cert}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* TRC Commitment */}
        {hasTrcDetails && (
          <section className="rounded-2xl bg-gradient-to-br from-purple-50 to-white border border-purple-500/20 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/20">
                <HeartIcon className="h-5 w-5 text-purple-400" />
              </div>
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">TRC Commitment</h2>
            </div>

            {trc?.commitmentStatement && (
              <p className="text-[var(--text-secondary)] mb-4">{trc.commitmentStatement}</p>
            )}

            <div className="grid gap-3 sm:grid-cols-3">
              <div className={`rounded-xl p-3 border ${
                trc?.hasIndigenousHiringStrategy
                  ? 'bg-accent/10 border-accent/20'
                  : 'bg-[var(--card-bg)] border-[var(--border)]'
              }`}>
                <div className="flex items-center gap-2 mb-1">
                  {trc?.hasIndigenousHiringStrategy ? (
                    <CheckBadgeIcon className="h-4 w-4 text-accent" />
                  ) : (
                    <div className="h-4 w-4 rounded-full border border-[var(--border)]" />
                  )}
                  <span className={`text-sm font-medium ${
                    trc?.hasIndigenousHiringStrategy ? 'text-accent' : 'text-foreground0'
                  }`}>
                    Hiring Strategy
                  </span>
                </div>
                <p className="text-xs text-foreground0">Indigenous hiring initiatives</p>
              </div>

              <div className={`rounded-xl p-3 border ${
                trc?.leadershipTrainingComplete
                  ? 'bg-accent/10 border-accent/20'
                  : 'bg-[var(--card-bg)] border-[var(--border)]'
              }`}>
                <div className="flex items-center gap-2 mb-1">
                  {trc?.leadershipTrainingComplete ? (
                    <CheckBadgeIcon className="h-4 w-4 text-accent" />
                  ) : (
                    <div className="h-4 w-4 rounded-full border border-[var(--border)]" />
                  )}
                  <span className={`text-sm font-medium ${
                    trc?.leadershipTrainingComplete ? 'text-accent' : 'text-foreground0'
                  }`}>
                    Leadership Training
                  </span>
                </div>
                <p className="text-xs text-foreground0">Cultural competency training</p>
              </div>

              <div className={`rounded-xl p-3 border ${
                trc?.isIndigenousOwned
                  ? 'bg-accent/10 border-accent/20'
                  : 'bg-[var(--card-bg)] border-[var(--border)]'
              }`}>
                <div className="flex items-center gap-2 mb-1">
                  {trc?.isIndigenousOwned ? (
                    <CheckBadgeIcon className="h-4 w-4 text-accent" />
                  ) : (
                    <div className="h-4 w-4 rounded-full border border-[var(--border)]" />
                  )}
                  <span className={`text-sm font-medium ${
                    trc?.isIndigenousOwned ? 'text-accent' : 'text-foreground0'
                  }`}>
                    Indigenous-Owned
                  </span>
                </div>
                <p className="text-xs text-foreground0">Majority Indigenous ownership</p>
              </div>
            </div>
          </section>
        )}
      </div>

      {/* Sidebar */}
      <div className="space-y-6">
        {/* Profile Strength (Owner only) */}
        {canEdit && <ProfileStrengthCard org={org} />}

        {/* Quick Facts */}
        <section className="rounded-2xl bg-[var(--card-bg)] border border-[var(--border)] p-6">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Quick Facts</h3>
          <dl className="space-y-3 text-sm">
            {memberSince && (
              <div className="flex justify-between">
                <dt className="text-foreground0">Member Since</dt>
                <dd className="text-[var(--text-primary)]">{memberSince.getFullYear()}</dd>
              </div>
            )}
            {jobCount > 0 && (
              <div className="flex justify-between">
                <dt className="text-foreground0">Jobs Posted</dt>
                <dd className="text-[var(--text-primary)]">{jobCount}</dd>
              </div>
            )}
            {org.foundedYear && (
              <div className="flex justify-between">
                <dt className="text-foreground0">Founded</dt>
                <dd className="text-[var(--text-primary)]">{org.foundedYear}</dd>
              </div>
            )}
            {org.companySize && (
              <div className="flex justify-between">
                <dt className="text-foreground0">Team Size</dt>
                <dd className="text-[var(--text-primary)]">{org.companySize}</dd>
              </div>
            )}
            {org.industry && (
              <div className="flex justify-between">
                <dt className="text-foreground0">Industry</dt>
                <dd className="text-[var(--text-primary)] capitalize">{org.industry.replace('-', ' ')}</dd>
              </div>
            )}
            {org.nation && (
              <div className="flex justify-between">
                <dt className="text-foreground0">Nation</dt>
                <dd className="text-[var(--text-primary)]">{org.nation}</dd>
              </div>
            )}
          </dl>

          {/* Activity Indicator */}
          {org.updatedAt && (
            <div className="mt-4 pt-4 border-t border-[var(--border)]">
              <ActivityIndicator updatedAt={org.updatedAt} />
            </div>
          )}
        </section>

        {/* Categories */}
        {org.categories && org.categories.length > 0 && (
          <section className="rounded-2xl bg-[var(--card-bg)] border border-[var(--border)] p-6">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Categories</h3>
            <div className="flex flex-wrap gap-2">
              {org.categories.map((cat) => (
                <span
                  key={cat}
                  className="inline-flex rounded-full bg-surface px-3 py-1 text-xs text-[var(--text-secondary)]"
                >
                  {cat}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Connect With Us */}
        {(org.contactEmail || org.contactPhone || org.links?.website) && (
          <section className="rounded-2xl bg-gradient-to-br from-teal-50 to-white border border-accent/20 p-5">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
              <EnvelopeIcon className="h-4 w-4 text-accent" />
              Connect With Us
            </h3>
            <div className="space-y-3">
              {org.contactEmail && (
                <a
                  href={`mailto:${org.contactEmail}`}
                  className="flex items-center gap-3 p-2.5 rounded-lg bg-[var(--background)] hover:bg-surface transition-colors group"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10">
                    <EnvelopeIcon className="h-4 w-4 text-accent" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-foreground0">Email</p>
                    <p className="text-sm text-[var(--text-primary)] truncate group-hover:text-accent transition-colors">
                      {org.contactEmail}
                    </p>
                  </div>
                </a>
              )}
              {org.contactPhone && (
                <a
                  href={`tel:${org.contactPhone}`}
                  className="flex items-center gap-3 p-2.5 rounded-lg bg-[var(--background)] hover:bg-surface transition-colors group"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10">
                    <PhoneIcon className="h-4 w-4 text-accent" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-foreground0">Phone</p>
                    <p className="text-sm text-[var(--text-primary)] group-hover:text-accent transition-colors">
                      {org.contactPhone}
                    </p>
                  </div>
                </a>
              )}
              {org.links?.website && (
                <a
                  href={org.links.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-2.5 rounded-lg bg-[var(--background)] hover:bg-surface transition-colors group"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10">
                    <GlobeAltIcon className="h-4 w-4 text-accent" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-foreground0">Website</p>
                    <p className="text-sm text-[var(--text-primary)] truncate group-hover:text-accent transition-colors">
                      {org.links.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                    </p>
                  </div>
                  <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5 text-foreground0" />
                </a>
              )}
            </div>

            {/* Social Links Row */}
            {(org.links?.linkedin || org.links?.instagram || org.links?.facebook || org.links?.twitter) && (
              <div className="mt-4 pt-4 border-t border-[var(--border)]">
                <p className="text-xs text-foreground0 mb-2">Follow Us</p>
                <div className="flex gap-2">
                  {org.links.linkedin && (
                    <a
                      href={org.links.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface hover:bg-surface text-foreground0 hover:text-[var(--text-primary)] transition-colors"
                      title="LinkedIn"
                    >
                      <SocialIcons.linkedin className="h-4 w-4" />
                    </a>
                  )}
                  {org.links.instagram && (
                    <a
                      href={org.links.instagram}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface hover:bg-surface text-foreground0 hover:text-[var(--text-primary)] transition-colors"
                      title="Instagram"
                    >
                      <SocialIcons.instagram className="h-4 w-4" />
                    </a>
                  )}
                  {org.links.facebook && (
                    <a
                      href={org.links.facebook}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface hover:bg-surface text-foreground0 hover:text-[var(--text-primary)] transition-colors"
                      title="Facebook"
                    >
                      <SocialIcons.facebook className="h-4 w-4" />
                    </a>
                  )}
                  {org.links.twitter && (
                    <a
                      href={org.links.twitter}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface hover:bg-surface text-foreground0 hover:text-[var(--text-primary)] transition-colors"
                      title="X (Twitter)"
                    >
                      <SocialIcons.twitter className="h-4 w-4" />
                    </a>
                  )}
                  {org.links.youtube && (
                    <a
                      href={org.links.youtube}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface hover:bg-surface text-foreground0 hover:text-[var(--text-primary)] transition-colors"
                      title="YouTube"
                    >
                      <SocialIcons.youtube className="h-4 w-4" />
                    </a>
                  )}
                  {org.links.tiktok && (
                    <a
                      href={org.links.tiktok}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface hover:bg-surface text-foreground0 hover:text-[var(--text-primary)] transition-colors"
                      title="TikTok"
                    >
                      <SocialIcons.tiktok className="h-4 w-4" />
                    </a>
                  )}
                </div>
              </div>
            )}
          </section>
        )}

        {/* Team Section (Owner only) */}
        {canEdit && (
          <section className="rounded-2xl bg-[var(--card-bg)] border border-[var(--border)] p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
                <UserGroupIcon className="h-4 w-4 text-foreground0" />
                Team Members
              </h3>
              <Link
                href="/organization/team"
                className="text-xs text-accent hover:text-teal-300"
              >
                Manage
              </Link>
            </div>
            {loadingTeam ? (
              <div className="flex justify-center py-4">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-accent border-t-transparent" />
              </div>
            ) : teamMembers.length > 0 ? (
              <div className="space-y-3">
                {teamMembers.slice(0, 5).map((member) => (
                  <div key={member.id} className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center text-sm font-medium text-white">
                      {member.displayName?.charAt(0) || member.email.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[var(--text-primary)] truncate">
                        {member.displayName || member.email}
                      </p>
                      <p className="text-xs text-foreground0 capitalize">{member.role}</p>
                    </div>
                  </div>
                ))}
                {teamMembers.length > 5 && (
                  <p className="text-xs text-foreground0 pt-2">
                    +{teamMembers.length - 5} more team members
                  </p>
                )}
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-xs text-foreground0 mb-2">No team members yet</p>
                <Link
                  href="/organization/team/invite"
                  className="text-xs text-accent hover:text-teal-300"
                >
                  Invite team members
                </Link>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

function JobsTab({ org, canEdit, onOpenPanel, refreshKey }: { org: OrganizationProfile; canEdit: boolean; onOpenPanel?: () => void; refreshKey?: number }) {
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchJobs() {
      setLoading(true);
      try {
        const data = await listEmployerJobs(org.userId);
        // Only show active jobs for public view
        setJobs(canEdit ? data : data.filter(j => j.active));
      } catch (error) {
        console.error('Error loading jobs:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchJobs();
  }, [org.userId, canEdit, refreshKey]);

  const formatSalary = (salaryRange: JobPosting['salaryRange']) => {
    if (!salaryRange) return null;
    if (typeof salaryRange === 'string') return salaryRange;
    if (salaryRange.min && salaryRange.max) {
      return `$${salaryRange.min.toLocaleString()} - $${salaryRange.max.toLocaleString()}`;
    }
    if (salaryRange.max) return `Up to $${salaryRange.max.toLocaleString()}`;
    if (salaryRange.min) return `From $${salaryRange.min.toLocaleString()}`;
    return null;
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="rounded-2xl bg-[var(--card-bg)] border border-[var(--border)] p-8 text-center">
        {canEdit ? (
          <EmptyStateCard
            title="No jobs posted yet"
            description="Reach thousands of Indigenous professionals actively seeking opportunities. Post your first job today."
            ctaText="Post a Job"
            onCtaClick={onOpenPanel}
            icon={<BriefcaseIcon className="h-7 w-7" />}
          />
        ) : (
          <p className="text-foreground0">No job openings at this time.</p>
        )}
      </div>
    );
  }

  // Helper to format closing date
  const formatClosingDate = (date: JobPosting['closingDate']) => {
    if (!date) return null;
    let d: Date;
    if (typeof date === 'string') {
      d = new Date(date);
    } else if (date instanceof Date) {
      d = date;
    } else if ('toDate' in date) {
      d = date.toDate();
    } else {
      return null;
    }
    const now = new Date();
    const diffDays = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return null; // Already closed
    if (diffDays === 0) return 'Closes today';
    if (diffDays === 1) return 'Closes tomorrow';
    if (diffDays <= 7) return `Closes in ${diffDays} days`;
    return null; // Don't show if more than a week away
  };

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {jobs.map((job) => {
        const salary = formatSalary(job.salaryRange);
        const postedDate = job.createdAt
          ? (typeof job.createdAt === 'object' && 'toDate' in job.createdAt
              ? job.createdAt.toDate()
              : new Date(job.createdAt as unknown as string))
          : null;
        const closingText = formatClosingDate(job.closingDate);
        return (
          <Link
            key={job.id}
            href={`/jobs/${job.id}`}
            className="group flex flex-col rounded-xl bg-[var(--card-bg)] border border-[var(--border)] p-5 hover:border-accent/50 focus-within:border-accent/50 active:border-accent/50 transition-colors"
          >
            {/* Header with badges */}
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex flex-wrap gap-1.5">
                {job.remoteFlag && (
                  <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-blue-400">
                    Remote
                  </span>
                )}
                {job.indigenousPreference && (
                  <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-400">
                    Indigenous Priority
                  </span>
                )}
                {job.quickApplyEnabled && (
                  <span className="rounded-full bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">
                    Quick Apply
                  </span>
                )}
              </div>
              {!job.active && canEdit && (
                <span className="flex-shrink-0 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs text-amber-400">
                  Inactive
                </span>
              )}
            </div>

            {/* Title and location */}
            <div className="flex-1">
              <h3 className="font-semibold text-[var(--text-primary)] group-hover:text-accent transition-colors line-clamp-2">
                {job.title}
              </h3>
              <div className="flex items-center gap-2 text-sm text-foreground0 mt-1">
                <span className="truncate">{job.location || 'Location flexible'}</span>
                {postedDate && (
                  <>
                    <span className="text-[var(--text-secondary)]">•</span>
                    <span className="text-foreground0 whitespace-nowrap">{formatTimeAgo(postedDate)}</span>
                  </>
                )}
              </div>
            </div>

            {/* Tags row */}
            <div className="mt-3 flex flex-wrap gap-2">
              {job.employmentType && (
                <span className="rounded-full bg-surface px-2 py-0.5 text-xs text-[var(--text-secondary)] capitalize">
                  {job.employmentType.replace('-', ' ')}
                </span>
              )}
              {salary && (
                <span className="rounded-full bg-accent/10 px-2 py-0.5 text-xs text-accent">
                  {salary}
                </span>
              )}
              {job.willTrain && (
                <span className="rounded-full bg-purple-500/10 px-2 py-0.5 text-xs text-purple-400">
                  Will Train
                </span>
              )}
            </div>

            {/* Footer with deadline and applicants */}
            {(closingText || (job.applicationsCount && job.applicationsCount > 0)) && (
              <div className="mt-3 pt-3 border-t border-[var(--border)] flex items-center justify-between text-xs text-foreground0">
                {closingText && (
                  <span className="text-amber-400">{closingText}</span>
                )}
                {job.applicationsCount && job.applicationsCount > 0 && (
                  <span>{job.applicationsCount} applicant{job.applicationsCount !== 1 ? 's' : ''}</span>
                )}
              </div>
            )}
          </Link>
        );
      })}
    </div>
  );
}

function ProgramsTab({ org, canEdit, onOpenScholarship, onOpenTraining, refreshKey }: { org: OrganizationProfile; canEdit: boolean; onOpenScholarship?: () => void; onOpenTraining?: () => void; refreshKey?: number }) {
  const [scholarships, setScholarships] = useState<Scholarship[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPrograms() {
      setLoading(true);
      try {
        const data = await listEmployerScholarships(org.userId);
        // Only show active scholarships for public view
        setScholarships(canEdit ? data : data.filter(s => s.active));
      } catch (error) {
        console.error('Error loading scholarships:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchPrograms();
  }, [org.userId, canEdit, refreshKey]);

  const formatDate = (date: Scholarship['deadline']) => {
    if (!date) return null;
    if (typeof date === 'string') return new Date(date).toLocaleDateString();
    if (date instanceof Date) return date.toLocaleDateString();
    if ('toDate' in date) return date.toDate().toLocaleDateString();
    return null;
  };

  const formatAmount = (amount: Scholarship['amount']) => {
    if (!amount) return null;
    if (typeof amount === 'number') return `$${amount.toLocaleString()}`;
    if (typeof amount === 'string') return amount;
    return String(amount);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
      </div>
    );
  }

  if (scholarships.length === 0) {
    return (
      <div className="rounded-2xl bg-[var(--card-bg)] border border-[var(--border)] p-8 text-center">
        {canEdit ? (
          <EmptyStateCard
            title="No programs listed"
            description="Showcase your commitment to Indigenous education. Add scholarships and training programs to attract diverse talent."
            ctaText="Add Scholarship"
            onCtaClick={onOpenScholarship}
            icon={<AcademicCapIcon className="h-7 w-7" />}
          />
        ) : (
          <p className="text-foreground0">No programs available at this time.</p>
        )}
      </div>
    );
  }

  // Helper to check if deadline is urgent
  const getDeadlineStatus = (date: Scholarship['deadline']) => {
    if (!date) return null;
    let d: Date;
    if (typeof date === 'string') d = new Date(date);
    else if (date instanceof Date) d = date;
    else if ('toDate' in date) d = date.toDate();
    else return null;

    const now = new Date();
    const diffDays = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return { text: 'Closed', urgent: true, closed: true };
    if (diffDays === 0) return { text: 'Closes today!', urgent: true };
    if (diffDays <= 7) return { text: `${diffDays} days left`, urgent: true };
    if (diffDays <= 30) return { text: `${diffDays} days left`, urgent: false };
    return { text: formatDate(date), urgent: false };
  };

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {scholarships.map((scholarship) => {
        const deadlineStatus = getDeadlineStatus(scholarship.deadline);
        const amountStr = formatAmount(scholarship.amount);
        return (
          <Link
            key={scholarship.id}
            href={`/scholarships/${scholarship.id}`}
            className="group flex flex-col rounded-xl bg-[var(--card-bg)] border border-[var(--border)] p-5 hover:border-accent/50 focus-within:border-accent/50 active:border-accent/50 transition-colors"
          >
            {/* Header with icon and amount */}
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center">
                <AcademicCapIcon className="h-6 w-6 text-amber-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-[var(--text-primary)] group-hover:text-accent transition-colors line-clamp-2">
                  {scholarship.title}
                </h3>
                {amountStr && (
                  <p className="text-lg font-bold text-accent mt-1">{amountStr}</p>
                )}
              </div>
            </div>

            {/* Tags */}
            <div className="mt-3 flex flex-wrap gap-2">
              {scholarship.level && (
                <span className="rounded-full bg-surface px-2 py-0.5 text-xs text-[var(--text-secondary)] capitalize">
                  {scholarship.level}
                </span>
              )}
              {scholarship.type && (
                <span className="rounded-full bg-purple-500/10 px-2 py-0.5 text-xs text-purple-400 capitalize">
                  {scholarship.type}
                </span>
              )}
              {scholarship.region && (
                <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-xs text-blue-400">
                  {scholarship.region}
                </span>
              )}
            </div>

            {/* Deadline footer */}
            {deadlineStatus && !deadlineStatus.closed && (
              <div className={`mt-3 pt-3 border-t border-[var(--border)] flex items-center gap-1.5 text-xs ${
                deadlineStatus.urgent ? 'text-amber-400' : 'text-foreground0'
              }`}>
                <CalendarIcon className="h-3.5 w-3.5" />
                {deadlineStatus.urgent ? deadlineStatus.text : `Deadline: ${deadlineStatus.text}`}
              </div>
            )}
          </Link>
        );
      })}
    </div>
  );
}

function OfferingsTab({ org, canEdit, onOpenPanel, refreshKey }: { org: OrganizationProfile; canEdit: boolean; onOpenPanel?: () => void; refreshKey?: number }) {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchServices() {
      setLoading(true);
      try {
        const data = await listUserServices(org.userId);
        // Only show active services for public view
        setServices(canEdit ? data : data.filter(s => s.status === 'active'));
      } catch (error) {
        console.error('Error loading services:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchServices();
  }, [org.userId, canEdit, refreshKey]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
      </div>
    );
  }

  if (services.length === 0) {
    return (
      <div className="rounded-2xl bg-[var(--card-bg)] border border-[var(--border)] p-8 text-center">
        {canEdit ? (
          <EmptyStateCard
            title="No products or services listed"
            description="Showcase what you offer. List your products and services to connect with potential customers and partners."
            ctaText="Add Product or Service"
            onCtaClick={onOpenPanel}
            icon={<BuildingStorefrontIcon className="h-7 w-7" />}
          />
        ) : (
          <p className="text-foreground0">No products or services available at this time.</p>
        )}
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {services.map((service) => (
        <Link
          key={service.id}
          href={`/business/services/${service.id}`}
          className="group flex flex-col rounded-xl bg-[var(--card-bg)] border border-[var(--border)] overflow-hidden hover:border-accent/50 focus-within:border-accent/50 active:border-accent/50 transition-colors"
        >
          {/* Cover Image */}
          <div className="relative h-36 bg-gradient-to-br from-slate-100 to-slate-200">
            {service.coverImageUrl ? (
              <Image
                src={service.coverImageUrl}
                alt={service.title}
                fill
                className="object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <BuildingStorefrontIcon className="h-12 w-12 text-[var(--text-secondary)]" />
              </div>
            )}
            {/* Overlay badges */}
            <div className="absolute top-2 left-2 flex flex-wrap gap-1.5">
              {service.indigenousOwned && (
                <span className="rounded-full bg-amber-500/90 px-2 py-0.5 text-xs font-medium text-white shadow-sm">
                  Indigenous-Owned
                </span>
              )}
              {service.verified && (
                <span className="rounded-full bg-blue-500/90 px-2 py-0.5 text-xs font-medium text-white shadow-sm flex items-center gap-1">
                  <CheckBadgeIcon className="h-3 w-3" />
                  Verified
                </span>
              )}
            </div>
            {/* Logo overlay */}
            {service.logoUrl && (
              <div className="absolute -bottom-5 left-4">
                <div className="h-10 w-10 rounded-lg border-2 border-[var(--border)] bg-surface overflow-hidden shadow-lg">
                  <Image
                    src={service.logoUrl}
                    alt={service.businessName}
                    width={40}
                    height={40}
                    className="h-full w-full object-cover"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 p-4 pt-7">
            <h3 className="font-semibold text-[var(--text-primary)] group-hover:text-accent transition-colors line-clamp-2">
              {service.title}
            </h3>
            {service.tagline && (
              <p className="text-xs text-foreground0 mt-1 line-clamp-2">{service.tagline}</p>
            )}

            {/* Tags row */}
            <div className="mt-3 flex flex-wrap gap-2">
              {service.category && (
                <span className="rounded-full bg-surface px-2 py-0.5 text-xs text-[var(--text-secondary)] capitalize">
                  {service.category.replace(/-/g, ' ')}
                </span>
              )}
              {service.servesRemote && (
                <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-xs text-blue-400">
                  Remote
                </span>
              )}
              {service.freeConsultation && (
                <span className="rounded-full bg-accent/10 px-2 py-0.5 text-xs text-accent">
                  Free Consultation
                </span>
              )}
            </div>

            {/* Footer with price and experience */}
            <div className="mt-3 pt-3 border-t border-[var(--border)] flex items-center justify-between">
              {service.priceRange ? (
                <span className="text-sm font-medium text-accent">{service.priceRange}</span>
              ) : (
                <span className="text-xs text-foreground0">Contact for pricing</span>
              )}
              {service.yearsExperience && service.yearsExperience > 0 && (
                <span className="text-xs text-foreground0">
                  {service.yearsExperience}+ yrs exp
                </span>
              )}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

function EventsTab({ org, canEdit, onOpenPanel, refreshKey }: { org: OrganizationProfile; canEdit: boolean; onOpenPanel?: () => void; refreshKey?: number }) {
  const [conferences, setConferences] = useState<Conference[]>([]);
  const [powwows, setPowwows] = useState<PowwowEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchEvents() {
      setLoading(true);
      try {
        const [confData, powwowData] = await Promise.all([
          listEmployerConferences(org.userId),
          listEmployerPowwows(org.userId),
        ]);
        // Only show active events for public view
        setConferences(canEdit ? confData : confData.filter(c => c.active));
        setPowwows(canEdit ? powwowData : powwowData.filter(p => p.active));
      } catch (error) {
        console.error('Error loading events:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchEvents();
  }, [org.userId, canEdit, refreshKey]);

  const formatEventDate = (date: Conference['startDate'] | PowwowEvent['startDate']) => {
    if (!date) return null;
    if (typeof date === 'string') return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    if ('toDate' in date) return date.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return null;
  };

  // Get event status (upcoming, happening now, or past)
  const getEventStatus = (startDate: Conference['startDate'], endDate: Conference['endDate']) => {
    if (!startDate) return null;
    const now = new Date();
    let start: Date;
    let end: Date | null = null;

    if (typeof startDate === 'string') start = new Date(startDate);
    else if ('toDate' in startDate) start = startDate.toDate();
    else return null;

    if (endDate) {
      if (typeof endDate === 'string') end = new Date(endDate);
      else if ('toDate' in endDate) end = endDate.toDate();
    }

    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfStart = new Date(start.getFullYear(), start.getMonth(), start.getDate());

    if (end) {
      const startOfEnd = new Date(end.getFullYear(), end.getMonth(), end.getDate());
      if (startOfToday >= startOfStart && startOfToday <= startOfEnd) {
        return { text: 'Happening Now', color: 'emerald' };
      }
    } else if (startOfToday.getTime() === startOfStart.getTime()) {
      return { text: 'Today', color: 'emerald' };
    }

    const diffDays = Math.ceil((startOfStart.getTime() - startOfToday.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 1) return { text: 'Tomorrow', color: 'amber' };
    if (diffDays > 1 && diffDays <= 7) return { text: `In ${diffDays} days`, color: 'blue' };
    return null;
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
      </div>
    );
  }

  const hasEvents = conferences.length > 0 || powwows.length > 0;

  if (!hasEvents) {
    return (
      <div className="rounded-2xl bg-[var(--card-bg)] border border-[var(--border)] p-8 text-center">
        {canEdit ? (
          <EmptyStateCard
            title="No events scheduled"
            description="Build connections with the community. Host conferences, networking events, or cultural gatherings."
            ctaText="Create Event"
            onCtaClick={onOpenPanel}
            icon={<CalendarIcon className="h-7 w-7" />}
          />
        ) : (
          <p className="text-foreground0">No upcoming events.</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Conferences */}
      {conferences.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Conferences</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {conferences.map((conf) => {
              const status = getEventStatus(conf.startDate, conf.endDate);
              return (
                <Link
                  key={conf.id}
                  href={`/conferences/${conf.id}`}
                  className="group flex flex-col rounded-xl bg-[var(--card-bg)] border border-[var(--border)] overflow-hidden hover:border-accent/50 focus-within:border-accent/50 active:border-accent/50 transition-colors"
                >
                  {/* Cover Image */}
                  <div className="relative h-36 bg-gradient-to-br from-purple-50 to-slate-100">
                    {conf.imageUrl ? (
                      <Image
                        src={conf.imageUrl}
                        alt={conf.title}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <CalendarIcon className="h-12 w-12 text-purple-500/30" />
                      </div>
                    )}
                    {/* Overlay badges */}
                    <div className="absolute top-2 left-2 flex flex-wrap gap-1.5">
                      {conf.featured && (
                        <span className="rounded-full bg-amber-500/90 px-2 py-0.5 text-xs font-medium text-white shadow-sm">
                          Featured
                        </span>
                      )}
                      {status && (
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium text-white shadow-sm ${
                          status.color === 'emerald' ? 'bg-accent/90' :
                          status.color === 'amber' ? 'bg-amber-500/90' : 'bg-blue-500/90'
                        }`}>
                          {status.text}
                        </span>
                      )}
                    </div>
                    {/* Format badge */}
                    {conf.format && (
                      <div className="absolute top-2 right-2">
                        <span className="rounded-full bg-[var(--card-bg)]/80 px-2 py-0.5 text-xs text-[var(--text-secondary)] capitalize">
                          {conf.format}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 p-4">
                    <h4 className="font-semibold text-[var(--text-primary)] group-hover:text-accent transition-colors line-clamp-2">
                      {conf.title}
                    </h4>

                    <div className="mt-3 space-y-1.5">
                      <div className="flex items-center gap-1.5 text-xs text-foreground0">
                        <CalendarIcon className="h-3.5 w-3.5 flex-shrink-0" />
                        <span>{formatEventDate(conf.startDate)}</span>
                        {conf.endDate && conf.endDate !== conf.startDate && (
                          <span>- {formatEventDate(conf.endDate)}</span>
                        )}
                      </div>
                      {conf.location && (
                        <div className="flex items-center gap-1.5 text-xs text-foreground0">
                          <MapPinIcon className="h-3.5 w-3.5 flex-shrink-0" />
                          <span className="truncate">{conf.location}</span>
                        </div>
                      )}
                    </div>

                    {/* Footer */}
                    <div className="mt-3 pt-3 border-t border-[var(--border)] flex items-center justify-between">
                      {conf.cost ? (
                        <span className={`text-xs font-medium ${
                          conf.cost.toLowerCase().includes('free') ? 'text-accent' : 'text-foreground0'
                        }`}>
                          {conf.cost}
                        </span>
                      ) : (
                        <span className="text-xs text-foreground0">See details</span>
                      )}
                      {conf.viewsCount && conf.viewsCount > 0 && (
                        <span className="text-xs text-foreground0">{conf.viewsCount} views</span>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Pow Wows */}
      {powwows.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Pow Wows</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {powwows.map((powwow) => {
              const status = getEventStatus(powwow.startDate || null, powwow.endDate || null);
              return (
                <Link
                  key={powwow.id}
                  href={`/powwows/${powwow.id}`}
                  className="group flex flex-col rounded-xl bg-[var(--card-bg)] border border-[var(--border)] overflow-hidden hover:border-rose-500/50 focus-within:border-rose-500/50 active:border-rose-500/50 transition-colors"
                >
                  {/* Cover Image */}
                  <div className="relative h-36 bg-gradient-to-br from-rose-50 to-slate-100">
                    {powwow.imageUrl ? (
                      <Image
                        src={powwow.imageUrl}
                        alt={powwow.name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-4xl">
                        🪶
                      </div>
                    )}
                    {/* Overlay badges */}
                    <div className="absolute top-2 left-2 flex flex-wrap gap-1.5">
                      {powwow.featured && (
                        <span className="rounded-full bg-amber-500/90 px-2 py-0.5 text-xs font-medium text-white shadow-sm">
                          Featured
                        </span>
                      )}
                      {status && (
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium text-white shadow-sm ${
                          status.color === 'emerald' ? 'bg-accent/90' :
                          status.color === 'amber' ? 'bg-amber-500/90' : 'bg-blue-500/90'
                        }`}>
                          {status.text}
                        </span>
                      )}
                      {powwow.livestream && (
                        <span className="rounded-full bg-red-500/90 px-2 py-0.5 text-xs font-medium text-white shadow-sm flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-[var(--card-bg)] animate-pulse" />
                          Livestream
                        </span>
                      )}
                    </div>
                    {/* Event type badge */}
                    {powwow.eventType && (
                      <div className="absolute top-2 right-2">
                        <span className="rounded-full bg-[var(--card-bg)]/80 px-2 py-0.5 text-xs text-[var(--text-secondary)] capitalize">
                          {powwow.eventType}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 p-4">
                    <h4 className="font-semibold text-[var(--text-primary)] group-hover:text-rose-400 transition-colors line-clamp-2">
                      {powwow.name}
                    </h4>
                    {powwow.host && (
                      <p className="text-xs text-foreground0 mt-1">Hosted by {powwow.host}</p>
                    )}

                    <div className="mt-3 space-y-1.5">
                      <div className="flex items-center gap-1.5 text-xs text-foreground0">
                        <CalendarIcon className="h-3.5 w-3.5 flex-shrink-0" />
                        <span>
                          {powwow.dateRange || formatEventDate(powwow.startDate)}
                          {!powwow.dateRange && powwow.endDate && powwow.endDate !== powwow.startDate && (
                            <> - {formatEventDate(powwow.endDate)}</>
                          )}
                        </span>
                      </div>
                      {powwow.location && (
                        <div className="flex items-center gap-1.5 text-xs text-foreground0">
                          <MapPinIcon className="h-3.5 w-3.5 flex-shrink-0" />
                          <span className="truncate">{powwow.location}</span>
                        </div>
                      )}
                    </div>

                    {/* Season tag */}
                    {powwow.season && (
                      <div className="mt-3 pt-3 border-t border-[var(--border)]">
                        <span className="rounded-full bg-rose-500/10 px-2 py-0.5 text-xs text-rose-400 capitalize">
                          {powwow.season}
                        </span>
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function FundingTab({ org, canEdit, onOpenPanel, refreshKey }: { org: OrganizationProfile; canEdit: boolean; onOpenPanel?: () => void; refreshKey?: number }) {
  const [grants, setGrants] = useState<BusinessGrant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchGrants() {
      setLoading(true);
      try {
        const data = await listOrganizationGrants(org.userId);
        // Only show active grants for public view
        setGrants(canEdit ? data : data.filter(g => g.status === 'active'));
      } catch (error) {
        console.error('Error loading grants:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchGrants();
  }, [org.userId, canEdit, refreshKey]);

  const formatGrantDate = (date: BusinessGrant['deadline']) => {
    if (!date) return null;
    if (typeof date === 'string') return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    if (date instanceof Date) return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    if ('toDate' in date) return date.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return null;
  };

  const formatGrantAmount = (amount: BusinessGrant['amount']) => {
    if (!amount) return null;
    if (amount.display) return amount.display;
    if (amount.min && amount.max) return `$${amount.min.toLocaleString()} - $${amount.max.toLocaleString()}`;
    if (amount.max) return `Up to $${amount.max.toLocaleString()}`;
    if (amount.min) return `From $${amount.min.toLocaleString()}`;
    return null;
  };

  // Check deadline urgency
  const getDeadlineStatus = (date: BusinessGrant['deadline']) => {
    if (!date) return null;
    let d: Date;
    if (typeof date === 'string') d = new Date(date);
    else if (date instanceof Date) d = date;
    else if ('toDate' in date) d = date.toDate();
    else return null;

    const now = new Date();
    const diffDays = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return { text: 'Closed', urgent: true, closed: true };
    if (diffDays === 0) return { text: 'Closes today!', urgent: true };
    if (diffDays === 1) return { text: 'Closes tomorrow', urgent: true };
    if (diffDays <= 7) return { text: `${diffDays} days left`, urgent: true };
    if (diffDays <= 30) return { text: `${diffDays} days left`, urgent: false };
    return { text: formatGrantDate(date), urgent: false };
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
      </div>
    );
  }

  if (grants.length === 0) {
    return (
      <div className="rounded-2xl bg-[var(--card-bg)] border border-[var(--border)] p-8 text-center">
        {canEdit ? (
          <EmptyStateCard
            title="No funding opportunities"
            description="Support Indigenous entrepreneurs. Share grants, loans, and funding programs to help businesses grow."
            ctaText="Add Funding"
            onCtaClick={onOpenPanel}
            icon={<CurrencyDollarIcon className="h-7 w-7" />}
          />
        ) : (
          <p className="text-foreground0">No funding opportunities available at this time.</p>
        )}
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {grants.map((grant) => {
        const amountStr = formatGrantAmount(grant.amount);
        const deadlineStatus = getDeadlineStatus(grant.deadline);
        const eligibility = grant.eligibility || {};
        return (
          <Link
            key={grant.id}
            href={`/business/funding/${grant.slug || grant.id}`}
            className="group flex flex-col rounded-xl bg-[var(--card-bg)] border border-[var(--border)] overflow-hidden hover:border-accent/50 focus-within:border-accent/50 active:border-accent/50 transition-colors"
          >
            {/* Header with gradient */}
            <div className="relative h-24 bg-gradient-to-br from-emerald-50 to-slate-100 p-4">
              {/* Featured badge */}
              {grant.featured && (
                <span className="absolute top-2 left-2 rounded-full bg-amber-500/90 px-2 py-0.5 text-xs font-medium text-white shadow-sm">
                  Featured
                </span>
              )}
              {/* Provider logo or icon */}
              <div className="absolute bottom-0 translate-y-1/2 left-4">
                <div className="h-12 w-12 rounded-xl border-2 border-[var(--border)] bg-surface overflow-hidden shadow-lg flex items-center justify-center">
                  {grant.providerLogo ? (
                    <Image
                      src={grant.providerLogo}
                      alt={grant.provider}
                      width={48}
                      height={48}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <CurrencyDollarIcon className="h-6 w-6 text-accent" />
                  )}
                </div>
              </div>
              {/* Amount display */}
              {amountStr && (
                <div className="absolute top-2 right-2">
                  <span className="rounded-lg bg-accent/90 px-2.5 py-1 text-sm font-bold text-white shadow-sm">
                    {amountStr}
                  </span>
                </div>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 p-4 pt-8">
              <h3 className="font-semibold text-[var(--text-primary)] group-hover:text-accent transition-colors line-clamp-2">
                {grant.title}
              </h3>
              <p className="text-xs text-foreground0 mt-1">{grant.provider}</p>

              {/* Eligibility badges */}
              <div className="mt-3 flex flex-wrap gap-1.5">
                {grant.grantType && (
                  <span className="rounded-full bg-surface px-2 py-0.5 text-xs text-[var(--text-secondary)] capitalize">
                    {grant.grantType.replace(/-/g, ' ')}
                  </span>
                )}
                {eligibility.indigenousOwned && (
                  <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs text-amber-400">
                    Indigenous-Owned
                  </span>
                )}
                {eligibility.womenOwned && (
                  <span className="rounded-full bg-pink-500/10 px-2 py-0.5 text-xs text-pink-400">
                    Women-Owned
                  </span>
                )}
                {eligibility.youthOwned && (
                  <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-xs text-blue-400">
                    Youth-Owned
                  </span>
                )}
              </div>

              {/* Provinces if applicable */}
              {eligibility.provinces && eligibility.provinces.length > 0 && eligibility.provinces.length <= 3 && (
                <div className="mt-2 flex items-center gap-1.5 text-xs text-foreground0">
                  <MapPinIcon className="h-3.5 w-3.5 flex-shrink-0" />
                  <span>{eligibility.provinces.join(', ')}</span>
                </div>
              )}

              {/* Deadline footer */}
              {deadlineStatus && !deadlineStatus.closed && (
                <div className={`mt-3 pt-3 border-t border-[var(--border)] flex items-center gap-1.5 text-xs ${
                  deadlineStatus.urgent ? 'text-amber-400' : 'text-foreground0'
                }`}>
                  <CalendarIcon className="h-3.5 w-3.5" />
                  {deadlineStatus.urgent ? deadlineStatus.text : `Deadline: ${deadlineStatus.text}`}
                </div>
              )}
            </div>
          </Link>
        );
      })}
    </div>
  );
}

// Activity Indicator Component
function ActivityIndicator({ updatedAt }: { updatedAt: OrganizationProfile['updatedAt'] }) {
  if (!updatedAt) return null;

  const date = typeof updatedAt === 'object' && 'toDate' in updatedAt
    ? updatedAt.toDate()
    : new Date(updatedAt as unknown as string);

  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  let statusText: string;
  let statusColor: string;
  let dotColor: string;

  if (diffDays <= 7) {
    statusText = 'Very Active';
    statusColor = 'text-accent';
    dotColor = 'bg-emerald-400';
  } else if (diffDays <= 30) {
    statusText = 'Recently Active';
    statusColor = 'text-accent';
    dotColor = 'bg-teal-400';
  } else if (diffDays <= 90) {
    statusText = 'Active';
    statusColor = 'text-foreground0';
    dotColor = 'bg-slate-400';
  } else {
    return null; // Don't show if inactive for too long
  }

  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-foreground0">Activity</span>
      <span className={`flex items-center gap-1.5 text-xs font-medium ${statusColor}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${dotColor} ${diffDays <= 7 ? 'animate-pulse' : ''}`} />
        {statusText}
      </span>
    </div>
  );
}

// Profile Strength Card Component (Owner only)
function ProfileStrengthCard({ org }: { org: OrganizationProfile }) {
  // Calculate profile completeness
  const items = [
    { id: 'logo', label: 'Logo', completed: !!org.logoUrl, weight: 15 },
    { id: 'banner', label: 'Banner', completed: !!org.bannerUrl, weight: 10 },
    { id: 'description', label: 'Description', completed: !!(org.description && org.description.length >= 50), weight: 15 },
    { id: 'location', label: 'Location', completed: !!(org.city || org.location), weight: 10 },
    { id: 'industry', label: 'Industry', completed: !!org.industry, weight: 10 },
    { id: 'website', label: 'Website', completed: !!(org.links?.website || org.website), weight: 10 },
    { id: 'contact', label: 'Contact info', completed: !!(org.contactEmail || org.contactPhone), weight: 10 },
    { id: 'story', label: 'Company story', completed: !!(org.story && org.story.length >= 50), weight: 10 },
    { id: 'video', label: 'Intro video', completed: !!org.companyIntroVideo?.videoUrl, weight: 10 },
  ];

  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  const completedWeight = items.filter(i => i.completed).reduce((sum, item) => sum + item.weight, 0);
  const score = Math.round((completedWeight / totalWeight) * 100);
  const incompleteItems = items.filter(i => !i.completed);

  const getScoreColor = (s: number) => {
    if (s >= 80) return 'text-accent';
    if (s >= 60) return 'text-amber-400';
    if (s >= 40) return 'text-orange-400';
    return 'text-red-400';
  };

  const getProgressColor = (s: number) => {
    if (s >= 80) return 'from-emerald-500 to-teal-400';
    if (s >= 60) return 'from-amber-500 to-yellow-400';
    if (s >= 40) return 'from-orange-500 to-amber-400';
    return 'from-red-500 to-orange-400';
  };

  if (score === 100) {
    return (
      <section className="rounded-2xl border border-accent/30 bg-accent/10 p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/20">
            <CheckBadgeIcon className="h-5 w-5 text-accent" />
          </div>
          <div>
            <p className="font-semibold text-emerald-300">Profile Complete!</p>
            <p className="text-xs text-emerald-200/70">Your profile is fully optimized.</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-2xl bg-[var(--card-bg)] border border-[var(--border)] p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">Profile Strength</h3>
        <span className={`text-xl font-bold ${getScoreColor(score)}`}>{score}%</span>
      </div>

      {/* Progress Bar */}
      <div className="h-2 w-full overflow-hidden rounded-full bg-surface mb-4">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${getProgressColor(score)} transition-all duration-500`}
          style={{ width: `${score}%` }}
        />
      </div>

      {/* Quick wins */}
      {incompleteItems.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-foreground0">Missing:</p>
          <div className="flex flex-wrap gap-1.5">
            {incompleteItems.slice(0, 4).map((item) => (
              <span
                key={item.id}
                className="inline-flex items-center gap-1 rounded-full bg-surface px-2 py-0.5 text-xs text-foreground0"
              >
                <span className="text-foreground0">+{item.weight}</span>
                {item.label}
              </span>
            ))}
            {incompleteItems.length > 4 && (
              <span className="text-xs text-foreground0">+{incompleteItems.length - 4} more</span>
            )}
          </div>
        </div>
      )}

      <Link
        href="/organization/profile"
        className="mt-4 flex items-center justify-center gap-1.5 w-full rounded-lg bg-accent/10 border border-accent/20 py-2 text-xs font-medium text-accent hover:bg-accent/20 transition-colors"
      >
        <PencilIcon className="h-3.5 w-3.5" />
        Complete Profile
      </Link>
    </section>
  );
}

// Empty State Card Component
function EmptyStateCard({
  title,
  description,
  ctaText,
  ctaHref,
  onCtaClick,
  icon,
}: {
  title: string;
  description: string;
  ctaText: string;
  ctaHref?: string;
  onCtaClick?: () => void;
  icon?: React.ReactNode;
}) {
  const buttonClass =
    "inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent transition-colors";

  return (
    <div className="flex flex-col items-center py-6">
      {icon && (
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-surface text-foreground0">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">{title}</h3>
      <p className="text-sm text-foreground0 mb-4 max-w-sm text-center">{description}</p>
      {onCtaClick ? (
        <button onClick={onCtaClick} className={buttonClass}>
          {ctaText}
        </button>
      ) : ctaHref ? (
        <Link href={ctaHref} className={buttonClass}>
          {ctaText}
        </Link>
      ) : null}
    </div>
  );
}

