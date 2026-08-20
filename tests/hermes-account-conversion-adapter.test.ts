import assert from "node:assert/strict";
import test from "node:test";

import {
  createHermesAccountConversionFirestoreAdapter,
  hermesAccountConversionIdempotencyDocumentId,
} from "../src/lib/server/hermes-account-conversion-firestore.ts";
import type {
  HermesFirestorePort,
  HermesFirestorePortTransaction,
} from "../src/lib/server/hermes-firestore-adapter.ts";
import {
  applyHermesAccountConversion,
  reviewHermesAccountConversion,
  ACCOUNT_CONVERSION_CONFIRMATION,
} from "../src/lib/server/hermes-account-conversion.ts";

interface StoredDoc { version: string; data: Record<string, unknown> }

function memoryPort(seed: Record<string, Record<string, StoredDoc>>) {
  const collections = new Map(Object.entries(structuredClone(seed)).map(([name, docs]) => [name, new Map(Object.entries(docs))]));
  let version = 10;
  let targetWrites = 0;
  const clone = () => new Map([...collections].map(([name, docs]) => [name, new Map(structuredClone([...docs]))]));
  const read = (source: typeof collections, collection: string, id: string) => {
    const stored = source.get(collection)?.get(id);
    return stored ? { id, version: stored.version, data: structuredClone(stored.data) } : null;
  };
  const write = (source: typeof collections, collection: string, id: string, data: Record<string, unknown>, merge: boolean) => {
    const docs = source.get(collection) ?? new Map<string, StoredDoc>();
    source.set(collection, docs);
    const previous = docs.get(id);
    docs.set(id, { version: `v${++version}`, data: merge ? { ...(previous?.data ?? {}), ...structuredClone(data) } : structuredClone(data) });
    if (["users", "members", "employers", "organizations", "subscriptions"].includes(collection)) targetWrites += 1;
  };
  const port: HermesFirestorePort = {
    async queryExact(collection, field, value, limit) {
      return [...(collections.get(collection)?.entries() ?? [])]
        .filter(([, stored]) => stored.data[field] === value).slice(0, limit)
        .map(([id, stored]) => ({ id, version: stored.version, data: structuredClone(stored.data) }));
    },
    async queryExactFields(collection, filters, limit) {
      return [...(collections.get(collection)?.entries() ?? [])]
        .filter(([, stored]) => filters.every(({ field, value }) => stored.data[field] === value)).slice(0, limit)
        .map(([id, stored]) => ({ id, version: stored.version, data: structuredClone(stored.data) }));
    },
    async getDocument(collection, id) { return read(collections, collection, id); },
    async runTransaction<T>(handler: (tx: HermesFirestorePortTransaction) => Promise<T>) {
      const working = clone();
      const tx: HermesFirestorePortTransaction = {
        async getDocument(collection, id) { return read(working, collection, id); },
        setDocument(collection, id, data, options) { write(working, collection, id, data, options?.merge === true); },
        updateDocument(collection, id, data) {
          if (!working.get(collection)?.has(id)) throw new Error("missing document");
          write(working, collection, id, data, true);
        },
      };
      const result = await handler(tx);
      collections.clear();
      for (const [name, docs] of working) collections.set(name, docs);
      return result;
    },
  };
  return {
    port,
    get: (collection: string, id: string) => collections.get(collection)?.get(id),
    targetWrites: () => targetWrites,
  };
}

const seed = {
  users: { user_1: { version: "u1", data: { email: "owner@example.com", role: "employer", employerId: "employer_1", orgId: "organization_1", orgRole: "owner", profile: "keep" } } },
  members: { user_1: { version: "m1", data: { role: "employer", orgId: "organization_1", orgRole: "owner", resume: "keep" } } },
  employers: { employer_1: { version: "e1", data: { uid: "user_1", email: "owner@example.com", status: "approved", disabled: false, plan: "premium", subscriptionTier: "premium", subscriptionStatus: "active", subscription: { tier: "premium", status: "active", applicationSetting: "keep" }, applicationConfig: "keep" } } },
  organizations: { organization_1: { version: "o1", data: { employerId: "employer_1", ownerId: "user_1", status: "approved", disabled: false, plan: "premium", tier: "premium", subscriptionTier: "premium", subscriptionStatus: "active", subscription: { tier: "premium", status: "active", applicationSetting: "keep" }, profileStory: "keep" } } },
  subscriptions: {
    subscription_1: { version: "s1", data: { employerId: "employer_1", organizationId: "organization_1", plan: "tier2", status: "active", amount: 0, manualOverride: true, applicationId: "keep" } },
    subscription_2: { version: "s2", data: { orgId: "organization_1", plan: "tier2", status: "active", totalAmount: 0, bonusAccessReason: "Complimentary Hermes administrator grant" } },
    paid_subscription: { version: "s3", data: { orgId: "organization_1", plan: "tier2", status: "active", totalAmount: 999 } },
  },
};

function execution(key = "convert-1") {
  return { keyId: "primary", idempotencyKey: key, requestHash: "a".repeat(64) };
}

