import { reconcileSnapshot } from './hermes-reconciliation-report.ts';
import { authenticateHermesMachineRequest, type HermesMachineAuthDeps } from './hermes-machine-auth.ts';

export const RECONCILIATION_PATH = '/api/hermes/v1/reports/billing-publishing';
export const COLLECTIONS = ['subscriptions', 'employers', 'organizations', 'jobs', 'posts', 'stripeWebhookEvents'] as const;
export type ReportCollection = typeof COLLECTIONS[number];
export interface ReportRecord { id: string; data: Record<string, unknown> }
export type ReportSnapshot = Record<ReportCollection, ReportRecord[]>;
export interface ReconciliationDeps extends HermesMachineAuthDeps {
  consumeReportBudget: (keyId: string) => Promise<boolean>;
  readSnapshot: () => Promise<ReportSnapshot>;
}
function json(payload: unknown, status = 200) {
  return Response.json(payload, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
}
export async function handleReconciliationRequest(request: Request, deps: ReconciliationDeps): Promise<Response> {
  try {
    const url = new URL(request.url);
    if (request.method !== 'POST' || url.pathname !== RECONCILIATION_PATH || url.search || url.hash) {
      return json({ ok: false, error: 'Report endpoint not found' }, 404);
    }
    const length = request.headers.get('content-length') ?? '';
    if (request.headers.get('content-type') !== 'application/json' || request.headers.has('content-encoding') ||
        request.headers.has('transfer-encoding') || !/^(0|[1-9][0-9]*)$/.test(length)) {
      return json({ ok: false, error: 'Invalid report request' }, 400);
    }
    if (!Number.isSafeInteger(Number(length)) || Number(length) > 128) return json({ ok: false, error: 'Body too large' }, 413);
    if (!request.body) return json({ ok: false, error: 'Report body required' }, 400);
    const reader = request.body.getReader();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let raw: Uint8Array;
    try {
      raw = await Promise.race([
        (async () => {
          const chunks: Uint8Array[] = []; let size = 0;
          for (;;) {
            const chunk = await reader.read(); if (chunk.done) break;
            size += chunk.value.byteLength;
            if (size > 128) throw new RangeError('Body too large');
            chunks.push(chunk.value);
          }
          return Buffer.concat(chunks);
        })(),
        new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('Body timeout')), 3000); }),
      ]);
    } catch (error) {
      return json({ ok: false, error: 'Report body rejected' }, error instanceof RangeError ? 413 : 408);
    } finally {
      clearTimeout(timer); void reader.cancel().catch(() => {});
    }
    if (raw.byteLength !== Number(length)) return json({ ok: false, error: 'Body length mismatch' }, 400);
    let body: string;
    try {
      if (raw[0] === 0xef && raw[1] === 0xbb && raw[2] === 0xbf) throw new Error('Noncanonical UTF-8');
      body = new TextDecoder('utf-8', { fatal: true }).decode(raw);
      if (!Buffer.from(body, 'utf8').equals(Buffer.from(raw))) throw new Error('Noncanonical UTF-8');
    }
    catch { return json({ ok: false, error: 'Invalid report body' }, 400); }
    const auth = await authenticateHermesMachineRequest({ method: request.method, url: request.url, body,
      headers: Object.fromEntries(request.headers.entries()) }, deps);
    if (!auth.ok) return json({ ok: false, error: auth.error }, auth.status);
    if (body !== '{"report":"billing-publishing-v1"}') return json({ ok: false, error: 'Invalid report contract' }, 400);
    if (!await deps.consumeReportBudget(auth.keyId)) return json({ ok: false, error: 'Report rate limit reached' }, 429);
    const snapshot = await deps.readSnapshot();
    return json({ ok: true, report: { ...reconcileSnapshot(snapshot), providerVerified: false, coverage: 'complete-six-collection-projected-snapshot',
      scanned: Object.fromEntries(COLLECTIONS.map(name => [name, snapshot[name].length])) } });
  } catch { return json({ ok: false, error: 'Reconciliation report unavailable' }, 503); }
}
