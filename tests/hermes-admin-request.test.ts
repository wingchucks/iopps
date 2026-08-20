import assert from "node:assert/strict";
import { generateKeyPairSync, sign } from "node:crypto";
import test from "node:test";

import {
  authenticateHermesJsonRequest,
  deriveHermesAdminReviewSecret,
} from "../src/lib/server/hermes-admin-request.ts";
import { buildHermesCanonicalRequest } from "../src/lib/server/hermes-machine-auth.ts";

const { privateKey, publicKey } = generateKeyPairSync("ed25519");
const publicKeyPem = publicKey.export({ type: "spki", format: "pem" }).toString();

function signedRequest(overrides: {
  body?: string;
  contentLength?: string;
  contentType?: string;
  timestamp?: string;
} = {}) {
  const body = overrides.body ?? JSON.stringify({ email: "person@example.com" });
  const timestamp = overrides.timestamp ?? "1787187600";
  const nonce = "nonce-1234567890abcdef";
  const idempotencyKey = "review-1";
  const url = "https://www.iopps.ca/api/hermes/v1/employers/review";
  const canonicalRequest = buildHermesCanonicalRequest({
    method: "POST",
    url,
    timestamp,
    nonce,
    body,
    idempotencyKey,
  });
  const signature = sign(null, Buffer.from(canonicalRequest), privateKey).toString("base64url");
  return new Request(url, {
    method: "POST",
    headers: {
      "content-type": overrides.contentType ?? "application/json",
      "content-length": overrides.contentLength ?? String(Buffer.byteLength(body)),
      "x-hermes-key-id": "primary",
      "x-hermes-timestamp": timestamp,
      "x-hermes-nonce": nonce,
      "x-hermes-signature": signature,
      "x-hermes-idempotency-key": idempotencyKey,
    },
    body,
  });
}

test("Hermes JSON requests authenticate the exact declared raw body", async () => {
  let consumed = 0;
  const result = await authenticateHermesJsonRequest(signedRequest(), {
    now: () => 1_787_187_600_000,
    publicKeys: { primary: publicKeyPem },
    consumeNonce: async () => {
      consumed += 1;
      return true;
    },
  });

  assert.equal(result.ok, true);
  if (result.ok) assert.deepEqual(result.json, { email: "person@example.com" });
  assert.equal(consumed, 1);
});

test("Hermes JSON requests require exact content type, declared byte length, and valid UTF-8 JSON", async () => {
  const deps = {
    now: () => 1_787_187_600_000,
    publicKeys: { primary: publicKeyPem },
    consumeNonce: async () => true,
  };
  const cases = [
    signedRequest({ contentType: "application/json; charset=utf-8" }),
    signedRequest({ contentLength: "999" }),
    signedRequest({ contentLength: "01" }),
    signedRequest({ body: "not-json" }),
  ];

  for (const request of cases) {
    const result = await authenticateHermesJsonRequest(request, deps);
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.status, 400);
  }
});

test("Hermes review secrets use domain-separated HKDF and fail closed", () => {
  const source = "r".repeat(48);
  const derived = deriveHermesAdminReviewSecret({ HERMES_ADMIN_REVIEW_SECRET: source });
  assert.match(derived, /^[A-Za-z0-9_-]{43}$/);
  assert.notEqual(derived, Buffer.from(source).toString("base64url"));

  const firebaseDerived = deriveHermesAdminReviewSecret({ FIREBASE_PRIVATE_KEY: source });
  assert.match(firebaseDerived, /^[A-Za-z0-9_-]{43}$/);
  assert.notEqual(firebaseDerived, derived);

  assert.throws(
    () => deriveHermesAdminReviewSecret({}),
    /Hermes review secret material is unavailable/,
  );
  assert.throws(
    () => deriveHermesAdminReviewSecret({ HERMES_ADMIN_REVIEW_SECRET: "too-short" }),
    /at least 32 bytes/,
  );
});
