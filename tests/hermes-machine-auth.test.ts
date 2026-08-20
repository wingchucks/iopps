import test from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync, sign } from "node:crypto";

import {
  HERMES_MACHINE_PROTOCOL,
  authenticateHermesMachineRequest,
  buildHermesCanonicalRequest,
  hashHermesBody,
  normalizeHermesRequestPath,
  verifyHermesMachineSignature,
} from "../src/lib/server/hermes-machine-auth.ts";

const keyPair = generateKeyPairSync("ed25519");
const publicKeyPem = keyPair.publicKey.export({ type: "spki", format: "pem" }).toString();

function signedFixture(overrides: Partial<{
  method: string;
  url: string;
  timestamp: string;
  nonce: string;
  body: string;
  idempotencyKey: string;
}> = {}) {
  const fixture = {
    method: "POST",
    url: "https://www.iopps.ca/api/hermes/v1/employers/review?z=2&a=hello%20world",
    timestamp: "1787187600",
    nonce: "nonce-1234567890abcdef",
    body: JSON.stringify({ operation: "review", email: "courtney.lewis@batc.ca" }),
    idempotencyKey: "review-1",
    ...overrides,
  };
  const canonical = buildHermesCanonicalRequest(fixture);
  return {
    ...fixture,
    canonical,
    signature: sign(null, Buffer.from(canonical), keyPair.privateKey).toString("base64url"),
  };
}

test("Hermes canonical requests bind method, sorted path, timestamp, nonce, body hash, and idempotency", () => {
  const fixture = signedFixture();
  assert.equal(
    fixture.canonical,
    [
      HERMES_MACHINE_PROTOCOL,
      "POST",
      "/api/hermes/v1/employers/review?a=hello+world&z=2",
      "1787187600",
      "nonce-1234567890abcdef",
      hashHermesBody(fixture.body),
      "review-1",
    ].join("\n"),
  );
});

test("Hermes canonical path rejects fragments and normalizes query ordering", () => {
  assert.equal(
    normalizeHermesRequestPath("https://www.iopps.ca/api/hermes/v1/test?b=2&a=3&a=1#ignored"),
    "/api/hermes/v1/test?a=3&a=1&b=2",
  );
});

test("Hermes signature verification accepts the exact request and rejects tampering", () => {
  const fixture = signedFixture();
  assert.equal(
    verifyHermesMachineSignature({
      canonicalRequest: fixture.canonical,
      signature: fixture.signature,
      publicKeyPem,
    }),
    true,
  );

  const tampered = buildHermesCanonicalRequest({ ...fixture, body: JSON.stringify({ operation: "apply" }) });
  assert.equal(
    verifyHermesMachineSignature({
      canonicalRequest: tampered,
      signature: fixture.signature,
      publicKeyPem,
    }),
    false,
  );
});

test("Hermes signature verification fails closed on malformed inputs", () => {
  assert.equal(
    verifyHermesMachineSignature({
      canonicalRequest: "x",
      signature: "not-base64url***",
      publicKeyPem,
    }),
    false,
  );
  assert.equal(
    verifyHermesMachineSignature({
      canonicalRequest: "x",
      signature: "AA",
      publicKeyPem: "not a public key",
    }),
    false,
  );
});

test("Hermes request authentication consumes a fresh nonce only after signature verification", async () => {
  const nowSeconds = 1_787_187_600;
  const fixture = signedFixture({ timestamp: String(nowSeconds) });
  const consumed: string[] = [];
  const result = await authenticateHermesMachineRequest(
    {
      method: fixture.method,
      url: fixture.url,
      body: fixture.body,
      headers: {
        "x-hermes-key-id": "primary",
        "x-hermes-timestamp": fixture.timestamp,
        "x-hermes-nonce": fixture.nonce,
        "x-hermes-signature": fixture.signature,
        "x-hermes-idempotency-key": fixture.idempotencyKey,
      },
    },
    {
      now: () => nowSeconds * 1000,
      publicKeys: { primary: publicKeyPem },
      consumeNonce: async ({ keyId, nonceHash }) => {
        consumed.push(`${keyId}:${nonceHash}`);
        return true;
      },
    },
  );

  assert.equal(result.ok, true);
  assert.equal(consumed.length, 1);
  assert.match(consumed[0], /^primary:[a-f0-9]{64}$/);
});

