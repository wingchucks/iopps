import assert from "node:assert/strict";
import test from "node:test";

import { cleanupHermesAccountConversionAuthClaims } from "../src/lib/server/hermes-account-conversion-auth.ts";

test("conversion Auth cleanup preserves unrelated claims, revokes tokens, and verifies readback", async () => {
  let claims: Record<string, unknown> | undefined = {
    role: "employer",
    employer: true,
    employerId: "employer_1",
    orgId: "organization_1",
    admin: true,
    locale: "en-CA",
  };
  const calls: string[] = [];
  await cleanupHermesAccountConversionAuthClaims({
    async getUser(uid) { calls.push(`get:${uid}`); return { customClaims: structuredClone(claims) }; },
    async setCustomUserClaims(uid, next) { calls.push(`set:${uid}`); claims = next ?? undefined; },
    async revokeRefreshTokens(uid) { calls.push(`revoke:${uid}`); },
  }, "user_1");
  assert.deepEqual(claims, { admin: true, locale: "en-CA" });
  assert.deepEqual(calls, ["get:user_1", "set:user_1", "revoke:user_1", "get:user_1"]);
});

test("conversion Auth cleanup can be retried after revocation fails", async () => {
  let claims: Record<string, unknown> | undefined = { role: "employer", employer: true, keep: "yes" };
  let revocations = 0;
  const auth = {
    async getUser() { return { customClaims: structuredClone(claims) }; },
    async setCustomUserClaims(_uid: string, next: Record<string, unknown> | null) { claims = next ?? undefined; },
    async revokeRefreshTokens() {
      revocations += 1;
      if (revocations === 1) throw new Error("temporary revoke failure");
    },
  };
  await assert.rejects(() => cleanupHermesAccountConversionAuthClaims(auth, "user_1"), /temporary revoke failure/);
  assert.deepEqual(claims, { keep: "yes" });
  await cleanupHermesAccountConversionAuthClaims(auth, "user_1");
  assert.deepEqual(claims, { keep: "yes" });
  assert.equal(revocations, 2);
});

test("conversion Auth cleanup fails closed when forbidden claims remain after readback", async () => {
  await assert.rejects(() => cleanupHermesAccountConversionAuthClaims({
    async getUser() { return { customClaims: { role: "employer", keep: true } }; },
    async setCustomUserClaims() {},
    async revokeRefreshTokens() {},
  }, "user_1"), /verification failed/);
});
