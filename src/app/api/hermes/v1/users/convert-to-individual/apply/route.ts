import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";
import {
  handleHermesAccountConversionApplyRequest,
  hermesAdminInternalErrorResponse,
} from "@/lib/server/hermes-admin-api";
import { cleanupHermesAccountConversionAuthClaims } from "@/lib/server/hermes-account-conversion-auth";
import { createHermesAccountConversionFirestoreAdapter } from "@/lib/server/hermes-account-conversion-firestore";
import { IOPPS_HERMES_ADMIN_PUBLIC_KEYS } from "@/lib/server/hermes-admin-public-key";
import { deriveHermesAdminReviewSecret } from "@/lib/server/hermes-admin-request";
import { createFirebaseHermesFirestorePort, createHermesFirestoreAdapter } from "@/lib/server/hermes-firestore-adapter";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  try {
    const port = createFirebaseHermesFirestorePort(getAdminDb());
    const nonceAdapter = createHermesFirestoreAdapter(port);
    const conversionAdapter = createHermesAccountConversionFirestoreAdapter(port, {
      cleanupAuthClaims: (userId) => cleanupHermesAccountConversionAuthClaims(getAdminAuth(), userId),
    });
    const reviewSecret = deriveHermesAdminReviewSecret();
    return await handleHermesAccountConversionApplyRequest(request, {
      publicKeys: IOPPS_HERMES_ADMIN_PUBLIC_KEYS,
      consumeNonce: nonceAdapter.consumeNonce,
      reviewSecret,
      getIdempotentConversionApply: conversionAdapter.getIdempotentApply,
      createAccountConversionServiceDeps: (execution) =>
        conversionAdapter.createServiceDeps({ reviewSecret, execution }),
    });
  } catch (error) {
    console.error("[hermes-admin] Conversion apply initialization failed:", error instanceof Error ? error.name : "UnknownError");
    return hermesAdminInternalErrorResponse();
  }
}
