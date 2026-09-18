// Every dashboard entry point uses the same screen for each task.
const standaloneTabs: Record<string, string> = {
  Jobs: "/org/dashboard/jobs",
  Applications: "/org/dashboard/applications",
  Events: "/org/dashboard/events",
  Scholarships: "/org/dashboard/scholarships",
  "Talent Search": "/org/dashboard/talent",
  Team: "/org/dashboard/team",
  Billing: "/org/dashboard/billing",
  // The unwired template editor is retired; existing bookmarks open job drafts.
  Templates: "/org/dashboard/jobs",
};

export function getStandaloneDashboardHref(tab: string): string | undefined {
  return Object.hasOwn(standaloneTabs, tab) ? standaloneTabs[tab] : undefined;
}

export function getDashboardHref(tab: string): string {
  return getStandaloneDashboardHref(tab) ?? `/org/dashboard?tab=${encodeURIComponent(tab)}`;
}

export function getDashboardRedirect(params: Pick<URLSearchParams, "get" | "toString">): string | undefined {
  const destination = params.get("create") === "job"
    ? "/org/dashboard/jobs/new"
    : getStandaloneDashboardHref(params.get("tab") ?? "");
  if (!destination) return undefined;
  const query = new URLSearchParams(params.toString());
  query.delete("tab");
  query.delete("create");
  return destination + (query.size ? `?${query}` : "");
}
