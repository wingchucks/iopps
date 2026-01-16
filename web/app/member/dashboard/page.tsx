'use client';

import { useState, useEffect, Suspense } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useRouter, useSearchParams } from 'next/navigation';
import MemberDashboardLayout from '@/components/member/dashboard/MemberDashboardLayout';
import MemberSidebar from '@/components/member/dashboard/MemberSidebar';
import { type MemberSection } from '@/components/member/dashboard/MemberMobileNav';

// Tab Components
import OverviewTab from './OverviewTab';
import ApplicationsTab from './ApplicationsTab';
import SavedItemsTab from './SavedItemsTab';
import SavedScholarshipsTab from './SavedScholarshipsTab';
import JobAlertsTab from './JobAlertsTab';
import TrainingTab from './TrainingTab';
import MessagesTab from './MessagesTab';
import ProfileTab from './ProfileTab';

// Data Fetching
import {
  getMemberProfile,
  listMemberApplications,
  getJobPosting
} from '@/lib/firestore';
import type { MemberProfile, JobApplication, JobPosting } from '@/lib/types';
import { useDashboardBadges } from '@/hooks/useDashboardBadges';

// Extended type for OverviewTab
interface ApplicationWithJob extends JobApplication {
  job?: JobPosting | null;
}

function MemberDashboardContent() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  // State
  const [activeSection, setActiveSection] = useState<MemberSection>('overview');
  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [applications, setApplications] = useState<ApplicationWithJob[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Real-time Badges
  const { badges } = useDashboardBadges(user, 'member');

  // Derived stats
  const profileCompletion = profile
    ? [
      profile.displayName,
      profile.tagline,
      profile.location,
      profile.skills?.length,
      profile.experience?.length,
      profile.education?.length
    ].filter(Boolean).length / 6 * 100
    : 0;

  const stats = {
    totalApplications: applications.length,
    recentApplications: applications.filter(a => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return a.createdAt && a.createdAt.toDate() > thirtyDaysAgo;
    }).length,
    profileCompletion: Math.round(profileCompletion)
  };

  // Initialize from URL params if present
  useEffect(() => {
    const tabParam = searchParams.get('tab') as MemberSection | null;
    if (tabParam) {
      setActiveSection(tabParam);
    }
  }, [searchParams]);

  // Load Data
  useEffect(() => {
    async function loadData() {
      if (!user) return;

      try {
        setLoadingData(true);
        // Note: we removed getUnreadMessageCount from here as it's handled by the hook
        const [userProfile, userApps] = await Promise.all([
          getMemberProfile(user.uid),
          listMemberApplications(user.uid)
        ]);

        setProfile(userProfile);

        // Fetch job details for applications
        const appsWithJobs = await Promise.all(
          userApps.map(async (app: JobApplication) => {
            if (!app.jobId) return app;
            try {
              const job = await getJobPosting(app.jobId);
              return { ...app, job };
            } catch (e) {
              return app;
            }
          })
        );

        setApplications(appsWithJobs);

      } catch (err) {
        console.error("Error loading dashboard data:", err);
      } finally {
        setLoadingData(false);
      }
    }

    if (user && !loading) {
      loadData();
    }
  }, [user, loading]);

  // Handle Section Change (Updates URL)
  const handleSectionChange = (section: MemberSection) => {
    setActiveSection(section);

    // Update URL without refresh
    const params = new URLSearchParams(searchParams);
    params.set('tab', section);
    router.push(`/member/dashboard?${params.toString()}`, { scroll: false });

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Show loading while fetching dashboard data (auth is handled by ProtectedRoute)
  if (loadingData && !profile) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
      </div>
    );
  }


  const renderContent = () => {
    switch (activeSection) {
      case 'overview':
        return (
          <OverviewTab
            profile={profile}
            profileCompletion={stats.profileCompletion}
            stats={stats}
            applications={applications} // Passes ApplicationWithJob[]
            onNavigate={(tab) => {
              // Map internal OverviewTab tabs to Sidebar sections if possible
              // Typically OverviewTab might link to 'profile' or 'applications'
              // If tab is 'jobs', maybe map to 'applications' or 'saved-jobs'
              // For now, simple mapping:
              if (tab === 'profile') handleSectionChange('profile');
              else if (tab === 'applications') handleSectionChange('applications');
              else if (tab === 'saved') handleSectionChange('saved-jobs');
            }}
          />
        );

      // Career
      case 'applications':
        return <ApplicationsTab />;
      case 'saved-jobs':
        return <SavedItemsTab />;
      case 'job-alerts':
        return <JobAlertsTab />;

      // Learning
      case 'training':
        return <TrainingTab />;
      case 'saved-scholarships':
        return <SavedScholarshipsTab />;

      // Account
      case 'messages':
        return <MessagesTab />;
      case 'profile':
        return <ProfileTab />;
      case 'settings':
        // Reuse ProfileTab for settings context if applicable, or placeholder
        return <ProfileTab />;

      default:
        // Pass required props even to default
        return (
          <OverviewTab
            profile={profile}
            profileCompletion={stats.profileCompletion}
            stats={stats}
            applications={applications}
            onNavigate={(tab) => {
              if (tab === 'profile') handleSectionChange('profile');
              else if (tab === 'applications') handleSectionChange('applications');
            }}
          />
        );
    }
  };

  return (
    <MemberDashboardLayout
      sidebar={
        <MemberSidebar
          activeSection={activeSection}
          onSectionChange={handleSectionChange}
          badges={badges}
        />
      }
      activeSection={activeSection}
      onSectionChange={handleSectionChange}
      badges={badges}
    >
      {renderContent()}
    </MemberDashboardLayout>
  );
}

export default function MemberDashboard() {
  return (
    <ProtectedRoute>
      <Suspense fallback={
        <div className="flex h-screen items-center justify-center bg-slate-950">
          <p className="text-slate-400">Loading dashboard...</p>
        </div>
      }>
        <MemberDashboardContent />
      </Suspense>
    </ProtectedRoute>
  );
}
