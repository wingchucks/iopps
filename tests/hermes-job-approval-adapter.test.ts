import assert from "node:assert/strict";
import test from "node:test";

import {
  createHermesFeaturedIdentitySetBinding,
  createHermesJobApprovalFirestoreAdapter,
  hermesJobApprovalIdempotencyDocumentId,
} from "../src/lib/server/hermes-job-approval-firestore.ts";
import {
  applyHermesJobApproval,
  JOB_APPROVAL_CONFIRMATION,
  reviewHermesJobApproval,
} from "../src/lib/server/hermes-job-approval.ts";
import type {
  HermesFirestorePort,
  HermesFirestorePortTransaction,
} from "../src/lib/server/hermes-firestore-adapter.ts";

interface StoredDoc { version: string; data: Record<string, unknown> }

function memoryPort(seed: Record<string, Record<string, StoredDoc>>) {
  const collections = new Map(Object.entries(structuredClone(seed)).map(([name, docs]) => [name, new Map(Object.entries(docs))]));
  let version = 10;
  let targetWrites = 0;
  let outsideReads = 0;
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
    if (collection === "jobs" || collection === "posts") targetWrites += 1;
  };
  const port: HermesFirestorePort = {
    async queryExact(collection, field, value, limit) {
      return [...(collections.get(collection) ?? new Map())]
        .filter(([, document]) => document.data[field] === value)
        .slice(0, limit)
        .map(([id]) => read(collections, collection, id)!).filter(Boolean);
    },
    async queryExactFields(collection, filters, limit) {
      return [...(collections.get(collection) ?? new Map())]
        .filter(([, document]) => filters.every(({ field, value }) => document.data[field] === value))
        .slice(0, limit)
        .map(([id]) => read(collections, collection, id)!).filter(Boolean);
    },
    async getDocument(collection, id) { outsideReads += 1; return read(collections, collection, id); },
    async runTransaction<T>(handler: (transaction: HermesFirestorePortTransaction) => Promise<T>) {
      const working = clone();
      const transaction: HermesFirestorePortTransaction = {
        async getDocument(collection, id) { return read(working, collection, id); },
        async queryExact(collection, field, value, limit) {
          return [...(working.get(collection) ?? new Map())]
            .filter(([, document]) => document.data[field] === value)
            .slice(0, limit)
            .map(([id]) => read(working, collection, id)!).filter(Boolean);
        },
        setDocument(collection, id, data, options) { write(working, collection, id, data, options?.merge === true); },
        updateDocument(collection, id, data) {
          if (!working.get(collection)?.has(id)) throw new Error("missing document");
          write(working, collection, id, data, true);
        },
      };
      const result = await handler(transaction);
      collections.clear();
      for (const [name, docs] of working) collections.set(name, docs);
      return result;
    },
  };
  return {
    port,
    get: (collection: string, id: string) => collections.get(collection)?.get(id),
    put: (collection: string, id: string, stored: StoredDoc) => {
      const docs = collections.get(collection) ?? new Map<string, StoredDoc>();
      collections.set(collection, docs);
      docs.set(id, structuredClone(stored));
    },
    targetWrites: () => targetWrites,
    outsideReads: () => outsideReads,
  };
}

function fundedMemoryPort(seed: Record<string, Record<string, StoredDoc>>) {
  const prepared=structuredClone(seed);
  prepared.employers ??= {};
  prepared.employers['fixture-owner']={version:'e-fixture',data:{standardPostCredits:1}};
  for(const collection of ['jobs','posts'])for(const doc of Object.values(prepared[collection]??{})) {
    if(collection==='posts'&&doc.data.type!=='job')continue;
    if(doc.data.employerId===undefined&&doc.data.orgId===undefined)doc.data[collection==='jobs'?'employerId':'orgId']='fixture-owner';
  }
  return memoryPort(prepared);
}

function expectedPaidFields(funding:string,days:number,termId?:string) {
 const firstPublishedAt=new Date('2026-08-25T12:00:00.000Z');
 const expiresAt=new Date(firstPublishedAt.getTime()+days*86400000);
 return {expiresAt,publication:{version:1,funding,firstPublishedAt,expiresAt,durationDays:days,...(termId?{termId}:{})}};
}

function execution(key = "job-apply-1") {
  return { keyId: "primary", idempotencyKey: key, requestHash: "a".repeat(64) };
}

