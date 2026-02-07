/**
 * Shared navigation constants used across the IOPPS platform.
 * Single source of truth for nav items, footer links, and quick links.
 */

export type NavId =
  | "feed"
  | "careers"
  | "education"
  | "events"
  | "live"
  | "nations"
  | "business"
  | "community"
  | "organizations"
  | "pricing";

export interface NavItem {
  id: NavId;
  icon: string;
  label: string;
  href: string;
}

export interface BottomNavItem {
  icon: string;
  label: string;
  href: string | ((loggedIn: boolean) => string);
}

export interface QuickLink {
  label: string;
  href: string;
}

/** Main sidebar/mobile navigation items */
export const NAV_ITEMS: NavItem[] = [
  { id: "feed", icon: "home", label: "Home Feed", href: "/discover" },
  { id: "careers", icon: "briefcase", label: "Careers", href: "/careers" },
  { id: "education", icon: "academic", label: "Education", href: "/education" },
  { id: "events", icon: "calendar", label: "Events", href: "/community" },
  { id: "live", icon: "video", label: "IOPPS Live", href: "/live" },
  { id: "nations", icon: "map", label: "Nations Map", href: "/map" },
];

/** Mobile bottom navigation bar items */
export const BOTTOM_NAV: BottomNavItem[] = [
  { icon: "home", label: "Feed", href: "/discover" },
  { icon: "briefcase", label: "Jobs", href: "/careers" },
  { icon: "search", label: "Search", href: "/search" },
  { icon: "bell", label: "Alerts", href: (loggedIn) => (loggedIn ? "/member/dashboard?tab=alerts" : "/login") },
  { icon: "user", label: "Profile", href: (loggedIn) => (loggedIn ? "/member/profile" : "/login") },
];

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

/** Resolve a BottomNavItem href that may be a function */
export function resolveHref(
  href: string | ((loggedIn: boolean) => string),
  loggedIn: boolean,
): string {
  return typeof href === "function" ? href(loggedIn) : href;
}
