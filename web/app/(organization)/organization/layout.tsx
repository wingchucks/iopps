"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";

// ---------------------------------------------------------------------------
// Navigation configuration
// ---------------------------------------------------------------------------

interface NavItem {
  label: string;
  href: string;
  /** Simple SVG path for the icon (24x24 viewBox, stroke-based) */
  iconPath: string;
}

const NAV_ITEMS: NavItem[] = [
  {
    label: "Dashboard",
    href: "/organization/dashboard",
    iconPath:
      "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1",
  },
  {
    label: "Jobs",
    href: "/organization/jobs",
    iconPath:
      "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4",
  },
  {
    label: "Billing",
    href: "/organization/billing",
    iconPath:
      "M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z",
  },
  {
    label: "Settings",
    href: "/organization/settings",
    iconPath:
      "M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.248a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.28z M15 12a3 3 0 11-6 0 3 3 0 016 0z",
  },
];

// ---------------------------------------------------------------------------
// Loading spinner shown while auth state resolves
// ---------------------------------------------------------------------------

function LayoutLoadingState() {
  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
        <p className="text-sm text-text-muted">Loading...</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sidebar navigation item
// ---------------------------------------------------------------------------

function SidebarLink({
  item,
  isActive,
  collapsed,
}: {
  item: NavItem;
  isActive: boolean;
  collapsed?: boolean;
}) {
  return (
    <Link
      href={item.href}
      className={[
        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
        isActive
          ? "bg-accent/10 text-accent"
          : "text-text-secondary hover:bg-surface hover:text-text-primary",
      ].join(" ")}
      aria-current={isActive ? "page" : undefined}
    >
      <svg
        className="h-5 w-5 shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d={item.iconPath}
        />
      </svg>
      {!collapsed && <span>{item.label}</span>}
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

export default function OrganizationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, userProfile, role, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Close mobile sidebar on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  // Auth gate: redirect unauthenticated users
  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }

    if (role && role !== "employer" && role !== "admin") {
      router.replace("/");
    }
  }, [loading, user, role, router, pathname]);

  // Show loading spinner while auth resolves
  if (loading) {
    return <LayoutLoadingState />;
  }

  // Prevent flash of content while redirect is in flight
  if (!user || (role && role !== "employer" && role !== "admin")) {
    return <LayoutLoadingState />;
  }

  const displayName = userProfile?.displayName || "Organization";

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* ----------------------------------------------------------------- */}
      {/* Mobile backdrop overlay                                           */}
      {/* ----------------------------------------------------------------- */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ----------------------------------------------------------------- */}
      {/* Sidebar                                                           */}
      {/* ----------------------------------------------------------------- */}
      <aside
        className={[
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-card-border bg-card transition-transform duration-300 lg:static lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
      >
        {/* Sidebar header */}
        <div className="flex h-16 items-center justify-between border-b border-card-border px-4">
          <div className="flex items-center gap-3 min-w-0">
            {/* Org avatar */}
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent font-bold text-sm">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-text-primary">
                {displayName}
              </p>
              <p className="text-xs text-text-muted">Employer</p>
            </div>
          </div>
          {/* Close button (mobile only) */}
          <button
            type="button"
            className="rounded-lg p-1.5 text-text-muted hover:bg-surface hover:text-text-primary lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Navigation links */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4" aria-label="Organization navigation">
          {NAV_ITEMS.map((item) => (
            <SidebarLink
              key={item.href}
              item={item}
              isActive={pathname === item.href || pathname.startsWith(item.href + "/")}
            />
          ))}
        </nav>

        {/* Sidebar footer */}
        <div className="border-t border-card-border p-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm text-text-muted hover:text-text-primary transition-colors"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3"
              />
            </svg>
            Back to IOPPS
          </Link>
        </div>
      </aside>

      {/* ----------------------------------------------------------------- */}
      {/* Main content area                                                 */}
      {/* ----------------------------------------------------------------- */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile top bar with hamburger */}
        <header className="flex h-14 items-center border-b border-card-border bg-card px-4 lg:hidden">
          <button
            type="button"
            className="rounded-lg p-2 text-text-secondary hover:bg-surface hover:text-text-primary"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open sidebar navigation"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
              />
            </svg>
          </button>
          <span className="ml-3 text-sm font-semibold text-text-primary">
            {displayName}
          </span>
        </header>

        {/* Scrollable content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
