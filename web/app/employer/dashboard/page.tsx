"use client";

import { useState } from "react";
import { redirect } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import OverviewTab from "./OverviewTab";
import OpportunitiesTab from "./OpportunitiesTab";
import ApplicationsTab from "./ApplicationsTab";
import ProfileTab from "./ProfileTab";

type TabType = "overview" | "opportunities" | "applications" | "profile";

export default function EmployerDashboard() {
  const { user, role, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>("overview");

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10 sm:py-16">
        <p className="text-slate-400">Loading your dashboard...</p>
      </div>
    );
  }

  if (!user || role !== "employer") {
    redirect("/login");
  }

  const tabs = [
    { id: "overview" as TabType, label: "Overview", icon: "📊" },
    { id: "opportunities" as TabType, label: "Opportunities", icon: "💼" },
    { id: "applications" as TabType, label: "Applications", icon: "📝" },
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
              className={`whitespace-nowrap rounded-t-lg px-4 py-3 text-sm font-medium transition-all ${
                activeTab === tab.id
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
          {activeTab === "profile" && <ProfileTab />}
        </div>
      </div>
    </div>
  );
}
