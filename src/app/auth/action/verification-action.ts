import { safeAuthRedirect } from "@/lib/auth-redirect";

export async function validateResetAction(query: URLSearchParams, check: (code: string) => Promise<string>): Promise<string> {
  const code = query.get("oobCode");
  if (query.getAll("mode").length !== 1 || query.get("mode") !== "resetPassword" ||
      query.getAll("oobCode").length !== 1 || !code || /\s/.test(code)) throw new Error("Invalid reset link");
  await check(code);
  return code;
}

export function resetContinuePath(value: string | null, origin: string): string {
  if (!value || /[\\\u0000-\u0020]/.test(value)) return "/login";
  try {
    const url = new URL(value, origin);
    if (url.origin !== origin || url.username || url.password) return "/login";
    const path = safeAuthRedirect(url.pathname + url.search);
    if (!path || /^\/(?:auth|login|signup|forgot-password|verify-email)(?:\/|\?|$)/.test(path)) return "/login";
    return `/login?${new URLSearchParams({ redirect: path })}`;
  } catch { return "/login"; }
}

type VerificationAdapter = {
  check(code: string): Promise<{ operation: string }>;
  apply(code: string): Promise<void>;
};

/** Never infer verification from query flags or accept another email action type. */
export async function completeVerificationAction(query: URLSearchParams, adapter: VerificationAdapter): Promise<void> {
  const code = query.get("oobCode");
  if (query.getAll("mode").length !== 1 || query.get("mode") !== "verifyEmail" ||
      query.getAll("oobCode").length !== 1 || !code || /\s/.test(code)) {
    throw new Error("Invalid verification link");
  }
  const info = await adapter.check(code);
  if (info.operation !== "VERIFY_EMAIL") throw new Error("Invalid verification link");
  await adapter.apply(code);
}

/** Only our existing verification/session-refresh page may receive continuation state. */
export function verificationContinuePath(value: string | null, origin: string): string {
  const fallback = "/verify-email?next=%2Fsetup";
  if (!value || /[\\\u0000-\u0020]/.test(value)) return fallback;
  try {
    const url = new URL(value, origin);
    if (url.origin !== origin || url.username || url.password || url.pathname !== "/verify-email") return fallback;
    const next = safeAuthRedirect(url.searchParams.get("next"));
    if (!next || !safeAuthRedirect(decodeURIComponent(next))) return fallback;
    const destination = new URL(next, origin);
    if (destination.origin !== origin || /^\/(verify-email|auth\/action)(?:\/|$)/.test(destination.pathname)) return fallback;
    return `/verify-email?${new URLSearchParams({ next })}`;
  } catch { return fallback; }
}
