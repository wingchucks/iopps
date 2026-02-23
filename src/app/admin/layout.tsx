"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Notification types
// ---------------------------------------------------------------------------

interface AdminNotification {
  id: string;
  title: string;
  message: string;
  type: "info" | "warning" | "error" | "success";
  read: boolean;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Inline SVG: Bell icon
// ---------------------------------------------------------------------------

function BellIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 01-3.46 0" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Notifications dropdown
// ---------------------------------------------------------------------------

function NotificationsDropdown({ user }: { user: { getIdToken: () => Promise<string> } }) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Fetch notifications when opened
  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/admin/notifications", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
      }
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (open) fetchNotifications();
  }, [open, fetchNotifications]);

  const markAllRead = async () => {
    try {
      const token = await user.getIdToken();
      await fetch("/api/admin/notifications", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ markAll: true }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (err) {
      console.error("Failed to mark all read:", err);
    }
  };

  const markRead = async (id: string) => {
    try {
      const token = await user.getIdToken();
      await fetch("/api/admin/notifications", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id }),
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
      );
    } catch (err) {
      console.error("Failed to mark notification read:", err);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="relative rounded-lg p-2 text-[var(--text-muted)] transition-colors hover:bg-[var(--card-bg)] hover:text-foreground"
        aria-label="Notifications"
      >
        <BellIcon className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-[#D97706] px-1 text-[10px] font-bold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute bottom-full left-0 z-50 mb-2 w-80 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] shadow-xl animate-scale-in">
          <div className="flex items-center justify-between border-b border-[var(--card-border)] px-4 py-3">
            <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs font-medium text-[#D97706] hover:text-[#B45309] transition-colors"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-64 overflow-y-auto">
            {loading && (
              <div className="px-4 py-6 text-center text-sm text-[var(--text-muted)]">
                Loading...
              </div>
            )}

            {!loading && notifications.length === 0 && (
              <div className="px-4 py-6 text-center text-sm text-[var(--text-muted)]">
                No notifications
              </div>
            )}

            {!loading &&
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => !n.read && markRead(n.id)}
                  className={cn(
                    "flex w-full flex-col gap-0.5 px-4 py-3 text-left transition-colors hover:bg-[var(--card-bg)]",
                    !n.read && "bg-[#D97706]/5",
                  )}
                >
                  <div className="flex items-center gap-2">
                    {!n.read && (
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#D97706]" />
                    )}
                    <span className="text-xs font-medium text-foreground truncate">
                      {n.title}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-muted)] line-clamp-2 pl-3.5">
                    {n.message}
                  </p>
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Navigation structure
// ---------------------------------------------------------------------------

interface NavItem {
  label: string;
  href: string;
  /** Unicode icon displayed beside the label */
  icon: string;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    title: "Overview",
    items: [
      { label: "Dashboard", href: "/admin", icon: "\u25A3" },
      { label: "Reports", href: "/admin/reports", icon: "\u2630" },
    ],
  },
  {
    title: "People",
    items: [
      { label: "Users", href: "/admin/users", icon: "\u2603" },
      { label: "Organizations", href: "/admin/employers", icon: "\u2616" },
      { label: "Verification", href: "/admin/verification", icon: "\u2713" },
    ],
  },
  {
    title: "Content",
    items: [
      { label: "All Posts", href: "/admin/posts", icon: "\u2601" },
      { label: "Jobs", href: "/admin/jobs", icon: "\u2601" },
      { label: "Pow Wows", href: "/admin/powwows", icon: "🪶" },
      { label: "Conferences", href: "/admin/conferences", icon: "\u2609" },
      { label: "Scholarships", href: "/admin/scholarships", icon: "\u2605" },
      { label: "Stories", href: "/admin/stories", icon: "\u270E" },
      { label: "Livestreams", href: "/admin/livestreams", icon: "\u25B6" },
      { label: "Moderation", href: "/admin/moderation", icon: "\u26A0" },
    ],
  },
  {
    title: "Commerce",
    items: [
      { label: "Payments", href: "/admin/payments", icon: "\u2B24" },
      { label: "Shop Indigenous", href: "/admin/shop", icon: "\u2302" },
      { label: "Featured & Pinned", href: "/admin/pinned", icon: "\u272A" },
      { label: "Partners", href: "/admin/partners", icon: "\u2764" },
    ],
  },
  {
    title: "Platform",
    items: [
      { label: "Feed Sync", href: "/admin/feed-sync", icon: "\u21BB" },
      { label: "Email", href: "/admin/email", icon: "\u2709" },
      { label: "Data Management", href: "/admin/data", icon: "\u2630" },
      { label: "Settings", href: "/admin/settings", icon: "\u2699" },
    ],
  },
];

// ---------------------------------------------------------------------------
// Inline SVG icons (no external library)
// ---------------------------------------------------------------------------

function MenuIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

function ArrowLeftIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  );
}

function LogOutIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Sidebar content (shared between desktop and mobile drawer)
// ---------------------------------------------------------------------------

function SidebarContent({
  pathname,
  onNavigate,
  onSignOut,
  user,
}: {
  pathname: string;
  onNavigate?: () => void;
  onSignOut: () => void;
  user: { displayName: string | null; email: string | null; getIdToken: () => Promise<string> };
}) {
  /** Check if a nav item is the "active" route */
  const isActive = (href: string) => {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  };

  return (
    <div className="flex h-full flex-col">
      {/* Logo / title area */}
      <div className="flex h-16 items-center gap-2.5 border-b border-[var(--card-border)] px-5">
        <span className="text-lg font-bold text-accent">IOPPS</span>
        <span className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
          Admin
        </span>
      </div>

      {/* Navigation groups */}
      <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Admin navigation">
        {NAV_GROUPS.map((group) => (
          <div key={group.title} className="mb-5">
            <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              {group.title}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      className={cn(
                        "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150",
                        active
                          ? "border-l-[3px] border-accent bg-accent/10 text-accent"
                          : "border-l-[3px] border-transparent text-[var(--text-muted)] hover:bg-[var(--card-bg)] hover:text-foreground",
                      )}
                      aria-current={active ? "page" : undefined}
                    >
                      <span className="text-base leading-none" aria-hidden="true">
                        {item.icon}
                      </span>
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer actions */}
      <div className="border-t border-[var(--card-border)] p-3 space-y-2">
        {/* Profile card */}
        <div className="flex items-center gap-3 rounded-lg px-3 py-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#D97706]/10 text-sm font-semibold text-[#D97706]">
            {(() => {
              const name = user.displayName || "";
              if (!name) return "?";
              const parts = name.trim().split(" ");
              if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
              return name[0]?.toUpperCase() || "?";
            })()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">
              {user.displayName || "Admin"}
            </p>
            <p className="truncate text-xs text-[var(--text-muted)]">
              {user.email || ""}
            </p>
          </div>
        </div>

        {/* Badge + Notifications row */}
        <div className="flex items-center justify-between px-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-full border border-[#D97706]/20 bg-[#D97706]/10 px-2.5 py-0.5 text-xs font-medium text-[#D97706]">
              Super Admin
            </span>
            <span className="text-[10px] text-[var(--text-muted)]">v1.0.0</span>
          </div>
          <NotificationsDropdown user={user} />
        </div>

        <Link
          href="/"
          onClick={onNavigate}
          className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-[var(--text-muted)] transition-colors hover:bg-[var(--card-bg)] hover:text-foreground"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Back to Site
        </Link>
        <button
          onClick={() => {
            onNavigate?.();
            onSignOut();
          }}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-[var(--text-muted)] transition-colors hover:bg-error/10 hover:text-error"
        >
          <LogOutIcon className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Loading spinner
// ---------------------------------------------------------------------------

function LoadingSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <svg
          className="h-8 w-8 animate-spin text-accent"
          viewBox="0 0 24 24"
          fill="none"
          aria-label="Loading"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        <p className="text-sm text-[var(--text-muted)]">Loading admin panel...</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main layout
// ---------------------------------------------------------------------------

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, role, loading, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Close mobile drawer on route change
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (drawerOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  // Auth guard: redirect when auth resolves
  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (role !== "admin" && role !== "moderator") {
      router.replace("/");
    }
  }, [loading, user, role, router]);

  // While loading or unauthorized, show spinner
  if (loading || !user || (role !== "admin" && role !== "moderator")) {
    return <LoadingSpinner />;
  }

  return (
    <div data-admin className="flex h-screen bg-background">
      {/* ---- Desktop sidebar ---- */}
      <aside className="hidden w-64 shrink-0 border-r border-[var(--card-border)] bg-surface lg:block">
        <SidebarContent
          pathname={pathname}
          onSignOut={signOut}
          user={user}
        />
      </aside>

      {/* ---- Mobile drawer overlay ---- */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 animate-fade-in"
            onClick={closeDrawer}
            aria-hidden="true"
          />
          {/* Drawer panel */}
          <aside className="relative z-50 h-full w-72 bg-surface shadow-xl animate-slide-in-left">
            <SidebarContent
              pathname={pathname}
              onNavigate={closeDrawer}
              onSignOut={signOut}
              user={user}
            />
          </aside>
        </div>
      )}

      {/* ---- Main content column ---- */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile header */}
        <header className="flex h-14 items-center gap-3 border-b border-[var(--card-border)] bg-surface px-4 lg:hidden">
          <button
            onClick={() => setDrawerOpen(true)}
            className="rounded-lg p-2 text-[var(--text-muted)] transition-colors hover:bg-[var(--card-bg)] hover:text-foreground"
            aria-label="Open navigation menu"
          >
            <MenuIcon className="h-5 w-5" />
          </button>
          <span className="text-sm font-bold text-accent">IOPPS</span>
          <span className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
            Admin
          </span>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-background p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
