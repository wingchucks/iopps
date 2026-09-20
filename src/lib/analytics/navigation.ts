import type { AnalyticsEventName } from "./types";

export function navigationEvent(href: string, base: string): AnalyticsEventName {
  try {
    const url = new URL(href, base);
    if (url.origin !== new URL(base).origin) return "outbound_link_click";
    const path = url.pathname;
    if (/^\/jobs\/[^/]+\/?$/.test(path)) return "job_detail_click";
    if (/^\/events\/[^/]+\/?$/.test(path)) return "event_detail_click";
    if (/^\/scholarships\/[^/]+\/?$/.test(path)) return "scholarship_detail_click";
    if (/^\/training\/[^/]+\/?$/.test(path)) return "training_detail_click";
    if (/^\/org\/[^/]+\/?$/.test(path) &&
      !["dashboard", "signup", "onboarding", "plans", "upgrade", "checkout"].includes(path.split("/")[2])) {
      return "employer_profile_click";
    }
  } catch { /* Invalid links remain generic clicks. */ }
  return "internal_link_click";
}
