"use client";

import { useState, useEffect, Suspense } from "react";
import { redirect, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
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

  const tabs = [
    { id: "overview" as TabType, label: "Overview", icon: "📊" },
    { id: "careers" as TabType, label: "Careers", icon: "💼" },
    { id: "education" as TabType, label: "Education", icon: "🎓" },
    { id: "events" as TabType, label: "Events", icon: "🎪" },
    { id: "messages" as TabType, label: "Messages", icon: "💬" },
    { id: "videos" as TabType, label: "Videos", icon: "🎬" },
    { id: "business" as TabType, label: "Business", icon: "🏪" },
    { id: "team" as TabType, label: "Team", icon: "👥" },
    { id: "notifications" as TabType, label: "Notifications", icon: "🔔" },
    { id: "billing" as TabType, label: "Billing", icon: "💳" },
    { id: "profile" as TabType, label: "Settings", icon: "⚙️" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white sm:text-4xl">
            Organization Dashboard
          </h1>
          <p className="mt-2 text-slate-400">
            Manage careers, events, business listings, and your organization profile
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="mb-8 flex gap-2 overflow-x-auto border-b border-slate-800 pb-px">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`whitespace-nowrap rounded-t-lg px-4 py-3 text-sm font-medium transition-all ${activeTab === tab.id
                ? "border-b-2 border-emerald-500 bg-emerald-500/10 text-emerald-400"
                : "border-b-2 border-transparent text-slate-400 hover:border-slate-700 hover:text-slate-300"
                }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

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
      </div>
    </div>
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
