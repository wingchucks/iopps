import { safeOpportunityUrl } from "./opportunity-posting";

/** Combine only matching event sources/dates and equivalent title prefixes. */
export function dedupeEventDirectory<T extends Record<string, unknown>>(items: T[]): T[] {
  const groups = new Map<string, T[]>();
  const title = (value: unknown) => String(value || "").toLowerCase().replace(/\b(?:afn|the)\b/g, "").replace(/[^a-z0-9]+/g, " ").trim();
  return items.filter(item => {
    const source = safeOpportunityUrl(item.sourceUrl);
    if (!source || !item.startDate) return true;
    const url = new URL(source);
    if (url.pathname === "/") return true;
    for (const key of [...url.searchParams.keys()]) if (key.startsWith("utm_")) url.searchParams.delete(key);
    url.hash = "";
    const key = `${url.href.replace(/\/$/, "")}|${item.startDate}|${item.endDate || item.startDate}`;
    const candidates = groups.get(key) || [];
    const name = title(item.title);
    if (name.length >= 16 && candidates.some(previous => { const other = title(previous.title); return other === name || other.startsWith(name + " ") || name.startsWith(other + " "); })) return false;
    groups.set(key, [...candidates, item]);
    return true;
  });
}
