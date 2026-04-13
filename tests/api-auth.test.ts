import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";

import {
  verifyAuthToken,
  verifySuperAdminToken,
} from "../src/lib/api-auth.ts";

function createUserDb(userData: Record<string, unknown>) {
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

test("verifySuperAdminToken accepts admins on the configured allowlist", async () => {
  const request = new NextRequest("https://example.com/api/admin/test", {
    headers: { authorization: "Bearer token" },
  });

  const result = await verifySuperAdminToken(request, {
    adminAuth: {
      async verifyIdToken() {
        return {
          uid: "admin_1",
          email: "owner@example.com",
          admin: true,
        };
      },
    },
    accessDeps: {
      auth: {
        async getUser(uid: string) {
          return { uid, email: "owner@example.com", disabled: false };
        },
      },
      db: createUserDb({ status: "active", role: "admin" }),
    },
    superAdminEnvValue: "owner@example.com",
  });

  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.viewerEmail, "owner@example.com");
  }
});

test("verifySuperAdminToken rejects non-allowlisted admins", async () => {
  const request = new NextRequest("https://example.com/api/admin/test", {
    headers: { authorization: "Bearer token" },
  });

  const result = await verifySuperAdminToken(request, {
    adminAuth: {
      async verifyIdToken() {
        return {
          uid: "admin_2",
          email: "staff@example.com",
          admin: true,
        };
      },
    },
    accessDeps: {
      auth: {
        async getUser(uid: string) {
          return { uid, email: "staff@example.com", disabled: false };
        },
      },
      db: createUserDb({ status: "active", role: "admin" }),
    },
    superAdminEnvValue: "owner@example.com",
  });

  assert.equal(result.success, false);
  if (!result.success) {
    assert.equal(result.response.status, 403);
  }
});

test("verifyAuthToken rejects blocked accounts before admin checks", async () => {
  const request = new NextRequest("https://example.com/api/auth/test", {
    headers: { authorization: "Bearer token" },
  });

  const result = await verifyAuthToken(request, {
    adminAuth: {
      async verifyIdToken() {
        return {
          uid: "member_1",
          email: "member@example.com",
        };
      },
    },
    accessDeps: {
      auth: {
        async getUser(uid: string) {
          return { uid, email: "member@example.com", disabled: true };
        },
      },
      db: createUserDb({ status: "active" }),
    },
  });

  assert.equal(result.success, false);
  if (!result.success) {
    assert.equal(result.response.status, 403);
  }
});
