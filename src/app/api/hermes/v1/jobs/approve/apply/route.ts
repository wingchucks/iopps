import { FieldValue } from "firebase-admin/firestore";

import { getAdminDb } from "@/lib/firebase-admin";
import {
  handleHermesJobApprovalApplyRequest,
  hermesAdminInternalErrorResponse,
} from "@/lib/server/hermes-admin-api";
import { IOPPS_HERMES_ADMIN_PUBLIC_KEYS } from "@/lib/server/hermes-admin-public-key";
import { deriveHermesAdminReviewSecret } from "@/lib/server/hermes-admin-request";
import { createFirebaseHermesFirestorePort, createHermesFirestoreAdapter } from "@/lib/server/hermes-firestore-adapter";
import { createHermesJobApprovalFirestoreAdapter } from "@/lib/server/hermes-job-approval-firestore";
import { refreshPublicJobs } from "@/lib/employer-job-cache";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  try {
    const port = createFirebaseHermesFirestorePort(getAdminDb());
    const nonceAdapter = createHermesFirestoreAdapter(port);
    const jobAdapter = createHermesJobApprovalFirestoreAdapter(port, {
      timestampToken: () => FieldValue.serverTimestamp(),
    });
    const reviewSecret = deriveHermesAdminReviewSecret();
    const response = await handleHermesJobApprovalApplyRequest(request, {
      publicKeys: IOPPS_HERMES_ADMIN_PUBLIC_KEYS,
      consumeNonce: nonceAdapter.consumeNonce,
      reviewSecret,
      getIdempotentJobApply: jobAdapter.getIdempotentApply,
      createJobApprovalServiceDeps: (execution) =>
        jobAdapter.createServiceDeps({ reviewSecret, execution }),
    });
    // An applied approval publishes the job; an idempotent replay only refreshes again.
    if (response.ok) refreshPublicJobs();
    return response;
  } catch (error) {
    console.error("[hermes-admin] Job apply initialization failed:", error instanceof Error ? error.name : "UnknownError");
    return hermesAdminInternalErrorResponse();
  }
}
