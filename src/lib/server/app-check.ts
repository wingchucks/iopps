import { getAppCheck } from "firebase-admin/app-check";
import { getAdminApp } from "@/lib/firebase-admin";
import { shouldEnforceAppCheck } from "@/lib/firebase/app-check-config";

// Only server-owned runtime settings may exempt attestation. Request headers
// and Next's constructed URL are not evidence that a server is local.
function isLocalRuntime(): boolean {
  if (process.env.VERCEL || process.env.VERCEL_ENV || process.env.K_SERVICE) return false;
  if (process.env.NODE_ENV === "development") return true;

  // Production-mode QA builds are allowed only against an explicit, consistent
  // demo project with all services on loopback and no Admin credentials.
  const emulatorFlag = process.env.NEXT_PUBLIC_USE_EMULATORS ?? process.env.USE_EMULATOR;
  const projects = [process.env.GCLOUD_PROJECT, process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID, process.env.FIREBASE_PROJECT_ID].filter(Boolean);
  const hosts = [process.env.FIRESTORE_EMULATOR_HOST, process.env.FIREBASE_AUTH_EMULATOR_HOST, process.env.FIREBASE_STORAGE_EMULATOR_HOST];
  return emulatorFlag === "true"
    && projects.length > 0
    && projects.every(project => /^demo-[a-z0-9-]+$/.test(project!) && project === projects[0])
    && hosts.every(host => /^(127\.0\.0\.1|localhost|\[::1\]):[0-9]{1,5}$/.test(host || "") && Number(host!.split(":").pop()) > 0 && Number(host!.split(":").pop()) <= 65535)
    && !process.env.FIREBASE_SERVICE_ACCOUNT_BASE64
    && !process.env.FIREBASE_CLIENT_EMAIL
    && !process.env.FIREBASE_PRIVATE_KEY
    && !process.env.GOOGLE_APPLICATION_CREDENTIALS;
}

export async function verifyRequiredAppCheckFromRequest(req: Request): Promise<boolean> {
  if (isLocalRuntime()) return true;
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
  const enforced = shouldEnforceAppCheck(
    process.env.NEXT_PUBLIC_FIREBASE_APP_CHECK_ENABLED,
    process.env.NEXT_PUBLIC_FIREBASE_APP_CHECK_SITE_KEY,
    "", // Server enforcement must not inherit the client's hostname exemption.
  );
  if (!enforced) return true;
  return verifyRequiredAppCheckFromRequest(req);
}
