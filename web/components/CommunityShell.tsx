/* eslint-disable @next/next/no-img-element */
"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { ProtectedRoute } from "@/components/ProtectedRoute";

const NAV_ITEMS = [
  { href: "/home", label: "Home", icon: "home" },
  { href: "/discover", label: "Network", icon: "users" },
  { href: "/home/jobs", label: "Jobs", icon: "briefcase" },
  { href: "/home/education", label: "Education", icon: "academic" },
  { href: "/home/events", label: "Events", icon: "calendar" },
  { href: "/home/business", label: "Business", icon: "building" },
  { href: "/me/opportunities", label: "My Stuff", icon: "folder" },
] as const;

const MOBILE_NAV_ITEMS = [
  { href: "/home", label: "Home", icon: "home" },
  { href: "/discover", label: "Network", icon: "users" },
  { href: "/home/jobs", label: "Jobs", icon: "briefcase" },
  { href: "/me/opportunities", label: "My Stuff", icon: "folder" },
  { href: "/home/messages", label: "Messages", icon: "chat" },
] as const;

function NavIcon({ icon, className }: { icon: string; className?: string }) {
  const cls = className || "h-5 w-5";
  switch (icon) {
    case "home":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      );
    case "users":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      );
    case "briefcase":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      );
    case "academic":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
        </svg>
      );
    case "calendar":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      );
    case "building":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      );
    case "folder":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
      );
    case "chat":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      );
    case "bell":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      );
    case "search":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      );
    default:
      return null;
  }
}

export default function CommunityShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuth();

  const isActive = (href: string) => {
    if (href === "/home") return pathname === "/home";
    if (href === "/me/opportunities") return pathname.startsWith("/me");
    return pathname.startsWith(href);
  };

  return (
    <ProtectedRoute allowedRoles={["community", "employer"]}>
      <div className="min-h-screen bg-background">
        {/* Top bar */}
        <header className="sticky top-0 z-30 h-14 border-b border-[var(--border)] bg-[var(--card-bg)] backdrop-blur-sm">
          <div className="flex h-full items-center justify-between px-4 sm:px-6">
            <Link href="/home" className="flex items-center gap-2">
              <span className="text-lg font-bold text-accent">IOPPS</span>
            </Link>

            <div className="hidden sm:flex flex-1 max-w-md mx-6">
              <div className="relative w-full">
                <NavIcon icon="search" className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
                <input
                  type="text"
                  placeholder="Search opportunities, people, orgs..."
                  className="w-full rounded-full border border-[var(--border)] bg-[var(--background)] py-2 pl-10 pr-4 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-accent/30"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button className="relative p-2 rounded-full text-[var(--text-secondary)] hover:bg-[var(--background)] transition-colors" aria-label="Notifications">
                <NavIcon icon="bell" className="h-5 w-5" />
              </button>
              <button className="relative p-2 rounded-full text-[var(--text-secondary)] hover:bg-[var(--background)] transition-colors sm:hidden" aria-label="Search">
                <NavIcon icon="search" className="h-5 w-5" />
              </button>
              <Link href="/me/career-vault" className="flex items-center">
                {user?.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt="Profile photo"
                    className="h-8 w-8 rounded-full border border-[var(--border)] object-cover"
                  />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-sm font-medium text-white">
                    {user?.displayName?.charAt(0) || "?"}
                  </div>
                )}
              </Link>
            </div>
          </div>
        </header>

        <div className="flex">
          {/* Desktop sidebar */}
          <aside className="hidden md:flex w-56 flex-shrink-0 flex-col border-r border-[var(--border)] bg-[var(--card-bg)] min-h-[calc(100vh-3.5rem)] sticky top-14">
            <nav className="flex flex-col gap-1 p-3 pt-4">
              {NAV_ITEMS.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                      active
                        ? "bg-accent/10 text-accent font-medium"
                        : "text-[var(--text-secondary)] hover:bg-[var(--background)]"
                    }`}
                  >
                    <NavIcon icon={item.icon} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </aside>

          {/* Main content */}
          <main className="flex-1 min-w-0 pb-24 md:pb-0">
            {children}
          </main>
        </div>

        {/* Mobile bottom nav */}
        <nav className="fixed bottom-0 left-0 right-0 h-16 border-t border-[var(--border)] bg-[var(--card-bg)] z-30 md:hidden">
          <div className="flex h-full items-center justify-around">
            {MOBILE_NAV_ITEMS.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex flex-col items-center gap-1 px-2 py-1 ${
                    active ? "text-accent" : "text-[var(--text-muted)]"
                  }`}
                >
                  <NavIcon icon={item.icon} className="h-5 w-5" />
                  <span className="text-[10px]">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </ProtectedRoute>
  );
}
