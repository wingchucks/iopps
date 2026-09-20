import assert from "node:assert/strict";
import test from "node:test";
import { generateKeyPairSync, sign, randomBytes } from "node:crypto";
import { handleEditorialRequest } from "../src/lib/server/hermes-editorial-api.ts";
import { buildHermesCanonicalRequest } from "../src/lib/server/hermes-machine-auth.ts";
import { createEditorialRepair, REPAIR, CONFIRMATION, editorialDigest } from "../src/lib/server/hermes-editorial-repair.ts";

test("preservation fingerprints distinguish Firestore value types", () => {
  assert.notEqual(editorialDigest({ value: NaN }), editorialDigest({ value: null }));
  assert.notEqual(editorialDigest({ value: new Date("2026-01-01T00:00:00Z") }), editorialDigest({value: "2026-01-01T00:00:00.000Z"}));
  assert.equal(editorialDigest({b: 2, a: 1}), editorialDigest({a: 1, b: 2}));
});
import type { HermesFirestorePort, HermesFirestorePortTransaction } from "../src/lib/server/hermes-firestore-adapter.ts";

// Entirely fictional stored records; allowlisted selectors are configuration, not a live snapshot.
function fixture() {
  const data = { title: REPAIR.title, employerName: REPAIR.employer, externalUrl: REPAIR.urls[0], slug: REPAIR.slug,
    description: REPAIR.original, descriptionFormat: "plain-text", active: true, status: "active",
    employerId: "fictional-employer", feedId: "fictional-feed", privateFixture: { keep: [1, 2] } };
  const store = new Map<string, { id: string; version: string; data: Record<string, unknown> }>();
  store.set(`jobs/${REPAIR.jobId}`, { id: REPAIR.jobId, version: "fictional-v1", data });
  store.set("rssFeeds/fictional-feed", {id: "fictional-feed", version: "fictional-feed-v1", data: { employerId: "fictional-employer", feedUrl: "https://fictional.example/source" }});
  let writes = 0; let drop = false; let beforeTransaction = () => {};
  const get = async (c: string, id: string) => structuredClone(store.get(`${c}/${id}`) ?? null);
  const port: HermesFirestorePort = { getDocument: get, queryExact: async () => [], queryExactFields: async () => [],
    async runTransaction<T>(fn: (tx: HermesFirestorePortTransaction) => Promise<T>) {
      beforeTransaction(); const queued: (() => void)[] = []; let writing = false;
      const result = await fn({ getDocument: async (c,id) => { assert.equal(writing, false); return get(c,id); },
        updateDocument(c,id,patch) { writing = true; queued.push(() => { writes++; if (!drop) store.set(`${c}/${id}`, { id, version: "fictional-v2", data: {...store.get(`${c}/${id}`)!.data, ...patch} }); }); },
        setDocument(c,id,d) { writing = true; queued.push(() => store.set(`${c}/${id}`, { id, version: "fixture", data: d })); } });
      queued.forEach(fn => fn()); return result;
    } };
  let clock = 1800000000000;
  const execution = { keyId: "fixture-key", idempotencyKey: "fixture-apply", requestHash: "a".repeat(64) };
  const service = createEditorialRepair(port, { secret: "s".repeat(64), now: () => clock });
  return { data, store, service, execution, writes: () => writes, drop: () => {drop = true;},
    advance: () => {clock += 601000;}, race: (fn: () => void) => {beforeTransaction = fn;} };
}
const command = { repairId: "siga-payroll-possessive-v1" };

for (const drift of ["version", "description", "externalUrl", "employerName", "title", "slug", "unrelated", "mirror", "expiry", "token", "confirmation", "repairId", "key"]) {
  test(`rejects ${drift} drift without writes`, async () => {
    const f = fixture(); const r = await f.service.review(command, f.execution.keyId);
    const body = { ...command, expiresAt: r.expiresAt, reviewToken: r.reviewToken, confirmation: CONFIRMATION };
    const doc = f.store.get(`jobs/${REPAIR.jobId}`)!;
    if (drift === "version") doc.version = "fictional-v9";
    else if (["description", "externalUrl", "employerName", "title", "slug", "unrelated"].includes(drift)) doc.data[drift] = "fictional-drift";
    else if (drift === "mirror") f.store.set(`posts/${REPAIR.jobId}`, structuredClone(doc));
    else if (drift === "expiry") f.advance();
    else if (drift === "token") body.reviewToken = "0".repeat(64);
    else if (drift === "confirmation") body.confirmation = "wrong";
    else if (drift === "repairId") body.repairId = "other";
    else f.execution.keyId = "another-fixture-key";
    await assert.rejects(f.service.apply(body, f.execution)); assert.equal(f.writes(), 0);
  });
}
test("source feed changes invalidate review and subsequent readback", async () => {
  const f = fixture(); const r = await f.service.review(command, f.execution.keyId);
  f.store.get("rssFeeds/fictional-feed")!.data.feedUrl = "https://fictional.example/changed-source";
  await assert.rejects(f.service.apply({...command, expiresAt: r.expiresAt, reviewToken: r.reviewToken, confirmation: CONFIRMATION}, f.execution));
  assert.equal(f.writes(), 0);
});