test("featured identity binding is deterministic and changes for every identity or version change", () => {
  const identities = [
    { collection: "posts" as const, documentId: "post-2", version: "v2" },
    { collection: "jobs" as const, documentId: "job-1", version: "v1" },
  ];
  const expected = createHermesFeaturedIdentitySetBinding(identities);
  assert.deepEqual(createHermesFeaturedIdentitySetBinding([...identities].reverse()), expected);
  assert.match(expected.activeFeaturedJobsDigest, /^[a-f0-9]{64}$/);
  assert.equal(expected.activeFeaturedJobsCount, 2);

  for (const changed of [
    [{ ...identities[0], collection: "jobs" as const }, identities[1]],
    [{ ...identities[0], documentId: "post-3" }, identities[1]],
    [{ ...identities[0], version: "v3" }, identities[1]],
    [...identities, { collection: "jobs" as const, documentId: "job-3", version: "v3" }],
  ]) {
    assert.notEqual(
      createHermesFeaturedIdentitySetBinding(changed).activeFeaturedJobsDigest,
      expected.activeFeaturedJobsDigest,
    );
  }
});

test("a successful review with 500 active featured identities yields a small apply envelope", async () => {
  const activePosts = Object.fromEntries(Array.from({ length: 500 }, (_, index) => [
    `featured-${String(index).padStart(3, "0")}`,
    {
      version: `version-private-${index}`,
      data: {
        type: "job",
        orgId: "employer-private-500",
        status: "active",
        active: true,
        featured: true,
        postedAt: "earlier",
      },
    },
  ]));
  const memory = memoryPort({
    employers: {
      "employer-private-500": {
        version: "employer-version-private-500",
        data: { plan: "free-private", subscriptionTier: "free-private", featuredPostCredits: 1 },
      },
    },
    jobs: {
      "job-123": {
        version: "target-version-private-500",
        data: {
          employerId: "employer-private-500",
          title: "A",
          status: "draft",
          active: false,
          featured: true, listingDurationDays:45,
        },
      },
    },
    posts: activePosts,
  });
  const deps = createHermesJobApprovalFirestoreAdapter(memory.port)
    .createServiceDeps({ reviewSecret: "s".repeat(64), execution: execution("five-hundred") });
  const reviewed = await reviewHermesJobApproval({ jobId: "job-123" }, deps);
  assert.equal(reviewed.ok, true);
  if (!reviewed.ok) return;
  const applyEnvelope = JSON.stringify({
    reviewToken: reviewed.reviewToken,
    confirmation: JOB_APPROVAL_CONFIRMATION,
  });
  const applyEnvelopeBytes = Buffer.byteLength(applyEnvelope, "utf8");
  assert.ok(applyEnvelopeBytes < 32_768, applyEnvelopeBytes.toString());
  assert.ok(applyEnvelopeBytes < 8_192, applyEnvelopeBytes.toString());
  for (const segment of reviewed.reviewToken.split(".")) {
    const decoded = Buffer.from(segment, "base64url").toString("utf8");
    for (const forbidden of [
      "employer-private-500",
      "employer-version-private-500",
      "free-private",
      "featured-499",
      "version-private-499",
      "target-version-private-500",
      "job-123",
    ]) assert.equal(decoded.includes(forbidden), false, forbidden);
  }
});

test("job adapter resolves the exact document ID across canonical jobs and legacy job posts", async () => {
  const jobs = memoryPort({
    jobs: { "job-123": { version: "j1", data: { title: "A", status: "draft", active: false } } },
  });
  const jobsDeps = createHermesJobApprovalFirestoreAdapter(jobs.port)
    .createServiceDeps({ reviewSecret: "s".repeat(64), execution: execution() });
  assert.deepEqual((await jobsDeps.findJobCandidates("job-123")).map(({ collection, schema }) => ({ collection, schema })), [
    { collection: "jobs", schema: "employer-job-v1" },
  ]);

  const posts = memoryPort({
    posts: { "job-123": { version: "p1", data: { type: "job", title: "A", status: "draft", active: false } } },
  });
  const postsDeps = createHermesJobApprovalFirestoreAdapter(posts.port)
    .createServiceDeps({ reviewSecret: "s".repeat(64), execution: execution("post") });
  assert.deepEqual((await postsDeps.findJobCandidates("job-123")).map(({ collection, schema }) => ({ collection, schema })), [
    { collection: "posts", schema: "legacy-job-post-v1" },
  ]);

  const both = memoryPort({
    jobs: { "job-123": { version: "j1", data: { status: "draft", active: false } } },
    posts: { "job-123": { version: "p1", data: { type: "job", status: "draft", active: false } } },
  });
  const bothDeps = createHermesJobApprovalFirestoreAdapter(both.port)
    .createServiceDeps({ reviewSecret: "s".repeat(64), execution: execution("both") });
  assert.equal((await bothDeps.findJobCandidates("job-123")).length, 2);
});

