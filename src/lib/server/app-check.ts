import { getAppCheck } from "firebase-admin/app-check";
import { getAdminApp } from "@/lib/firebase-admin";

function isLocalRequest(req: Request): boolean {
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
  return host.includes("localhost") || host.includes("127.0.0.1");
}

export async function verifyAppCheckFromRequest(req: Request): Promise<boolean> {
  if (isLocalRequest(req)) return true;

  const appCheckToken = req.headers.get("X-Firebase-AppCheck") || req.headers.get("x-firebase-appcheck");
  if (!appCheckToken) return false;

  try {
    await getAppCheck(getAdminApp()).verifyToken(appCheckToken);
    return true;
  } catch {
    return false;
  }
}
