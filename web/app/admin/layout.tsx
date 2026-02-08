"use client";

import { useAuth } from "@/components/AuthProvider";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ShieldCheckIcon,
  UsersIcon,
  UserGroupIcon,
  BriefcaseIcon,
  ChartBarIcon,
  ArrowLeftOnRectangleIcon,
  ArrowDownTrayIcon,
  VideoCameraIcon,
  SparklesIcon,
  BuildingOfficeIcon,
  BuildingStorefrontIcon,
  Cog6ToothIcon,
  DocumentTextIcon,
  EnvelopeIcon,
  Bars3Icon,
  XMarkIcon,
  AcademicCapIcon,
  ClipboardDocumentListIcon,
  FlagIcon,
  NewspaperIcon,
} from "@heroicons/react/24/outline";
import { AdminNavGroup, AdminTopBar, type NavItem } from "@/components/admin";
import { useAdminCounts } from "@/lib/hooks/admin";

// ============================================================================
// Navigation Groups Configuration
// ============================================================================

interface NavGroup {
  label: string;
  items: NavItem[];
  defaultOpen?: boolean;
  collapsible?: boolean;
}

function useNavigationGroups(): NavGroup[] {
  const { counts, loading } = useAdminCounts();

  // Calculate pending counts for badges
  const pendingApprovals = loading ? 0 : counts.employers.pending + counts.vendors.pending;

  return [
    {
      label: "Overview",
      items: [
        {
          name: "Dashboard",
          href: "/admin",
          icon: ChartBarIcon,
          badge: pendingApprovals > 0 ? pendingApprovals : undefined,
          badgeVariant: "warning" as const,
        },
      ],
      defaultOpen: true,
      collapsible: false,
    },
    {
      label: "People",
      items: [
        { name: "Users", href: "/admin/users", icon: UsersIcon },
        {
          name: "Employers",
          href: "/admin/employers",
          icon: BriefcaseIcon,
          badge: counts.employers.pending > 0 ? counts.employers.pending : undefined,
          badgeVariant: "warning" as const,
        },
        { name: "Applications", href: "/admin/applications", icon: ClipboardDocumentListIcon },
      ],
      defaultOpen: true,
    },
    {
      label: "Moderation",
      items: [
        { name: "Flagged Content", href: "/admin/moderation", icon: FlagIcon },
        { name: "Verification", href: "/admin/verification", icon: ShieldCheckIcon },
      ],
      defaultOpen: true,
    },
    {
      label: "Content",
      items: [
        { name: "Jobs", href: "/admin/jobs", icon: DocumentTextIcon },
        { name: "Scholarships", href: "/admin/scholarships", icon: AcademicCapIcon },
        { name: "Conferences", href: "/admin/conferences", icon: BuildingOfficeIcon },
        { name: "Pow Wows", href: "/admin/powwows", icon: SparklesIcon },
        { name: "News", href: "/admin/news", icon: NewspaperIcon },
      ],
      defaultOpen: true,
    },
    {
      label: "Marketplace",
      items: [
        {
          name: "Vendors",
          href: "/admin/vendors",
          icon: BuildingStorefrontIcon,
          badge: counts.vendors.pending > 0 ? counts.vendors.pending : undefined,
          badgeVariant: "warning" as const,
        },
      ],
      defaultOpen: true,
    },
    {
      label: "Media",
      items: [{ name: "Videos", href: "/admin/videos", icon: VideoCameraIcon }],
      defaultOpen: false,
    },
    {
      label: "Automation",
      items: [
        { name: "Job Auto Import", href: "/admin/feeds", icon: ArrowDownTrayIcon },
        { name: "Email Campaigns", href: "/admin/emails", icon: EnvelopeIcon },
      ],
      defaultOpen: false,
    },
    {
      label: "Settings",
      items: [{ name: "Platform Settings", href: "/admin/settings", icon: Cog6ToothIcon }],
      defaultOpen: false,
    },
  ];
}

// ============================================================================
// Mobile Navigation
// ============================================================================

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
  groups: NavGroup[];
}

