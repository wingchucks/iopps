type FeedIdentity = { id: string; type: string };

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
  return uniqueFeedItems(items).filter(item => item.type !== "job" || !spotlightJobs.has(item.id));
}
