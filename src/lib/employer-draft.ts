// Browser-only convenience, never authorization. No credentials, files or plan grants.
export const employerDraftKey = (uid: string) => `iopps-employer-draft-v1:${uid}`;
const text = (v: unknown, max: number) => typeof v === "string" ? v.slice(0, max) : "";
export function safeEmployerDraft(input: Record<string, unknown>) {
  return {
    step: [3, 10, 11, 12].includes(Number(input.step)) ? Number(input.step) : 10,
    orgName: text(input.orgName, 200), empDescription: text(input.empDescription, 600),
    empServices: text(input.empServices, 500), empWebsite: text(input.empWebsite, 300),
    empProvince: text(input.empProvince, 80), empCity: text(input.empCity, 120),
    businessIdentity: (["indigenous", "non_indigenous"].includes(String(input.businessIdentity)) ? input.businessIdentity : "not_specified") as "indigenous" | "non_indigenous" | "not_specified",
    capabilities: Array.isArray(input.capabilities) ? input.capabilities.filter((v): v is string => ["post_jobs", "list_business", "host_events", "post_grants"].includes(v)).slice(0, 4) : [],
  };
}
export type EmployerDraft = ReturnType<typeof safeEmployerDraft>;
export function encodeEmployerDraft(uid: string, input: Record<string, unknown>, now = Date.now()) {
  return JSON.stringify({ version: 1, uid, savedAt: now, draft: safeEmployerDraft(input) });
}
export function decodeEmployerDraft(uid: string, raw: string | null, now = Date.now()): EmployerDraft | null {
  try {
    const value = JSON.parse(raw || "null");
    if (!value || value.version !== 1 || value.uid !== uid || !Number.isFinite(value.savedAt) || value.savedAt > now || now - value.savedAt > 30 * 86400000 || !value.draft || typeof value.draft !== "object") return null;
    return safeEmployerDraft(value.draft);
  } catch { return null; }
}
