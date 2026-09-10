// No auth, database or provider work belongs in this pre-routing gate.
export function maintenanceResponse(pathname: string, setting: string | undefined, method = 'GET'): Response | null {
  if (setting === undefined || setting === 'off') return null;
  if (['GET','HEAD'].includes(method) && ['/api/launch-status','/sw.js'].includes(pathname)) return null;
  const headers = { 'Cache-Control': 'no-store', 'Retry-After': '120', 'X-IOPPS-Maintenance': 'paused' };
  if (pathname.startsWith('/api/')) {
    return Response.json({ error: 'IOPPS is temporarily unavailable for scheduled maintenance. Please retry shortly. Your request has not been processed.', code: 'MAINTENANCE' }, { status: 503, headers });
  }
  return new Response('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>IOPPS — Maintenance</title></head><body style="margin:0;background:#071e2a;color:#fff;font:18px system-ui;display:grid;min-height:100vh;place-items:center"><main style="max-width:36rem;padding:2rem"><p style="color:#5ee7ed;font-weight:700">IOPPS</p><h1>Temporarily unavailable</h1><p>We are completing scheduled maintenance. Please keep any unsaved text and refresh this page in a few minutes.</p><p>No submission or payment is confirmed by this page. If you already paid, do not pay again; wait for your original transaction to finish processing.</p></main></body></html>', { status: 503, headers: { ...headers, 'Content-Type': 'text/html; charset=utf-8', 'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; worker-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'" } });
}
