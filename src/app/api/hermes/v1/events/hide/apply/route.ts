import { FieldValue } from "firebase-admin/firestore";

import { getAdminDb } from "@/lib/firebase-admin";
import { handleHermesEventHideApplyRequest, hermesAdminInternalErrorResponse } from "@/lib/server/hermes-admin-api";
import { IOPPS_HERMES_ADMIN_PUBLIC_KEYS } from "@/lib/server/hermes-admin-public-key";
import { deriveHermesAdminReviewSecret } from "@/lib/server/hermes-admin-request";
import { createHermesEventHideFirestoreAdapter } from "@/lib/server/hermes-event-hide-firestore";
import { createFirebaseHermesFirestorePort, createHermesFirestoreAdapter } from "@/lib/server/hermes-firestore-adapter";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  try {
    const port = createFirebaseHermesFirestorePort(getAdminDb());
    const nonceAdapter = createHermesFirestoreAdapter(port);
    const eventAdapter = createHermesEventHideFirestoreAdapter(port, { timestampToken: () => FieldValue.serverTimestamp() });
    const reviewSecret = deriveHermesAdminReviewSecret();
    return await handleHermesEventHideApplyRequest(request, {
      publicKeys: IOPPS_HERMES_ADMIN_PUBLIC_KEYS,
      consumeNonce: nonceAdapter.consumeNonce,
      reviewSecret,
      getIdempotentEventHideApply: eventAdapter.getIdempotentApply,
      createEventHideServiceDeps: (execution) => eventAdapter.createServiceDeps({ reviewSecret, execution }),
    });
  } catch (error) {
    console.error("[hermes-admin] Event-hide apply initialization failed:", error instanceof Error ? error.name : "UnknownError");
    return hermesAdminInternalErrorResponse();
  }
}
