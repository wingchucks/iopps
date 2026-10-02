/** A failed organization-workspace API call, in words the dashboard can show. */
export interface EmployerRequestFailure {
  status: number;
  message: string;
  /** Machine-readable reason from the API, e.g. "payment_required" or "session_expired". */
  code: string | null;
}

const STATUS_MESSAGES: Record<number, string> = {
  401: "Your session has expired. Sign in again to continue.",
  503: "IOPPS is temporarily unavailable. Please try again in a moment.",
};

// Firebase client errors that mean the stored sign-in can no longer be refreshed.
const SESSION_ERROR_CODES = new Set(["auth/user-token-expired", "auth/invalid-user-token", "auth/user-disabled", "auth/requires-recent-login"]);

/** True for a Firebase client error (e.g. from getIdToken(true)) that needs a fresh sign-in. */
export function isSessionErrorCode(error: unknown): boolean {
  return Boolean(error && typeof error === "object" && "code" in error && SESSION_ERROR_CODES.has(String((error as { code?: unknown }).code)));
}

/** Reads the API's JSON error ({ error, code }); never shows raw response text. */
export async function readEmployerRequestFailure(response: Response, fallback: string): Promise<EmployerRequestFailure> {
  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }
  const record = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const message = typeof record.error === "string" && record.error.trim() ? record.error.trim() : STATUS_MESSAGES[response.status] ?? fallback;
  return { status: response.status, message, code: typeof record.code === "string" ? record.code : null };
}

/** The session can't be used any more: the person has to sign in again. */
export function isSessionFailure(failure: Pick<EmployerRequestFailure, "status">): boolean {
  return failure.status === 401;
}

/** Sign-in page that explains the expired session and returns here afterwards. */
export function sessionExpiredLoginHref(returnTo: string): string {
  return `/login?${new URLSearchParams({ reason: "expired", redirect: returnTo })}`;
}

/** Only the organization's owner account can buy credits or plans (checkout enforces the same rule). */
export function canBuyForOrganization(profile: { uid?: string; orgId?: string; orgRole?: string } | null | undefined): boolean {
  return Boolean(profile?.uid && profile.uid === profile.orgId && profile.orgRole === "owner");
}
