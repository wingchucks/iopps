import assert from "node:assert/strict";
import { generateKeyPairSync, sign } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  handleHermesEmployerApplyRequest,
  handleHermesEmployerReviewRequest,
  type HermesAdminApiDeps,
} from "../src/lib/server/hermes-admin-api.ts";
import { buildHermesCanonicalRequest } from "../src/lib/server/hermes-machine-auth.ts";

const { privateKey, publicKey } = generateKeyPairSync("ed25519");
const publicKeyPem = publicKey.export({ type: "spki", format: "pem" }).toString();
const nowSeconds = 1_787_187_600;

const command = {
  email: "person@example.com",
  organizationName: "Correct Organization",
  subscriptionStart: "2026-08-19",
  subscriptionEnd: "2027-08-19",
};

function signedRequest(path: string, bodyValue: unknown, idempotencyKey: string): Request {
  const body = JSON.stringify(bodyValue);
  const url = `https://www.iopps.ca${path}`;
  const timestamp = String(nowSeconds);
  const nonce = `nonce-${idempotencyKey}-1234567890`;
  const canonical = buildHermesCanonicalRequest({
    method: "POST",
    url,
    timestamp,
    nonce,
    body,
    idempotencyKey,
  });
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

function apiDeps(): HermesAdminApiDeps {
  const state = {
    user: { id: "user_1", version: "u1", data: { email: command.email, role: "community" } },
    employer: {
      id: "org_1",
      version: "e1",
      data: { email: command.email, organizationName: "Wrong Organization", status: "pending" },
    },
  };
  return {
    now: () => nowSeconds * 1000,
    publicKeys: { primary: publicKeyPem },
    consumeNonce: async () => true,
    reviewSecret: "s".repeat(64),
    createEmployerServiceDeps: () => ({
      reviewSecret: "s".repeat(64),
      now: () => new Date(nowSeconds * 1000),
      findUsersByEmail: async () => [structuredClone(state.user)],
      findEmployersByEmail: async () => [structuredClone(state.employer)],
      findOrganizationsByEmployerId: async () => [],
      findSubscriptions: async () => [],
      findSubscriptionsByEmployerId: async () => [],
      findSubscriptionsByOrganizationId: async () => [],
      getOrganization: async () => null,
      getSubscription: async () => null,
      commit: async ({ command: normalized }) => ({
        committedAt: "2026-08-19T18:00:00.000Z",
        verified: {
          email: normalized.email,
          organizationName: normalized.organizationName,
          role: "employer",
          status: "approved",
          verified: true,
          subscriptionTier: "premium",
          unlimitedJobPostings: true,
          subscriptionStart: normalized.subscriptionStart,
          subscriptionEnd: normalized.subscriptionEnd,
        },
        userVerified: true,
        employerVerified: true,
        organizationVerified: true,
      }),
    }),
  };
}

test("signed Hermes review returns one opaque, no-store review response", async () => {
  const response = await handleHermesEmployerReviewRequest(
    signedRequest("/api/hermes/v1/employers/review", command, "review-1"),
    apiDeps(),
  );
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  const payload = await response.json();
  assert.equal(payload.ok, true);
  assert.match(payload.reviewToken, /^[A-Za-z0-9_-]{43}$/);
  assert.deepEqual(Object.keys(payload).sort(), ["current", "desired", "ok", "reviewToken", "target"]);
});

test("signed Hermes apply requires the exact envelope and returns only verified state", async () => {
  const deps = apiDeps();
  const review = await handleHermesEmployerReviewRequest(
    signedRequest("/api/hermes/v1/employers/review", command, "review-2"),
    deps,
  );
  const reviewPayload = await review.json();
  const applyBody = {
    command,
    reviewToken: reviewPayload.reviewToken,
    confirmation: "APPLY IOPPS EMPLOYER UPDATE",
  };
  const response = await handleHermesEmployerApplyRequest(
    signedRequest("/api/hermes/v1/employers/apply", applyBody, "apply-1"),
    deps,
  );
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.deepEqual(Object.keys(payload).sort(), ["committedAt", "ok", "status", "verified"]);
  assert.equal(payload.status, "applied");
  assert.equal(JSON.stringify(payload).includes(reviewPayload.reviewToken), false);

  const invalid = await handleHermesEmployerApplyRequest(
    signedRequest("/api/hermes/v1/employers/apply", { ...applyBody, arbitraryWrite: true }, "apply-2"),
    deps,
  );
  assert.equal(invalid.status, 400);
});

test("Hermes production routes are thin Node handlers wired to committed verification material", () => {
  for (const operation of ["review", "apply"]) {
    const source = readFileSync(
      new URL(`../src/app/api/hermes/v1/employers/${operation}/route.ts`, import.meta.url),
      "utf8",
    );
    assert.match(source, /runtime = "nodejs"/);
    assert.match(source, /IOPPS_HERMES_ADMIN_PUBLIC_KEYS/);
    assert.match(source, /createFirebaseHermesFirestorePort/);
    assert.doesNotMatch(source, /HERMES.*PUBLIC.*process\.env/i);
    assert.doesNotMatch(source, /request\.json\(/);
  }
});

test("Hermes apply returns a completed deterministic idempotent result before stale review resolution", async () => {
  const verified = {
    email: command.email,
    organizationName: command.organizationName,
    role: "employer",
    status: "approved",
    verified: true,
    subscriptionTier: "premium",
    unlimitedJobPostings: true,
    subscriptionStart: command.subscriptionStart,
    subscriptionEnd: command.subscriptionEnd,
  };
  const body = {
    command,
    reviewToken: "x".repeat(43),
    confirmation: "APPLY IOPPS EMPLOYER UPDATE",
  };
  const deps = apiDeps();
  deps.getIdempotentApply = async () => ({
    status: "applied",
    committedAt: "2026-08-19T18:00:00.000Z",
    verified,
  });
  deps.createEmployerServiceDeps = () => {
    throw new Error("stale state resolution must not run for a completed retry");
  };

  const response = await handleHermesEmployerApplyRequest(
    signedRequest("/api/hermes/v1/employers/apply", body, "apply-retry"),
    deps,
  );
  assert.equal(response.status, 200);
  assert.equal((await response.json()).status, "applied");
});
