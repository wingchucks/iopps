import test from "node:test";
import assert from "node:assert/strict";

import {
  EmployerApiError,
  requireEmployerContext,
  requireEmployerPublishingContext,
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

test("requireEmployerPublishingContext rejects a pending employer after verification and onboarding", async () => {
  const db = createFirestore({
    users: {
      user_pending: {
        email: "owner@example.com",
        role: "employer",
        employerId: "org_pending",
        onboardingComplete: true,
      },
    },
    members: {
      user_pending: { orgId: "org_pending", orgRole: "owner" },
    },
    organizations: {
      org_pending: { status: "pending", onboardingComplete: true },
    },
    employers: {
      org_pending: { status: "pending", onboardingComplete: true },
    },
  });

  await assert.rejects(
    () => requireEmployerPublishingContext(
      new Request("https://example.com/api/employer/jobs", {
        headers: { Authorization: "Bearer token" },
      }),
      {
        adminAuth: {
          async verifyIdToken() {
            return {
              uid: "user_pending",
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
      assert.equal(
        error.message,
        "Your organization is awaiting IOPPS approval before it can publish content.",
      );
      return true;
    },
  );
});

test("requireEmployerPublishingContext permits an approved legacy employer", async () => {
  const db = createFirestore({
    users: {
      user_approved: {
        email: "owner@example.com",
        role: "employer",
        employerId: "org_approved",
      },
    },
    members: {
      user_approved: { orgId: "org_approved", orgRole: "owner" },
    },
    organizations: {
      org_approved: { onboardingComplete: true },
    },
    employers: {
      org_approved: { status: "approved", onboardingComplete: true },
    },
  });

  const context = await requireEmployerPublishingContext(
    new Request("https://example.com/api/employer/jobs", {
      headers: { Authorization: "Bearer token" },
    }),
    {
      adminAuth: {
        async verifyIdToken() {
          return {
            uid: "user_approved",
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

  assert.equal(context.employerId, "org_approved");
});
