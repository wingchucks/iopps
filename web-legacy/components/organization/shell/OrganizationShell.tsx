'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { EmployerProfile, OrganizationModule, OrganizationProfile } from '@/lib/types';
import NavigationSidebar from './NavigationSidebar';
import MobileNavBar from './MobileNavBar';
import ModuleSwitcher from './ModuleSwitcher';
import KeyboardShortcutsModal from './KeyboardShortcutsModal';
import WelcomeTour from './WelcomeTour';
import MobileAppBanner from './MobileAppBanner';
import { useOrganizationShortcuts } from '@/hooks/useKeyboardShortcuts';
import { Bars3Icon, XMarkIcon, ClockIcon, XCircleIcon, PencilSquareIcon, BoltIcon, BellIcon } from '@heroicons/react/24/outline';

interface OrganizationShellProps {
  children: React.ReactNode;
  profile: EmployerProfile | OrganizationProfile;
  enabledModules: OrganizationModule[];
  currentPath: string;
  userId: string;
  onModulesChange?: (modules: OrganizationModule[]) => void;
}

export default function OrganizationShell({
  children,
  profile,
  enabledModules,
  currentPath,
  userId,
  onModulesChange,
}: OrganizationShellProps) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [badges, setBadges] = useState({
    inbox: 0,
    applications: 0,
    inquiries: 0,
  });

  // Enable keyboard shortcuts
  useOrganizationShortcuts();

  // Determine current module from path
  const getCurrentModule = (): OrganizationModule | null => {
    if (currentPath.includes('/hire')) return 'hire';
    if (currentPath.includes('/sell')) return 'sell';
    if (currentPath.includes('/educate')) return 'educate';
    if (currentPath.includes('/host')) return 'host';
    if (currentPath.includes('/funding')) return 'funding';
    return null;
  };

  const currentModule = getCurrentModule();

  const handleModuleSelect = (module: OrganizationModule) => {
    // Navigate to the module's main page
    const moduleRoutes: Record<OrganizationModule, string> = {
      hire: '/organization/hire/jobs',
      sell: '/organization/sell/profile',
      educate: '/organization/educate/profile',
      host: '/organization/host/conferences',
      funding: '/organization/funding/opportunities',
    };
    router.push(moduleRoutes[module]);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Background Effects */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
      </div>

      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-xl border-b border-[var(--card-border)]">
        <div className="flex items-center justify-between px-4 h-16">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg text-[var(--text-muted)] hover:text-foreground hover:bg-surface"
          >
            <Bars3Icon className="w-6 h-6" />
          </button>

          <Link href="/organization" className="flex items-center gap-2">
            {profile.logoUrl ? (
              <Image
                src={profile.logoUrl}
                alt={profile.organizationName}
                width={32}
                height={32}
                className="w-8 h-8 rounded-lg object-cover"
              />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-teal-700 flex items-center justify-center text-slate-950 font-bold">
                {profile.organizationName?.charAt(0) || 'O'}
              </div>
            )}
            <span className="font-semibold text-foreground truncate max-w-[150px]">
              {profile.organizationName}
            </span>
          </Link>

          <ModuleSwitcher
            enabledModules={enabledModules}
            currentModule={currentModule}
            onModuleSelect={handleModuleSelect}
            compact
          />
        </div>
      </header>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-background/80 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        >
          <div
            className="absolute left-0 top-0 bottom-0 w-80 bg-background border-r border-[var(--card-border)] p-4 overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-semibold text-foreground">Menu</h2>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-2 rounded-lg text-[var(--text-muted)] hover:text-foreground hover:bg-surface"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <NavigationSidebar
              profile={profile}
              enabledModules={enabledModules}
              currentPath={currentPath}
              badges={badges}
              onNavigate={() => setSidebarOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Desktop Layout */}
      <div className="relative z-10 flex">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:block fixed left-0 top-0 bottom-0 w-72 bg-background/50 backdrop-blur-xl border-r border-[var(--card-border)] p-4 overflow-y-auto">
          <NavigationSidebar
            profile={profile}
            enabledModules={enabledModules}
            currentPath={currentPath}
            badges={badges}
          />
        </aside>

        {/* Main Content */}
        <main className="flex-1 lg:ml-72 min-h-screen">
          {/* Desktop Header */}
          <header className="hidden lg:flex sticky top-0 z-40 h-16 items-center justify-between px-6 bg-background/90 backdrop-blur-xl border-b border-[var(--card-border)]">
            <div className="flex items-center gap-4">
              <ModuleSwitcher
                enabledModules={enabledModules}
                currentModule={currentModule}
                onModuleSelect={handleModuleSelect}
              />
            </div>

            <div className="flex items-center gap-3">
              {/* Notification Bell */}
              <Link
                href="/organization/inbox"
                className="relative p-2 rounded-lg text-[var(--text-muted)] hover:text-foreground hover:bg-surface transition-colors"
                title="Inbox"
              >
                <BellIcon className="w-5 h-5" />
                {badges.inbox > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center px-1 text-[10px] font-bold rounded-full bg-accent text-slate-950">
                    {badges.inbox > 99 ? '99+' : badges.inbox}
                  </span>
                )}
              </Link>
              
              {/* Keyboard Shortcuts Hint */}
              <button
                onClick={() => window.dispatchEvent(new CustomEvent('show-shortcuts-modal'))}
                className="hidden xl:flex items-center gap-1 px-2 py-1 rounded-lg text-foreground0 hover:text-[var(--text-secondary)] hover:bg-surface transition-colors text-xs"
                title="Keyboard Shortcuts"
              >
                <kbd className="px-1.5 py-0.5 rounded bg-surface text-[var(--text-muted)] font-mono">?</kbd>
              </button>
              
              <Link
                href={`/organizations/${(profile as OrganizationProfile).slug || profile.id}`}
                target="_blank"
                className="text-sm text-[var(--text-muted)] hover:text-foreground transition-colors"
              >
                View Public Profile
              </Link>
            </div>
          </header>

          {/* Page Content */}
          <div className="p-4 lg:p-6 pt-20 lg:pt-6 pb-24 lg:pb-6">
            {/* Incomplete Profile Banner */}
            {profile.status === 'incomplete' && (
              <div className="mb-6 rounded-xl border border-[var(--card-border)]/50 bg-surface p-4 lg:p-6">
                <div className="flex items-start gap-3">
                  <PencilSquareIcon className="h-6 w-6 lg:h-8 lg:w-8 text-[var(--text-muted)] flex-shrink-0" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground">Complete Your Profile</h3>
                    <p className="text-sm text-[var(--text-muted)] mt-1">
                      Finish setting up your organization profile to submit for approval and become visible in the directory.
                    </p>
                    <Link
                      href="/organization/onboarding"
                      className="inline-flex items-center gap-1.5 mt-3 text-sm font-medium text-accent hover:text-teal-300 transition-colors"
                    >
                      Complete Profile Setup
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* Pending Approval Banner */}
            {profile.status === 'pending' && (
              <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 lg:p-6">
                <div className="flex items-start gap-3">
                  <ClockIcon className="h-6 w-6 lg:h-8 lg:w-8 text-amber-400 flex-shrink-0" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-amber-200">Account Pending Approval</h3>
                    <p className="text-sm text-amber-300/80 mt-1">
                      Your organization is being reviewed. You can post jobs now, but they won&apos;t be visible until approved.
                    </p>
                    <p className="text-sm text-emerald-300 mt-2">
                      <BoltIcon className="h-4 w-4 inline mr-1" />
                      <span className="font-medium">Skip the wait:</span> Purchase any ad to get instant approval!
                    </p>
                    <div className="flex flex-wrap gap-3 mt-3">
                      <Link
                        href="/organization/subscribe"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-white text-sm font-semibold hover:bg-emerald-400 transition-colors"
                      >
                        Get Instant Approval
                      </Link>
                      <Link
                        href="/organization/jobs/new"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-700 text-white text-sm font-semibold hover:bg-slate-600 transition-colors"
                      >
                        Post a Job
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Rejected Banner */}
            {profile.status === 'rejected' && (
              <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/5 p-4 lg:p-6">
                <div className="flex items-start gap-3">
                  <XCircleIcon className="h-6 w-6 lg:h-8 lg:w-8 text-red-400 flex-shrink-0" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-red-200">Application Not Approved</h3>
                    <p className="text-sm text-red-300/80 mt-1">
                      {profile.rejectionReason || 'Your application was not approved. Please review and update your profile, then resubmit for approval.'}
                    </p>
                    <Link
                      href="/organization/onboarding"
                      className="inline-flex items-center gap-1.5 mt-3 text-sm font-medium text-red-300 hover:text-red-200 transition-colors"
                    >
                      Edit &amp; Resubmit
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </div>
                </div>
              </div>
            )}
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileNavBar
        currentPath={currentPath}
        badges={badges}
        enabledModules={enabledModules}
      />

      {/* Keyboard Shortcuts Modal */}
      <KeyboardShortcutsModal />

      {/* Welcome Tour for First-Time Users */}
      <WelcomeTour userId={userId} />

      {/* Mobile App Banner */}
      <MobileAppBanner userId={userId} />
    </div>
  );
}