test("job approval transaction changes only canonical publication fields, preserves the job, audits safely, and verifies readback", async () => {
  const memory = fundedMemoryPort({
    jobs: {
      "job-123": {
        version: "j1",
        data: {
          title: "Community Liaison",
          orgName: "Northern Organization",
          status: "draft",
          active: false,
          description: "preserve body",
          contactEmail: "private@example.com",
          applicationConfig: { preserve: true },
          createdAt: "preserve-created",
        },
      },
    },
  });
  const exec = execution();
  const adapter = createHermesJobApprovalFirestoreAdapter(memory.port, {
    now: () => new Date("2026-08-25T12:00:00.000Z"),
  });
  const deps = adapter.createServiceDeps({ reviewSecret: "s".repeat(64), execution: exec });
  const reviewed = await reviewHermesJobApproval({ jobId: "job-123" }, deps);
  assert.equal(reviewed.ok, true);
  if (!reviewed.ok) return;
  const applied = await applyHermesJobApproval({
    reviewToken: reviewed.reviewToken,
    confirmation: JOB_APPROVAL_CONFIRMATION,
  }, deps);
  assert.equal(applied.ok, true);
  if (!applied.ok) return;
  assert.equal(applied.status, "applied");
  assert.deepEqual(applied.verified, {
    title: "Community Liaison",
    organization: "Northern Organization",
    status: "active",
    featuredIntent: "standard",
    entitlementDecision: "standard_credit",funding:"standard_credit",durationDays:30,expiresAt:"2026-09-24T12:00:00.000Z",
  });
  assert.deepEqual(memory.get("jobs", "job-123")?.data, {
    employerId:"fixture-owner",...expectedPaidFields("standard_credit",30),standardCreditConsumed:true,standardCreditConsumedAt:new Date("2026-08-25T12:00:00.000Z"),
    title: "Community Liaison",
    orgName: "Northern Organization",
    status: "active",
    active: true,
    description: "preserve body",
    contactEmail: "private@example.com",
    applicationConfig: { preserve: true },
    createdAt: "preserve-created",
    updatedAt: new Date("2026-08-25T12:00:00.000Z"),
    postedAt: new Date("2026-08-25T12:00:00.000Z"),
  });
  assert.ok(memory.outsideReads() >= 3, "target and idempotency state must be reread outside the transaction");

  const id = hermesJobApprovalIdempotencyDocumentId(exec);
  const audit = memory.get("hermesAdminAudit", id)?.data ?? {};
  const idempotency = memory.get("hermesAdminIdempotency", id)?.data ?? {};
  for (const stored of [audit, idempotency]) {
    const serialized = JSON.stringify(stored).toLowerCase();
    for (const forbidden of ["preserve body", "private@example.com", reviewed.reviewToken.toLowerCase(), "signature", "nonce"]) {
      assert.equal(serialized.includes(forbidden), false, forbidden);
    }
  }
  assert.deepEqual(audit.changedFields, {employer:["standardPostCredits"],job:["active","expiresAt","postedAt","publication","standardCreditConsumed","standardCreditConsumedAt","status"]});
});

