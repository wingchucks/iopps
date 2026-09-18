/* eslint-disable @typescript-eslint/no-explicit-any -- Partial SDK test doubles for authorization and failure ordering. */
import test from "node:test";
import assert from "node:assert/strict";
import { changeAdminUserRole } from "../src/lib/server/admin-user-role.ts";
import { POST, DELETE } from "../src/app/api/admin/create-test-account/route.ts";

function fixture(options: { owner?: boolean; revokeFails?: boolean; memberExists?: boolean } = {}) {
  const calls: string[] = [], writes: Record<string, unknown> = {};
  let claims: Record<string, unknown> = { admin: true, role: "admin", feature: "preserve", orgId: "org" };
  const auth: any = {
    getUser: async () => ({ email: options.owner ? "Nathan.Arias@iopps.ca" : "staff@example.invalid", customClaims: claims }),
    setCustomUserClaims: async (_uid: string, next: Record<string, unknown>) => { calls.push("claims"); claims = next; },
    revokeRefreshTokens: async () => { calls.push("revoke"); if (options.revokeFails) throw new Error("revocation unavailable"); },
  };
  const db: any = {
    collection: (name: string) => ({ doc: (uid: string) => `${name}/${uid}` }),
    runTransaction: async (callback: (tx: any) => Promise<void>) => {
      calls.push("database");
      await callback({ get: async () => ({ exists: options.memberExists !== false }), update: (path: string, data: unknown) => { writes[path] = data; } });
    },
  };
  return { calls, writes, get claims() { return claims; }, deps: { auth, db, isSuperAdmin: true } };
}

test("role demotion blocks stale sessions before changing signed authority and preserves unrelated claims", async () => {
  const f = fixture();
  await changeAdminUserRole("target", "moderator", f.deps);
  assert.deepEqual(f.claims, { role: "moderator", feature: "preserve", orgId: "org" });
  assert.deepEqual(f.calls, ["database", "claims", "revoke"]);
  assert.equal((f.writes["users/target"] as any).role, "moderator");
  assert.equal((f.writes["members/target"] as any).role, "moderator");
});

test("role promotion installs signed admin authority without creating a missing member profile", async () => {
  const f = fixture({ memberExists: false });
  await changeAdminUserRole("target", "admin", f.deps);
  assert.equal(f.claims.admin, true);
  assert.equal(f.claims.role, "admin");
  assert.equal(f.writes["members/target"], undefined);
});

test("non-owner, invalid roles and the fixed owner identity cannot be changed", async () => {
  for (const [options, owner, role] of [[{}, false, "admin"], [{}, true, "super_admin"], [{ owner: true }, true, "community"]] as const) {
    const f = fixture(options);
    await assert.rejects(changeAdminUserRole("target", role, { ...f.deps, isSuperAdmin: owner }));
    assert.deepEqual(f.calls, []);
    assert.deepEqual(f.writes, {});
  }
});

test("a revocation failure leaves a server-owned freshness marker and never reports success", async () => {
  const f = fixture({ revokeFails: true });
  await assert.rejects(changeAdminUserRole("target", "community", f.deps), /revocation unavailable/);
  assert.equal(f.claims.admin, undefined);
  assert.deepEqual(f.calls, ["database", "claims", "revoke"]);
  assert.equal((f.writes["users/target"] as any).role, "community");
  assert.ok((f.writes["users/target"] as any).claimsValidAfter > 0);
});

test("retired test account mutations always return gone and need no configured credentials", async () => {
  assert.equal((await POST()).status, 410);
  assert.equal((await DELETE()).status, 410);
});
