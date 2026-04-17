const DEFAULT_SUPER_ADMIN_EMAILS = ["nathan.arias@iopps.ca"];

function normalizeEmail(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export function parseSuperAdminEmails(value?: string | null): string[] {
  if (!value) return [];

  return Array.from(
    new Set(
      value
        .split(/[\s,;]+/)
        .map((entry) => normalizeEmail(entry))
        .filter(Boolean),
    ),
  );
}

export function getSuperAdminEmailAllowlist(
  envValue = process.env.SUPER_ADMIN_EMAILS,
): string[] {
  const configured = parseSuperAdminEmails(envValue);
  if (configured.length > 0) return configured;
  return DEFAULT_SUPER_ADMIN_EMAILS;
}

export function isSuperAdminEmail(
  email?: string | null,
  envValue = process.env.SUPER_ADMIN_EMAILS,
): boolean {
  const normalized = normalizeEmail(email);
  if (!normalized) return false;
  return getSuperAdminEmailAllowlist(envValue).includes(normalized);
}
