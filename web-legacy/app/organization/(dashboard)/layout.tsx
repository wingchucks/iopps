'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { getEmployerProfile, getEnabledModules, initializeModules } from '@/lib/firestore';
import type { EmployerProfile, OrganizationModule } from '@/lib/types';
import OrganizationShell from '@/components/organization/shell/OrganizationShell';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<EmployerProfile | null>(null);
  const [enabledModules, setEnabledModules] = useState<OrganizationModule[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const redirectedRef = useRef(false);

  useEffect(() => {
    if (!auth) {
      router.push('/login?redirect=/organization');
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push('/login?redirect=/organization');
        return;
      }

      setUserId(user.uid);

      try {
        // Fetch employer profile from employers collection
        const employerProfile = await getEmployerProfile(user.uid);

        if (!employerProfile) {
          // No employer profile — show recovery UI (don't redirect to avoid loops)
          setLoadError('No organization profile found. Complete your setup to get started.');
          return;
        }

        // Check if profile is incomplete (missing required fields for approval)
        const isProfileIncomplete = !employerProfile.organizationName ||
          !employerProfile.description;

        // If incomplete AND not already approved, redirect to onboarding (once only)
        if (isProfileIncomplete && employerProfile.status !== 'approved') {
          if (!pathname.includes('/settings') && !redirectedRef.current) {
            redirectedRef.current = true;
            router.push('/onboarding/organization');
            return;
          }
        }

        setProfile(employerProfile);

        // Get or initialize enabled modules
        let modules = await getEnabledModules(user.uid);

        if (modules.length === 0) {
          modules = await initializeModules(user.uid);
        }

        setEnabledModules(modules);
      } catch (error) {
        console.error('Error loading dashboard:', error);
        setLoadError('Failed to load your organization profile.');
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- router is stable, pathname read inside callback only
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-[var(--text-muted)] text-sm">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Recovery UI — never show a blank screen
  if (!profile || !userId || loadError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="w-full max-w-sm rounded-2xl border border-[var(--card-border)] bg-surface p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10">
            <svg className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-foreground">
            Couldn&apos;t load your dashboard
          </h2>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            {loadError || 'We had trouble loading your organization profile. This is usually temporary.'}
          </p>
          <div className="mt-6 flex flex-col gap-3">
            <button
              onClick={() => window.location.reload()}
              className="w-full rounded-full bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover transition-colors"
            >
              Retry
            </button>
            <button
              onClick={() => router.push('/onboarding/organization')}
              className="w-full rounded-full border border-[var(--border)] bg-[var(--card-bg)] px-4 py-2.5 text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--border-lt)] transition-colors"
            >
              Complete org setup
            </button>
          </div>
          <p className="mt-4 text-xs text-[var(--text-muted)]">
            If this keeps happening,{' '}
            <a href="mailto:support@iopps.ca" className="text-accent hover:underline">
              contact support
            </a>
          </p>
        </div>
      </div>
    );
  }

  return (
    <OrganizationShell
      profile={profile}
      enabledModules={enabledModules}
      currentPath={pathname}
      userId={userId}
      onModulesChange={setEnabledModules}
    >
      {children}
    </OrganizationShell>
  );
}
