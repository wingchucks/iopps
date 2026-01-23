'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { EmployerProfile, OrganizationModule, OrganizationProfile } from '@/lib/types';
import NavigationSidebar from './NavigationSidebar';
import MobileNavBar from './MobileNavBar';
import ModuleSwitcher from './ModuleSwitcher';
import { Bars3Icon, XMarkIcon, ClockIcon } from '@heroicons/react/24/outline';

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
    <div className="min-h-screen bg-slate-950">
      {/* Background Effects */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
      </div>

      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-slate-950/90 backdrop-blur-xl border-b border-slate-800">
        <div className="flex items-center justify-between px-4 h-16">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800"
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
            <span className="font-semibold text-slate-50 truncate max-w-[150px]">
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
          className="lg:hidden fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        >
          <div
            className="absolute left-0 top-0 bottom-0 w-80 bg-slate-950 border-r border-slate-800 p-4 overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-semibold text-slate-50">Menu</h2>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800"
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
        <aside className="hidden lg:block fixed left-0 top-0 bottom-0 w-72 bg-slate-950/50 backdrop-blur-xl border-r border-slate-800 p-4 overflow-y-auto">
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
          <header className="hidden lg:flex sticky top-0 z-40 h-16 items-center justify-between px-6 bg-slate-950/90 backdrop-blur-xl border-b border-slate-800">
            <div className="flex items-center gap-4">
              <ModuleSwitcher
                enabledModules={enabledModules}
                currentModule={currentModule}
                onModuleSelect={handleModuleSelect}
              />
            </div>

            <div className="flex items-center gap-3">
              <Link
                href={`/organizations/${(profile as OrganizationProfile).slug || profile.id}`}
                target="_blank"
                className="text-sm text-slate-400 hover:text-slate-200 transition-colors"
              >
                View Public Profile
              </Link>
            </div>
          </header>

          {/* Page Content */}
          <div className="p-4 lg:p-6 pt-20 lg:pt-6 pb-24 lg:pb-6">
            {/* Pending Approval Banner */}
            {profile.status === 'pending' && (
              <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 lg:p-6">
                <div className="flex items-start gap-3">
                  <ClockIcon className="h-6 w-6 lg:h-8 lg:w-8 text-amber-400 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-amber-200">Pending Approval</h3>
                    <p className="text-sm text-amber-300/80 mt-1">
                      Your organization is being reviewed. You can explore the dashboard and create jobs,
                      but they won&apos;t be visible to job seekers until your account is approved.
                    </p>
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
    </div>
  );
}
