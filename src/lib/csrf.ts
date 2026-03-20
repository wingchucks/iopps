import { NextRequest } from "next/server";

/**
 * Validates that the request origin matches the expected host.
 * Defense-in-depth alongside SameSite=Lax cookies.
 */
export function validateOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  const host = req.headers.get("host");

  // Non-browser requests (cURL, Postman) may not send Origin
  if (!origin) return true;

  try {
    const originHost = new URL(origin).host;
    return originHost === host;
  } catch {
    return false;
  }
}
