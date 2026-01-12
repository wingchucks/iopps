"use client";

import { useState, useEffect, Suspense } from "react";
import { redirect, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { DashboardLayout, type SidebarSection } from "@/components/ui";
import OverviewTab from "./OverviewTab";
import CareersTab from "./CareersTab";
import EducationTab from "./EducationTab";
import EventsTab from "./EventsTab";
import ProfileTab from "./UnifiedProfileTab";
import BillingTab from "./BillingTab";
import VideosTab from "./VideosTab";
import BusinessTab from "./BusinessTab";
import MessagesTab from "./MessagesTab";
import TeamTab from "./TeamTab";
import NotificationsTab from "./NotificationsTab";

type TabType = "overview" | "careers" | "education" | "events" | "messages" | "videos" | "business" | "team" | "notifications" | "billing" | "profile";

function EmployerDashboardContent() {
  const { user, role, loading } = useAuth();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabType>("overview");

  // Map DashboardSection values to TabType (they use different naming conventions)
  const handleSectionNavigate = (section: string) => {
    const sectionToTab: Record<string, TabType> = {
      jobs: "careers",
      applications: "careers",
      training: "careers",
      videos: "videos",
      messages: "messages",
      profile: "profile",
      billing: "billing",
    };
    const targetTab = sectionToTab[section] || (section as TabType);
    setActiveTab(targetTab);
  };

  // Handle URL tab parameter for deep linking
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    // Handle legacy tab redirects
    if (tabParam === "opportunities" || tabParam === "applications") {
      // Redirect old applications tab to careers (applications is now a sub-tab of careers)
      setActiveTab("careers");
    } else if (tabParam === "shop") {
      setActiveTab("business");
    } else if (tabParam && ["overview", "careers", "education", "events", "messages", "videos", "business", "team", "notifications", "billing", "profile"].includes(tabParam)) {
      setActiveTab(tabParam as TabType);
    }
  }, [searchParams]);

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10 sm:py-16">
        <p className="text-slate-400">Loading your dashboard...</p>
      </div>
    );
  }

  const isSuperAdmin = user?.email === "nathan.arias@iopps.ca";

  if (!user || (role !== "employer" && !isSuperAdmin)) {
    redirect("/login");
  }

  // Sidebar sections with grouped navigation
  const sidebarSections: SidebarSection[] = [
    {
      title: "Manage",
      items: [
        { id: "overview", label: "Overview", icon: "📊" },
        { id: "careers", label: "Careers", icon: "💼" },
        { id: "events", label: "Events", icon: "🎪" },
        { id: "education", label: "Education", icon: "🎓" },
        { id: "business", label: "Business", icon: "🏪" },
        { id: "videos", label: "Videos", icon: "🎬" },
      ],
    },
    {
      title: "Communicate",
      items: [
        { id: "messages", label: "Messages", icon: "💬" },
        { id: "team", label: "Team", icon: "👥" },
      ],
    },
    {
      title: "Account",
      items: [
        { id: "notifications", label: "Notifications", icon: "🔔" },
        { id: "billing", label: "Billing", icon: "💳" },
        { id: "profile", label: "Settings", icon: "⚙️" },
      ],
    },
  ];

  // Sidebar header with organization name placeholder
  const sidebarHeader = (
    <div className="flex items-center gap-2 flex-1 min-w-0">
      <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-sm font-bold flex-shrink-0">
        O
      </div>
      <span className="text-sm font-semibold text-slate-200 truncate">
        Organization
      </span>
    </div>
  );

  return (
    <DashboardLayout
      sections={sidebarSections}
      activeItem={activeTab}
      onItemClick={(id) => setActiveTab(id as TabType)}
      header={sidebarHeader}
      title="Organization Dashboard"
      subtitle="Manage careers, events, business listings, and your organization profile"
      storageKey="organization"
      mobilePrimaryCount={4}
    >
      {/* Tab Content - key ensures React properly unmounts/remounts components on tab change */}
      <div className="min-h-[600px]" key={activeTab}>
        {activeTab === "overview" && <OverviewTab onNavigate={handleSectionNavigate} />}
        {activeTab === "careers" && <CareersTab />}
        {activeTab === "education" && <EducationTab />}
        {activeTab === "events" && <EventsTab />}
        {activeTab === "messages" && <MessagesTab />}
        {activeTab === "videos" && <VideosTab />}
        {activeTab === "business" && <BusinessTab onNavigate={handleSectionNavigate} />}
        {activeTab === "team" && <TeamTab />}
        {activeTab === "notifications" && <NotificationsTab />}
        {activeTab === "billing" && <BillingTab />}
        {activeTab === "profile" && <ProfileTab mode="employer" />}
      </div>
    </DashboardLayout>
  );
}

export default function EmployerDashboard() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-7xl px-4 py-10 sm:py-16">
          <p className="text-slate-400">Loading your dashboard...</p>
        </div>
      }
    >
      <EmployerDashboardContent />
    </Suspense>
  );
}
