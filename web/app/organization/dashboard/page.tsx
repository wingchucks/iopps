"use client";

import { useState, useEffect, Suspense, useCallback } from "react";
import { redirect, useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { getEmployerProfile, getUnreadMessageCount, listEmployerApplications } from "@/lib/firestore";
import { getVendorByUserId } from "@/lib/firebase/shop";
import type { EmployerProfile, JobApplication } from "@/lib/types";
import type { Vendor } from "@/lib/types";

// New dashboard components
import {
  DashboardLayout,
  DashboardSidebar,
  type DashboardMode,
  type DashboardSection,
} from "@/components/organization/dashboard";

// Existing tab components
import OverviewTab from "./OverviewTab";
import OpportunitiesTab from "./OpportunitiesTab";
import ApplicationsTab from "./ApplicationsTab";
import BillingTab from "./BillingTab";
import VideosTab from "./VideosTab";
import ShopTab from "./ShopTab";
import MessagesTab from "./MessagesTab";
import TrainingTab from "./TrainingTab";

// Unified profile tab (combines employer and vendor profiles)
import UnifiedProfileTab from "./UnifiedProfileTab";

// Vendor-specific tabs
import VendorOverviewTab from "./VendorOverviewTab";
import ProductsTab from "./ProductsTab";

// Storage key for mode persistence
const MODE_STORAGE_KEY = "dashboard_active_mode";

// Map legacy tab params to new mode/section
const LEGACY_TAB_MAP: Record<string, { mode: DashboardMode; section: DashboardSection }> = {
  overview: { mode: "employer", section: "overview" },
  opportunities: { mode: "employer", section: "jobs" },
  applications: { mode: "employer", section: "applications" },
  videos: { mode: "employer", section: "videos" },
  shop: { mode: "vendor", section: "overview" },
  messages: { mode: "employer", section: "messages" },
  billing: { mode: "employer", section: "billing" },
  profile: { mode: "employer", section: "profile" },
  events: { mode: "employer", section: "jobs" }, // Legacy redirect
};

// Valid sections for each mode (for URL validation)
const VALID_SECTIONS: Record<DashboardMode, DashboardSection[]> = {
  employer: ["overview", "jobs", "training", "applications", "videos", "messages", "profile", "billing"],
  vendor: ["overview", "products", "services", "inquiries", "messages", "profile", "billing"],
};

function DashboardContent() {
  const { user, role, loading } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();

  // Dashboard state
  const [mode, setMode] = useState<DashboardMode>("employer");
  const [activeSection, setActiveSection] = useState<DashboardSection>("overview");
  const [isInitialized, setIsInitialized] = useState(false);

  // Data state
  const [profile, setProfile] = useState<EmployerProfile | null>(null);
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [unreadMessages, setUnreadMessages] = useState(0);

  // Initialize from URL params and localStorage
  useEffect(() => {
    let initialMode: DashboardMode = "employer";
    let initialSection: DashboardSection = "overview";
    let shouldUpdateUrl = false;

    // Check for legacy ?tab= parameter first
    const tabParam = searchParams.get("tab");
    if (tabParam && LEGACY_TAB_MAP[tabParam]) {
      const mapped = LEGACY_TAB_MAP[tabParam];
      initialMode = mapped.mode;
      initialSection = mapped.section;
      shouldUpdateUrl = true; // Clean up legacy param
    } else {
      // Check for new ?mode= parameter
      const modeParam = searchParams.get("mode");
      if (modeParam === "employer" || modeParam === "vendor") {
        initialMode = modeParam;
      } else {
        // Fall back to localStorage
        const savedMode = localStorage.getItem(MODE_STORAGE_KEY);
        if (savedMode === "employer" || savedMode === "vendor") {
          initialMode = savedMode;
        }
      }

      // Check for ?section= parameter
      const sectionParam = searchParams.get("section") as DashboardSection;
      if (sectionParam && VALID_SECTIONS[initialMode].includes(sectionParam)) {
        initialSection = sectionParam;
      } else if (sectionParam) {
        // Section not valid for this mode, reset to overview
        initialSection = "overview";
        shouldUpdateUrl = true;
      }
    }

    setMode(initialMode);
    setActiveSection(initialSection);
    setIsInitialized(true);

    // Clean up URL if we handled legacy params or invalid sections
    if (shouldUpdateUrl) {
      const url = new URL(window.location.href);
      url.searchParams.delete("tab");
      url.searchParams.set("mode", initialMode);
      url.searchParams.set("section", initialSection);
      router.replace(url.pathname + url.search, { scroll: false });
    }
  }, [searchParams, router]);

  // Persist mode to localStorage when it changes
  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem(MODE_STORAGE_KEY, mode);
    }
  }, [mode, isInitialized]);

  // Load user data
  useEffect(() => {
    if (!user) return;

    const loadData = async () => {
      try {
        const [profileData, vendorData, appsData, unreadCount] = await Promise.all([
          getEmployerProfile(user.uid),
          getVendorByUserId(user.uid),
          listEmployerApplications(user.uid),
          getUnreadMessageCount(user.uid, "employer"),
        ]);

        setProfile(profileData);
        setVendor(vendorData);
        setApplications(appsData);
        setUnreadMessages(unreadCount);
      } catch (err) {
        console.error("Error loading dashboard data:", err);
      }
    };

    loadData();
  }, [user]);

  // Helper to update URL with current state
  const updateUrl = useCallback((newMode: DashboardMode, newSection: DashboardSection, useReplace = false) => {
    const url = new URL(window.location.href);
    url.searchParams.delete("tab"); // Remove legacy param
    url.searchParams.set("mode", newMode);
    url.searchParams.set("section", newSection);

    // Use push for user-initiated navigation (enables back button)
    // Use replace for automatic redirects (doesn't add to history)
    if (useReplace) {
      router.replace(url.pathname + url.search, { scroll: false });
    } else {
      router.push(url.pathname + url.search, { scroll: false });
    }
  }, [router]);

  // Handle mode change - resets to overview and updates URL
  const handleModeChange = useCallback((newMode: DashboardMode) => {
    setMode(newMode);
    setActiveSection("overview");
    updateUrl(newMode, "overview");
  }, [updateUrl]);

  // Handle section change with URL update
  const handleSectionChange = useCallback((section: DashboardSection) => {
    setActiveSection(section);
    updateUrl(mode, section);
  }, [mode, updateUrl]);

  // Handle legacy switchTab events from child components
  useEffect(() => {
    const handleSwitchTab = (event: CustomEvent<{ tab: string }>) => {
      const tab = event.detail.tab;
      if (LEGACY_TAB_MAP[tab]) {
        const { mode: newMode, section } = LEGACY_TAB_MAP[tab];
        setMode(newMode);
        setActiveSection(section);
        updateUrl(newMode, section);
      }
    };

    // Also handle new switchSection events
    const handleSwitchSection = (event: CustomEvent<{ mode?: DashboardMode; section: DashboardSection }>) => {
      const newMode = event.detail.mode || mode;
      const newSection = event.detail.section;
      if (event.detail.mode) {
        setMode(newMode);
      }
      setActiveSection(newSection);
      updateUrl(newMode, newSection);
    };

    window.addEventListener("switchTab", handleSwitchTab as EventListener);
    window.addEventListener("switchSection", handleSwitchSection as EventListener);

    return () => {
      window.removeEventListener("switchTab", handleSwitchTab as EventListener);
      window.removeEventListener("switchSection", handleSwitchSection as EventListener);
    };
  }, [mode, updateUrl]);

  // Auth check
  if (loading || !isInitialized) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <p className="text-slate-400">Loading your dashboard...</p>
      </div>
    );
  }

  const isSuperAdmin = user?.email === "nathan.arias@iopps.ca";

  if (!user || (role !== "employer" && !isSuperAdmin)) {
    redirect("/login");
  }

  // Badge counts
  const badges = {
    applications: applications.filter((a) => a.status === "submitted").length,
    inquiries: 0, // TODO: Implement vendor inquiries count
    messages: unreadMessages,
  };

  // Render content based on mode and section
  const renderContent = () => {
    // Shared sections (same component for both modes)
    switch (activeSection) {
      case "messages":
        return <MessagesTab />;
      case "billing":
        return <BillingTab />;
      case "profile":
        return <UnifiedProfileTab mode={mode} onNavigate={handleSectionChange} />;
    }

    // Employer mode sections
    if (mode === "employer") {
      switch (activeSection) {
        case "overview":
          return <OverviewTab onNavigate={handleSectionChange} />;
        case "jobs":
          return <OpportunitiesTab />;
        case "training":
          return <TrainingTab />;
        case "applications":
          return <ApplicationsTab />;
        case "videos":
          return <VideosTab />;
        default:
          return <OverviewTab onNavigate={handleSectionChange} />;
      }
    }

    // Vendor mode sections
    if (mode === "vendor") {
      switch (activeSection) {
        case "overview":
          return <VendorOverviewTab onNavigate={handleSectionChange} />;
        case "products":
        case "services":
          return <ProductsTab />;
        case "inquiries":
          // TODO: Create dedicated InquiriesTab
          return <ShopTab />;
        default:
          return <VendorOverviewTab onNavigate={handleSectionChange} />;
      }
    }

    return <OverviewTab />;
  };

  // Get current section title and description
  const getSectionInfo = () => {
    const employerSections: Record<string, { title: string; description: string }> = {
      overview: { title: "Overview", description: "Track your hiring activity and key metrics" },
      jobs: { title: "Job Postings", description: "Manage your job listings and opportunities" },
      training: { title: "Training Programs", description: "Manage your training programs and courses" },
      applications: { title: "Applications", description: "Review and manage candidate applications" },
      videos: { title: "Interview Videos", description: "Review video responses from candidates" },
    };

    const vendorSections: Record<string, { title: string; description: string }> = {
      overview: { title: "Shop Overview", description: "Track your shop performance and metrics" },
      products: { title: "Products", description: "Manage your product listings" },
      services: { title: "Services", description: "Manage your service offerings" },
      inquiries: { title: "Inquiries", description: "Respond to customer inquiries" },
    };

    const sharedSections: Record<string, { title: string; description: string }> = {
      messages: { title: "Messages", description: "View and respond to messages" },
      billing: { title: "Billing & Subscription", description: "Manage your subscription and payments" },
      profile: { title: "Profile", description: "Manage your organization and business profile" },
    };

    const sections = mode === "employer" ? employerSections : vendorSections;
    return sections[activeSection] || sharedSections[activeSection] || { title: "Dashboard", description: "" };
  };

  const { title, description } = getSectionInfo();

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
      {/* Page Header */}
      <header className="flex items-center justify-between mb-8 sticky top-0 bg-slate-950/20 backdrop-blur-lg p-2 -mx-2 z-10 rounded-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                mode === "employer"
                  ? "bg-blue-600/20 text-blue-400"
                  : "bg-accent/20 text-accent"
              }`}
            >
              {mode.charAt(0).toUpperCase() + mode.slice(1)} Mode
            </span>
          </div>
          <h1 className="text-3xl font-bold text-slate-50">{title}</h1>
          {description && <p className="text-sm text-slate-400 mt-1">{description}</p>}
        </div>

        {/* Primary Action Button */}
        {(activeSection === "overview" || activeSection === "jobs" || activeSection === "products") && (
          <button
            className={`
              flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm shadow-xl
              transition-all active:scale-95
              ${mode === "employer"
                ? "bg-blue-600 text-white shadow-blue-900/20 hover:bg-blue-500"
                : "bg-accent text-slate-950 shadow-accent/20 hover:bg-accent-hover"
              }
            `}
            onClick={() => {
              // Navigate to create page based on mode
              if (mode === "employer") {
                router.push("/organization/jobs/create");
              } else {
                // For vendor, switch to products section (Phase 3 will have create flow)
                handleSectionChange("products");
              }
            }}
          >
            <span className="text-lg">+</span>
            {mode === "employer" ? "Post New Job" : "Add Product"}
          </button>
        )}
      </header>

      {/* Main Content */}
      <div className="min-h-[600px]">
        {renderContent()}
      </div>
    </DashboardLayout>
  );
}

export default function EmployerDashboard() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#020617] flex items-center justify-center">
          <p className="text-slate-400">Loading your dashboard...</p>
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
