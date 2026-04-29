type LegacyPartnerTier = "premium" | "school" | "standard";

type LegacyPartnerRecord = {
  ids: string[];
  slugs: string[];
  names: string[];
  tier: LegacyPartnerTier;
};

const LEGACY_PUBLIC_PARTNERS: LegacyPartnerRecord[] = [
  {
    ids: ["vAhCU0qrmpRaWCHHWOpbhvx3u9h1"],
    slugs: ["city-of-saskatoon"],
    names: ["city-of-saskatoon"],
    tier: "premium",
  },
];

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeKeySegment(value: unknown): string {
  return text(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeSlugBase(value: unknown): string {
  return normalizeKeySegment(value).replace(/-[a-z0-9]{6}$/i, "");
}

function findLegacyPublicPartner(record: Record<string, unknown>): LegacyPartnerRecord | undefined {
  const id = text(record.id);
  const slug = normalizeSlugBase(record.slug);
  const name = normalizeKeySegment(record.name);

  return LEGACY_PUBLIC_PARTNERS.find(
    (partner) =>
      (id && partner.ids.includes(id)) ||
      (slug && partner.slugs.includes(slug)) ||
      (name && partner.names.includes(name)),
  );
}

export function isLegacyPublicPartner(record: Record<string, unknown>): boolean {
  return Boolean(findLegacyPublicPartner(record));
}

export function getLegacyPublicPartnerTier(record: Record<string, unknown>): LegacyPartnerTier | null {
  return findLegacyPublicPartner(record)?.tier ?? null;
}
