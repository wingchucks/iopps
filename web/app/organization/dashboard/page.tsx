'use client';

import { useState, useEffect, Suspense } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { useRouter, useSearchParams, redirect } from 'next/navigation';
import DashboardLayout from '@/components/organization/dashboard/DashboardLayout';
import DashboardSidebar, {
  type DashboardMode,
  type DashboardSection
} from '@/components/organization/dashboard/DashboardSidebar';

// Tab Components
import OverviewTab from './OverviewTab';
import CareersTab from './CareersTab';
import EducationTab from './EducationTab';
// ApplicationsTab removed - integrated into CareersTab/EducationTab
import MessagesTab from './MessagesTab';
import VideosTab from './VideosTab';
import BusinessTab from './BusinessTab';
import BillingTab from './BillingTab';
import ProfileTab from './UnifiedProfileTab';
import VendorOverviewTab from './VendorOverviewTab';

// Data Fetching
import { getEmployerProfile, getUnreadMessageCount } from '@/lib/firestore';
import type { EmployerProfile } from '@/lib/types';

// Hooks
import { useDashboardBadges } from '@/hooks/useDashboardBadges';

function OrganizationDashboardContent() {
  const { user, role, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  // State
  const [profile, setProfile] = useState<EmployerProfile | null>(null);
  const [mode, setMode] = useState<DashboardMode>('employer');
  const [activeSection, setActiveSection] = useState<DashboardSection>('overview');

  // Real-time Badges
  const { badges } = useDashboardBadges(user, 'employer');

  // Initialize from URL params depending on searchParams changes
  useEffect(() => {
    const tabParam = searchParams.get('tab') as DashboardSection | null;
    const modeParam = searchParams.get('mode') as DashboardMode | null;

    if (tabParam) {
      setActiveSection(tabParam);
    }
    if (modeParam && (modeParam === 'employer' || modeParam === 'vendor')) {
      setMode(modeParam);
    }
  }, [searchParams]);

  // Load Profile Data
  useEffect(() => {
    async function loadProfile() {
      if (!user) return;
      try {
        const profileData = await getEmployerProfile(user.uid);
        setProfile(profileData);
      } catch (err) {
        console.error("Error loading profile:", err);
      }
    }
    if (user && !loading) {
      loadProfile();
    }
  }, [user, loading]);

  // Handlers
  const handleModeChange = (newMode: DashboardMode) => {
    setMode(newMode);
    setActiveSection('overview');

    const params = new URLSearchParams(searchParams);
    params.set('mode', newMode);
    params.set('tab', 'overview');
    router.push(`/organization/dashboard?${params.toString()}`);
  };

  const handleSectionChange = (section: DashboardSection) => {
    setActiveSection(section);

    const params = new URLSearchParams(searchParams);
    params.set('tab', section);
    params.set('mode', mode);
    router.push(`/organization/dashboard?${params.toString()}`);
  };

  const renderContent = () => {
    switch (activeSection) {
      // --- Employer Mode ---
      case 'overview':
        return mode === 'employer' ? <OverviewTab /> : <VendorOverviewTab />;

      // Talent & Hiring
      case 'jobs':
        return <CareersTab key="jobs" initialView="jobs" />;
      case 'applications':
        return <CareersTab key="apps" initialView="applications" />;
      case 'videos':
        return <VideosTab />;

      // Education Provider
      case 'school':
        return <EducationTab initialView="school" />;
      case 'programs':
        return <EducationTab initialView="programs" />;
      case 'scholarships':
        return <EducationTab initialView="scholarships" />;
      case 'events':
        return <EducationTab initialView="events" />;
      case 'student-inquiries':
        return <EducationTab initialView="inquiries" />;

      // --- Vendor Mode ---
      // Marketplace
      case 'products':
        return <BusinessTab initialView="shop" />;
      case 'services':
        return <BusinessTab initialView="services" />;
      case 'shop-inquiries':
        return <BusinessTab initialView="shop" />;

      // Growth
      case 'funding':
        return <BusinessTab initialView="funding" />;

      // --- Shared ---
      case 'messages':
        return <MessagesTab />;
      case 'billing':
        return <BillingTab />;
      case 'profile':
        return <ProfileTab mode={mode} />;

      default:
        return mode === 'employer' ? <OverviewTab /> : <VendorOverviewTab />;
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#020617]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  // Role Protection
  const isSuperAdmin = user?.email === "nathan.arias@iopps.ca";
  if (!user || (role !== "employer" && !isSuperAdmin)) {
    if (!user) return null; // AuthProvider usually handles this
    redirect("/login");
  }

  return (
    <DashboardLayout
      sidebar={
        <DashboardSidebar
          profile={profile}
          mode={mode}
          activeSection={activeSection}
          onModeChange={handleModeChange}
          onSectionChange={handleSectionChange}
          badges={badges}
        />
      }
      mode={mode}
      activeSection={activeSection}
      onModeChange={handleModeChange}
      onSectionChange={handleSectionChange}
      badges={badges}
    >
      {renderContent()}
    </DashboardLayout>
  );
}

export default function OrganizationDashboard() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-slate-950">
        <p className="text-slate-400">Loading dashboard...</p>
      </div>
    }>
      <OrganizationDashboardContent />
    </Suspense>
  );
}
