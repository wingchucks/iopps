import { getAdminDb } from "@/lib/firebase-admin";
import { IOPPS_HERMES_ADMIN_PUBLIC_KEYS } from "@/lib/server/hermes-admin-public-key";
import { deriveHermesAdminReviewSecret } from "@/lib/server/hermes-admin-request";
import { createFirebaseHermesFirestorePort, createHermesFirestoreAdapter } from "@/lib/server/hermes-firestore-adapter";
import { createEditorialRepair } from "@/lib/server/hermes-editorial-repair";
import { handleEditorialRequest } from "@/lib/server/hermes-editorial-api";
import { normalizeImportedDescription } from "@/lib/server/imported-job-descriptions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request: Request): Promise<Response> {
  try {
    const port = createFirebaseHermesFirestorePort(getAdminDb());
    return await handleEditorialRequest(request, "apply", {
      publicKeys: IOPPS_HERMES_ADMIN_PUBLIC_KEYS,
      consumeNonce: createHermesFirestoreAdapter(port).consumeNonce,
      // Explicit, repair-specific opt-in. Never modifies the existing global key policy.
      repairKeys: (process.env.HERMES_SIGA_PAYROLL_EDITORIAL_KEY_IDS ?? "").split(",").map(k => k.trim()).filter(Boolean),
      service: createEditorialRepair(port, { secret: deriveHermesAdminReviewSecret(), normalize: normalizeImportedDescription }),
    });
  } catch {
    return Response.json({error: "Editorial operation unavailable"}, {status: 503, headers: {"Cache-Control": "no-store"}});
  }
}
