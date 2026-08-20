import assert from "node:assert/strict";
import { generateKeyPairSync, sign } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  handleHermesAccountConversionApplyRequest,
  handleHermesAccountConversionReviewRequest,
  type HermesAccountConversionApiDeps,
} from "../src/lib/server/hermes-admin-api.ts";
import { buildHermesCanonicalRequest } from "../src/lib/server/hermes-machine-auth.ts";
import type { HermesAccountConversionCommitResult } from "../src/lib/server/hermes-account-conversion.ts";

const { privateKey, publicKey } = generateKeyPairSync("ed25519");
const publicKeyPem = publicKey.export({ type: "spki", format: "pem" }).toString();
const nowSeconds = 1_787_252_400;

function signedRequest(path: string, bodyValue: unknown, idempotencyKey: string, attempt = 1) {
  const body = JSON.stringify(bodyValue);
  const url = `https://www.iopps.ca${path}`;
  const timestamp = String(nowSeconds);
  const nonce = `nonce-${idempotencyKey}-${attempt}-1234567890`;
  const canonical = buildHermesCanonicalRequest({ method: "POST", url, timestamp, nonce, body, idempotencyKey });
  return new Request(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "content-length": String(Buffer.byteLength(body)),
      "x-hermes-key-id": "primary",
      "x-hermes-timestamp": timestamp,
      "x-hermes-nonce": nonce,
      "x-hermes-signature": sign(null, Buffer.from(canonical), privateKey).toString("base64url"),
      "x-hermes-idempotency-key": idempotencyKey,
    },
    body,
  });
}

function apiDeps(): HermesAccountConversionApiDeps {
  return {
    now: () => nowSeconds * 1000,
    publicKeys: { primary: publicKeyPem },
    consumeNonce: async () => true,
    reviewSecret: "s".repeat(64),
    getIdempotentConversionApply: async () => null,
    createAccountConversionServiceDeps: () => ({
      reviewSecret: "s".repeat(64),
      now: () => new Date(nowSeconds * 1000),
      findUsersByEmail: async () => [{ id: "user_1", version: "u1", data: { email: "owner@example.com", role: "employer", employerId: "employer_1", orgId: "organization_1" } }],
      getMember: async () => ({ id: "user_1", version: "m1", data: { role: "employer", orgId: "organization_1" } }),
      findLinkedEmployers: async () => [{ id: "employer_1", version: "e1", data: { status: "approved", plan: "premium" } }],
      findLinkedOrganizations: async () => [{ id: "organization_1", version: "o1", data: { status: "approved", plan: "premium" } }],
      findLinkedSubscriptions: async () => [{ id: "subscription_1", version: "s1", data: { status: "active", amount: 0, manualOverride: true } }],
      commit: async () => ({
        status: "applied",
        committedAt: "2026-08-20T12:00:00.000Z",
        userId: "user_1",
        verified: {
          accountRole: "community", memberRole: "community", employerDisabled: true,
          organizationDisabled: true, subscriptionStatus: "expired", complimentarySubscriptionsExpired: 1,
        },
      }),
      cleanupAuthClaims: async () => {},
      markAuthCleanupComplete: async () => {},
    }),
  };
}

test("signed conversion review returns only no-store sanitized projections and an opaque token", async () => {
  const response = await handleHermesAccountConversionReviewRequest(
    signedRequest("/api/hermes/v1/users/convert-to-individual/review", { email: "owner@example.com" }, "convert-review"),
    apiDeps(),
  );
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  const payload = await response.json();
  assert.deepEqual(Object.keys(payload).sort(), ["current", "desired", "ok", "reviewToken"]);
  assert.equal(JSON.stringify(payload.current).includes("user_1"), false);

  const invalid = await handleHermesAccountConversionReviewRequest(
    signedRequest("/api/hermes/v1/users/convert-to-individual/review", { email: "owner@example.com", extra: true }, "bad-review"),
    apiDeps(),
  );
  assert.equal(invalid.status, 400);
});

test("signed conversion apply requires only token plus exact confirmation", async () => {
  const deps = apiDeps();
  const review = await handleHermesAccountConversionReviewRequest(
    signedRequest("/api/hermes/v1/users/convert-to-individual/review", { email: "owner@example.com" }, "review-2"), deps,
  );
  const reviewPayload = await review.json();
  const body = { reviewToken: reviewPayload.reviewToken, confirmation: "CONVERT IOPPS ACCOUNT TO INDIVIDUAL" };
  const response = await handleHermesAccountConversionApplyRequest(
    signedRequest("/api/hermes/v1/users/convert-to-individual/apply", body, "apply-1"), deps,
  );
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.deepEqual(Object.keys(payload).sort(), ["committedAt", "ok", "status", "verified"]);
  assert.equal(payload.status, "applied");

  const invalid = await handleHermesAccountConversionApplyRequest(
    signedRequest("/api/hermes/v1/users/convert-to-individual/apply", { ...body, email: "owner@example.com" }, "apply-2"), deps,
  );
  assert.equal(invalid.status, 400);
});

test("exact apply retry finishes incomplete Auth cleanup before idempotent success", async () => {
  const deps = apiDeps();
  const cached: HermesAccountConversionCommitResult & { authCleanupComplete: boolean } = {
    status: "applied",
    committedAt: "2026-08-20T12:00:00.000Z",
    userId: "user_1",
    authCleanupComplete: false,
    verified: {
      accountRole: "community", memberRole: "community", employerDisabled: true,
      organizationDisabled: true, subscriptionStatus: "expired", complimentarySubscriptionsExpired: 1,
    },
  };
  deps.getIdempotentConversionApply = async () => cached;
  const calls: string[] = [];
  deps.createAccountConversionServiceDeps = () => ({
    ...apiDeps().createAccountConversionServiceDeps({ keyId: "primary", idempotencyKey: "retry", requestHash: "a".repeat(64) }),
    findUsersByEmail: async () => { throw new Error("stale review resolution must not run"); },
    cleanupAuthClaims: async (uid) => { calls.push(`claims:${uid}`); },
    markAuthCleanupComplete: async () => { calls.push("complete"); cached.authCleanupComplete = true; },
  });
  const response = await handleHermesAccountConversionApplyRequest(
    signedRequest("/api/hermes/v1/users/convert-to-individual/apply", {
      reviewToken: "opaque-token-is-not-reparsed-on-completed-retry",
      confirmation: "CONVERT IOPPS ACCOUNT TO INDIVIDUAL",
    }, "retry", 2), deps,
  );
  assert.equal(response.status, 200);
  assert.equal((await response.json()).status, "applied");
  assert.deepEqual(calls, ["claims:user_1", "complete"]);
});

test("conversion production routes are thin signed Node handlers", () => {
  for (const operation of ["review", "apply"]) {
    const source = readFileSync(new URL(`../src/app/api/hermes/v1/users/convert-to-individual/${operation}/route.ts`, import.meta.url), "utf8");
    assert.match(source, /runtime = "nodejs"/);
    assert.match(source, /IOPPS_HERMES_ADMIN_PUBLIC_KEYS/);
    assert.match(source, /createFirebaseHermesFirestorePort/);
    assert.match(source, /getAdminAuth/);
    assert.doesNotMatch(source, /request\.json\(/);
  }
});

test("local signed client exposes conversion review and apply operations", () => {
  const source = readFileSync(new URL("../scripts/hermes-admin-client.mjs", import.meta.url), "utf8");
  assert.match(source, /convert-review/);
  assert.match(source, /convert-apply/);
  assert.match(source, /users\/convert-to-individual/);
});
