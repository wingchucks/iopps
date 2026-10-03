import { auth } from "./firebase";

// Jobs, applications, employer data and public listings are server-only under
// firestore.rules. The app uses the same website APIs as the site, which apply the
// same access checks to both.
export const API_BASE = (process.env.EXPO_PUBLIC_API_URL || "https://www.iopps.ca").replace(/\/+$/, "");

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

export interface ApiRequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  /** Send the signed-in member's Firebase ID token. */
  signedIn?: boolean;
  signal?: AbortSignal;
}

/** JSON from the website's API; failures throw ApiError with the API's own message. */
export async function apiRequest<T>(
  path: string,
  { method = "GET", body, signedIn = false, signal }: ApiRequestOptions = {}
): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (signedIn) {
    const user = auth.currentUser;
    if (!user) throw new ApiError("Please sign in to continue.", 401);
    headers.Authorization = `Bearer ${await user.getIdToken()}`;
  }
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    signal,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const record = (payload && typeof payload === "object" ? payload : {}) as { error?: unknown; code?: unknown };
    throw new ApiError(
      typeof record.error === "string" && record.error ? record.error : "Something went wrong. Please try again.",
      response.status,
      typeof record.code === "string" ? record.code : undefined
    );
  }
  return payload as T;
}