test("conversion adapter uniquely resolves linked targets and all complimentary subscriptions", async () => {
  const memory = memoryPort(seed);
  const adapter = createHermesAccountConversionFirestoreAdapter(memory.port);
  const deps = adapter.createServiceDeps({ reviewSecret: "s".repeat(64), execution: execution() });
  const reviewed = await reviewHermesAccountConversion({ email: "owner@example.com" }, deps);
  assert.equal(reviewed.ok, true);
  if (!reviewed.ok) return;
  assert.equal(reviewed.current.complimentarySubscriptionsActive, 2);

  const ambiguous = memoryPort({ ...seed, employers: { ...seed.employers, employer_2: { version: "e2", data: { ownerId: "user_1" } } } });
  const ambiguousDeps = createHermesAccountConversionFirestoreAdapter(ambiguous.port)
    .createServiceDeps({ reviewSecret: "s".repeat(64), execution: execution("ambiguous") });
  const result = await reviewHermesAccountConversion({ email: "owner@example.com" }, ambiguousDeps);
  assert.deepEqual(result, { ok: false, status: 409, error: "Linked employer lookup was not unique" });
});

test("conversion transaction preserves unrelated fields, expires only complimentary records, audits safely, and verifies readback", async () => {
  const memory = memoryPort(seed);
  const adapter = createHermesAccountConversionFirestoreAdapter(memory.port, { now: () => new Date("2026-08-20T12:00:00.000Z") });
  const deps = adapter.createServiceDeps({ reviewSecret: "s".repeat(64), execution: execution() });
  const reviewed = await reviewHermesAccountConversion({ email: "owner@example.com" }, deps);
  assert.equal(reviewed.ok, true);
  if (!reviewed.ok) return;
  const applied = await applyHermesAccountConversion({ reviewToken: reviewed.reviewToken, confirmation: ACCOUNT_CONVERSION_CONFIRMATION }, deps);
  assert.equal(applied.ok, true);
  assert.equal(memory.get("users", "user_1")?.data.profile, "keep");
  assert.equal(memory.get("members", "user_1")?.data.resume, "keep");
  assert.equal(memory.get("employers", "employer_1")?.data.applicationConfig, "keep");
  assert.equal(memory.get("organizations", "organization_1")?.data.profileStory, "keep");
  assert.equal((memory.get("employers", "employer_1")?.data.subscription as Record<string, unknown>).applicationSetting, "keep");
  assert.equal((memory.get("organizations", "organization_1")?.data.subscription as Record<string, unknown>).applicationSetting, "keep");
  assert.equal(memory.get("subscriptions", "subscription_1")?.data.applicationId, "keep");
  assert.equal(memory.get("subscriptions", "subscription_1")?.data.status, "expired");
  assert.equal(memory.get("subscriptions", "subscription_2")?.data.status, "expired");
  assert.equal(memory.get("subscriptions", "paid_subscription")?.data.status, "active");
  assert.equal(memory.get("users", "user_1")?.data.employerId, null);
  assert.equal(memory.get("members", "user_1")?.data.orgId, null);

  const id = hermesAccountConversionIdempotencyDocumentId(execution());
  const audit = memory.get("hermesAdminAudit", id)?.data ?? {};
  const serialized = JSON.stringify(audit);
  for (const secret of ["owner@example.com", reviewed.reviewToken, "signature", "nonce", "secret", "body"]) {
    assert.equal(serialized.includes(secret), false);
  }
  assert.equal(memory.get("hermesAdminIdempotency", id)?.data.authCleanupComplete, true);
});

test("conversion transaction rejects stale versions atomically", async () => {
  const memory = memoryPort(seed);
  const adapter = createHermesAccountConversionFirestoreAdapter(memory.port);
  const deps = adapter.createServiceDeps({ reviewSecret: "s".repeat(64), execution: execution() });
  const reviewed = await reviewHermesAccountConversion({ email: "owner@example.com" }, deps);
  assert.equal(reviewed.ok, true);
  if (!reviewed.ok) return;
  const reviewedOrganization = structuredClone(memory.get("organizations", "organization_1")!);
  memory.get("organizations", "organization_1")!.version = "changed";
  deps.findLinkedOrganizations = async () => [{
    id: "organization_1",
    version: reviewedOrganization.version,
    data: reviewedOrganization.data,
  }];
  await assert.rejects(
    () => applyHermesAccountConversion({ reviewToken: reviewed.reviewToken, confirmation: ACCOUNT_CONVERSION_CONFIRMATION }, deps),
    (error: unknown) => Boolean(error && typeof error === "object" && "status" in error && error.status === 409),
  );
  assert.equal(memory.get("users", "user_1")?.data.role, "employer");
});

test("completed conversion retry is a verified no-op with no second target write", async () => {
  const memory = memoryPort(seed);
  const adapter = createHermesAccountConversionFirestoreAdapter(memory.port);
  const input = { reviewSecret: "s".repeat(64), execution: execution() };
  const deps = adapter.createServiceDeps(input);
  const reviewed = await reviewHermesAccountConversion({ email: "owner@example.com" }, deps);
  assert.equal(reviewed.ok, true);
  if (!reviewed.ok) return;
  await applyHermesAccountConversion({ reviewToken: reviewed.reviewToken, confirmation: ACCOUNT_CONVERSION_CONFIRMATION }, deps);
  const writes = memory.targetWrites();
  const cached = await adapter.getIdempotentApply(input.execution);
  assert.equal(cached?.status, "applied");
  assert.equal(cached?.authCleanupComplete, true);
  assert.equal(memory.targetWrites(), writes);
  assert.equal(cached?.verified.accountRole, "community");
});
