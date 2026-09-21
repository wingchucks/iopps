type FeedIdentity = { id: string; type: string; orgSlug?: string; orgName?: string };

/** The public jobs API supplies canonical IDs; titles/slugs are not identities. */
export function uniqueFeedItems<T extends FeedIdentity>(items: readonly T[]): T[] {
  const seen = new Set<string>();
  return items.filter(item => {
    if (!item.id) return true;
    const key = JSON.stringify([item.type, item.id]);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** A spotlight is a placement, not a second posting of the same job. */
export function freshFeedItems<T extends FeedIdentity>(items: readonly T[], featured: readonly T[]): T[] {
  const spotlightJobs = new Set(featured.filter(item => item.type === "job").map(item => item.id));
  // Presentation-only diversity: never limit the public jobs API/search inventory.
  const counts = new Map<string, number>();
  const employer = (item: FeedIdentity) => item.orgSlug || item.orgName?.trim() || "";
  for (const item of uniqueFeedItems(featured)) {
    const key = employer(item);
    if (item.type === "job" && key) counts.set(key, (counts.get(key) || 0) + 1);
  }
  return uniqueFeedItems(items).filter(item => {
    if (item.type !== "job") return true;
    if (spotlightJobs.has(item.id)) return false;
    const key = employer(item);
    if (!key) return true;
    const count = counts.get(key) || 0;
    if (count >= 3) return false;
    counts.set(key, count + 1);
    return true;
  });
}
