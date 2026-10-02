import test from "node:test";
import assert from "node:assert/strict";

import {
  EmployerApiError,
  requireEmployerContext,
} from "../src/lib/server/employer-auth.ts";

type CollectionData = Record<string, Record<string, unknown>>;

function createFirestore(collections: CollectionData) {
  return {
    collection(name: string) {
      return {
        doc(id: string) {
          return {
            async get() {
              const collection = collections[name] ?? {};
              const data = collection[id];
              return {
                id,
                exists: data !== undefined,
                data: () => data,
              };
            },
          };
        },
      };
    },
  };
}

test("requireEmployerContext rejects disabled organizations", async () => {
  const db = createFirestore({
    users: {
      user_1: {
        email: "owner@example.com",
        role: "employer",
        employerId: "org_1",
      },
    },
    members: {
      user_1: {
        orgId: "org_1",
        orgRole: "owner",
      },
    },
    organizations: {
      org_1: {
        status: "disabled",
      },
    },
    employers: {
      org_1: {
        status: "approved",
      },
    },
  });

  await assert.rejects(
    () =>
      requireEmployerContext(
        new Request("https://example.com/api/employer/check", {
          headers: { Authorization: "Bearer token" },
        }),
        {
          adminAuth: {
            async verifyIdToken() {
              return {
                uid: "user_1",
                email: "owner@example.com",
                role: "employer",
                email_verified: true,
              };
            },
          },
          adminDb: db,
          accountAccessDeps: {
            auth: {
              async getUser(uid: string) {
                return { uid, email: "owner@example.com", disabled: false };
              },
            },
            db,
          },
        },
      ),
    (error: unknown) => {
      assert.ok(error instanceof EmployerApiError);
      assert.equal(error.status, 403);
      assert.equal(error.message, "Organization access has been removed.");
      return true;
    },
  );
});

test("requireEmployerContext returns active org context for linked employers", async () => {
  const db = createFirestore({
    users: {
      user_2: {
        email: "owner@example.com",
        role: "employer",
        employerId: "org_2",
      },
    },
    members: {
      user_2: {
        orgId: "org_2",
        orgRole: "owner",
      },
    },
    organizations: {
      org_2: {
        status: "approved",
        onboardingComplete: true,
      },
    },
    employers: {
      org_2: {
        status: "approved",
      },
    },
  });

  const context = await requireEmployerContext(
    new Request("https://example.com/api/employer/check", {
      headers: { Authorization: "Bearer token" },
    }),
    {
      adminAuth: {
        async verifyIdToken() {
          return {
            uid: "user_2",
            email: "owner@example.com",
            role: "employer",
            email_verified: true,
          };
        },
      },
      adminDb: db,
      accountAccessDeps: {
        auth: {
          async getUser(uid: string) {
            return { uid, email: "owner@example.com", disabled: false };
          },
        },
        db,
      },
    },
  );

  assert.equal(context.orgId, "org_2");
  assert.equal(context.employerId, "org_2");
  assert.equal(context.orgRole, "owner");
});

function sessionHarness(verifyIdToken: () => Promise<Record<string, unknown>>, options: { userData?: Record<string, unknown>; getUser?: (uid: string) => Promise<unknown> } = {}) {
  const db = createFirestore({
    users: { user_3: { email: "owner@example.com", role: "employer", employerId: "org_3", ...options.userData } },
    members: { user_3: { orgId: "org_3", orgRole: "owner" } },
    organizations: { org_3: { status: "approved", name: "Fictional org", type: "employer" } },
  });
  return (headers: Record<string, string> = { Authorization: "Bearer token" }) => requireEmployerContext(
    new Request("https://example.com/api/employer/jobs", { headers }),
    {
      adminAuth: { verifyIdToken: verifyIdToken as never, getUser: (async () => ({})) as never },
      adminDb: db,
      accountAccessDeps: {
        auth: { getUser: (options.getUser ?? (async (uid: string) => ({ uid, email: "owner@example.com", disabled: false }))) as never },
        db,
      },
    },
  );
}

async function rejection(promise: Promise<unknown>): Promise<EmployerApiError> {
  try { await promise; } catch (error) { assert.ok(error instanceof EmployerApiError, String(error)); return error; }
  assert.fail("expected the employer context to be rejected");
}

const authError = (code: string, message = "fixture") => Object.assign(new Error(message), { code });
const signedIn = async () => ({ uid: "user_3", email: "owner@example.com", email_verified: true, auth_time: 2000 });

test("missing, expired and revoked sessions ask the user to sign in again (401)", async () => {
  const missing = await rejection(sessionHarness(signedIn)({}));
  assert.deepEqual([missing.status, missing.code], [401, "session_missing"]);
  for (const code of ["auth/id-token-expired", "auth/id-token-revoked", "auth/argument-error"]) {
    const error = await rejection(sessionHarness(async () => { throw authError(code); })());
    assert.deepEqual([error.status, error.code], [401, "session_expired"], code);
  }
  const revokedPermissions = await rejection(sessionHarness(signedIn, { userData: { claimsValidAfter: 3000 } })());
  assert.deepEqual([revokedPermissions.status, revokedPermissions.code], [401, "session_revoked"]);
});

test("disabled and suspended accounts keep their access status instead of becoming 500 or 401", async () => {
  const disabled = await rejection(sessionHarness(async () => { throw authError("auth/user-disabled"); })());
  assert.deepEqual([disabled.status, disabled.message], [403, "This account has been disabled."]);
  const suspended = await rejection(sessionHarness(signedIn, { userData: { status: "suspended" } })());
  assert.deepEqual([suspended.status, suspended.message, suspended.code], [403, "This account is suspended.", "account_blocked"]);
});

test("Auth outages are reported as temporarily unavailable (503), not as an invalid session", async () => {
  for (const failure of [
    authError("auth/internal-error"),
    authError("auth/argument-error", "Error fetching public keys for Google certs: upstream unavailable"),
    authError("app/network-error", "Error while making request: socket hang up"),
    new Error("ECONNRESET"),
  ]) {
    const error = await rejection(sessionHarness(async () => { throw failure; })());
    assert.deepEqual([error.status, error.code], [503, "auth_unavailable"], failure.message);
    assert.equal(error.cause, failure);
  }
  const lookup = await rejection(sessionHarness(signedIn, { getUser: async () => { throw authError("auth/internal-error"); } })());
  assert.deepEqual([lookup.status, lookup.code], [503, "auth_unavailable"]);
});
