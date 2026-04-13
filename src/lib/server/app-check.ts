import { getAppCheck } from "firebase-admin/app-check";
import { getAdminApp } from "@/lib/firebase-admin";

export type AppCheckVerificationResult = {
  ok: boolean;
  reason: "local" | "missing" | "verified" | "invalid";
};

function isLocalRequest(req: Request): boolean {
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
  return host.includes("localhost") || host.includes("127.0.0.1");
}

export async function getAppCheckVerificationResult(req: Request): Promise<AppCheckVerificationResult> {
  if (isLocalRequest(req)) {
    return { ok: true, reason: "local" };
  }

  const appCheckToken = req.headers.get("X-Firebase-AppCheck") || req.headers.get("x-firebase-appcheck");
  if (!appCheckToken) {
    return { ok: false, reason: "missing" };
  }

  try {
    await getAppCheck(getAdminApp()).verifyToken(appCheckToken);
    return { ok: true, reason: "verified" };
  } catch {
    return { ok: false, reason: "invalid" };
  }
}

export async function verifyAppCheckFromRequest(req: Request): Promise<boolean> {
  const result = await getAppCheckVerificationResult(req);
  return result.ok;
}
