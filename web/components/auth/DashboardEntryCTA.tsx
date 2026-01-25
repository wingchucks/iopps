'use client';

import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';

interface DashboardEntryCTAProps {
  /** Style variant for the card */
  variant?: 'card' | 'link' | 'button';
  /** Additional CSS classes */
  className?: string;
  /** Whether to show loading state while auth is loading */
  showLoading?: boolean;
}

/**
 * DashboardEntryCTA - Single source of truth for dashboard CTA on public pages
 *
 * IMPORTANT: This component ensures proper role-based dashboard routing:
 * - Community members → "My Dashboard" → /member/dashboard
 * - Employers/Organizations → "Organization Dashboard" → /organization/dashboard
 * - Admins/Moderators → No CTA (they use admin panel)
 * - Unknown/Loading → No CTA (prevents role leakage)
 *
 * DO NOT render "My Dashboard" for employer/organization roles anywhere.
 * If you need a dashboard CTA on a public page, USE THIS COMPONENT.
 */
export function DashboardEntryCTA({
  variant = 'card',
  className = '',
  showLoading = false
}: DashboardEntryCTAProps) {
  const { user, role, loading } = useAuth();

  // Don't show anything while loading (prevents flash of wrong content)
  if (loading) {
    if (showLoading) {
      return (
        <div className={`animate-pulse rounded-2xl bg-slate-800/50 ${variant === 'card' ? 'h-48' : 'h-10'} ${className}`} />
      );
    }
    return null;
  }

  // Not logged in - no dashboard CTA
  if (!user) {
    return null;
  }

  // Determine dashboard based on role
  // Community members (role is null, "community", or any role that's not employer/admin/moderator)
  const isCommunityMember = role !== 'employer' && role !== 'admin' && role !== 'moderator';
  const isAdminOrModerator = role === 'admin' || role === 'moderator';

  // Admins/moderators don't need a dashboard CTA on public pages
  if (isAdminOrModerator) {
    return null;
  }

  // Determine the link and label based on role
  const dashboardHref = isCommunityMember ? '/member/dashboard' : '/organization/dashboard';
  const dashboardLabel = isCommunityMember ? 'My Dashboard' : 'Organization Dashboard';
  const dashboardDescription = isCommunityMember
    ? 'Track applications, continue learning, and manage your certificates.'
    : 'Manage your job postings, view applications, and grow your presence.';

  // Card variant (for grid layouts like /careers)
  if (variant === 'card') {
    return (
      <Link
        href={dashboardHref}
        className={`group rounded-2xl border border-slate-800/80 bg-slate-900/50 p-8 text-left transition-all duration-300 hover:border-[#14B8A6]/50 hover:-translate-y-1 hover:shadow-lg hover:shadow-[#14B8A6]/10 ${className}`}
      >
        <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-[#14B8A6]/20 to-cyan-500/20">
          <span className="text-2xl">📊</span>
        </div>
        <h2 className="text-xl font-bold text-white mb-2">{dashboardLabel}</h2>
        <p className="text-sm text-slate-400 leading-relaxed mb-4">
          {dashboardDescription}
        </p>
        <span className="text-sm font-semibold text-[#14B8A6] opacity-0 group-hover:opacity-100 transition-opacity">
          View Dashboard →
        </span>
      </Link>
    );
  }

  // Link variant (for inline text)
  if (variant === 'link') {
    return (
      <Link
        href={dashboardHref}
        className={`text-[#14B8A6] hover:text-[#16cdb8] font-medium transition-colors ${className}`}
      >
        {dashboardLabel} →
      </Link>
    );
  }

  // Button variant
  return (
    <Link
      href={dashboardHref}
      className={`inline-flex items-center justify-center rounded-full bg-[#14B8A6] px-6 py-3 text-sm font-bold text-slate-900 shadow-lg transition-all hover:-translate-y-0.5 hover:bg-[#16cdb8] hover:shadow-xl ${className}`}
    >
      {dashboardLabel}
    </Link>
  );
}

/**
 * Helper hook to check if user should see community dashboard CTA
 * Use this for custom implementations where the component doesn't fit
 */
export function useDashboardRoute() {
  const { user, role, loading } = useAuth();

  const isCommunityMember = role !== 'employer' && role !== 'admin' && role !== 'moderator';
  const isEmployer = role === 'employer';
  const isAdminOrModerator = role === 'admin' || role === 'moderator';

  return {
    loading,
    isAuthenticated: !!user,
    isCommunityMember: !!user && isCommunityMember,
    isEmployer: !!user && isEmployer,
    isAdminOrModerator: !!user && isAdminOrModerator,
    dashboardHref: !user ? null : isCommunityMember ? '/member/dashboard' : isEmployer ? '/organization/dashboard' : '/admin',
    dashboardLabel: !user ? null : isCommunityMember ? 'My Dashboard' : isEmployer ? 'Organization Dashboard' : 'Admin Dashboard',
  };
}

export default DashboardEntryCTA;