test("featured approval uses an included slot without consuming a purchased credit", async () => {
  const memory = memoryPort({
    employers: {
      "employer-1": {
        version: "e1",
        data: { plan: "premium", subscriptionTier: "premium", subscriptionStatus:"active",subscriptionStart:"2026-01-01",subscriptionEnd:"2027-01-01",subscription:{paymentId:"admin-manual-tier2",amountPaid:2500}, featuredPostCredits: 2, privateBillingNote: "keep-secret" },
      },
    },
    jobs: {
      "job-123": {
        version: "j1",
        data: {
          employerId: "employer-1", title: "Community Liaison", orgName: "Northern Organization",
          status: "draft", active: false, featured: true, listingDurationDays:45, description: "preserve body",
        },
      },
      "job-existing": {
        version: "j2",
        data: { employerId: "employer-1", status: "active", active: true, featured: true, postedAt: "earlier" },
      },
    },
  });
  const exec = execution("included-slot");
  const adapter = createHermesJobApprovalFirestoreAdapter(memory.port, {
    now: () => new Date("2026-08-25T12:00:00.000Z"),
  });
  const deps = adapter.createServiceDeps({ reviewSecret: "s".repeat(64), execution: exec });
  const reviewed = await reviewHermesJobApproval({ jobId: "job-123" }, deps);
  assert.equal(reviewed.ok, true);
  if (!reviewed.ok) return;
  assert.equal(reviewed.current.featuredIntent, "featured");
  assert.equal(reviewed.desired.entitlementDecision, "premium_subscription");
  assert.equal(JSON.stringify(reviewed).includes("privateBillingNote"), false);
  assert.equal(JSON.stringify(reviewed).includes("featuredPostCredits"), false);

  const applied = await applyHermesJobApproval({
    reviewToken: reviewed.reviewToken,
    confirmation: JOB_APPROVAL_CONFIRMATION,
  }, deps);
  assert.equal(applied.ok, true);
  assert.equal(memory.get("employers", "employer-1")?.data.featuredPostCredits, 2);
  assert.deepEqual(memory.get("jobs", "job-123")?.data, {
    employerId: "employer-1", title: "Community Liaison", orgName: "Northern Organization",
    status: "active", active: true, featured: true, description: "preserve body",
    listingDurationDays:45,featuredEntitlement:"included_slot",...expectedPaidFields("premium_subscription",45,"manual:employer-1:tier2:2026-01-01T00:00:00.000Z:2027-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-08-25T12:00:00.000Z"),
    postedAt: new Date("2026-08-25T12:00:00.000Z"),
  });
});

test("explicit standard publication consumes a Standard credit, not a Featured credit", async () => {
  const memory = memoryPort({
    employers: { emp1: { version: "e1", data: { plan: "free", standardPostCredits:1, featuredPostCredits: 0, keep: true } } },
    jobs: {
      "job-123": {
        version: "j1",
        data: { title: "A", employerId: "emp1", status: "draft", active: false, featured: true, listingDurationDays:45, keep: true },
      },
    },
  });
  const deps = createHermesJobApprovalFirestoreAdapter(memory.port)
    .createServiceDeps({ reviewSecret: "s".repeat(64), execution: execution("standard-publish") });
  const reviewed = await reviewHermesJobApproval({ jobId: "job-123", featured: false }, deps);
  assert.equal(reviewed.ok, true);
  if (!reviewed.ok) return;
  const applied = await applyHermesJobApproval({
    reviewToken: reviewed.reviewToken,
    confirmation: JOB_APPROVAL_CONFIRMATION,
  }, deps);
  assert.equal(applied.ok, true);
  const job = memory.get("jobs", "job-123")!.data;
  assert.equal(job.status, "active");
  assert.equal(job.active, true);
  assert.equal(job.featured, false);
  assert.equal(job.keep, true);
  const employer=memory.get("employers", "emp1")!.data;assert.ok(employer.updatedAt instanceof Date);
  assert.deepEqual({...employer,updatedAt:undefined}, { plan: "free", standardPostCredits:0,featuredPostCredits: 0, keep: true,updatedAt:undefined });
});

