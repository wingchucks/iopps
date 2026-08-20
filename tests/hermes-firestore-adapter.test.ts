import assert from "node:assert/strict";
import test from "node:test";

import {
  createHermesFirestoreAdapter,
  hermesIdempotencyDocumentId,
  type HermesFirestorePort,
  type HermesFirestorePortTransaction,
} from "../src/lib/server/hermes-firestore-adapter.ts";
import {
  applyHermesEmployer,
  buildHermesEmployerMutationPlan,
  hermesEmployerSubscriptionDocumentId,
  normalizeHermesEmployerCommand,
  reviewHermesEmployer,
  type HermesEmployerBoundState,
} from "../src/lib/server/hermes-employer-admin.ts";

interface StoredDoc {
  version: string;
  data: Record<string, unknown>;
}

function memoryPort(seed: Record<string, Record<string, StoredDoc>> = {}) {
  const collections = new Map<string, Map<string, StoredDoc>>();
  for (const [collection, docs] of Object.entries(seed)) {
    collections.set(collection, new Map(Object.entries(structuredClone(docs))));
  }
  let version = 100;
  let transactionWrites = 0;
  let outsideReads = 0;

  const docFor = (source: Map<string, Map<string, StoredDoc>>, collection: string, id: string) => {
    const value = source.get(collection)?.get(id);
    return value ? { id, version: value.version, data: structuredClone(value.data) } : null;
  };
  const setFor = (
    source: Map<string, Map<string, StoredDoc>>,
    collection: string,
    id: string,
    data: Record<string, unknown>,
    merge: boolean,
  ) => {
    const target = source.get(collection) ?? new Map<string, StoredDoc>();
    source.set(collection, target);
    const previous = target.get(id);
    target.set(id, {
      version: `v${++version}`,
      data: merge ? { ...(previous?.data ?? {}), ...structuredClone(data) } : structuredClone(data),
    });
    transactionWrites += 1;
  };
  const cloneCollections = () => {
    const clone = new Map<string, Map<string, StoredDoc>>();
    for (const [name, docs] of collections) clone.set(name, new Map(structuredClone([...docs])));
    return clone;
  };

  const port: HermesFirestorePort = {
    async queryExact(collection, field, value, limit) {
      return [...(collections.get(collection)?.entries() ?? [])]
        .filter(([, stored]) => stored.data[field] === value)
        .slice(0, limit)
        .map(([id, stored]) => ({ id, version: stored.version, data: structuredClone(stored.data) }));
    },
    async queryExactFields(collection, filters, limit) {
      return [...(collections.get(collection)?.entries() ?? [])]
        .filter(([, stored]) => filters.every(({ field, value }) => stored.data[field] === value))
        .slice(0, limit)
        .map(([id, stored]) => ({ id, version: stored.version, data: structuredClone(stored.data) }));
    },
    async getDocument(collection, id) {
      outsideReads += 1;
      return docFor(collections, collection, id);
    },
    async runTransaction<T>(handler: (transaction: HermesFirestorePortTransaction) => Promise<T>) {
      const working = cloneCollections();
      const tx: HermesFirestorePortTransaction = {
        async getDocument(collection, id) {
          return docFor(working, collection, id);
        },
        setDocument(collection, id, data, options) {
          setFor(working, collection, id, data, options?.merge === true);
        },
        updateDocument(collection, id, data) {
          if (!working.get(collection)?.has(id)) throw new Error("missing document");
          setFor(working, collection, id, data, true);
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
    get(collection: string, id: string) {
      return collections.get(collection)?.get(id);
    },
    values(collection: string) {
      return [...(collections.get(collection)?.values() ?? [])];
    },
    stats() {
      return { transactionWrites, outsideReads };
    },
  };
}

const normalized = normalizeHermesEmployerCommand({
  email: "person@example.com",
  organizationName: "Correct Organization",
  subscriptionStart: "2026-08-19",
  subscriptionEnd: "2027-08-19",
});
assert.equal(normalized.ok, true);
if (!normalized.ok) throw new Error("invalid fixture");
const command = normalized.command;

const boundState: HermesEmployerBoundState = {
  userId: "user_1",
  userVersion: "u1",
  employerId: "org_1",
  employerVersion: "e1",
  organizationId: "org_1",
  organizationVersion: "missing",
  subscriptionId: hermesEmployerSubscriptionDocumentId(command, "org_1"),
  subscriptionVersion: "missing",
};

test("Firestore Hermes nonces persist once without storing the raw nonce", async () => {
  const memory = memoryPort();
  const adapter = createHermesFirestoreAdapter(memory.port, {
    now: () => new Date("2026-08-19T18:00:00.000Z"),
  });
  const input = { keyId: "primary", nonceHash: "a".repeat(64), expiresAt: new Date("2026-08-19T18:10:00Z") };
  assert.equal(await adapter.consumeNonce(input), true);
  assert.equal(await adapter.consumeNonce(input), false);
  const stored = memory.values("hermesAdminNonces")[0]?.data ?? {};
  assert.equal(stored.keyId, "primary");
  assert.equal(stored.nonceHash, undefined);
  assert.equal(Object.values(stored).includes(input.nonceHash), false);
});

test("Firestore Hermes employer lookup is exact across email fields and deduplicates one document", async () => {
  const memory = memoryPort({
    employers: {
      org_1: { version: "e1", data: { email: command.email, contactEmail: command.email } },
      org_2: { version: "e2", data: { contactEmail: command.email } },
    },
  });
  const deps = createHermesFirestoreAdapter(memory.port).createEmployerServiceDeps({
    reviewSecret: "s".repeat(64),
    execution: { keyId: "primary", idempotencyKey: "apply-1", requestHash: "b".repeat(64) },
  });
  const matches = await deps.findEmployersByEmail(command.email);
  assert.deepEqual(matches.map((doc) => doc.id), ["org_1", "org_2"]);
});

test("Firestore Hermes resolution updates unique auto-ID organization and subscription documents without duplicates", async () => {
  const originalSubscriptionCreatedAt = new Date("2025-01-02T03:04:05.678Z");
  const memory = memoryPort({
    users: { user_1: { version: "u1", data: { email: command.email, role: "community" } } },
    employers: { org_1: { version: "e1", data: { email: command.email, status: "pending" } } },
    organizations: {
      organization_auto_1: { version: "o1", data: { employerId: "org_1", status: "pending" } },
    },
    subscriptions: {
      subscription_auto_1: {
        version: "s1",
        data: {
          orgId: "org_1",
          plan: "tier2",
          billingCycle: "annual",
          status: "pending",
          createdAt: originalSubscriptionCreatedAt,
        },
      },
    },
  });
  const deps = createHermesFirestoreAdapter(memory.port, {
    now: () => new Date("2026-08-19T18:00:00.000Z"),
  }).createEmployerServiceDeps({
    reviewSecret: "s".repeat(64),
    execution: { keyId: "primary", idempotencyKey: "apply-auto-ids", requestHash: "e".repeat(64) },
  });
  const input = {
    email: command.email,
    organizationName: command.organizationName,
    subscriptionStart: command.subscriptionStart,
    subscriptionEnd: command.subscriptionEnd,
  };
  const reviewed = await reviewHermesEmployer(input, deps);
  assert.equal(reviewed.ok, true);
  if (!reviewed.ok) return;
  assert.equal(reviewed.target.organizationId, "organization_auto_1");

  const applied = await applyHermesEmployer({
    command: input,
    reviewToken: reviewed.reviewToken,
    confirmation: "APPLY IOPPS EMPLOYER UPDATE",
  }, deps);
  assert.equal(applied.ok, true);
  assert.equal(memory.get("organizations", "organization_auto_1")?.data.organizationName, command.organizationName);
  assert.equal(memory.get("subscriptions", "subscription_auto_1")?.data.status, "active");
  assert.equal(memory.get("subscriptions", "subscription_auto_1")?.data.employerId, "org_1");
  assert.equal(memory.get("subscriptions", "subscription_auto_1")?.data.orgId, "org_1");
  assert.equal(memory.get("subscriptions", "subscription_auto_1")?.data.organizationId, "organization_auto_1");
  assert.deepEqual(
    memory.get("subscriptions", "subscription_auto_1")?.data.createdAt,
    originalSubscriptionCreatedAt,
  );
  assert.equal(memory.get("organizations", "org_1"), undefined);
  assert.equal(memory.get("subscriptions", hermesEmployerSubscriptionDocumentId(command, "org_1")), undefined);
  assert.equal(memory.values("organizations").length, 1);
  assert.equal(memory.values("subscriptions").length, 1);
});

test("Firestore Hermes future reviews resolve one three-field subscription without duplicating", async () => {
  const memory = memoryPort({
    users: { user_1: { version: "u1", data: { email: command.email, role: "community" } } },
    employers: { org_1: { version: "e1", data: { email: command.email, status: "pending" } } },
    organizations: {
      organization_auto_1: { version: "o1", data: { employerId: "org_1", status: "pending" } },
    },
    subscriptions: {
      subscription_auto_1: {
        version: "s1",
        data: {
          employerId: "org_1",
          orgId: "org_1",
          organizationId: "organization_auto_1",
          plan: "tier2",
          billingCycle: "annual",
          status: "pending",
        },
      },
    },
  });
  const deps = createHermesFirestoreAdapter(memory.port, {
    now: () => new Date("2026-08-19T18:00:00.000Z"),
  }).createEmployerServiceDeps({
    reviewSecret: "s".repeat(64),
    execution: { keyId: "primary", idempotencyKey: "future-review", requestHash: "1".repeat(64) },
  });
  const input = {
    email: command.email,
    organizationName: command.organizationName,
    subscriptionStart: command.subscriptionStart,
    subscriptionEnd: command.subscriptionEnd,
  };

  const reviewed = await reviewHermesEmployer(input, deps);
  assert.equal(reviewed.ok, true);
  if (!reviewed.ok) return;
  const applied = await applyHermesEmployer({
    command: input,
    reviewToken: reviewed.reviewToken,
    confirmation: "APPLY IOPPS EMPLOYER UPDATE",
  }, deps);

  assert.equal(applied.ok, true);
  assert.equal(memory.get("subscriptions", "subscription_auto_1")?.data.status, "active");
  assert.equal(memory.values("subscriptions").length, 1);
  assert.equal(memory.get("subscriptions", hermesEmployerSubscriptionDocumentId(command, "org_1")), undefined);
});

test("Firestore Hermes subscription resolution deduplicates one dual-ID match and rejects distinct matches", async () => {
  const baseSeed = {
    users: { user_1: { version: "u1", data: { email: command.email } } },
    employers: { org_1: { version: "e1", data: { email: command.email } } },
    organizations: {
      organization_auto_1: { version: "o1", data: { employerId: "org_1" } },
    },
  };
  const input = {
    email: command.email,
    organizationName: command.organizationName,
    subscriptionStart: command.subscriptionStart,
    subscriptionEnd: command.subscriptionEnd,
  };
  const uniqueMemory = memoryPort({
    ...baseSeed,
    subscriptions: {
      subscription_auto_1: {
        version: "s1",
        data: { employerId: "org_1", orgId: "organization_auto_1", plan: "tier2", billingCycle: "annual" },
      },
    },
  });
  const uniqueDeps = createHermesFirestoreAdapter(uniqueMemory.port).createEmployerServiceDeps({
    reviewSecret: "s".repeat(64),
    execution: { keyId: "primary", idempotencyKey: "dual-id-unique", requestHash: "2".repeat(64) },
  });
  assert.equal((await reviewHermesEmployer(input, uniqueDeps)).ok, true);

  const ambiguousMemory = memoryPort({
    ...baseSeed,
    subscriptions: {
      subscription_by_employer: {
        version: "s1",
        data: { orgId: "org_1", plan: "tier2", billingCycle: "annual" },
      },
      subscription_by_organization: {
        version: "s2",
        data: {
          employerId: "other_employer",
          orgId: "other_employer",
          organizationId: "organization_auto_1",
          plan: "tier2",
          billingCycle: "annual",
        },
      },
    },
  });
  const ambiguousDeps = createHermesFirestoreAdapter(ambiguousMemory.port).createEmployerServiceDeps({
    reviewSecret: "s".repeat(64),
    execution: { keyId: "primary", idempotencyKey: "dual-id-ambiguous", requestHash: "3".repeat(64) },
  });
  assert.deepEqual(await reviewHermesEmployer(input, ambiguousDeps), {
    ok: false,
    status: 409,
    error: "Subscription lookup was not unique",
  });
});

test("Firestore Hermes resolution rejects ambiguous linked organizations and subscriptions", async () => {
  const baseSeed = {
    users: { user_1: { version: "u1", data: { email: command.email } } },
    employers: { org_1: { version: "e1", data: { email: command.email } } },
  };
  const organizationMemory = memoryPort({
    ...baseSeed,
    organizations: {
      organization_auto_1: { version: "o1", data: { employerId: "org_1" } },
      organization_auto_2: { version: "o2", data: { employerId: "org_1" } },
    },
  });
  const organizationDeps = createHermesFirestoreAdapter(organizationMemory.port).createEmployerServiceDeps({
    reviewSecret: "s".repeat(64),
    execution: { keyId: "primary", idempotencyKey: "ambiguous-org", requestHash: "f".repeat(64) },
  });
  const input = {
    email: command.email,
    organizationName: command.organizationName,
    subscriptionStart: command.subscriptionStart,
    subscriptionEnd: command.subscriptionEnd,
  };
  assert.deepEqual(await reviewHermesEmployer(input, organizationDeps), {
    ok: false,
    status: 409,
    error: "Organization lookup was not unique",
  });

  const subscriptionMemory = memoryPort({
    ...baseSeed,
    subscriptions: {
      subscription_auto_1: {
        version: "s1",
        data: { orgId: "org_1", plan: "tier2", billingCycle: "annual" },
      },
      subscription_auto_2: {
        version: "s2",
        data: { orgId: "org_1", plan: "tier2", billingCycle: "annual" },
      },
    },
  });
  const subscriptionDeps = createHermesFirestoreAdapter(subscriptionMemory.port).createEmployerServiceDeps({
    reviewSecret: "s".repeat(64),
    execution: { keyId: "primary", idempotencyKey: "ambiguous-subscription", requestHash: "0".repeat(64) },
  });
  assert.deepEqual(await reviewHermesEmployer(input, subscriptionDeps), {
    ok: false,
    status: 409,
    error: "Subscription lookup was not unique",
  });
});

test("Firestore Hermes apply is atomic, deterministic, sanitized, and rereads committed documents", async () => {
  const memory = memoryPort({
    users: { user_1: { version: "u1", data: {
      email: command.email,
      role: "community",
      employerId: "wrong-employer",
      orgId: "wrong-organization",
      orgRole: "member",
      unrelatedUser: "keep",
    } } },
    employers: {
      org_1: {
        version: "e1",
        data: { email: command.email, organizationName: "Wrong Name", status: "pending" },
      },
    },
  });
  const execution = { keyId: "primary", idempotencyKey: "apply-1", requestHash: "b".repeat(64) };
  const adapter = createHermesFirestoreAdapter(memory.port, {
    now: () => new Date("2026-08-19T18:00:00.000Z"),
  });
  const deps = adapter.createEmployerServiceDeps({ reviewSecret: "s".repeat(64), execution });
  const plan = buildHermesEmployerMutationPlan(command, {
    orgId: "org_1",
    now: new Date("2026-08-19T18:00:00.000Z"),
    createdAtToken: "created",
    updatedAtToken: "updated",
  });

  const first = await deps.commit({ command, boundState, plan });
  assert.equal(first.verified.organizationName, "Correct Organization");
  assert.equal(first.verified.role, "employer");
  assert.equal(first.verified.subscriptionTier, "premium");
  assert.ok(memory.stats().outsideReads >= 4, "post-write state must be reread outside the transaction");
  assert.deepEqual(memory.get("users", "user_1")?.data, {
    email: command.email,
    role: "employer",
    employerId: "org_1",
    orgId: "org_1",
    orgRole: "owner",
    unrelatedUser: "keep",
  });

  const idempotencyId = hermesIdempotencyDocumentId(execution);
  const record = memory.get("hermesAdminIdempotency", idempotencyId)?.data ?? {};
  assert.equal(record.idempotencyKey, undefined);
  assert.equal(record.requestHash, execution.requestHash);
  const audit = memory.get("hermesAdminAudit", idempotencyId)?.data ?? {};
  const serializedAudit = JSON.stringify(audit);
  for (const forbidden of [command.email, "reviewToken", "signature", "nonce", "secret", "body"]) {
  assert.equal(serializedAudit.toLowerCase().includes(forbidden.toLowerCase()), false, forbidden);
  }

  const cached = await adapter.getIdempotentApply(command, execution);
  assert.deepEqual(cached, { status: "applied", committedAt: first.committedAt, verified: first.verified });

  const writesAfterFirst = memory.stats().transactionWrites;
  const second = await deps.commit({ command, boundState, plan });
  assert.deepEqual(second.verified, first.verified);
  assert.equal(memory.stats().transactionWrites, writesAfterFirst, "idempotent retry must not write again");
});

test("Firestore Hermes idempotent retries reject stable allowlisted and subscription intent drift", async () => {
  const scenarios = [
    {
      name: "employer disabled",
      mutate(memory: ReturnType<typeof memoryPort>) {
        const employer = memory.get("employers", "org_1");
        if (employer) employer.data.disabled = true;
      },
    },
    {
      name: "organization verification",
      mutate(memory: ReturnType<typeof memoryPort>) {
        const organization = memory.get("organizations", "org_1");
        if (organization) organization.data.verificationStatus = "pending";
      },
    },
    {
      name: "nested subscription intent",
      mutate(memory: ReturnType<typeof memoryPort>) {
        const employer = memory.get("employers", "org_1");
        const subscription = employer?.data.subscription;
        if (subscription && typeof subscription === "object" && !Array.isArray(subscription)) {
          (subscription as Record<string, unknown>).paymentId = "drifted-payment";
        }
      },
    },
    {
      name: "subscription record intent",
      mutate(memory: ReturnType<typeof memoryPort>) {
        const subscription = memory.get("subscriptions", boundState.subscriptionId);
        if (subscription) subscription.data.status = "inactive";
      },
    },
  ];

  for (const [index, scenario] of scenarios.entries()) {
    const memory = memoryPort({
      users: { user_1: { version: "u1", data: { email: command.email } } },
      employers: { org_1: { version: "e1", data: { email: command.email } } },
    });
    const execution = {
      keyId: "primary",
      idempotencyKey: `idempotent-drift-${index}`,
      requestHash: "f".repeat(64),
    };
    const now = new Date("2026-08-19T18:00:00.000Z");
    const adapter = createHermesFirestoreAdapter(memory.port, { now: () => now });
    const deps = adapter.createEmployerServiceDeps({ reviewSecret: "s".repeat(64), execution });
    const plan = buildHermesEmployerMutationPlan(command, { orgId: "org_1", now });
    await deps.commit({ command, boundState, plan });

    scenario.mutate(memory);

    await assert.rejects(
      () => adapter.getIdempotentApply(command, execution),
      /Idempotent result verification failed|could not reread/,
      scenario.name,
    );
  }
});

test("Firestore Hermes apply rejects stale versions before any mutation", async () => {
  const memory = memoryPort({
    users: { user_1: { version: "changed", data: { email: command.email, role: "community" } } },
    employers: { org_1: { version: "e1", data: { email: command.email } } },
  });
  const adapter = createHermesFirestoreAdapter(memory.port);
  const deps = adapter.createEmployerServiceDeps({
    reviewSecret: "s".repeat(64),
    execution: { keyId: "primary", idempotencyKey: "apply-stale", requestHash: "c".repeat(64) },
  });
  const plan = buildHermesEmployerMutationPlan(command, { orgId: "org_1" });
  await assert.rejects(() => deps.commit({ command, boundState, plan }), /changed since review/);
  assert.equal(memory.stats().transactionWrites, 0);
});

test("Firestore Hermes post-write verification checks employer and organization independently", async () => {
  const desiredData = {
    organizationName: "Correct Organization",
    status: "approved",
    verified: true,
    subscriptionTier: "premium",
    subscriptionStart: "2026-08-19T00:00:00.000Z",
    subscriptionEnd: "2027-08-19T00:00:00.000Z",
    subscription: { tier: "premium", status: "active", amountPaid: 0 },
  };
  const memory = memoryPort({
    users: { user_1: { version: "u1", data: { email: command.email, role: "employer" } } },
    employers: {
      org_1: { version: "e1", data: { email: command.email, ...desiredData, organizationName: "Stale Employer" } },
    },
    organizations: { org_1: { version: "o1", data: desiredData } },
  });
  const droppingPort: HermesFirestorePort = {
    ...memory.port,
    runTransaction: (handler) => memory.port.runTransaction((transaction) => handler({
      ...transaction,
      updateDocument(collection, id, data) {
        if (collection !== "employers") transaction.updateDocument(collection, id, data);
      },
    })),
  };
  const deps = createHermesFirestoreAdapter(droppingPort, {
    now: () => new Date("2026-08-19T18:00:00.000Z"),
  }).createEmployerServiceDeps({
    reviewSecret: "s".repeat(64),
    execution: { keyId: "primary", idempotencyKey: "apply-post-verify", requestHash: "d".repeat(64) },
  });
  const plan = buildHermesEmployerMutationPlan(command, {
    orgId: "org_1",
    now: new Date("2026-08-19T18:00:00.000Z"),
  });
  const state = { ...boundState, organizationVersion: "o1" };

  await assert.rejects(
    () => deps.commit({ command, boundState: state, plan }),
    /Post-write verification failed/,
  );
});

test("Firestore Hermes post-write verification rejects stale user, employer, organization, and nested intent fields", async () => {
  const now = new Date("2026-08-19T18:00:00.000Z");
  const plan = buildHermesEmployerMutationPlan(command, { orgId: "org_1", now });
  const cases = [
    { collection: "users", field: "employerId", stale: "wrong-employer" },
    { collection: "employers", field: "disabled", stale: true },
    { collection: "employers", field: "approved", stale: false },
    { collection: "employers", field: "verificationStatus", stale: "pending" },
    { collection: "employers", field: "subscriptionStatus", stale: "inactive" },
    { collection: "employers", field: "plan", stale: "standard" },
    { collection: "organizations", field: "tier", stale: "standard" },
    { collection: "organizations", field: "subscription.paymentId", stale: "stale-payment" },
  ] as const;

  for (const scenario of cases) {
    const userData = { email: command.email, ...structuredClone(plan.userPatch), unrelatedUser: "keep" };
    const employerData = { email: command.email, ...structuredClone(plan.employerPatch), unrelatedEmployer: "keep" };
    const organizationData = { ...structuredClone(plan.organizationPatch), unrelatedOrganization: "keep" };
    const targetData = scenario.collection === "users"
      ? userData
      : scenario.collection === "employers"
        ? employerData
        : organizationData;
    if (scenario.field === "subscription.paymentId") {
      (targetData.subscription as Record<string, unknown>).paymentId = scenario.stale;
    } else {
      targetData[scenario.field] = scenario.stale;
    }
    const memory = memoryPort({
      users: { user_1: { version: "u1", data: userData } },
      employers: { org_1: { version: "e1", data: employerData } },
      organizations: { org_1: { version: "o1", data: organizationData } },
    });
    const droppingPort: HermesFirestorePort = {
      ...memory.port,
      runTransaction: (handler) => memory.port.runTransaction((transaction) => handler({
        ...transaction,
        setDocument(collection, id, data, options) {
          const next = structuredClone(data);
          if (collection === scenario.collection) {
            if (scenario.field === "subscription.paymentId" && next.subscription) {
              (next.subscription as Record<string, unknown>).paymentId = scenario.stale;
            } else {
              delete next[scenario.field];
            }
          }
          transaction.setDocument(collection, id, next, options);
        },
        updateDocument(collection, id, data) {
          const next = structuredClone(data);
          if (collection === scenario.collection) {
            if (scenario.field === "subscription.paymentId" && next.subscription) {
              (next.subscription as Record<string, unknown>).paymentId = scenario.stale;
            } else {
              delete next[scenario.field];
            }
          }
          transaction.updateDocument(collection, id, next);
        },
      })),
    };
    const deps = createHermesFirestoreAdapter(droppingPort, { now: () => now }).createEmployerServiceDeps({
      reviewSecret: "s".repeat(64),
      execution: {
        keyId: "primary",
        idempotencyKey: `post-verify-${scenario.collection}-${scenario.field.replace(".", "-")}`,
        requestHash: "e".repeat(64),
      },
    });

    await assert.rejects(
      () => deps.commit({
        command,
        boundState: { ...boundState, organizationVersion: "o1" },
        plan,
      }),
      /Post-write verification failed/,
      `${scenario.collection}.${scenario.field}`,
    );
    assert.equal(memory.get("users", "user_1")?.data.unrelatedUser, "keep");
    assert.equal(memory.get("employers", "org_1")?.data.unrelatedEmployer, "keep");
    assert.equal(memory.get("organizations", "org_1")?.data.unrelatedOrganization, "keep");
  }
});
