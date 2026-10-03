// The account lookup (/api/auth/account) can attach a notice for the person signing in, such
// as "your organization's workspace is no longer available". It is shown once, right after that
// sign-in, and only to that person: the auth context marks a sign-in made in this tab, the first
// account lookup after it keeps the notice for the same account (or drops the mark when there is
// none), and SignInNotice shows it on the page the person lands on, including after the login
// page's full-page redirect. Restored sessions and later lookups never show it again.
// Per tab, per account and short-lived; the notice text comes from our own API.

export const SIGN_IN_NOTICE_EVENT = "iopps:sign-in-notice";

const STORAGE_KEY = "iopps:sign-in-notice:v1";
const MAX_AGE_MS = 5 * 60 * 1000;
const MAX_NOTICE_LENGTH = 500;

type NoticeStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;
interface Entry { uid: string; at: number; notice?: string }

function tabStorage(): NoticeStorage | null {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage ?? null;
  } catch {
    return null;
  }
}

function clear(storage: NoticeStorage): void {
  try { storage.removeItem(STORAGE_KEY); } catch { /* Storage is optional. */ }
}

function write(storage: NoticeStorage, entry: Entry): void {
  // Private mode or a full quota: the notice is skipped and nothing else changes.
  try { storage.setItem(STORAGE_KEY, JSON.stringify(entry)); } catch { /* Storage is optional. */ }
}

function read(storage: NoticeStorage, now: number): Entry | null {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (raw === null) return null;
    const entry = JSON.parse(raw) as Partial<Entry> | null;
    if (entry && typeof entry.uid === "string" && entry.uid && typeof entry.at === "number" &&
      now - entry.at <= MAX_AGE_MS && entry.at <= now + 60_000 &&
      (entry.notice === undefined || typeof entry.notice === "string")) {
      return { uid: entry.uid, at: entry.at, ...(entry.notice === undefined ? {} : { notice: entry.notice }) };
    }
  } catch { /* Malformed or unreadable: start clean. */ }
  clear(storage);
  return null;
}

/** Auth context: this person just signed in in this tab. Replaces any earlier mark or notice. */
export function markSignIn(uid: string, now = Date.now(), storage = tabStorage()): void {
  if (!storage || !uid) return;
  write(storage, { uid, at: now });
}

/**
 * Every page that reads /api/auth/account calls this with the response. Only the first
 * lookup after a sign-in in this tab, for the same account, keeps its notice.
 */
export function rememberSignInNotice(uid: string | undefined, account: unknown, now = Date.now(), storage = tabStorage()): void {
  if (!storage || !uid) return;
  const entry = read(storage, now);
  // No sign-in in this tab (a restored session), or its notice is already waiting to be shown.
  if (!entry || entry.notice !== undefined) return;
  const notice = account && typeof account === "object" ? (account as { notice?: unknown }).notice : undefined;
  if (entry.uid !== uid || typeof notice !== "string" || !notice.trim() || notice.length > MAX_NOTICE_LENGTH) {
    clear(storage);
    return;
  }
  write(storage, { uid, at: now, notice: notice.trim() });
  try {
    window.dispatchEvent(new Event(SIGN_IN_NOTICE_EVENT));
  } catch { /* SignInNotice still finds it on the next page. */ }
}

/** SignInNotice: the kept notice for this account, once. Another account's notice is dropped unseen. */
export function takeSignInNotice(uid: string, now = Date.now(), storage = tabStorage()): string | null {
  if (!storage || !uid) return null;
  const entry = read(storage, now);
  // A bare mark waits for its account lookup.
  if (!entry || entry.notice === undefined) return null;
  clear(storage);
  return entry.uid === uid ? entry.notice : null;
}
