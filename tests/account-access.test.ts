import test from "node:test";
import assert from "node:assert/strict";

import {
  AccountAccessError,
  assertUserCanAccessApp,
} from "../src/lib/server/account-access.ts";

function createDb(userData: Record<string, unknown>) {
  return {
    collection(name: string) {
      assert.equal(name, "users");
      return {
        doc(id: string) {
          return {
            async get() {
              return {
                id,
                data: () => userData,
              };
            },
          };
        },
      };
    },
  };
}

test("assertUserCanAccessApp returns active auth and profile data", async () => {
  const context = await assertUserCanAccessApp(
    { uid: "user_1", email: "member@example.com" },
    {
      auth: {
        async getUser(uid: string) {
          return {
            uid,
            email: "member@example.com",
            disabled: false,
          };
        },
      },
      db: createDb({ status: "active", role: "member" }),
    },
  );

  assert.equal(context.email, "member@example.com");
  assert.equal(context.userData.status, "active");
});

test("assertUserCanAccessApp rejects disabled auth users", async () => {
  await assert.rejects(
    () =>
      assertUserCanAccessApp(
        { uid: "user_2", email: "member@example.com" },
        {
          auth: {
            async getUser(uid: string) {
              return {
                uid,
                email: "member@example.com",
                disabled: true,
              };
            },
          },
          db: createDb({ status: "active" }),
        },
      ),
    (error: unknown) => {
      assert.ok(error instanceof AccountAccessError);
      assert.equal(error.message, "This account has been disabled.");
      return true;
    },
  );
});

test("assertUserCanAccessApp rejects deleted user profiles and missing auth users", async () => {
  await assert.rejects(
    () =>
      assertUserCanAccessApp(
        { uid: "user_3", email: "member@example.com" },
        {
          auth: {
            async getUser() {
              throw { code: "auth/user-not-found" };
            },
          },
          db: createDb({ status: "deleted" }),
        },
      ),
    (error: unknown) => {
      assert.ok(error instanceof AccountAccessError);
      assert.equal(error.message, "This account no longer exists.");
      return true;
    },
  );
});

test("permission changes reject old or missing authentication time and allow a new sign-in", async () => {
  const deps = { auth: { getUser: async (uid: string) => ({ uid, email: "member@example.com", disabled: false }) }, db: createDb({ status: "active", claimsValidAfter: 200 }) };
  for (const auth_time of [undefined, 199, 200]) {
    await assert.rejects(() => assertUserCanAccessApp({ uid: "member", auth_time }, deps), (error: unknown) => error instanceof AccountAccessError && error.status === 401);
  }
  assert.equal((await assertUserCanAccessApp({ uid: "member", auth_time: 201 }, deps)).email, "member@example.com");
});
