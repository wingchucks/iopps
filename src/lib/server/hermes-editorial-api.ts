import { authenticateHermesJsonRequest } from "./hermes-admin-request.ts";
import { hashHermesBody, type HermesMachineAuthDeps } from "./hermes-machine-auth.ts";
import type { HermesExecutionContext } from "./hermes-firestore-adapter.ts";

interface EditorialApiDeps extends HermesMachineAuthDeps {
  repairKeys: readonly string[];
  service: { review: (value: unknown, keyId: string) => Promise<unknown>; apply: (value: unknown, execution: HermesExecutionContext) => Promise<unknown> };
}
// Only flat scalar envelopes are supported. Decode names before duplicate checking;
// JSON.parse alone silently collapses identical/escaped duplicate keys.
function uniqueFlatEnvelope(body: string): boolean {
  const text = body.trim();
  if (!text.startsWith("{") || !text.endsWith("}")) return false;
  const inner = text.slice(1, -1); const names = new Set<string>();
  const field = /\s*("(?:[^"\\\u0000-\u001f]|\\(?:["\\/bfnrt]|u[0-9a-fA-F]{4}))*")\s*:\s*("(?:[^"\\\u0000-\u001f]|\\(?:["\\/bfnrt]|u[0-9a-fA-F]{4}))*"|-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?)\s*(,|$)/gy;
  let cursor = 0;
  while (cursor < inner.length) {
    field.lastIndex = cursor; const match = field.exec(inner); if (!match) return false;
    const name = JSON.parse(match[1]) as string;
    if (names.has(name)) return false; names.add(name); cursor = field.lastIndex;
    if (match[3] === "," && !inner.slice(cursor).trim()) return false;
  }
  return names.size > 0;
}
function response(value: unknown, status = 200) {
  return Response.json(value, { status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
}
export async function handleEditorialRequest(request: Request, action: "review" | "apply", deps: EditorialApiDeps): Promise<Response> {
  const url = new URL(request.url);
  if (request.method !== "POST" || url.pathname !== `/api/hermes/v1/jobs/editorial/${action}` || url.search) return response({ error: "Invalid editorial endpoint" }, 400);
  try {
    const auth = await authenticateHermesJsonRequest(request, deps);
    if (!auth.ok) return response({error: auth.error}, auth.status);
    // Existing signing keys gain NO editorial permission merely by being registered.
    if (!deps.repairKeys.includes(auth.keyId)) return response({error: "Key is not authorized for this exact editorial repair"}, 403);
    if (!uniqueFlatEnvelope(auth.body)) return response({error: "A unique flat JSON envelope is required"}, 400);
    const result = action === "review" ? await deps.service.review(auth.json, auth.keyId) :
      await deps.service.apply(auth.json, {keyId: auth.keyId, idempotencyKey: auth.idempotencyKey, requestHash: hashHermesBody(auth.body)});
    return response(result);
  } catch (error) {
    const conflict = error && typeof error === "object" && "status" in error && error.status === 409;
    return response({error: conflict ? "Editorial review is stale or conflicted; inspect before retrying" : "Editorial operation failed; inspect state before retrying"}, conflict ? 409 : 500);
  }
}
