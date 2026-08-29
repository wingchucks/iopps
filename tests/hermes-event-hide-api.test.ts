import assert from "node:assert/strict";
import { generateKeyPairSync, sign } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  handleHermesEventHideApplyRequest,
  handleHermesEventHideReviewRequest,
  type HermesEventHideApiDeps,
} from "../src/lib/server/hermes-admin-api.ts";
import { buildHermesCanonicalRequest } from "../src/lib/server/hermes-machine-auth.ts";

const { privateKey, publicKey } = generateKeyPairSync("ed25519");
const publicKeyPem = publicKey.export({ type: "spki", format: "pem" }).toString();
const nowSeconds = 1_788_004_800;
const command = { eventId: "OJfFAuFhEn4IW2DFOOKE", title: "Conference", organization: "IOPPS", type: "event", status: "active" } as const;

function signedRequest(path: string, bodyValue: unknown, key: string) {
  const body = JSON.stringify(bodyValue); const url = `https://www.iopps.ca${path}`;
  const timestamp = String(nowSeconds); const nonce = `nonce-${key}-1234567890123456`;
  const canonical = buildHermesCanonicalRequest({ method: "POST", url, timestamp, nonce, body, idempotencyKey: key });
  return new Request(url, { method: "POST", headers: {
    "content-type": "application/json", "content-length": String(Buffer.byteLength(body)),
    "x-hermes-key-id": "primary", "x-hermes-timestamp": timestamp, "x-hermes-nonce": nonce,
    "x-hermes-signature": sign(null, Buffer.from(canonical), privateKey).toString("base64url"),
    "x-hermes-idempotency-key": key,
  }, body });
}

function deps(calls: string[] = []): HermesEventHideApiDeps {
  return {
    now: () => nowSeconds * 1000, publicKeys: { primary: publicKeyPem }, consumeNonce: async () => true,
    reviewSecret: "s".repeat(64), getIdempotentEventHideApply: async () => null,
    createEventHideServiceDeps: () => ({
      reviewSecret: "s".repeat(64),
      getEvent: async () => { calls.push("resolve"); return { id: command.eventId, version: "p1", data: { title: command.title, orgName: command.organization, type: "event", status: "active", active: true } }; },
      commit: async () => { calls.push("commit"); return { status: "applied", verified: { id: command.eventId, title: command.title, organization: command.organization, type: "event", status: "hidden", active: false } }; },
    }),
  };
}

test("signed event-hide review/apply handlers authenticate exact typed envelopes", async () => {
  const calls: string[] = [];
  const unsignedBody = JSON.stringify(command);
  const unsigned = new Request("https://www.iopps.ca/api/hermes/v1/events/hide/review", { method: "POST", headers: { "content-type": "application/json", "content-length": String(Buffer.byteLength(unsignedBody)) }, body: unsignedBody });
  assert.equal((await handleHermesEventHideReviewRequest(unsigned, deps(calls))).status, 401);
  assert.deepEqual(calls, []);
  const reviewResponse = await handleHermesEventHideReviewRequest(signedRequest("/api/hermes/v1/events/hide/review", command, "review"), deps(calls));
  assert.equal(reviewResponse.status, 200);
  const review = await reviewResponse.json();
  assert.equal(reviewResponse.headers.get("cache-control"), "no-store");
  const apply = await handleHermesEventHideApplyRequest(signedRequest("/api/hermes/v1/events/hide/apply", {
    command, reviewToken: review.reviewToken, confirmation: "HIDE IOPPS EVENT",
  }, "apply"), deps(calls));
  assert.equal(apply.status, 200);
  assert.equal((await apply.json()).status, "applied");
  assert.deepEqual(calls, ["resolve", "resolve", "commit"]);
  const bad = await handleHermesEventHideApplyRequest(signedRequest("/api/hermes/v1/events/hide/apply", {
    command, reviewToken: review.reviewToken, confirmation: "hide",
  }, "bad"), deps());
  assert.equal(bad.status, 400);
});

test("event-hide production routes are thin signed Node handlers and client exposes both operations", () => {
  for (const operation of ["review", "apply"]) {
    const source = readFileSync(new URL(`../src/app/api/hermes/v1/events/hide/${operation}/route.ts`, import.meta.url), "utf8");
    assert.match(source, /runtime = "nodejs"/);
    assert.match(source, /IOPPS_HERMES_ADMIN_PUBLIC_KEYS/);
    assert.match(source, /createFirebaseHermesFirestorePort/);
    assert.match(source, /createHermesEventHideFirestoreAdapter/);
    assert.match(source, /FieldValue\.serverTimestamp/);
    assert.doesNotMatch(source, /request\.json\(/);
  }
  const client = readFileSync(new URL("../scripts/hermes-admin-client.mjs", import.meta.url), "utf8");
  for (const required of ["event-hide-review", "event-hide-apply", "events/hide/review", "events/hide/apply"]) assert.equal(client.includes(required), true, required);
});
