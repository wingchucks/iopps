export function slugifyJobTitle(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .replace(/-{2,}/g, "-");
}

export function buildJobRouteSlug(job: {
  id: string;
  slug?: string | null;
  title?: string | null;
}): string {
  const explicitSlug = typeof job.slug === "string" ? job.slug.trim() : "";
  if (explicitSlug) return explicitSlug;

  const title = typeof job.title === "string" ? job.title.trim() : "";
  if (title) return slugifyJobTitle(title);

  return job.id;
}
