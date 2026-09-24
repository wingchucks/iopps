import { getAdminDb } from '@/lib/firebase-admin';
import { IOPPS_HERMES_ADMIN_PUBLIC_KEYS } from '@/lib/server/hermes-admin-public-key';
import { createFirebaseHermesFirestorePort, createHermesFirestoreAdapter } from '@/lib/server/hermes-firestore-adapter';
import { handleImportInventoryRequest } from '@/lib/server/hermes-import-inventory-api';
import { createImportInventoryAdapter } from '@/lib/server/hermes-import-inventory-firestore';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;
const REPORT_KEY_IDS = ['hermes-nathan-primary'] as const;

export async function POST(request: Request): Promise<Response> {
  try {
    const db = getAdminDb();
    const nonce = createHermesFirestoreAdapter(createFirebaseHermesFirestorePort(db));
    const publicKeys: Record<string,string> = {};
    for (const key of REPORT_KEY_IDS) if (Object.hasOwn(IOPPS_HERMES_ADMIN_PUBLIC_KEYS,key)) publicKeys[key] = IOPPS_HERMES_ADMIN_PUBLIC_KEYS[key];
    return await handleImportInventoryRequest(request, {
      publicKeys, reportKeyIds: REPORT_KEY_IDS, consumeNonce: nonce.consumeNonce,
      ...createImportInventoryAdapter(db),
    });
  } catch {
    return Response.json({ ok:false, error:'Import inventory unavailable' }, {
      status:503, headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'},
    });
  }
}
