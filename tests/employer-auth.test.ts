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
