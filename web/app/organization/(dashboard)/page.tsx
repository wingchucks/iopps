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
import type { EmployerProfile, OrganizationModule } from '@/lib/types';
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
} from '@heroicons/react/24/outline';
import Link from 'next/link';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ElementType;
  href?: string;
  trend?: { value: number; isPositive: boolean };
  color?: 'blue' | 'teal' | 'amber' | 'purple' | 'pink';
}

function StatCard({ label, value, icon: Icon, href, color = 'teal' }: StatCardProps) {
  const colorClasses = {
    blue: 'from-blue-500/20 to-blue-600/5 border-blue-500/20 text-blue-400',
    teal: 'from-accent/20 to-teal-600/5 border-accent/20 text-accent',
    amber: 'from-amber-500/20 to-amber-600/5 border-amber-500/20 text-amber-400',
    purple: 'from-purple-500/20 to-purple-600/5 border-purple-500/20 text-purple-400',
    pink: 'from-pink-500/20 to-pink-600/5 border-pink-500/20 text-pink-400',
  };

  const content = (
    <div className={`bg-gradient-to-br ${colorClasses[color]} border rounded-2xl p-5 backdrop-blur-sm transition-all hover:scale-[1.02]`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-slate-400 text-sm mb-1">{label}</p>
          <p className="text-3xl font-bold text-slate-50">{value}</p>
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
  const moduleInfo: Record<OrganizationModule, { name: string; description: string; icon: React.ElementType; color: string }> = {
    hire: { name: 'Hire', description: 'Post jobs and manage applications', icon: BriefcaseIcon, color: 'blue' },
    sell: { name: 'Sell', description: 'Showcase your Indigenous business', icon: ShoppingBagIcon, color: 'teal' },
    educate: { name: 'Educate', description: 'Manage programs and scholarships', icon: AcademicCapIcon, color: 'purple' },
    host: { name: 'Host', description: 'Create conferences and events', icon: CalendarDaysIcon, color: 'amber' },
    funding: { name: 'Funding Opportunities', description: 'Share funding for Indigenous businesses', icon: SparklesIcon, color: 'pink' },
  };

  const info = moduleInfo[module];

  if (enabled) return null;

  return (
    <button
      onClick={onEnable}
      className="flex items-center gap-4 p-4 rounded-xl border border-dashed border-slate-700 bg-slate-900/30 hover:border-slate-600 hover:bg-slate-900/50 transition-all text-left w-full"
    >
      <div className="p-2 rounded-lg bg-slate-800">
        <info.icon className="w-5 h-5 text-slate-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-slate-300">{info.name}</p>
        <p className="text-sm text-slate-500">{info.description}</p>
      </div>
      <PlusIcon className="w-5 h-5 text-slate-500" />
    </button>
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
  const [loading, setLoading] = useState(true);

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

        // Load stats based on enabled modules
        const statsPromises: Promise<void>[] = [];
        const newStats = { ...stats };

        if (modules.includes('hire')) {
          statsPromises.push(
            listEmployerJobs(user.uid).then(jobs => {
              newStats.activeJobs = jobs.filter(j => j.active).length;
            }),
            listEmployerApplications(user.uid).then(apps => {
              newStats.newApplications = apps.filter(a => a.status === 'submitted').length;
            })
          );
        }

        statsPromises.push(
          getUnifiedUnreadCount(user.uid).then(count => {
            newStats.unreadMessages = count;
          })
        );

        if (modules.includes('sell')) {
          statsPromises.push(
            getOfferingCounts(user.uid).then(counts => {
              newStats.offerings = counts.total;
            }),
            getAnalyticsSummary(user.uid, 30).then(summary => {
              newStats.profileViews = summary.profileViews.total;
              newStats.outboundClicks = summary.outboundClicks.total;
            })
          );
        }

        await Promise.all(statsPromises);
        setStats(newStats);
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
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
      { label: 'Active Jobs', value: stats.activeJobs, icon: BriefcaseIcon, href: '/organization/jobs', color: 'blue' },
      { label: 'New Applications', value: stats.newApplications, icon: DocumentTextIcon, href: '/organization/applications', color: 'blue' }
    );
  }

  visibleStats.push(
    { label: 'Unread Messages', value: stats.unreadMessages, icon: EnvelopeIcon, href: '/organization/inbox', color: 'teal' }
  );

  if (enabledModules.includes('sell')) {
    visibleStats.push(
      { label: 'Profile Views', value: stats.profileViews, icon: EyeIcon, href: '/organization/analytics', color: 'purple' },
      { label: 'Link Clicks', value: stats.outboundClicks, icon: CursorArrowRaysIcon, href: '/organization/analytics', color: 'amber' },
      { label: 'Offerings', value: stats.offerings, icon: ShoppingBagIcon, href: '/organization/sell/offerings', color: 'teal' }
    );
  }

  // Limit to 4 stats
  const displayStats = visibleStats.slice(0, 4);

  // Build action items based on profile completion and modules
  const actions: ActionCardProps[] = [];

  // Profile completion actions
  if (!profile?.logoUrl) {
    actions.push({ title: 'Add your logo', description: 'Help people recognize your organization', href: '/organization/profile', icon: EyeIcon });
  }
  if (!profile?.description) {
    actions.push({ title: 'Complete your profile', description: 'Tell your story to potential connections', href: '/organization/profile', icon: DocumentTextIcon });
  }

  // Module-specific actions
  if (enabledModules.includes('hire') && stats.activeJobs === 0) {
    actions.push({ title: 'Post your first job', description: 'Start attracting Indigenous talent', href: '/organization/jobs/new', icon: BriefcaseIcon });
  }

  if (enabledModules.includes('sell') && stats.offerings === 0) {
    actions.push({ title: 'Add your first offering', description: 'Showcase your products or services', href: '/organization/sell/offerings', icon: ShoppingBagIcon });
  }

  if (enabledModules.includes('host')) {
    actions.push({ title: 'Create an event', description: 'Host conferences or gatherings', href: '/organization/conferences/new', icon: CalendarDaysIcon });
  }

  if (enabledModules.includes('funding')) {
    actions.push({ title: 'Share a funding opportunity', description: 'Help Indigenous businesses grow', href: '/organization/funding/opportunities', icon: SparklesIcon });
  }

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

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {displayStats.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Next Best Actions */}
        <div className="bg-card border border-card-border rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-slate-50 mb-4">Next Steps</h2>
          <div className="space-y-3">
            {actions.slice(0, 5).map((action, index) => (
              <ActionCard key={index} {...action} />
            ))}
            {actions.length === 0 && (
              <p className="text-slate-500 text-center py-4">
                You&apos;re all caught up! Great work.
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
                  <span className="text-slate-200">Manage Plans</span>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
