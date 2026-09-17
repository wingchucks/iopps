import test from "node:test";
import assert from "node:assert/strict";
import type { Auth, UserRecord } from "firebase-admin/auth";
import { SUPER_ADMIN_EMAIL, isSuperAdminEmail, isSuperAdminAccount } from "../src/lib/server/super-admin.ts";

test("only Nathan's exact email is eligible, regardless of legacy environment settings", () => {
  const before = process.env.SUPER_ADMIN_EMAILS;
  process.env.SUPER_ADMIN_EMAILS = "staff@example.com,owner@example.com";
  try {
    assert.equal(isSuperAdminEmail(SUPER_ADMIN_EMAIL), true);
    assert.equal(isSuperAdminEmail(" Nathan.Arias@IOPPS.ca "), true);
    for (const value of [undefined, null, "", "staff@example.com", "owner@example.com", "nathan.arias+admin@iopps.ca", "nathan.arias@iopps.ca.example.com", [SUPER_ADMIN_EMAIL]]) {
      assert.equal(isSuperAdminEmail(value), false);
    }
  } finally {
    if (before === undefined) delete process.env.SUPER_ADMIN_EMAILS;
    else process.env.SUPER_ADMIN_EMAILS = before;
  }
});

test("owner protection uses Firebase Auth even when profile data is missing or changed", async () => {
  const auth: Pick<Auth, "getUser"> = {
    async getUser(uid) {
      assert.equal(uid, "owner");
      return { uid, email: SUPER_ADMIN_EMAIL, emailVerified: false } as UserRecord;
    },
  };
  assert.equal(await isSuperAdminAccount("owner", auth), true);
});

test("missing Auth accounts can be cleaned up, but lookup failures fail closed", async () => {
  assert.equal(await isSuperAdminAccount("missing", {
    async getUser() { throw { code: "auth/user-not-found" }; },
  }), false);
  const failure = new Error("Auth service unavailable");
  await assert.rejects(isSuperAdminAccount("owner", {
    async getUser() { throw failure; },
  }), error => error === failure);
});