test("featured approval consumes exactly one purchased credit, preserves unrelated fields, and retry does not debit again", async () => {
  const memory = memoryPort({
    employers: {
      "employer-1": {
        version: "e1",
        data: { plan: "free", subscriptionTier: "free", featuredPostCredits: 2, unrelatedEmployer: { keep: true } },
      },
    },
    jobs: {
      "job-123": {
        version: "j1",
        data: {
          employerId: "employer-1", title: "Community Liaison", orgName: "Northern Organization",
          status: "draft", active: false, featured: true, listingDurationDays:45, description: "preserve body",
          applicationConfig: { preserve: true }, createdAt: "preserve-created",
        },
      },
    },
  });
  const exec = execution("credit");
  const timestamp = new Date("2026-08-25T12:00:00.000Z");
  const adapter = createHermesJobApprovalFirestoreAdapter(memory.port, { now: () => timestamp });
  const deps = adapter.createServiceDeps({ reviewSecret: "s".repeat(64), execution: exec });
  const reviewed = await reviewHermesJobApproval({ jobId: "job-123" }, deps);
  assert.equal(reviewed.ok, true);
  if (!reviewed.ok) return;
  assert.equal(reviewed.desired.featuredIntent, "featured");
  assert.equal(reviewed.desired.entitlementDecision, "featured_credit");

  const applied = await applyHermesJobApproval({ reviewToken: reviewed.reviewToken, confirmation: JOB_APPROVAL_CONFIRMATION }, deps);
  assert.equal(applied.ok, true);
  assert.deepEqual(memory.get("employers", "employer-1")?.data, {
    plan: "free", subscriptionTier: "free", featuredPostCredits: 1,
    unrelatedEmployer: { keep: true }, updatedAt: timestamp,
  });
  assert.deepEqual(memory.get("jobs", "job-123")?.data, {
    employerId: "employer-1", title: "Community Liaison", orgName: "Northern Organization",
    status: "active", active: true, featured: true, description: "preserve body",
    applicationConfig: { preserve: true }, createdAt: "preserve-created",
    listingDurationDays:45,featuredEntitlement:"featured_credit",...expectedPaidFields("featured_credit",45),
    featuredCreditConsumed: true, featuredCreditConsumedAt: timestamp,
    updatedAt: timestamp, postedAt: timestamp,
  });

  const cached = await adapter.getIdempotentApply(exec);
  assert.equal(cached?.status, "applied");
  assert.equal(memory.get("employers", "employer-1")?.data.featuredPostCredits, 1);
  const audit = memory.get("hermesAdminAudit", hermesJobApprovalIdempotencyDocumentId(exec))?.data ?? {};
  assert.deepEqual(audit.changedFields, {
    employer: ["featuredPostCredits"],
    job: ["active","expiresAt", "featuredCreditConsumed", "featuredCreditConsumedAt","featuredEntitlement", "postedAt","publication", "status"],
  });
  assert.equal(JSON.stringify(audit).includes("unrelatedEmployer"), false);
  assert.equal(JSON.stringify(audit).includes("featuredPostCredits\":1"), false);
});

test("featured review rejects a draft with no included slot or purchased credit", async () => {
  const memory = memoryPort({
    employers: { "employer-1": { version: "e1", data: { plan: "free", featuredPostCredits: 0 } } },
    jobs: {
      "job-123": {
        version: "j1",
        data: { employerId: "employer-1", title: "A", status: "draft", active: false, featured: true, listingDurationDays:45 },
      },
    },
  });
  const deps = createHermesJobApprovalFirestoreAdapter(memory.port)
    .createServiceDeps({ reviewSecret: "s".repeat(64), execution: execution("no-entitlement") });
  assert.deepEqual(await reviewHermesJobApproval({ jobId: "job-123" }, deps), {
    ok: false,
    status: 402,
    error: "A paid posting credit or eligible annual plan is required.",
  });
  assert.equal(memory.targetWrites(), 0);
});

test("featured apply rejects employer, active-featured-count, and identity-version races atomically", async (t) => {
  for (const race of ["employer", "count", "identity-version"] as const) {
    await t.test(race, async () => {
      const memory = memoryPort({
        employers: { "employer-1": { version: "e1", data: { plan: "premium", subscriptionStatus:"active",subscriptionStart:"2026-01-01",subscriptionEnd:"2027-01-01",subscription:{paymentId:"admin-manual-tier2",amountPaid:2500}, featuredPostCredits: 0 } } },
        jobs: {
          "job-123": {
            version: "j1",
            data: { employerId: "employer-1", title: "A", status: "draft", active: false, featured: true, listingDurationDays:45 },
          },
          "job-existing": {
            version: "existing-v1",
            data: { employerId: "employer-1", status: "active", active: true, featured: true, postedAt: "earlier" },
          },
        },
      });
      let injectRace = false;
      const racingPort: HermesFirestorePort = {
        ...memory.port,
        async runTransaction(handler) {
          if (injectRace) {
            if (race === "employer") {
              memory.put("employers", "employer-1", {
                version: "e2",
                data: { plan: "free", featuredPostCredits: 0 },
              });
            } else if (race === "count") {
              memory.put("jobs", "job-race", {
                version: "jr1",
                data: { employerId: "employer-1", status: "active", active: true, featured: true, postedAt: "now" },
              });
            } else {
              memory.put("jobs", "job-existing", {
                version: "existing-v2",
                data: { employerId: "employer-1", status: "active", active: true, featured: true, postedAt: "earlier" },
              });
            }
          }
          return memory.port.runTransaction(handler);
        },
      };
      const deps = createHermesJobApprovalFirestoreAdapter(racingPort)
        .createServiceDeps({ reviewSecret: "s".repeat(64), execution: execution(`race-${race}`) });
      const reviewed = await reviewHermesJobApproval({ jobId: "job-123" }, deps);
      assert.equal(reviewed.ok, true);
      if (!reviewed.ok) return;
      injectRace = true;
      await assert.rejects(
        () => applyHermesJobApproval({ reviewToken: reviewed.reviewToken, confirmation: JOB_APPROVAL_CONFIRMATION }, deps),
        (error: unknown) => Boolean(error && typeof error === "object" && "status" in error && error.status === 409),
      );
      assert.equal(memory.targetWrites(), 0);
      assert.equal(memory.get("jobs", "job-123")?.data.status, "draft");
    });
  }
});

