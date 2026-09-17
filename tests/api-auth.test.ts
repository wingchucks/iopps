import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import type { Auth, DecodedIdToken, UserRecord } from "firebase-admin/auth";
import type { Firestore } from "firebase-admin/firestore";
import { verifyAuthToken, verifyAdminToken, verifySuperAdminToken } from "../src/lib/api-auth.ts";
import { SUPER_ADMIN_EMAIL } from "../src/lib/server/super-admin.ts";

function fixture({ token = {}, user = {}, profile = {}, tokenError = undefined as Error | undefined } = {}) {
  const verificationChecks: boolean[] = [];
  const deps = {
    adminAuth: {
      async verifyIdToken(_token: string, checkRevoked?: boolean) {
        verificationChecks.push(checkRevoked === true);
        if (tokenError) throw tokenError;
        return { uid: "owner", email: SUPER_ADMIN_EMAIL, email_verified: true, admin: true, ...token } as DecodedIdToken;
      },
    } satisfies Pick<Auth, "verifyIdToken">,
    accessDeps: {
      auth: { async getUser() {
        return { uid: "owner", email: SUPER_ADMIN_EMAIL, emailVerified: true, disabled: false, customClaims: { admin: true }, ...user } as UserRecord;
      } } satisfies Pick<Auth, "getUser">,
      db: { collection() { return { doc() { return { async get() {
        return { data: () => ({ status: "active", role: "admin", ...profile }) };
      } }; } }; } } as unknown as Pick<Firestore, "collection">,
    },
  };
  const request = new NextRequest("https://example.invalid/api/admin/test", { headers: { authorization: "Bearer fixture" } });
  return { request, deps, verificationChecks };
}

test("verified owner receives super-admin capabilities and revocation checks", async () => {
  for (const claims of [{ admin: true }, { admin: false, role: "admin" }]) {
    const { request, deps, verificationChecks } = fixture({ token: { email: "Nathan.Arias@iopps.ca", ...claims }, user: { customClaims: claims } });
    const result = await verifySuperAdminToken(request, deps);
    assert.equal(result.success, true);
    if (result.success) assert.equal(result.isSuperAdmin, true);
    assert.deepEqual(verificationChecks, [true]);
  }
});

const deniedIdentities = [
  ["another administrator with a forged owner profile", { token: { email: "staff@example.com" }, user: { email: "staff@example.com" }, profile: { email: SUPER_ADMIN_EMAIL, role: "super_admin", admin: true } }],
  ["unverified token", { token: { email_verified: false } }],
  ["missing token verification", { token: { email_verified: undefined } }],
  ["unverified current Auth record", { user: { emailVerified: false } }],
  ["old owner token after email change", { user: { email: "new@example.com" } }],
  ["old non-owner token before email change", { token: { email: "old@example.com" } }],
  ["missing token email", { token: { email: undefined } }],
  ["missing current Auth email", { user: { email: undefined } }],
  ["removed current admin claims", { user: { customClaims: {} } }],
  ["profile role without signed admin claims", { token: { admin: false, role: "super_admin" } }],
  ["mismatched Auth uid", { user: { uid: "different" } }],
  ["disabled owner", { user: { disabled: true } }],
  ["suspended owner", { profile: { status: "suspended" } }],
] as const;
for (const [label, options] of deniedIdentities) {
  test("super-admin access denies " + label, async () => {
    const { request, deps } = fixture(options);
    const result = await verifySuperAdminToken(request, deps);
    assert.equal(result.success, false);
    if (!result.success) assert.equal(result.response.status, 403);
  });
}

test("ordinary administrators retain admin access without owner capabilities", async () => {
  const { request, deps } = fixture({ token: { email: "staff@example.com" }, user: { email: "staff@example.com" } });
  const result = await verifyAdminToken(request, deps);
  assert.equal(result.success, true);
  if (result.success) assert.equal(result.isSuperAdmin, false);
});

test("revoked tokens and missing sign-in are denied before privileged operations", async () => {
  const { request, deps, verificationChecks } = fixture({ tokenError: new Error("auth/id-token-revoked") });
  const revoked = await verifySuperAdminToken(request, deps);
  assert.equal(revoked.success, false);
  if (!revoked.success) assert.equal(revoked.response.status, 401);
  assert.deepEqual(verificationChecks, [true]);
  const missing = await verifySuperAdminToken(new NextRequest("https://example.invalid"), deps);
  assert.equal(missing.success, false);
  if (!missing.success) assert.equal(missing.response.status, 401);
});

test("ordinary member authentication never infers ownership from a profile", async () => {
  const { request, deps } = fixture({ token: { admin: false, email: "member@example.com" }, user: { email: "member@example.com", customClaims: {} }, profile: { email: SUPER_ADMIN_EMAIL, role: "super_admin" } });
  const result = await verifyAuthToken(request, deps);
  assert.equal(result.success, true);
  if (result.success) assert.equal(result.isSuperAdmin, false);
});
