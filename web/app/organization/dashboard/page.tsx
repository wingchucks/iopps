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
import ProfileTab from "./ProfileTab";
import BillingTab from "./BillingTab";
import VideosTab from "./VideosTab";
import ShopTab from "./ShopTab";
import MessagesTab from "./MessagesTab";

// Vendor-specific tabs
import VendorOverviewTab from "./VendorOverviewTab";
import ProductsTab from "./ProductsTab";
import ShopProfileTab from "./ShopProfileTab";

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

  // Initialize mode from localStorage and URL params
  useEffect(() => {
    // Check for legacy ?tab= parameter first
    const tabParam = searchParams.get("tab");
    if (tabParam && LEGACY_TAB_MAP[tabParam]) {
      const { mode: newMode, section } = LEGACY_TAB_MAP[tabParam];
      setMode(newMode);
      setActiveSection(section);
      setIsInitialized(true);
      return;
    }

    // Check for new ?section= parameter
    const sectionParam = searchParams.get("section");
    if (sectionParam) {
      setActiveSection(sectionParam as DashboardSection);
    }

    // Load mode from localStorage
    const savedMode = localStorage.getItem(MODE_STORAGE_KEY);
    if (savedMode === "employer" || savedMode === "vendor") {
      setMode(savedMode);
    }

    setIsInitialized(true);
  }, [searchParams]);

  // Persist mode to localStorage
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

  // Handle mode change
  const handleModeChange = useCallback((newMode: DashboardMode) => {
    setMode(newMode);
  }, []);

  // Handle section change with URL update
  const handleSectionChange = useCallback((section: DashboardSection) => {
    setActiveSection(section);
    // Update URL without full navigation
    const url = new URL(window.location.href);
    url.searchParams.set("section", section);
    url.searchParams.delete("tab"); // Remove legacy param
    router.replace(url.pathname + url.search, { scroll: false });
  }, [router]);

  // Handle legacy switchTab events from child components
  useEffect(() => {
    const handleSwitchTab = (event: CustomEvent<{ tab: string }>) => {
      const tab = event.detail.tab;
      if (LEGACY_TAB_MAP[tab]) {
        const { mode: newMode, section } = LEGACY_TAB_MAP[tab];
        setMode(newMode);
        setActiveSection(section);
      }
    };

    // Also handle new switchSection events
    const handleSwitchSection = (event: CustomEvent<{ mode?: DashboardMode; section: DashboardSection }>) => {
      if (event.detail.mode) {
        setMode(event.detail.mode);
      }
      setActiveSection(event.detail.section);
    };

    window.addEventListener("switchTab", handleSwitchTab as EventListener);
    window.addEventListener("switchSection", handleSwitchSection as EventListener);

    return () => {
      window.removeEventListener("switchTab", handleSwitchTab as EventListener);
      window.removeEventListener("switchSection", handleSwitchSection as EventListener);
    };
  }, []);

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
    // Employer mode sections
    if (mode === "employer") {
      switch (activeSection) {
        case "overview":
          return <OverviewTab />;
        case "jobs":
          return <OpportunitiesTab />;
        case "applications":
          return <ApplicationsTab />;
        case "videos":
          return <VideosTab />;
        // Shared sections accessible in employer mode
        case "messages":
          return <MessagesTab />;
        case "billing":
          return <BillingTab />;
        case "profile":
          return <ProfileTab />;
        default:
          return <OverviewTab />;
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
        case "shop-profile":
          return <ShopProfileTab onNavigate={handleSectionChange} />;
        // Shared sections accessible in vendor mode
        case "messages":
          return <MessagesTab />;
        case "billing":
          return <BillingTab />;
        case "profile":
          return <ProfileTab />;
        default:
          return <ShopTab />;
      }
    }

    return <OverviewTab />;
  };

  // Get current section title and description
  const getSectionInfo = () => {
    const employerSections: Record<string, { title: string; description: string }> = {
      overview: { title: "Overview", description: "Track your hiring activity and key metrics" },
      jobs: { title: "Job Postings", description: "Manage your job listings and opportunities" },
      applications: { title: "Applications", description: "Review and manage candidate applications" },
      videos: { title: "Interview Videos", description: "Review video responses from candidates" },
    };

    const vendorSections: Record<string, { title: string; description: string }> = {
      overview: { title: "Shop Overview", description: "Track your shop performance and metrics" },
      products: { title: "Products", description: "Manage your product listings" },
      services: { title: "Services", description: "Manage your service offerings" },
      inquiries: { title: "Inquiries", description: "Respond to customer inquiries" },
      "shop-profile": { title: "Shop Profile", description: "Update your shop information" },
    };

    const sharedSections: Record<string, { title: string; description: string }> = {
      messages: { title: "Messages", description: "View and respond to messages" },
      billing: { title: "Billing & Subscription", description: "Manage your subscription and payments" },
      profile: { title: "Organization Profile", description: "Update your organization information" },
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