test("an already public-active target is verified_noop only after reread and exact retry is deterministic", async () => {
  const memory = fundedMemoryPort({
    jobs: {
      "job-123": {
        version: "j1",
        data: {
          title: "Community Liaison",
          orgName: "Northern Organization",
          status: "active",
          active: true,
          postedAt: "existing-posted-at",
          unrelated: "keep",
        },
      },
    },
  });
  const exec = execution("noop");
  const adapter = createHermesJobApprovalFirestoreAdapter(memory.port);
  const deps = adapter.createServiceDeps({ reviewSecret: "s".repeat(64), execution: exec });
  const reviewed = await reviewHermesJobApproval({ jobId: "job-123" }, deps);
  assert.equal(reviewed.ok, true);
  if (!reviewed.ok) return;
  const result = await applyHermesJobApproval({
    reviewToken: reviewed.reviewToken,
    confirmation: JOB_APPROVAL_CONFIRMATION,
  }, deps);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.status, "verified_noop");
  assert.equal(memory.targetWrites(), 0);
  assert.ok(memory.outsideReads() >= 3);

  const cached = await adapter.getIdempotentApply(exec);
  assert.equal(cached?.status, "verified_noop");
  assert.deepEqual(cached?.verified, result.verified);
  assert.equal(memory.targetWrites(), 0);
});

test("the transaction rechecks legacy job schema eligibility and rejects drift atomically", async () => {
  const memory = fundedMemoryPort({
    posts: {
      "job-123": {
        version: "p1",
        data: { type: "job", title: "Community Liaison", orgName: "Northern Organization", status: "draft", active: false },
      },
    },
  });
  const adapter = createHermesJobApprovalFirestoreAdapter(memory.port);
  const deps = adapter.createServiceDeps({ reviewSecret: "s".repeat(64), execution: execution("schema-drift") });
  const reviewedDocument = (await deps.findJobCandidates("job-123"))[0];
  const reviewed = await reviewHermesJobApproval({ jobId: "job-123" }, {
    ...deps,
    findJobCandidates: async () => [structuredClone(reviewedDocument)],
  });
  assert.equal(reviewed.ok, true);
  if (!reviewed.ok) return;
  memory.get("posts", "job-123")!.data.type = "announcement";

  await assert.rejects(
    () => applyHermesJobApproval({
      reviewToken: reviewed.reviewToken,
      confirmation: JOB_APPROVAL_CONFIRMATION,
    }, {
      ...deps,
      findJobCandidates: async () => [structuredClone(reviewedDocument)],
    }),
    (error: unknown) => Boolean(error && typeof error === "object" && "status" in error && error.status === 409),
  );
  assert.equal(memory.targetWrites(), 0);
});

