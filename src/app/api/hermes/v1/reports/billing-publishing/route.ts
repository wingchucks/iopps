import { getAdminDb } from '@/lib/firebase-admin';
import { IOPPS_HERMES_ADMIN_PUBLIC_KEYS } from '@/lib/server/hermes-admin-public-key';
import { createFirebaseHermesFirestorePort, createHermesFirestoreAdapter } from '@/lib/server/hermes-firestore-adapter';
import { handleReconciliationRequest } from '@/lib/server/hermes-reconciliation-api';
import { createReconciliationAdapter } from '@/lib/server/hermes-reconciliation-firestore';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: Request): Promise<Response> {
  try {
    const db = getAdminDb();
    const nonce = createHermesFirestoreAdapter(createFirebaseHermesFirestorePort(db));
    return await handleReconciliationRequest(request, {
      publicKeys: IOPPS_HERMES_ADMIN_PUBLIC_KEYS,
      consumeNonce: nonce.consumeNonce,
      ...createReconciliationAdapter(db),
    });
  } catch {
    return Response.json({ ok: false, error: 'Reconciliation report unavailable' }, {
      status: 503, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
    });
  }
}
