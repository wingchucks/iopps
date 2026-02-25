"use client";

import Link from "next/link";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
  external?: boolean;
  primary?: boolean;
  onClick?: () => void;
}

// SVG icons
const icons = {
  talent: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
    </svg>
  ),
  applications: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <rect x="8" y="2" width="8" height="4" rx="1" />
    </svg>
  ),
  analytics: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 20V10" /><path d="M12 20V4" /><path d="M6 20v-6" />
    </svg>
  ),
  profile: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  ),
  team: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  templates: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  ),
  calendar: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  graduation: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c0 1.66 2.69 3 6 3s6-1.34 6-3v-5" />
    </svg>
  ),
  billing: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="4" width="22" height="16" rx="2" /><line x1="1" y1="10" x2="23" y2="10" />
    </svg>
  ),
  external: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  ),
};

interface OrgDashboardNavProps {
  orgSlug?: string;
  pendingApps?: number;
  onPostJob?: () => void;
}

export default function OrgDashboardNav({
  orgSlug,
  pendingApps = 0,
  onPostJob,
}: OrgDashboardNavProps) {
  const items: NavItem[] = [
    { href: "/org/dashboard/applications", label: "Applications", icon: icons.applications, badge: pendingApps || undefined },
    { href: "/org/dashboard/events", label: "Events", icon: icons.calendar },
    { href: "/org/dashboard/scholarships", label: "Scholarships", icon: icons.graduation },
    { href: "/org/dashboard/talent", label: "Talent Search", icon: icons.talent },
    { href: "/org/dashboard/analytics", label: "Analytics", icon: icons.analytics },
    { href: "/org/dashboard/profile", label: "Edit Profile", icon: icons.profile },
    { href: "/org/dashboard/team", label: "Team", icon: icons.team },
    { href: "/org/dashboard/templates", label: "Templates", icon: icons.templates },
    { href: "/org/dashboard/billing", label: "Billing", icon: icons.billing },
    ...(orgSlug
      ? [{ href: `/org/${orgSlug}`, label: "Public Page", icon: icons.external, external: true }]
      : []),
  ];

  return (
    <div className="flex gap-2 flex-wrap">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          target={item.external ? "_blank" : undefined}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold no-underline transition-all hover:opacity-80"
          style={{
            background: "var(--card)",
            color: "var(--text-sec, var(--text-muted))",
            border: "1px solid var(--border)",
          }}
        >
          <span style={{ opacity: 0.7 }}>{item.icon}</span>
          {item.label}
          {item.badge && item.badge > 0 && (
            <span
              className="px-1.5 py-0.5 rounded-full text-[10px] font-bold leading-none"
              style={{ background: "#DC2626", color: "#fff" }}
            >
              {item.badge}
            </span>
          )}
        </Link>
      ))}
      {onPostJob && (
        <button
          onClick={onPostJob}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold border-none cursor-pointer transition-all hover:opacity-80"
          style={{ background: "var(--teal)", color: "#fff" }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Post a Job
        </button>
      )}
    </div>
  );
}
