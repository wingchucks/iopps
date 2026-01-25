'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import {
  getEmployerProfile,
  getEnabledModules,
  listEmployerJobs,
  listEmployerApplications,
  getUnifiedUnreadCount,
  getOfferingCounts,
  getAnalyticsSummary,
} from '@/lib/firestore';
import type { EmployerProfile, OrganizationModule, OrganizationProfile } from '@/lib/types';
import DirectoryStatusCard from '@/components/organization/dashboard/DirectoryStatusCard';
import {
  BriefcaseIcon,
  DocumentTextIcon,
  EnvelopeIcon,
  EyeIcon,
  CursorArrowRaysIcon,
  ShoppingBagIcon,
  AcademicCapIcon,
  CalendarDaysIcon,
  SparklesIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  PlusIcon,
  CreditCardIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import OnboardingChecklist from '@/components/organization/OnboardingChecklist';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ElementType;
  href?: string;
  trend?: { value: number; isPositive: boolean };
  color?: 'blue' | 'teal' | 'amber' | 'purple' | 'pink';
  loading?: boolean;
  error?: boolean;
  emptyHint?: string;
}

function StatCard({ label, value, icon: Icon, href, color = 'teal', loading, error, emptyHint }: StatCardProps) {
  const colorClasses = {
    blue: 'from-blue-500/20 to-blue-600/5 border-blue-500/20 text-blue-400',
    teal: 'from-accent/20 to-teal-600/5 border-accent/20 text-accent',
    amber: 'from-amber-500/20 to-amber-600/5 border-amber-500/20 text-amber-400',
    purple: 'from-purple-500/20 to-purple-600/5 border-purple-500/20 text-purple-400',
    pink: 'from-pink-500/20 to-pink-600/5 border-pink-500/20 text-pink-400',
  };

  const renderValue = () => {
    if (loading) {
      return (
        <div className="h-9 flex items-center">
          <div className="w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
        </div>
      );
    }
    if (error) {
      return <p className="text-lg text-slate-500">--</p>;
    }
    if (value === 0) {
      return (
        <div>
          <p className="text-3xl font-bold text-slate-400">0</p>
          {emptyHint && <p className="text-xs text-slate-500 mt-1">{emptyHint}</p>}
        </div>
      );
    }
    return <p className="text-3xl font-bold text-slate-50">{value}</p>;
  };

  const content = (
    <div className={`bg-gradient-to-br ${colorClasses[color]} border rounded-2xl p-5 backdrop-blur-sm transition-all hover:scale-[1.02]`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-slate-400 text-sm mb-1">{label}</p>
          {renderValue()}
        </div>
        <div className={`p-2 rounded-xl bg-slate-900/50 ${colorClasses[color].split(' ').pop()}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}

interface ActionCardProps {
  title: string;
  description: string;
  href: string;
  icon: React.ElementType;
  completed?: boolean;
}

function ActionCard({ title, description, href, icon: Icon, completed }: ActionCardProps) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-4 p-4 rounded-xl border transition-all hover:border-accent/50 ${
        completed
          ? 'bg-teal-900/10 border-teal-800/30'
          : 'bg-slate-900/50 border-slate-800 hover:bg-slate-900'
      }`}
    >
      <div className={`p-2 rounded-lg ${completed ? 'bg-teal-900/30' : 'bg-slate-800'}`}>
        {completed ? (
          <CheckCircleIcon className="w-5 h-5 text-accent" />
        ) : (
          <Icon className="w-5 h-5 text-slate-400" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`font-medium ${completed ? 'text-slate-400 line-through' : 'text-slate-200'}`}>
          {title}
        </p>
        <p className="text-sm text-slate-500 truncate">{description}</p>
      </div>
      <ArrowRightIcon className="w-4 h-4 text-slate-500" />
    </Link>
  );
}

interface ModuleCardProps {
  module: OrganizationModule;
  enabled: boolean;
  onEnable: () => void;
}

function ModuleCard({ module, enabled, onEnable }: ModuleCardProps) {
  // Intent-based module info with pricing and deep-links
  const moduleInfo: Record<OrganizationModule, {
    name: string;
    intentLabel: string;
    description: string;
    price: string;
    priceColor: 'emerald' | 'blue';
    icon: React.ElementType;
    color: string;
    pricingLink: string;
  }> = {
    hire: {
      name: 'Hire',
      intentLabel: 'Hire Talent',
      description: 'Post jobs and find Indigenous professionals',
      price: 'from $125',
      priceColor: 'blue',
      icon: BriefcaseIcon,
      color: 'blue',
      pricingLink: '/pricing#employers',
    },
    sell: {
      name: 'Sell',
      intentLabel: 'Promote Business',
      description: 'List in Shop Indigenous marketplace',
      price: 'from $50/mo',
      priceColor: 'blue',
      icon: ShoppingBagIcon,
      color: 'teal',
      pricingLink: '/pricing#vendors',
    },
    educate: {
      name: 'Educate',
      intentLabel: 'Share Scholarships',
      description: 'Manage programs and scholarships',
      price: 'FREE',
      priceColor: 'emerald',
      icon: AcademicCapIcon,
      color: 'purple',
      pricingLink: '/pricing#education',
    },
    host: {
      name: 'Host',
      intentLabel: 'Host Event',
      description: 'Create conferences and gatherings',
      price: 'FREE',
      priceColor: 'emerald',
      icon: CalendarDaysIcon,
      color: 'amber',
      pricingLink: '/pricing#events',
    },
    funding: {
      name: 'Funding',
      intentLabel: 'Share Funding',
      description: 'Post funding opportunities',
      price: 'FREE',
      priceColor: 'emerald',
      icon: SparklesIcon,
      color: 'pink',
      pricingLink: '/pricing#employers',
    },
  };

  const info = moduleInfo[module];

  if (enabled) return null;

  const priceColorClasses = {
    emerald: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    blue: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  };

  return (
    <div className="flex items-center gap-4 p-4 rounded-xl border border-dashed border-slate-700 bg-slate-900/30 hover:border-slate-600 hover:bg-slate-900/50 transition-all">
      <div className="p-2 rounded-lg bg-slate-800">
        <info.icon className="w-5 h-5 text-slate-400" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="font-semibold text-slate-200">{info.intentLabel}</p>
          <span className={`px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded border ${priceColorClasses[info.priceColor]}`}>
            {info.price}
          </span>
        </div>
        <p className="text-sm text-slate-500">{info.description}</p>
      </div>
      <div className="flex items-center gap-2">
        <Link
          href={info.pricingLink}
          className="text-xs text-slate-400 hover:text-slate-300 transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          Pricing
        </Link>
        <button
          onClick={onEnable}
          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
          title="Enable module"
        >
          <PlusIcon className="w-4 h-4 text-slate-400" />
        </button>
      </div>
    </div>
  );
}

interface YourPlanCardProps {
  profile: EmployerProfile | null;
  enabledModules: OrganizationModule[];
}

function YourPlanCard({ profile, enabledModules }: YourPlanCardProps) {
  const hasActiveSubscription = profile?.subscription?.active;
  const subscriptionTier = profile?.subscription?.tier;

  // Determine what's included with descriptions for tooltips
  const freeFeatures: { name: string; tooltip: string }[] = [];
  const paidFeatures: { name: string; price: string; tooltip: string }[] = [];

  if (enabledModules.includes('host')) {
    freeFeatures.push({
      name: 'Events & Conferences',
      tooltip: 'Create and promote conferences, pow wows, and community events for free'
    });
  }
  if (enabledModules.includes('funding')) {
    freeFeatures.push({
      name: 'Funding Opportunities',
      tooltip: 'Share grants, scholarships, and funding opportunities with the community'
    });
  }
  if (enabledModules.includes('educate')) {
    freeFeatures.push({
      name: 'Education Programs',
      tooltip: 'List your training programs, courses, and educational offerings'
    });
  }

  if (enabledModules.includes('hire')) {
    paidFeatures.push({
      name: 'Job Postings',
      price: 'from $125',
      tooltip: 'Post job opportunities visible to Indigenous job seekers across Canada'
    });
  }
  if (enabledModules.includes('sell')) {
    paidFeatures.push({
      name: 'Shop Indigenous',
      price: 'from $50/mo',
      tooltip: 'List your products and services in the Indigenous business directory'
    });
  }

  return (
    <div className="bg-gradient-to-br from-accent/10 to-teal-600/5 border border-accent/20 rounded-2xl p-5">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-slate-900/50 text-accent">
            <CreditCardIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-50">Your Plan</h3>
            <p className="text-sm text-slate-400">
              {hasActiveSubscription
                ? `${subscriptionTier === 'TIER2' ? 'Unlimited' : 'Growth'} Plan Active`
                : 'No active subscription'}
            </p>
          </div>
        </div>
        <Link
          href="/organization/billing"
          className="px-3 py-1.5 bg-accent text-slate-950 rounded-lg text-sm font-medium hover:bg-accent/90 transition-colors"
        >
          {hasActiveSubscription ? 'Manage' : 'View Pricing'}
        </Link>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4">
        {/* Free Features */}
        {freeFeatures.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-400 mb-2">Free</p>
            <ul className="space-y-1">
              {freeFeatures.map(feature => (
                <li
                  key={feature.name}
                  className="text-sm text-slate-300 flex items-center gap-2 cursor-help"
                  title={feature.tooltip}
                >
                  <CheckCircleIcon className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span className="border-b border-dotted border-slate-600">{feature.name}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Paid Features */}
        {paidFeatures.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-400 mb-2">Paid</p>
            <ul className="space-y-1">
              {paidFeatures.map(feature => (
                <li
                  key={feature.name}
                  className="text-sm text-slate-300 cursor-help"
                  title={feature.tooltip}
                >
                  <span className="border-b border-dotted border-slate-600">{feature.name}</span>
                  <span className="text-slate-500 text-xs ml-1">({feature.price})</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

export default function OrganizationDashboardHome() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<EmployerProfile | null>(null);
  const [enabledModules, setEnabledModules] = useState<OrganizationModule[]>([]);
  const [stats, setStats] = useState({
    activeJobs: 0,
    newApplications: 0,
    unreadMessages: 0,
    profileViews: 0,
    outboundClicks: 0,
    offerings: 0,
  });
  const [statsLoading, setStatsLoading] = useState({
    jobs: true,
    applications: true,
    messages: true,
    analytics: true,
    offerings: true,
  });
  const [statsError, setStatsError] = useState({
    jobs: false,
    applications: false,
    messages: false,
    analytics: false,
    offerings: false,
  });
  const [loading, setLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      if (!user) return;

      try {
        const [employerProfile, modules] = await Promise.all([
          getEmployerProfile(user.uid),
          getEnabledModules(user.uid),
        ]);

        setProfile(employerProfile);
        setEnabledModules(modules);
        setLoading(false);

        // Load stats in parallel with individual error handling
        if (modules.includes('hire')) {
          listEmployerJobs(user.uid)
            .then(jobs => {
              setStats(prev => ({ ...prev, activeJobs: jobs.filter(j => j.active).length }));
              setStatsLoading(prev => ({ ...prev, jobs: false }));
            })
            .catch(() => {
              setStatsError(prev => ({ ...prev, jobs: true }));
              setStatsLoading(prev => ({ ...prev, jobs: false }));
            });

          listEmployerApplications(user.uid)
            .then(apps => {
              setStats(prev => ({ ...prev, newApplications: apps.filter(a => a.status === 'submitted').length }));
              setStatsLoading(prev => ({ ...prev, applications: false }));
            })
            .catch(() => {
              setStatsError(prev => ({ ...prev, applications: true }));
              setStatsLoading(prev => ({ ...prev, applications: false }));
            });
        } else {
          setStatsLoading(prev => ({ ...prev, jobs: false, applications: false }));
        }

        getUnifiedUnreadCount(user.uid)
          .then(count => {
            setStats(prev => ({ ...prev, unreadMessages: count }));
            setStatsLoading(prev => ({ ...prev, messages: false }));
          })
          .catch(() => {
            setStatsError(prev => ({ ...prev, messages: true }));
            setStatsLoading(prev => ({ ...prev, messages: false }));
          });

        if (modules.includes('sell')) {
          getOfferingCounts(user.uid)
            .then(counts => {
              setStats(prev => ({ ...prev, offerings: counts.total }));
              setStatsLoading(prev => ({ ...prev, offerings: false }));
            })
            .catch(() => {
              setStatsError(prev => ({ ...prev, offerings: true }));
              setStatsLoading(prev => ({ ...prev, offerings: false }));
            });

          getAnalyticsSummary(user.uid, 30)
            .then(summary => {
              setStats(prev => ({
                ...prev,
                profileViews: summary.profileViews.total,
                outboundClicks: summary.outboundClicks.total,
              }));
              setStatsLoading(prev => ({ ...prev, analytics: false }));
            })
            .catch(() => {
              setStatsError(prev => ({ ...prev, analytics: true }));
              setStatsLoading(prev => ({ ...prev, analytics: false }));
            });
        } else {
          setStatsLoading(prev => ({ ...prev, offerings: false, analytics: false }));
        }
      } catch (error) {
        console.error('Error loading dashboard data:', error);
        setLoading(false);
      }
    }

    loadDashboardData();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Determine which stats to show based on enabled modules
  const visibleStats: StatCardProps[] = [];

  if (enabledModules.includes('hire')) {
    visibleStats.push(
      { label: 'Active Jobs', value: stats.activeJobs, icon: BriefcaseIcon, href: '/organization/jobs', color: 'blue', loading: statsLoading.jobs, error: statsError.jobs, emptyHint: 'Post your first job' },
      { label: 'New Applications', value: stats.newApplications, icon: DocumentTextIcon, href: '/organization/applications', color: 'blue', loading: statsLoading.applications, error: statsError.applications, emptyHint: 'Post jobs to receive applications' }
    );
  }

  visibleStats.push(
    { label: 'Unread Messages', value: stats.unreadMessages, icon: EnvelopeIcon, href: '/organization/inbox', color: 'teal', loading: statsLoading.messages, error: statsError.messages }
  );

  if (enabledModules.includes('sell')) {
    visibleStats.push(
      { label: 'Profile Views', value: stats.profileViews, icon: EyeIcon, href: '/organization/analytics', color: 'purple', loading: statsLoading.analytics, error: statsError.analytics, emptyHint: 'Complete your profile to get views' },
      { label: 'Link Clicks', value: stats.outboundClicks, icon: CursorArrowRaysIcon, href: '/organization/analytics', color: 'amber', loading: statsLoading.analytics, error: statsError.analytics },
      { label: 'Offerings', value: stats.offerings, icon: ShoppingBagIcon, href: '/organization/sell/offerings', color: 'teal', loading: statsLoading.offerings, error: statsError.offerings }
    );
  }

  // Limit to 4 stats
  const displayStats = visibleStats.slice(0, 4);

  // Build action items with completion status for progress tracking
  const actions: ActionCardProps[] = [];

  // Profile completion actions - show completed items too for progress visibility
  const hasLogo = !!profile?.logoUrl;
  const hasDescription = !!profile?.description;

  actions.push({
    title: 'Add your logo',
    description: hasLogo ? 'Logo uploaded' : 'Help people recognize your organization',
    href: '/organization/onboarding?step=3',
    icon: EyeIcon,
    completed: hasLogo,
  });
  actions.push({
    title: 'Complete your profile',
    description: hasDescription ? 'Profile completed' : 'Tell your story to potential connections',
    href: '/organization/onboarding',
    icon: DocumentTextIcon,
    completed: hasDescription,
  });

  // Module-specific actions with completion tracking and intent-based titles
  if (enabledModules.includes('hire')) {
    const hasJobs = stats.activeJobs > 0;
    actions.push({
      title: 'Hire Talent',
      description: hasJobs ? `${stats.activeJobs} active job${stats.activeJobs > 1 ? 's' : ''}` : 'From $125 — Post jobs to find Indigenous professionals',
      href: '/organization/jobs/new',
      icon: BriefcaseIcon,
      completed: hasJobs,
    });
  }

  if (enabledModules.includes('sell')) {
    const hasOfferings = stats.offerings > 0;
    actions.push({
      title: 'Promote Business',
      description: hasOfferings ? `${stats.offerings} offering${stats.offerings > 1 ? 's' : ''} listed` : 'From $50/mo — List in Shop Indigenous marketplace',
      href: '/organization/sell/offerings',
      icon: ShoppingBagIcon,
      completed: hasOfferings,
    });
  }

  if (enabledModules.includes('host')) {
    actions.push({ title: 'Host Event', description: 'FREE — Create conferences and community gatherings', href: '/organization/conferences/new', icon: CalendarDaysIcon });
  }

  if (enabledModules.includes('funding')) {
    actions.push({ title: 'Share Funding', description: 'FREE — Post funding opportunities for the community', href: '/organization/funding/opportunities', icon: SparklesIcon });
  }

  if (enabledModules.includes('educate')) {
    actions.push({ title: 'Share Scholarships', description: 'FREE — Post scholarships and education programs', href: '/organization/educate/scholarships', icon: AcademicCapIcon });
  }

  // Sort actions: incomplete first, then completed
  actions.sort((a, b) => {
    if (a.completed === b.completed) return 0;
    return a.completed ? 1 : -1;
  });

  // Count completed for progress indicator
  const completedCount = actions.filter(a => a.completed).length;
  const totalActions = actions.length;

  // Modules that can be enabled
  const availableModules: OrganizationModule[] = ['hire', 'sell', 'educate', 'host', 'funding']
    .filter(m => !enabledModules.includes(m as OrganizationModule)) as OrganizationModule[];

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-50">
          Welcome back{profile?.organizationName ? `, ${profile.organizationName}` : ''}
        </h1>
        <p className="text-slate-400 mt-1">
          Here&apos;s what&apos;s happening with your organization
        </p>
      </div>

      {/* Onboarding Checklist for New/Pending Employers */}
      {showOnboarding && (
        <OnboardingChecklist
          profile={profile}
          enabledModules={enabledModules}
          stats={{ activeJobs: stats.activeJobs, offerings: stats.offerings }}
          onDismiss={() => setShowOnboarding(false)}
          showDismiss={profile?.status === 'approved'}
        />
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {displayStats.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </div>

      {/* Your Plan & Directory Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <YourPlanCard profile={profile} enabledModules={enabledModules} />
        <DirectoryStatusCard
          isDirectoryVisible={(profile as OrganizationProfile)?.directoryVisible ?? true}
          directoryVisibleUntil={(profile as OrganizationProfile)?.directoryVisibleUntil}
          isGrandfathered={(profile as OrganizationProfile)?.isGrandfathered}
        />
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Next Best Actions */}
        <div className="bg-card border border-card-border rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-50">Next Steps</h2>
            {totalActions > 0 && (
              <span className="text-sm text-slate-400">
                {completedCount}/{totalActions} completed
              </span>
            )}
          </div>
          {/* Progress bar */}
          {totalActions > 0 && (
            <div className="w-full h-1.5 bg-slate-800 rounded-full mb-4 overflow-hidden">
              <div
                className="h-full bg-accent rounded-full transition-all duration-500"
                style={{ width: `${(completedCount / totalActions) * 100}%` }}
              />
            </div>
          )}
          <div className="space-y-3">
            {actions.slice(0, 5).map((action, index) => (
              <ActionCard key={index} {...action} />
            ))}
            {completedCount === totalActions && totalActions > 0 && (
              <p className="text-accent text-center py-2 font-medium">
                All steps completed! Great work.
              </p>
            )}
          </div>
        </div>

        {/* Add Modules / Quick Access */}
        <div className="bg-card border border-card-border rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-slate-50 mb-4">
            {availableModules.length > 0 ? 'Expand Your Presence' : 'Quick Access'}
          </h2>
          <div className="space-y-3">
            {availableModules.length > 0 ? (
              availableModules.slice(0, 3).map(module => (
                <ModuleCard
                  key={module}
                  module={module}
                  enabled={enabledModules.includes(module)}
                  onEnable={() => {
                    // Navigate to enable flow
                    window.location.href = `/organization/settings?enableModule=${module}`;
                  }}
                />
              ))
            ) : (
              <>
                <Link
                  href="/organization/inbox"
                  className="flex items-center gap-3 p-3 rounded-lg bg-slate-900/50 hover:bg-slate-900 transition-colors"
                >
                  <EnvelopeIcon className="w-5 h-5 text-accent" />
                  <span className="text-slate-200">View Inbox</span>
                </Link>
                <Link
                  href="/organization/analytics"
                  className="flex items-center gap-3 p-3 rounded-lg bg-slate-900/50 hover:bg-slate-900 transition-colors"
                >
                  <EyeIcon className="w-5 h-5 text-accent" />
                  <span className="text-slate-200">View Analytics</span>
                </Link>
                <Link
                  href="/organization/billing"
                  className="flex items-center gap-3 p-3 rounded-lg bg-slate-900/50 hover:bg-slate-900 transition-colors"
                >
                  <SparklesIcon className="w-5 h-5 text-accent" />
                  <span className="text-slate-200">View Pricing</span>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
