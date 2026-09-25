// Keeps an unpublished job wizard resumable across checkout, cancellation and
// browser Back. The server draft is the durable copy; this per-tab snapshot
// restores the exact wizard step and fields when the owner returns in the tab.
export const JOB_WIZARD_RESUME_PARAM = "resume";
export type WizardFormStep = 0 | 1 | 2;
export type DraftPurchase = "standard-post" | "featured-post" | "plans";

export interface JobWizardSnapshot<TForm> {
  draftId: string;
  step: WizardFormStep;
  form: TForm;
  savedAt: number;
}

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const KEY_PREFIX = "iopps:job-wizard-resume:v1:";
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

export function isDraftId(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_-]{1,200}$/.test(value);
}

export function jobWizardResumePath(draftId: string): string {
  return `/org/dashboard/jobs/new?${new URLSearchParams({ [JOB_WIZARD_RESUME_PARAM]: draftId })}`;
}

export function savedDraftEditPath(draftId: string): string {
  return `/org/dashboard/jobs/${encodeURIComponent(draftId)}/edit`;
}

/** Where a purchase started from a saved draft goes; every return path resumes the draft. */
export function draftPurchaseHref(purchase: DraftPurchase, draftId: string): string {
  const redirect = jobWizardResumePath(draftId);
  if (purchase === "plans") return `/org/plans?${new URLSearchParams({ redirect })}`;
  return `/org/checkout?${new URLSearchParams({ plan: purchase, redirect })}`;
}

export function saveJobWizardSnapshot<TForm>(storage: StorageLike | null, uid: string, snapshot: JobWizardSnapshot<TForm>): boolean {
  if (!storage || !uid || !isDraftId(snapshot.draftId)) return false;
  try {
    storage.setItem(KEY_PREFIX + uid, JSON.stringify(snapshot));
    return true;
  } catch {
    return false; // Private mode or a full quota: the server draft still exists.
  }
}

/** Returns the snapshot for this owner and draft, or null when missing, stale or malformed. */
export function readJobWizardSnapshot<TForm extends object>(storage: StorageLike | null, uid: string, draftId: string, now = Date.now()): JobWizardSnapshot<TForm> | null {
  if (!storage || !uid || !isDraftId(draftId)) return null;
  try {
    const raw = storage.getItem(KEY_PREFIX + uid);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<JobWizardSnapshot<TForm>>;
    if (parsed.draftId !== draftId || ![0, 1, 2].includes(parsed.step as number)) return null;
    if (typeof parsed.savedAt !== "number" || now - parsed.savedAt > MAX_AGE_MS || parsed.savedAt > now + 60_000) return null;
    if (!parsed.form || typeof parsed.form !== "object" || Array.isArray(parsed.form)) return null;
    return parsed as JobWizardSnapshot<TForm>;
  } catch {
    return null;
  }
}

export function clearJobWizardSnapshot(storage: StorageLike | null, uid: string): void {
  if (!storage || !uid) return;
  try {
    storage.removeItem(KEY_PREFIX + uid);
  } catch {
    // Nothing to clear when storage is unavailable.
  }
}

export function sessionStorageOrNull(): StorageLike | null {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage;
  } catch {
    return null;
  }
}