test("an idempotent retry re-resolves exactly one target and rejects new cross-collection ambiguity", async () => {
  const memory = fundedMemoryPort({
    jobs: { "job-123": { version: "j1", data: { title: "A", status: "draft", active: false } } },
  });
  const exec = execution("retry-ambiguity");
  const adapter = createHermesJobApprovalFirestoreAdapter(memory.port);
  const deps = adapter.createServiceDeps({ reviewSecret: "s".repeat(64), execution: exec });
  const reviewed = await reviewHermesJobApproval({ jobId: "job-123" }, deps);
  assert.equal(reviewed.ok, true);
  if (!reviewed.ok) return;
  const applied = await applyHermesJobApproval({ reviewToken: reviewed.reviewToken, confirmation: JOB_APPROVAL_CONFIRMATION }, deps);
  assert.equal(applied.ok, true);
  memory.put("posts", "job-123", {
    version: "p1",
    data: { type: "job", title: "Duplicate", status: "active", active: true, postedAt: "now" },
  });
  await assert.rejects(
    () => adapter.getIdempotentApply(exec),
    (error: unknown) => Boolean(error && typeof error === "object" && "status" in error && error.status === 409),
  );
});

test("an unrelated non-job legacy post does not make a canonical job ambiguous", async () => {
  const memory = fundedMemoryPort({
    jobs: {
      "job-123": { version: "j1", data: { title: "A", status: "draft", active: false } },
    },
    posts: {
      "job-123": { version: "p1", data: { type: "announcement", title: "Unrelated" } },
    },
  });
  const exec = execution("unrelated-post");
  const adapter = createHermesJobApprovalFirestoreAdapter(memory.port);
  const deps = adapter.createServiceDeps({ reviewSecret: "s".repeat(64), execution: exec });
  assert.equal((await deps.findJobCandidates("job-123")).length, 1);
  const reviewed = await reviewHermesJobApproval({ jobId: "job-123" }, deps);
  assert.equal(reviewed.ok, true);
  if (!reviewed.ok) return;
  const applied = await applyHermesJobApproval({
    reviewToken: reviewed.reviewToken,
    confirmation: JOB_APPROVAL_CONFIRMATION,
  }, deps);
  assert.equal(applied.ok, true);
  if (!applied.ok) return;
  assert.equal(applied.status, "applied");
  const cached = await adapter.getIdempotentApply(exec);
  assert.equal(cached?.status, "applied");
});

test("an idempotent retry rejects a legacy post that is no longer a job", async () => {
  const memory = fundedMemoryPort({
    posts: {
      "job-123": {
        version: "p1",
        data: { type: "job", title: "A", status: "draft", active: false },
      },
    },
  });
  const exec = execution("retry-schema-drift");
  const adapter = createHermesJobApprovalFirestoreAdapter(memory.port);
  const deps = adapter.createServiceDeps({ reviewSecret: "s".repeat(64), execution: exec });
  const reviewed = await reviewHermesJobApproval({ jobId: "job-123" }, deps);
  assert.equal(reviewed.ok, true);
  if (!reviewed.ok) return;
  const applied = await applyHermesJobApproval({
    reviewToken: reviewed.reviewToken,
    confirmation: JOB_APPROVAL_CONFIRMATION,
  }, deps);
  assert.equal(applied.ok, true);
  const published = memory.get("posts", "job-123")!;
  memory.put("posts", "job-123", {
    version: published.version,
    data: { ...published.data, type: "announcement" },
  });
  await assert.rejects(
    () => adapter.getIdempotentApply(exec),
    /Paid publication verification detected drift/,
  );
});

test("post-transaction readback verifies the exact legacy job schema as well as public-active state", async () => {
  const memory = fundedMemoryPort({
    posts: {
      "job-123": {
        version: "p1",
        data: { type: "job", title: "A", status: "draft", active: false },
      },
    },
  });
  let committed = false;
  const driftingPort: HermesFirestorePort = {
    ...memory.port,
    async getDocument(collection, id) {
      const document = await memory.port.getDocument(collection, id);
      if (committed && collection === "posts" && document) document.data.type = "announcement";
      return document;
    },
    async runTransaction(handler) {
      const result = await memory.port.runTransaction(handler);
      committed = true;
      return result;
    },
  };
  const adapter = createHermesJobApprovalFirestoreAdapter(driftingPort);
  const deps = adapter.createServiceDeps({ reviewSecret: "s".repeat(64), execution: execution("readback-schema") });
  const reviewed = await reviewHermesJobApproval({ jobId: "job-123" }, deps);
  assert.equal(reviewed.ok, true);
  if (!reviewed.ok) return;
  await assert.rejects(
    () => applyHermesJobApproval({ reviewToken: reviewed.reviewToken, confirmation: JOB_APPROVAL_CONFIRMATION }, deps),
    /Paid publication verification detected drift/,
  );
});