test("transaction race is rejected and dropped writes fail readback", async () => {
  for (const race of [true, false]) {
    const f = fixture(); const r = await f.service.review(command, f.execution.keyId);
    if (race) f.race(() => {f.store.get(`jobs/${REPAIR.jobId}`)!.version = "raced";}); else f.drop();
    await assert.rejects(f.service.apply({ ...command, expiresAt: r.expiresAt, reviewToken: r.reviewToken, confirmation: CONFIRMATION }, f.execution));
    assert.equal(f.writes(), race ? 0 : 1);
  }
});
test("reject arbitrary commands, conflicting idempotency and drifted retries", async () => {
  const f = fixture(); await assert.rejects(f.service.review({...command, description: "arbitrary"}, f.execution.keyId));
  const r = await f.service.review(command, f.execution.keyId);
  const body = {...command, expiresAt: r.expiresAt, reviewToken: r.reviewToken, confirmation: CONFIRMATION};
  await f.service.apply(body, f.execution);
  await assert.rejects(f.service.apply(body, {...f.execution, requestHash: "b".repeat(64)}));
  f.store.get(`jobs/${REPAIR.jobId}`)!.data.privateFixture = "lost";
  await assert.rejects(f.service.apply(body, f.execution)); assert.equal(f.writes(), 1);
});

test("offline signed review/apply traverses auth, token, transaction and readback", async () => {
  const f = fixture(); const keys = generateKeyPairSync("ed25519"); const nonces = new Set<string>();
  const deps = { publicKeys: {"fixture-key": keys.publicKey.export({type: "spki", format: "pem"}).toString()},
    now: () => 1800000000000, repairKeys: ["fixture-key"], service: f.service,
    consumeNonce: async ({nonceHash}: {nonceHash: string}) => {if(nonces.has(nonceHash)) return false; nonces.add(nonceHash); return true;} };
  async function invoke(action: "review" | "apply", value: unknown) {
    const body = JSON.stringify(value), timestamp = "1800000000", nonce = randomBytes(24).toString("base64url");
    const url = `https://fictional.example/api/hermes/v1/jobs/editorial/${action}`;
    const signature = sign(null, Buffer.from(buildHermesCanonicalRequest({method: "POST", url, timestamp, nonce, body, idempotencyKey: `fixture-${action}`})), keys.privateKey).toString("base64url");
    return handleEditorialRequest(new Request(url, {method: "POST", body, headers: {
      "content-type": "application/json", "content-length": String(Buffer.byteLength(body)), "x-hermes-key-id": "fixture-key",
      "x-hermes-nonce": nonce, "x-hermes-timestamp": timestamp, "x-hermes-signature": signature, "x-hermes-idempotency-key": `fixture-${action}`,
    }}), action, deps);
  }
  const review = await invoke("review", command); assert.equal(review.status, 200);
  const reviewed = await review.json();
  const body = {...command, reviewToken: reviewed.reviewToken, expiresAt: reviewed.expiresAt, confirmation: CONFIRMATION};
  const applied = await invoke("apply", body); assert.equal(applied.status, 200);
  assert.equal((await applied.json()).verified.description, REPAIR.replacement);
  assert.equal((await invoke("apply", body)).status, 200); assert.equal(f.writes(), 1);
});

test("review actual version, apply exact repair, preserve unrelated data, audit and independently reread retry", async () => {
  const f = fixture();
  const review = await f.service.review(command, f.execution.keyId);
  assert.equal(review.current, REPAIR.original);
  const body = { ...command, expiresAt: review.expiresAt, reviewToken: review.reviewToken, confirmation: CONFIRMATION };
  const result = await f.service.apply(body, f.execution);
  assert.equal(result.status, "applied"); assert.equal(result.verified.description, REPAIR.replacement);
  const stored = f.store.get(`jobs/${REPAIR.jobId}`)!.data;
  assert.deepEqual(stored, { ...f.data, description: REPAIR.replacement, editorialCorrection: stored.editorialCorrection });
  assert.equal((stored.editorialCorrection as Record<string, unknown>).kind, "user-approved-editorial");
  assert.equal(f.writes(), 1);
  assert.equal((await f.service.apply(body, f.execution)).verified.description, REPAIR.replacement);
  assert.equal(f.writes(), 1);
  const audits = [...f.store].filter(([key]) => key.startsWith("hermesAdminAudit/"));
  assert.equal(audits.length, 1); assert.ok(!JSON.stringify(audits).includes(review.reviewToken));
});
