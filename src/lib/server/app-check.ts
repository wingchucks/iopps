import { getAppCheck } from "firebase-admin/app-check";
import { getAdminApp } from "@/lib/firebase-admin";
import { shouldEnforceAppCheck } from "@/lib/firebase/app-check-config";

function requestHostname(req: Request): string {
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
  return host.split(":")[0].toLowerCase();
}

export async function verifyRequiredAppCheckFromRequest(req: Request): Promise<boolean> {
  const hostname = requestHostname(req);
  if (hostname === "localhost" || hostname === "127.0.0.1") return true;

  const appCheckToken = req.headers.get("X-Firebase-AppCheck") || req.headers.get("x-firebase-appcheck");
  if (!appCheckToken) return false;

  try {
    await getAppCheck(getAdminApp()).verifyToken(appCheckToken);
    return true;
  } catch {
    return false;
  }
}

export async function verifyAppCheckFromRequest(req: Request): Promise<boolean> {
  const hostname = requestHostname(req);
  const enforced = shouldEnforceAppCheck(
    process.env.NEXT_PUBLIC_FIREBASE_APP_CHECK_ENABLED,
    process.env.NEXT_PUBLIC_FIREBASE_APP_CHECK_SITE_KEY,
    hostname,
  );
  if (!enforced) return true;
  return verifyRequiredAppCheckFromRequest(req);
}