test("Hermes request authentication rejects stale, replayed, unknown-key, oversized, and unsigned requests", async () => {
  const nowSeconds = 1_787_187_600;
  let consumeCalls = 0;
  const deps = {
    now: () => nowSeconds * 1000,
    publicKeys: { primary: publicKeyPem },
    consumeNonce: async () => {
      consumeCalls += 1;
      return false;
    },
  };

  const replay = signedFixture({ timestamp: String(nowSeconds) });
  const replayResult = await authenticateHermesMachineRequest(
    {
      method: replay.method,
      url: replay.url,
      body: replay.body,
      headers: {
        "x-hermes-key-id": "primary",
        "x-hermes-timestamp": replay.timestamp,
        "x-hermes-nonce": replay.nonce,
        "x-hermes-signature": replay.signature,
        "x-hermes-idempotency-key": replay.idempotencyKey,
      },
    },
    deps,
  );
  assert.deepEqual(replayResult, { ok: false, status: 409, error: "Replay detected" });
  assert.equal(consumeCalls, 1);

  for (const [name, input, expectedStatus] of [
    ["stale", signedFixture({ timestamp: String(nowSeconds - 301) }), 401],
    ["future", signedFixture({ timestamp: String(nowSeconds + 301) }), 401],
    ["unknown", signedFixture({ timestamp: String(nowSeconds) }), 401],
    ["oversized", signedFixture({ timestamp: String(nowSeconds), body: "x".repeat(32_769) }), 413],
  ] as const) {
    const result = await authenticateHermesMachineRequest(
      {
        method: input.method,
        url: input.url,
        body: input.body,
        headers: {
          "x-hermes-key-id": name === "unknown" ? "missing" : "primary",
          "x-hermes-timestamp": input.timestamp,
          "x-hermes-nonce": input.nonce,
          "x-hermes-signature": input.signature,
          "x-hermes-idempotency-key": input.idempotencyKey,
        },
      },
      { ...deps, consumeNonce: async () => true },
    );
    assert.equal(result.ok, false, name);
    if (!result.ok) assert.equal(result.status, expectedStatus, name);
  }

  const unsigned = await authenticateHermesMachineRequest(
    { method: "POST", url: replay.url, body: replay.body, headers: {} },
    deps,
  );
  assert.deepEqual(unsigned, { ok: false, status: 401, error: "Missing machine authentication headers" });
});

test("Hermes request authentication rejects non-canonical signed header values", async () => {
  const nowSeconds = 1_787_187_600;
  const fixture = signedFixture({ timestamp: String(nowSeconds) });
  for (const [header, value] of [
    ["x-hermes-timestamp", ` ${fixture.timestamp}`],
    ["x-hermes-key-id", "primary "],
    ["x-hermes-nonce", `${fixture.nonce} `],
    ["x-hermes-idempotency-key", "review-1 "],
  ] as const) {
    const headers = {
      "x-hermes-key-id": "primary",
      "x-hermes-timestamp": fixture.timestamp,
      "x-hermes-nonce": fixture.nonce,
      "x-hermes-signature": fixture.signature,
      "x-hermes-idempotency-key": fixture.idempotencyKey,
      [header]: value,
    };
    const result = await authenticateHermesMachineRequest(
      { method: fixture.method, url: fixture.url, body: fixture.body, headers },
      {
        now: () => nowSeconds * 1000,
        publicKeys: { primary: publicKeyPem },
        consumeNonce: async () => true,
      },
    );
    assert.equal(result.ok, false, header);
  }
});
