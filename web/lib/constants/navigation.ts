/**
 * Shared navigation constants used across the IOPPS platform.
 * Single source of truth for nav items, footer links, and quick links.
 *
 * Social-platform-style navigation (LinkedIn/Facebook pattern):
 * - Desktop: top bar with main nav + icon actions + avatar dropdown
 * - Mobile: top bar + bottom nav (5 items)
 */

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type NavId =
  | "home"
  | "network"
  | "jobs"
  | "education"
  | "events"
  | "business"
  // Legacy IDs — kept for backward compat with pages that pass these to FeedLayout
  | "feed"
  | "careers"
  | "community"
  | "organizations"
  | "live"
  | "nations"
  | "pricing";

export interface NavItem {
  id: NavId;
  icon: string;
  label: string;
  href: string;
}

export interface IconNavItem {
  icon: string;
  label: string;
  href: string;
}

export interface AvatarMenuItem {
  icon: string;
  label: string;
  /** Static href, or "dynamic" when it needs userId at runtime, or "action" for sign-out */
  href: string;
  action?: "signout";
}

export interface BottomNavItem {
  icon: string;
  label: string;
  /** Static string, a function of (loggedIn, userId?) returning a string, or "action" for post creation */
  href: string | ((loggedIn: boolean, userId?: string) => string);
  action?: "create-post";
}

export interface QuickLink {
  label: string;
  href: string;
}

/* ------------------------------------------------------------------ */
/*  Main nav items — desktop top bar center                            */
/* ------------------------------------------------------------------ */

export const NAV_ITEMS: NavItem[] = [
  { id: "home", icon: "home", label: "Home", href: "/" },
  { id: "network", icon: "users", label: "Network", href: "/members" },
  { id: "jobs", icon: "briefcase", label: "Jobs", href: "/careers" },
  { id: "education", icon: "academic", label: "Education", href: "/education" },
  { id: "events", icon: "calendar", label: "Events", href: "/community" },
  { id: "business", icon: "building", label: "Business", href: "/business" },
];

/* ------------------------------------------------------------------ */
/*  Icon-only nav items — desktop top bar right side                   */
/* ------------------------------------------------------------------ */

export const ICON_NAV_ITEMS: IconNavItem[] = [
  { icon: "mail", label: "Messages", href: "/messages" },
  // Notifications are handled by the NotificationBell component
];

/* ------------------------------------------------------------------ */
/*  Avatar dropdown menu                                               */
/* ------------------------------------------------------------------ */

/** userId placeholder "{{userId}}" is replaced at render time */
export const AVATAR_MENU_ITEMS: AvatarMenuItem[] = [
  { icon: "user", label: "View Profile", href: "/member/{{userId}}" },
  { icon: "settings", label: "Settings & Privacy", href: "/member/settings" },
  { icon: "help", label: "Help", href: "/contact" },
  { icon: "logout", label: "Sign Out", href: "#", action: "signout" },
];

/** Resolve "{{userId}}" in avatar menu item hrefs */
export function resolveAvatarHref(href: string, userId: string): string {
  return href.replace("{{userId}}", userId);
}

/* ------------------------------------------------------------------ */
/*  Mobile bottom nav — 5 items                                        */
/* ------------------------------------------------------------------ */

export const BOTTOM_NAV: BottomNavItem[] = [
  { icon: "home", label: "Home", href: "/" },
  { icon: "briefcase", label: "Jobs", href: "/careers" },
  { icon: "users", label: "Network", href: "/discover" },
  { icon: "academic", label: "Learn", href: "/education" },
  { icon: "calendar", label: "Events", href: "/community" },
  { icon: "building", label: "Shop", href: "/business" },
  { icon: "mail", label: "Chat", href: (loggedIn, role) => resolveHref("/member/messages", loggedIn, role) },
  { icon: "user", label: "Profile", href: (loggedIn, role) => resolveHref("/me/opportunities", loggedIn, role) },
];

/* ------------------------------------------------------------------ */
/*  Sidebar & footer links                                             */
/* ------------------------------------------------------------------ */

/** Default quick links shown in right sidebar */
export const QUICK_LINKS: QuickLink[] = [
  { label: "Post a Job", href: "/organization/jobs/new" },
  { label: "Browse Training", href: "/careers" },
  { label: "Find Scholarships", href: "/education" },
  { label: "Upcoming Events", href: "/community" },
];

/** Footer navigation links */
export const FOOTER_LINKS: QuickLink[] = [
  { label: "About", href: "/about" },
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
  { label: "Help", href: "/contact" },
];

/** Full footer links (used on marketing pages) */
export const FOOTER_LINKS_FULL: QuickLink[] = [
  { label: "About", href: "/about" },
  { label: "Jobs", href: "/careers" },
  { label: "Education", href: "/education" },
  { label: "Events", href: "/community" },
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
  { label: "Contact", href: "/contact" },
];

/** Section-specific sidebar links */
export const CAREERS_SIDEBAR_LINKS: QuickLink[] = [
  { label: "Browse All Jobs", href: "/careers/jobs" },
  { label: "Training Programs", href: "/careers/programs" },
  { label: "My Applications", href: "/member/applications" },
  { label: "Job Alerts", href: "/member/alerts" },
  { label: "Post a Job", href: "/organization/jobs/new" },
];

export const EDUCATION_SIDEBAR_LINKS: QuickLink[] = [
  { label: "Browse Schools", href: "/education/schools" },
  { label: "Find Scholarships", href: "/education/scholarships" },
  { label: "Training Programs", href: "/careers/programs" },
  { label: "List Your School", href: "/organization/education/setup" },
];

export const EVENTS_SIDEBAR_LINKS: QuickLink[] = [
  { label: "Pow Wows", href: "/community/powwows" },
  { label: "Conferences", href: "/conferences" },
  { label: "All Events", href: "/community" },
  { label: "Nations Map", href: "/map" },
  { label: "Host an Event", href: "/organization/events/new" },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/** Resolve a BottomNavItem href that may be a function */
export function resolveHref(
  href: string | ((loggedIn: boolean, userId?: string) => string),
  loggedIn: boolean,
  userId?: string,
): string {
  return typeof href === "function" ? href(loggedIn, userId) : href;
}
