import assert from "node:assert/strict";
import { generateKeyPairSync, sign } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  handleHermesJobApprovalApplyRequest,
  handleHermesJobApprovalReviewRequest,
  type HermesJobApprovalApiDeps,
} from "../src/lib/server/hermes-admin-api.ts";
import { buildHermesCanonicalRequest } from "../src/lib/server/hermes-machine-auth.ts";

const { privateKey, publicKey } = generateKeyPairSync("ed25519");
const publicKeyPem = publicKey.export({ type: "spki", format: "pem" }).toString();
const nowSeconds = 1_787_662_800;

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

function apiDeps(calls: string[] = []): HermesJobApprovalApiDeps {
  return {
    now: () => nowSeconds * 1000,
    publicKeys: { primary: publicKeyPem },
    consumeNonce: async () => true,
    reviewSecret: "s".repeat(64),
    getIdempotentJobApply: async () => null,
    createJobApprovalServiceDeps: () => ({
      reviewSecret: "s".repeat(64),
      findJobCandidates: async () => {
        calls.push("resolve");
        return [{
          id: "job-123",
          collection: "jobs",
          schema: "employer-job-v1",
          version: "j1",
          data: { title: "Community Liaison", orgName: "Northern Organization", status: "draft", active: false },
        }];
      },
      commit: async () => {
        calls.push("commit");
        return {
          status: "applied",
          committedAt: "2026-08-25T12:00:00.000Z",
          verified: { title: "Community Liaison", organization: "Northern Organization", status: "active" },
        };
      },
    }),
  };
}

test("job approval routes authenticate the exact signed shape before resolution or mutation", async () => {
  const calls: string[] = [];
  const invalid = new Request("https://www.iopps.ca/api/hermes/v1/jobs/approve/review", {
    method: "POST",
    headers: { "content-type": "application/json", "content-length": "19" },
    body: '{"jobId":"job-123"}',
  });
  const unauthorized = await handleHermesJobApprovalReviewRequest(invalid, apiDeps(calls));
  assert.equal(unauthorized.status, 401);
  assert.deepEqual(calls, []);

  const unauthorizedApplyBody = JSON.stringify({ reviewToken: "opaque", confirmation: "APPROVE IOPPS JOB" });
  const unauthorizedApply = await handleHermesJobApprovalApplyRequest(new Request(
    "https://www.iopps.ca/api/hermes/v1/jobs/approve/apply",
    {
      method: "POST",
      headers: { "content-type": "application/json", "content-length": String(Buffer.byteLength(unauthorizedApplyBody)) },
      body: unauthorizedApplyBody,
    },
  ), apiDeps(calls));
  assert.equal(unauthorizedApply.status, 401);
  assert.deepEqual(calls, []);

  const wrongPath = await handleHermesJobApprovalReviewRequest(
    signedRequest("/api/hermes/v1/jobs/approve/not-review", { jobId: "job-123" }, "wrong-path"),
    apiDeps(calls),
  );
  assert.equal(wrongPath.status, 404);
  assert.deepEqual(calls, []);

  const valid = await handleHermesJobApprovalReviewRequest(
    signedRequest("/api/hermes/v1/jobs/approve/review", { jobId: "job-123" }, "review"),
    apiDeps(calls),
  );
  assert.equal(valid.status, 200);
  assert.equal(valid.headers.get("cache-control"), "no-store");
  assert.deepEqual(calls, ["resolve"]);
});

test("signed job review and apply enforce strict bodies and the exact confirmation", async () => {
  const deps = apiDeps();
  const invalidReview = await handleHermesJobApprovalReviewRequest(
    signedRequest("/api/hermes/v1/jobs/approve/review", { jobId: "job-123", extra: true }, "bad-review"),
    deps,
  );
  assert.equal(invalidReview.status, 400);

  const emptyToken = await handleHermesJobApprovalApplyRequest(
    signedRequest("/api/hermes/v1/jobs/approve/apply", {
      reviewToken: "",
      confirmation: "APPROVE IOPPS JOB",
    }, "empty-token"),
    deps,
  );
  assert.equal(emptyToken.status, 400);

  const review = await handleHermesJobApprovalReviewRequest(
    signedRequest("/api/hermes/v1/jobs/approve/review", { jobId: "job-123" }, "review-2"),
    deps,
  );
  assert.equal(review.status, 200);
  const reviewPayload = await review.json();
  const validBody = { reviewToken: reviewPayload.reviewToken, confirmation: "APPROVE IOPPS JOB" };
  const applied = await handleHermesJobApprovalApplyRequest(
    signedRequest("/api/hermes/v1/jobs/approve/apply", validBody, "apply-1"),
    deps,
  );
  assert.equal(applied.status, 200);
  assert.equal((await applied.json()).status, "applied");

  for (const invalid of [
    { ...validBody, confirmation: "approve" },
    { ...validBody, jobId: "job-123" },
  ]) {
    const response = await handleHermesJobApprovalApplyRequest(
      signedRequest("/api/hermes/v1/jobs/approve/apply", invalid, `invalid-${JSON.stringify(invalid).length}`),
      deps,
    );
    assert.equal(response.status, 400);
  }
});

test("job approval production routes are thin signed Node handlers using Firestore server timestamps", () => {
  for (const operation of ["review", "apply"]) {
    const source = readFileSync(
      new URL(`../src/app/api/hermes/v1/jobs/approve/${operation}/route.ts`, import.meta.url),
      "utf8",
    );
    assert.match(source, /runtime = "nodejs"/);
    assert.match(source, /IOPPS_HERMES_ADMIN_PUBLIC_KEYS/);
    assert.match(source, /createFirebaseHermesFirestorePort/);
    assert.match(source, /createHermesJobApprovalFirestoreAdapter/);
    assert.match(source, /FieldValue\.serverTimestamp/);
    assert.doesNotMatch(source, /request\.json\(/);
  }
});

test("local signed client exposes job-review and job-apply commands", () => {
  const source = readFileSync(new URL("../scripts/hermes-admin-client.mjs", import.meta.url), "utf8");
  assert.match(source, /job-review/);
  assert.match(source, /job-apply/);
  assert.match(source, /jobs\/approve\/review/);
  assert.match(source, /jobs\/approve\/apply/);
});

test("Hermes documentation defines the exact job approval contract", () => {
  const documentation = readFileSync(new URL("../docs/hermes-admin-api.md", import.meta.url), "utf8");
  for (const required of [
    "/api/hermes/v1/jobs/approve/review",
    "/api/hermes/v1/jobs/approve/apply",
    '"jobId"',
    "APPROVE IOPPS JOB",
    "status`, `active`, `updatedAt`, and `postedAt`",
    "job-review",
    "job-apply",
  ]) {
    assert.equal(documentation.includes(required), true, required);
  }
});
