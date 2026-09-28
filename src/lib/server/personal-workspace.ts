// One login keeps its own personal profile and may add an organization workspace,
// like creating a Page from a personal account. Organization setup must never
// replace the person's identity or silently move them out of another organization.
type AccountData = Record<string, unknown> | undefined;

const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");

/** Another organization this account already belongs to, if any. The account's own org (uid) is not a conflict. */
export function conflictingOrganizationLink(uid: string, user: AccountData, member: AccountData): string | null {
  for (const value of [member?.orgId, user?.orgId, user?.employerId, member?.employerId, user?.organizationId]) {
    const id = text(value);
    if (id && id !== uid) return id;
  }
  return null;
}

/** Personal identity fields organization setup may fill in when missing, but never overwrite. */
export function personalIdentityDefaults(existing: AccountData, defaults: { displayName?: string; email?: string }): Record<string, string> {
  const fields: Record<string, string> = {};
  const displayName = text(defaults.displayName);
  const email = text(defaults.email).toLowerCase();
  if (!text(existing?.displayName) && displayName) fields.displayName = displayName;
  if (!text(existing?.email) && email) fields.email = email;
  return fields;
}

export const ORGANIZATION_LINK_CONFLICT =
  "This account already belongs to another organization. Ask that organization's owner to remove you before creating a new organization.";

/** Split a free-text "City, Province" entry into the structured location the profile editor uses. */
export function parseLocationText(value: unknown): { city: string; province: string } | undefined {
  const raw = text(value).slice(0, 200);
  if (!raw) return undefined;
  const [city, ...rest] = raw.split(",").map(part => part.trim());
  const province = rest.join(", ").slice(0, 80);
  return { city: (city || "").slice(0, 120), province };
}