function MobileNav({ isOpen, onClose, groups }: MobileNavProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed inset-y-0 left-0 w-72 bg-surface shadow-xl">
        <div className="flex h-16 items-center justify-between border-b border-[var(--card-border)] px-4">
          <Link href="/" className="flex items-center gap-2 font-bold text-foreground" onClick={onClose}>
            <ShieldCheckIcon className="h-6 w-6 text-accent" />
            <span>IOPPS Admin</span>
          </Link>
          <button
            onClick={onClose}
            className="rounded-md p-2 text-[var(--text-muted)] hover:bg-surface hover:text-white"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {groups.map((group) => (
            <AdminNavGroup
              key={group.label}
              label={group.label}
              items={group.items}
              defaultOpen={group.defaultOpen}
              collapsible={group.collapsible}
            />
          ))}
        </nav>

        <div className="border-t border-[var(--card-border)] p-4">
          <Link
            href="/"
            className="group flex items-center rounded-md px-3 py-2 text-sm font-medium text-[var(--text-muted)] hover:bg-surface hover:text-white"
            onClick={onClose}
          >
            <ArrowLeftOnRectangleIcon className="mr-3 h-5 w-5 text-foreground0 group-hover:text-[var(--text-muted)]" />
            Back to Site
          </Link>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Main Layout
// ============================================================================

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, role, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const navGroups = useNavigationGroups();

  // Close mobile nav on route change
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: sync UI with route change
    setMobileNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push("/login");
      } else if (role !== "moderator" && role !== "admin") {
        router.push("/");
      }
    }
  }, [user, role, loading, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-[var(--text-muted)]" data-admin>
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--card-border)] border-t-accent" />
          <span>Loading admin panel...</span>
        </div>
      </div>
    );
  }

  if (!user || (role !== "moderator" && role !== "admin")) {
    return null; // Will redirect via useEffect
  }

  return (
    <div className="min-h-screen bg-background" data-admin>
      <div className="flex h-screen overflow-hidden">
        {/* Desktop Sidebar */}
        <div className="hidden w-64 flex-col border-r border-[var(--card-border)] bg-surface md:flex">
          {/* Logo */}
          <div className="flex h-16 items-center border-b border-[var(--card-border)] px-6">
            <Link href="/" className="flex items-center gap-2 font-bold text-foreground">
              <ShieldCheckIcon className="h-6 w-6 text-accent" />
              <span>IOPPS Admin</span>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-2">
            {navGroups.map((group) => (
              <AdminNavGroup
                key={group.label}
                label={group.label}
                items={group.items}
                defaultOpen={group.defaultOpen}
                collapsible={group.collapsible}
              />
            ))}
          </nav>

          {/* Footer */}
          <div className="border-t border-[var(--card-border)] p-4">
            <Link
              href="/"
              className="group flex items-center rounded-md px-3 py-2 text-sm font-medium text-[var(--text-muted)] hover:bg-surface hover:text-white"
            >
              <ArrowLeftOnRectangleIcon className="mr-3 h-5 w-5 text-foreground0 group-hover:text-[var(--text-muted)]" />
              Back to Site
            </Link>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Mobile Header */}
          <header className="flex h-16 items-center justify-between border-b border-[var(--card-border)] bg-surface px-4 md:hidden">
            <button
              onClick={() => setMobileNavOpen(true)}
              className="rounded-md p-2 text-[var(--text-muted)] hover:bg-surface hover:text-white"
            >
              <Bars3Icon className="h-6 w-6" />
            </button>
            <div className="flex items-center gap-2 font-bold text-foreground">
              <ShieldCheckIcon className="h-6 w-6 text-accent" />
              <span>Admin</span>
            </div>
            <div className="w-10" /> {/* Spacer for centering */}
          </header>

          {/* Desktop Top Bar */}
          <div className="hidden md:block">
            <AdminTopBar />
          </div>

          {/* Page Content */}
          <main className="flex-1 overflow-y-auto bg-background p-6">{children}</main>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      <MobileNav isOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} groups={navGroups} />
    </div>
  );
}
