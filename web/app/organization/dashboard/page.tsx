"use client";

import { useState, useEffect, Suspense } from "react";
import { redirect, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import OverviewTab from "./OverviewTab";
import OpportunitiesTab from "./OpportunitiesTab";
import ApplicationsTab from "./ApplicationsTab";
import ProfileTab from "./ProfileTab";
import BillingTab from "./BillingTab";
import VideosTab from "./VideosTab";
import ShopTab from "./ShopTab";
import MessagesTab from "./MessagesTab";

type TabType = "overview" | "opportunities" | "applications" | "messages" | "videos" | "shop" | "billing" | "profile";

function EmployerDashboardContent() {
  const { user, role, loading } = useAuth();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabType>("overview");

  // Handle URL tab parameter for deep linking
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    // Redirect legacy "events" tab to "opportunities" (pow wows are now in opportunities)
    if (tabParam === "events") {
      setActiveTab("opportunities");
    } else if (tabParam && ["overview", "opportunities", "applications", "messages", "videos", "shop", "billing", "profile"].includes(tabParam)) {
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
    { id: "opportunities" as TabType, label: "Opportunities", icon: "💼" },
    { id: "applications" as TabType, label: "Applications", icon: "📝" },
    { id: "messages" as TabType, label: "Messages", icon: "💬" },
    { id: "videos" as TabType, label: "Videos", icon: "🎬" },
    { id: "shop" as TabType, label: "Shop", icon: "🏪" },
    { id: "billing" as TabType, label: "Billing & Payments", icon: "💳" },
    { id: "profile" as TabType, label: "Profile & Settings", icon: "⚙️" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white sm:text-4xl">
            Employer Dashboard
          </h1>
          <p className="mt-2 text-slate-400">
            Manage your opportunities, track applications, and update your organization profile
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

        {/* Tab Content */}
        <div className="min-h-[600px]">
          {activeTab === "overview" && <OverviewTab />}
          {activeTab === "opportunities" && <OpportunitiesTab />}
          {activeTab === "applications" && <ApplicationsTab />}
          {activeTab === "messages" && <MessagesTab />}
          {activeTab === "videos" && <VideosTab />}
          {activeTab === "shop" && <ShopTab />}
          {activeTab === "billing" && <BillingTab />}
          {activeTab === "profile" && <ProfileTab />}
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
