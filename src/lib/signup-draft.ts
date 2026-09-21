// Anonymous account-step draft only. Never use this as authentication or consent.
export const SIGNUP_DRAFT_KEY = "iopps:signup-draft:v1";
export const SIGNUP_DRAFT_TTL = 30 * 60 * 1000;
export interface SignupDraft {
  role: "" | "community" | "organization";
  orgType: "" | "employer" | "school";
  step: 1 | 2;
  name: string;
  email: string;
}
interface StoredDraft extends SignupDraft { version: 1; expiresAt: number }
export function readSignupDraft(now = Date.now()): StoredDraft | null {
  try {
    const raw = sessionStorage.getItem(SIGNUP_DRAFT_KEY);
    if (!raw) return null;
    const draft = JSON.parse(raw);
    if (draft.version !== 1 || !Number.isFinite(draft.expiresAt) || draft.expiresAt <= now || draft.expiresAt > now + SIGNUP_DRAFT_TTL ||
      !["", "community", "organization"].includes(draft.role) || !["", "employer", "school"].includes(draft.orgType) ||
      ![1, 2].includes(draft.step) || typeof draft.name !== "string" || draft.name.length > 200 || typeof draft.email !== "string" || draft.email.length > 320 ||
      (draft.role !== "organization" && draft.orgType !== "") || (draft.step === 2 && (!draft.role || (draft.role === "organization" && !draft.orgType)))) {
      clearSignupDraft(); return null;
    }
    return { version: 1, expiresAt: draft.expiresAt, role: draft.role, orgType: draft.orgType, step: draft.step, name: draft.name, email: draft.email };
  } catch { clearSignupDraft(); return null; }
}
export function clearSignupDraft() {
  try { sessionStorage.removeItem(SIGNUP_DRAFT_KEY); } catch { /* Optional storage. */ }
}
export function saveSignupDraft(draft: SignupDraft, expiresAt: number, now = Date.now()) {
  if (expiresAt <= now) { clearSignupDraft(); return; }
  try {
    sessionStorage.setItem(SIGNUP_DRAFT_KEY, JSON.stringify({ version: 1, expiresAt,
      role: draft.role, orgType: draft.orgType, step: draft.step,
      name: draft.name.slice(0, 200), email: draft.email.slice(0, 320),
    }));
  } catch { /* Storage denial must not prevent account creation. */ }
}
