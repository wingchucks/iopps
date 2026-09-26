// "Back to Jobs" should return to the same search: query, filters, sort, page and scroll.
// Directory pages keep that state in their URL; this remembers the URL and scroll position
// for the tab when a listing is opened. Nothing personal is stored.
export type Directory = "jobs" | "businesses";

const MAX_AGE_MS = 2 * 60 * 60 * 1000;
const storageKey = (directory: Directory) => `iopps:directory-return:${directory}`;

interface SavedPosition { url: string; scrollY: number; at: number }

function storage(): Storage | null {
  try { return typeof window === "undefined" ? null : window.sessionStorage; } catch { return null; }
}

function read(directory: Directory): SavedPosition | null {
  try {
    const saved = JSON.parse(storage()?.getItem(storageKey(directory)) || "null") as SavedPosition | null;
    if (!saved || typeof saved.url !== "string" || typeof saved.at !== "number" || Date.now() - saved.at > MAX_AGE_MS) return null;
    // Only the directory page itself, never another path or site.
    const url = new URL(saved.url, "https://iopps.invalid");
    return url.origin === "https://iopps.invalid" && url.pathname === `/${directory}` ? { ...saved, url: url.pathname + url.search } : null;
  } catch { return null; }
}

/** Call when a listing is opened from a directory page. */
export function rememberDirectoryPosition(directory: Directory) {
  try {
    storage()?.setItem(storageKey(directory), JSON.stringify({ url: window.location.pathname + window.location.search, scrollY: Math.round(window.scrollY), at: Date.now() }));
  } catch { /* Storage can be unavailable; the plain directory link still works. */ }
}

/** Where "Back to …" should go: the remembered search, or the directory itself. */
export function directoryReturnHref(directory: Directory): string {
  return read(directory)?.url ?? `/${directory}`;
}

/** On the directory page, once results are shown, return to the remembered scroll position. */
export function restoreDirectoryScroll(directory: Directory) {
  const saved = read(directory);
  if (!saved || !saved.scrollY || saved.url !== window.location.pathname + window.location.search) return;
  window.scrollTo({ top: saved.scrollY });
  try { storage()?.setItem(storageKey(directory), JSON.stringify({ ...saved, scrollY: 0 })); } catch { /* ignore */ }
}
