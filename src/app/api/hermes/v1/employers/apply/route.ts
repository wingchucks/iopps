import { getAdminDb } from "@/lib/firebase-admin";
import {
  handleHermesEmployerApplyRequest,
  hermesAdminInternalErrorResponse,
} from "@/lib/server/hermes-admin-api";
import { IOPPS_HERMES_ADMIN_PUBLIC_KEYS } from "@/lib/server/hermes-admin-public-key";
import { deriveHermesAdminReviewSecret } from "@/lib/server/hermes-admin-request";
import {
  createFirebaseHermesFirestorePort,
  createHermesFirestoreAdapter,
} from "@/lib/server/hermes-firestore-adapter";
import { refreshPublicPartners } from "@/lib/public-partner-cache";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  try {
    const adapter = createHermesFirestoreAdapter(createFirebaseHermesFirestorePort(getAdminDb()));
    const reviewSecret = deriveHermesAdminReviewSecret();
    const response = await handleHermesEmployerApplyRequest(request, {
      publicKeys: IOPPS_HERMES_ADMIN_PUBLIC_KEYS,
      consumeNonce: adapter.consumeNonce,
      reviewSecret,
      getIdempotentApply: adapter.getIdempotentApply,
      createEmployerServiceDeps: (execution) =>
        adapter.createEmployerServiceDeps({ reviewSecret, execution }),
    });
    // An applied grant approves the organization and replaces its subscription.
    if (response.ok) refreshPublicPartners();
    return response;
  } catch (error) {
    console.error(
      "[hermes-admin] Apply request initialization failed:",
      error instanceof Error ? error.name : "UnknownError",
    );
    return hermesAdminInternalErrorResponse();
  }
}
