/**
 * Canonical organization slugs.
 *
 * When an organization's public slug changes (e.g. a business renames itself
 * and the slug generator produces a different slug), the old slug becomes an
 * alias that permanently redirects to the canonical slug. Add a new entry here
 * whenever a slug changes: { "<old-alias-slug>": "<canonical-slug>" }.
 *
 * The alias map is consumed by next.config.ts to emit permanent (308)
 * redirects at the routing layer, so /org/<alias> never shows
 * "Organization Not Found". This stays generic: any org whose slug appears
 * as an alias resolves to its canonical slug.
 */
export const ORG_SLUG_ALIASES: Record<string, string> = {
  // "Eston's Place" previously resolved at eston-s-place; estons-place is the alias.
  "estons-place": "eston-s-place",
};

/** Returns the canonical slug for a requested org slug (alias or canonical). */
export function canonicalOrgSlug(slug: string): string {
  return ORG_SLUG_ALIASES[slug] ?? slug;
}

/** Build next.config.ts redirect entries from the alias map. */
export function orgSlugRedirectEntries(): Array<{ source: string; destination: string; permanent: boolean }> {
  return Object.entries(ORG_SLUG_ALIASES).map(([alias, canonical]) => ({
    source: `/org/${alias}`,
    destination: `/org/${canonical}`,
    permanent: true,
  }));
}
