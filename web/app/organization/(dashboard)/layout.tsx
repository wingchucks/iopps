'use client';

import { useEffect, useState } from 'react';
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

  useEffect(() => {
    if (!auth) {
      router.push('/login?redirect=/organization/dashboard');
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push('/login?redirect=/organization/dashboard');
        return;
      }

      setUserId(user.uid);

      try {
        // Fetch employer profile
        const employerProfile = await getEmployerProfile(user.uid);

        if (!employerProfile) {
          // Redirect to setup if no profile exists
          router.push('/organization/setup');
          return;
        }

        setProfile(employerProfile);

        // Get or initialize enabled modules
        let modules = await getEnabledModules(user.uid);

        // If no modules set, auto-detect from existing data
        if (modules.length === 0) {
          modules = await initializeModules(user.uid);
        }

        setEnabledModules(modules);
      } catch (error) {
        console.error('Error loading dashboard:', error);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 text-sm">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!profile || !userId) {
    return null;
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
