// Anonymous role/step only. Never use this as authentication or consent.
// Keep the original storage slot so reads can purge legacy PII-bearing drafts.
export const SIGNUP_DRAFT_KEY = "iopps:signup-draft:v1";
export const SIGNUP_DRAFT_TTL = 30 * 60 * 1000;
export interface SignupDraft {
  role: "" | "community" | "organization";
  orgType: "" | "employer" | "school";
  step: 1 | 2;
}
interface StoredDraft extends SignupDraft { version: 2; expiresAt: number }
export function readSignupDraft(now = Date.now()): StoredDraft | null {
  try {
    const raw = sessionStorage.getItem(SIGNUP_DRAFT_KEY);
    if (raw === null) return null;
    const draft = JSON.parse(raw);
    if (!draft || draft.version !== 2 || !Number.isFinite(draft.expiresAt) || draft.expiresAt <= now || draft.expiresAt > now + SIGNUP_DRAFT_TTL ||
      Object.keys(draft).some(key => !["version", "expiresAt", "role", "orgType", "step"].includes(key)) ||
      !["", "community", "organization"].includes(draft.role) || !["", "employer", "school"].includes(draft.orgType) ||
      ![1, 2].includes(draft.step) ||
      (draft.role !== "organization" && draft.orgType !== "") || (draft.step === 2 && (!draft.role || (draft.role === "organization" && !draft.orgType)))) {
      clearSignupDraft(); return null;
    }
    return { version: 2, expiresAt: draft.expiresAt, role: draft.role, orgType: draft.orgType, step: draft.step };
  } catch { clearSignupDraft(); return null; }
}
export function clearSignupDraft() {
  try { sessionStorage.removeItem(SIGNUP_DRAFT_KEY); } catch { /* Optional storage. */ }
}
export function saveSignupDraft(draft: SignupDraft, expiresAt: number, now = Date.now()) {
  // Select literal enum values: untrusted strings never reach the storage sink.
  const role = draft?.role === "community" ? "community" : draft?.role === "organization" ? "organization" : draft?.role === "" ? "" : null;
  const orgType = draft?.orgType === "employer" ? "employer" : draft?.orgType === "school" ? "school" : draft?.orgType === "" ? "" : null;
  const step = draft?.step === 1 ? 1 : draft?.step === 2 ? 2 : null;
  if (!Number.isFinite(expiresAt) || !Number.isFinite(now) || expiresAt <= now || expiresAt > now + SIGNUP_DRAFT_TTL ||
    role === null || orgType === null || step === null ||
    (role !== "organization" && orgType !== "") || (step === 2 && (!role || (role === "organization" && !orgType)))) {
    clearSignupDraft(); return;
  }
  try {
    sessionStorage.setItem(SIGNUP_DRAFT_KEY, JSON.stringify({ version: 2, expiresAt, role, orgType, step }));
  } catch { /* Storage denial must not prevent account creation. */ }
}
