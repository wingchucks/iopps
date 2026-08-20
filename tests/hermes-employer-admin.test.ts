import test from "node:test";
import assert from "node:assert/strict";

import {
  buildHermesEmployerMutationPlan,
  createHermesEmployerReviewToken,
  hermesEmployerSubscriptionMatches,
  normalizeHermesEmployerCommand,
  reviewHermesEmployer,
  applyHermesEmployer,
  verifyHermesEmployerDesiredDocuments,
  verifyHermesEmployerReviewToken,
  type HermesEmployerBoundState,
} from "../src/lib/server/hermes-employer-admin.ts";

const commandInput = {
  email: " Courtney.Lewis@BATC.CA ",
  organizationName: "Battlefords Agency Tribal Chiefs",
  subscriptionStart: "2026-08-19",
  subscriptionEnd: "2027-08-19",
};

const boundState: HermesEmployerBoundState = {
  userId: "user_1",
  userVersion: "2026-08-18T16:12:28.000Z",
  employerId: "org_1",
  employerVersion: "2026-08-18T16:12:28.000Z",
  organizationId: "org_1",
  organizationVersion: "missing",
  subscriptionId: "subscription_1",
  subscriptionVersion: "missing",
};

const reviewSecret = "s".repeat(64);

test("Hermes employer commands normalize an exact email and complimentary Premium intent", () => {
  const result = normalizeHermesEmployerCommand(commandInput);
  assert.deepEqual(result, {
    ok: true,
    command: {
      email: "courtney.lewis@batc.ca",
      organizationName: "Battlefords Agency Tribal Chiefs",
      role: "employer",
      approved: true,
      verified: true,
      subscriptionTier: "premium",
      subscriptionStart: "2026-08-19",
      subscriptionEnd: "2027-08-19",
      amount: 0,
      gstAmount: 0,
      totalAmount: 0,
    },
  });
});

test("Hermes employer commands reject ambiguous or unsafe input", () => {
  for (const input of [
    { ...commandInput, email: "not-an-email" },
    { ...commandInput, organizationName: "x" },
    { ...commandInput, organizationName: "Good\nBad" },
    { ...commandInput, subscriptionStart: "2027-08-19", subscriptionEnd: "2026-08-19" },
    { ...commandInput, unexpected: true },
  ]) {
    const result = normalizeHermesEmployerCommand(input);
    assert.equal(result.ok, false);
  }
});

test("Hermes employer review tokens bind exact IDs, versions, and desired state", () => {
  const normalized = normalizeHermesEmployerCommand(commandInput);
  assert.equal(normalized.ok, true);
  if (!normalized.ok) return;

  const token = createHermesEmployerReviewToken({
    command: normalized.command,
    boundState,
    secret: reviewSecret,
  });
  assert.equal(
    verifyHermesEmployerReviewToken({
      token,
      command: normalized.command,
      boundState,
      secret: reviewSecret,
    }),
    true,
  );

  assert.equal(
    verifyHermesEmployerReviewToken({
      token,
      command: normalized.command,
      boundState: { ...boundState, employerVersion: "changed" },
      secret: reviewSecret,
    }),
    false,
  );
  assert.equal(
    verifyHermesEmployerReviewToken({
      token,
      command: normalized.command,
      boundState: { ...boundState, employerId: "different-employer" },
      secret: reviewSecret,
    }),
    false,
  );
  assert.equal(
    verifyHermesEmployerReviewToken({
      token,
      command: normalized.command,
      boundState: { ...boundState, organizationId: "different-organization" },
      secret: reviewSecret,
    }),
    false,
  );
  assert.equal(
    verifyHermesEmployerReviewToken({
      token: "malformed***",
      command: normalized.command,
      boundState,
      secret: reviewSecret,
    }),
    false,
  );
});

test("Hermes employer mutation plans update only approved identity, approval, verification, and Premium fields", () => {
  const normalized = normalizeHermesEmployerCommand(commandInput);
  assert.equal(normalized.ok, true);
  if (!normalized.ok) return;

  const plan = buildHermesEmployerMutationPlan(normalized.command, {
    orgId: "org_1",
    organizationId: "organization_auto_1",
    now: new Date("2026-08-19T18:00:00.000Z"),
    createdAtToken: "created-token",
    updatedAtToken: "updated-token",
  });

  assert.deepEqual(plan.userPatch, {
    role: "employer",
    employerId: "org_1",
    orgId: "organization_auto_1",
    orgRole: "owner",
  });
  assert.deepEqual(
    {
      organizationName: plan.employerPatch.organizationName,
      name: plan.employerPatch.name,
      companyName: plan.employerPatch.companyName,
      status: plan.employerPatch.status,
      approved: plan.employerPatch.approved,
      verified: plan.employerPatch.verified,
      verificationStatus: plan.employerPatch.verificationStatus,
      disabled: plan.employerPatch.disabled,
      subscriptionTier: plan.employerPatch.subscriptionTier,
      paymentId: (plan.employerPatch.subscription as { paymentId: string }).paymentId,
    },
    {
      organizationName: "Battlefords Agency Tribal Chiefs",
      name: "Battlefords Agency Tribal Chiefs",
      companyName: "Battlefords Agency Tribal Chiefs",
      status: "approved",
      approved: true,
      verified: true,
      verificationStatus: "verified",
      disabled: false,
      subscriptionTier: "premium",
      paymentId: "admin-grant-tier2",
    },
  );
  assert.equal(plan.subscriptionRecordPatch.amount, 0);
  assert.equal(plan.subscriptionRecordPatch.plan, "tier2");
  assert.equal(plan.subscriptionRecordPatch.employerId, "org_1");
  assert.equal(plan.subscriptionRecordPatch.orgId, "org_1");
  assert.equal(plan.subscriptionRecordPatch.organizationId, "organization_auto_1");
});

test("Hermes employer mutation plans use the current Date for a new deterministic subscription", () => {
  const normalized = normalizeHermesEmployerCommand(commandInput);
  assert.equal(normalized.ok, true);
  if (!normalized.ok) return;
  const now = new Date("2026-08-19T18:00:00.000Z");

  const plan = buildHermesEmployerMutationPlan(normalized.command, { orgId: "org_1", now });

  assert.ok(plan.subscriptionRecordPatch.createdAt instanceof Date);
  assert.deepEqual(plan.subscriptionRecordPatch.createdAt, now);
});

test("Hermes subscription verification accepts legacy identities but can require the exact three-field identity", () => {
  const normalized = normalizeHermesEmployerCommand(commandInput);
  assert.equal(normalized.ok, true);
  if (!normalized.ok) return;
  const fields = {
    plan: "tier2",
    status: "active",
    amount: 0,
    gstAmount: 0,
    totalAmount: 0,
    billingCycle: "annual",
    manualOverride: true,
    bonusAccessReason: "Complimentary Hermes administrator grant",
    startsAt: new Date("2026-08-19T00:00:00.000Z"),
    expiresAt: new Date("2027-08-19T00:00:00.000Z"),
  };
  const legacy = doc("subscription_1", "s1", { orgId: "org_1", ...fields });
  const current = doc("subscription_1", "s1", {
    employerId: "org_1",
    orgId: "org_1",
    organizationId: "organization_auto_1",
    ...fields,
  });

  assert.equal(hermesEmployerSubscriptionMatches(
    normalized.command, legacy, "org_1", "organization_auto_1"), true);
  assert.equal(hermesEmployerSubscriptionMatches(
    normalized.command, legacy, "org_1", "organization_auto_1", "exact"), false);
  assert.equal(hermesEmployerSubscriptionMatches(
    normalized.command, current, "org_1", "organization_auto_1", "exact"), true);
});

test("Hermes desired-document verification checks every intended user, employer, and organization field deeply", () => {
  const normalized = normalizeHermesEmployerCommand(commandInput);
  assert.equal(normalized.ok, true);
  if (!normalized.ok) return;
  const plan = buildHermesEmployerMutationPlan(normalized.command, {
    orgId: "org_1",
    now: new Date("2026-08-19T18:00:00.000Z"),
  });
  const user = doc("user_1", "u1", { ...plan.userPatch, unrelatedUserField: "preserved" });
  const employer = doc("org_1", "e1", { ...plan.employerPatch, unrelatedEmployerField: "preserved" });
  const organization = doc("org_1", "o1", { ...plan.organizationPatch, unrelatedOrganizationField: "preserved" });

  assert.deepEqual(
    verifyHermesEmployerDesiredDocuments(normalized.command, user, employer, organization, plan),
    { user: true, employer: true, organization: true },
  );

  for (const field of Object.keys(plan.userPatch)) {
    const staleUser = structuredClone(user);
    staleUser.data[field] = `stale-${field}`;
    assert.equal(
      verifyHermesEmployerDesiredDocuments(normalized.command, staleUser, employer, organization, plan).user,
      false,
      `stale user.${field} must be detected`,
    );
  }

  for (const field of Object.keys(plan.employerPatch)) {
    const staleEmployer = structuredClone(employer);
    staleEmployer.data[field] = `stale-${field}`;
    assert.equal(
      verifyHermesEmployerDesiredDocuments(normalized.command, user, staleEmployer, organization, plan).employer,
      false,
      `stale employer.${field} must be detected`,
    );
  }

  for (const field of Object.keys(plan.organizationPatch)) {
    const staleOrganization = structuredClone(organization);
    staleOrganization.data[field] = `stale-${field}`;
    assert.equal(
      verifyHermesEmployerDesiredDocuments(normalized.command, user, employer, staleOrganization, plan).organization,
      false,
      `stale organization.${field} must be detected`,
    );
  }

  for (const field of Object.keys(plan.employerPatch.subscription)) {
    const staleEmployer = structuredClone(employer);
    (staleEmployer.data.subscription as Record<string, unknown>)[field] = `stale-${field}`;
    assert.equal(
      verifyHermesEmployerDesiredDocuments(normalized.command, user, staleEmployer, organization, plan).employer,
      false,
      `stale employer.subscription.${field} must be detected`,
    );
  }

  for (const field of Object.keys(plan.organizationPatch.subscription)) {
    const staleOrganization = structuredClone(organization);
    (staleOrganization.data.subscription as Record<string, unknown>)[field] = `stale-${field}`;
    assert.equal(
      verifyHermesEmployerDesiredDocuments(normalized.command, user, employer, staleOrganization, plan).organization,
      false,
      `stale organization.subscription.${field} must be detected`,
    );
  }
});

function doc(id: string, version: string, data: Record<string, unknown>) {
  return { id, version, data };
}

function verifiedProjection() {
  return {
    email: "courtney.lewis@batc.ca",
    organizationName: "Battlefords Agency Tribal Chiefs",
    role: "employer",
    status: "approved",
    verified: true,
    subscriptionTier: "premium",
    unlimitedJobPostings: true,
    subscriptionStart: "2026-08-19",
    subscriptionEnd: "2027-08-19",
  };
}

function serviceDeps(overrides: Record<string, unknown> = {}) {
  const base = {
    reviewSecret,
    now: () => new Date("2026-08-19T18:00:00.000Z"),
    findUsersByEmail: async () => [
      doc("user_1", boundState.userVersion, {
        email: "courtney.lewis@batc.ca",
        role: "community",
      }),
    ],
    findEmployersByEmail: async () => [
      doc("org_1", boundState.employerVersion, {
        email: "courtney.lewis@batc.ca",
        organizationName: "Battlefords Agency Tribal Cheifs",
        status: "pending",
      }),
    ],
    findOrganizationsByEmployerId: async () => [],
    findSubscriptions: async () => [],
    findSubscriptionsByEmployerId: async () => [],
    findSubscriptionsByOrganizationId: async () => [],
    getOrganization: async () => null,
    getSubscription: async () => null,
    commit: async () => ({
      committedAt: "2026-08-19T18:00:00.000Z",
      verified: verifiedProjection(),
      userVerified: true,
      employerVerified: true,
      organizationVerified: true,
    }),
  };
  return { ...base, ...overrides } as typeof base;
}

test("reviewHermesEmployer rejects non-unique targets and returns an opaque token for one exact target", async () => {
  const duplicate = await reviewHermesEmployer(commandInput, serviceDeps({
    findEmployersByEmail: async () => [
      doc("org_1", "v1", { email: "courtney.lewis@batc.ca" }),
      doc("org_2", "v2", { email: "courtney.lewis@batc.ca" }),
    ],
  }));
  assert.deepEqual(duplicate, { ok: false, status: 409, error: "Exact employer lookup was not unique" });

  const reviewed = await reviewHermesEmployer(commandInput, serviceDeps());
  assert.equal(reviewed.ok, true);
  if (!reviewed.ok) return;
  assert.match(reviewed.reviewToken, /^[A-Za-z0-9_-]{43}$/);
  assert.deepEqual(reviewed.target, {
    userId: "user_1",
    employerId: "org_1",
    organizationId: "org_1",
    email: "courtney.lewis@batc.ca",
  });
  assert.equal(reviewed.current.organizationName, "Battlefords Agency Tribal Cheifs");
  assert.equal(reviewed.desired.organizationName, "Battlefords Agency Tribal Chiefs");
});

test("reviewHermesEmployer binds a unique linked organization whose ID differs from the employer ID", async () => {
  const organization = doc("organization_auto_1", "o1", { employerId: "org_1" });
  const reviewed = await reviewHermesEmployer(commandInput, serviceDeps({
    findOrganizationsByEmployerId: async () => [organization],
  }));

  assert.equal(reviewed.ok, true);
  if (!reviewed.ok) return;
  assert.equal(reviewed.target.organizationId, organization.id);
});

test("reviewHermesEmployer rejects ambiguous organizations linked to one employer", async () => {
  const reviewed = await reviewHermesEmployer(commandInput, serviceDeps({
    findOrganizationsByEmployerId: async () => [
      doc("organization_auto_1", "o1", { employerId: "org_1" }),
      doc("organization_auto_2", "o2", { employerId: "org_1" }),
    ],
  }));

  assert.deepEqual(reviewed, { ok: false, status: 409, error: "Organization lookup was not unique" });
});

test("reviewHermesEmployer binds a unique existing tier2 annual subscription with an auto-generated ID", async () => {
  const subscription = doc("subscription_auto_1", "s1", {
    orgId: "org_1",
    plan: "tier2",
    billingCycle: "annual",
  });
  const reviewed = await reviewHermesEmployer(commandInput, serviceDeps({
    findSubscriptions: async () => [subscription],
  }));

  assert.equal(reviewed.ok, true);
  if (!reviewed.ok) return;
  const normalized = normalizeHermesEmployerCommand(commandInput);
  assert.equal(normalized.ok, true);
  if (!normalized.ok) return;
  assert.equal(verifyHermesEmployerReviewToken({
    token: reviewed.reviewToken,
    command: normalized.command,
    boundState: { ...boundState, subscriptionId: subscription.id, subscriptionVersion: subscription.version },
    secret: reviewSecret,
  }), true);
});

test("reviewHermesEmployer rejects ambiguous tier2 annual subscriptions", async () => {
  const reviewed = await reviewHermesEmployer(commandInput, serviceDeps({
    findSubscriptions: async () => [
      doc("subscription_auto_1", "s1", { orgId: "org_1", plan: "tier2", billingCycle: "annual" }),
      doc("subscription_auto_2", "s2", { orgId: "org_1", plan: "tier2", billingCycle: "annual" }),
    ],
  }));

  assert.deepEqual(reviewed, { ok: false, status: 409, error: "Subscription lookup was not unique" });
});

test("applyHermesEmployer rejects stale review tokens without committing", async () => {
  const reviewed = await reviewHermesEmployer(commandInput, serviceDeps());
  assert.equal(reviewed.ok, true);
  if (!reviewed.ok) return;

  let commits = 0;
  const applied = await applyHermesEmployer(
    {
      command: commandInput,
      reviewToken: reviewed.reviewToken,
      confirmation: "APPLY IOPPS EMPLOYER UPDATE",
    },
    serviceDeps({
      findEmployersByEmail: async () => [
        doc("org_1", "changed-version", {
          email: "courtney.lewis@batc.ca",
          organizationName: "Battlefords Agency Tribal Cheifs",
          status: "pending",
        }),
      ],
      commit: async () => {
        commits += 1;
        return { committedAt: "never", verified: verifiedProjection(), userVerified: true, employerVerified: true, organizationVerified: true };
      },
    }),
  );

  assert.deepEqual(applied, { ok: false, status: 409, error: "Review token is invalid or stale" });
  assert.equal(commits, 0);
});

test("applyHermesEmployer commits one minimal plan and returns a verified projection", async () => {
  const reviewed = await reviewHermesEmployer(commandInput, serviceDeps());
  assert.equal(reviewed.ok, true);
  if (!reviewed.ok) return;

  const plans: unknown[] = [];
  const applied = await applyHermesEmployer(
    {
      command: commandInput,
      reviewToken: reviewed.reviewToken,
      confirmation: "APPLY IOPPS EMPLOYER UPDATE",
    },
    serviceDeps({
      commit: async (input: unknown) => {
        plans.push(input);
        return {
          committedAt: "2026-08-19T18:00:00.000Z",
          verified: verifiedProjection(),
          userVerified: true,
          employerVerified: true,
          organizationVerified: true,
        };
      },
    }),
  );

  assert.equal(applied.ok, true);
  if (!applied.ok) return;
  assert.equal(applied.status, "applied");
  assert.equal(plans.length, 1);
  assert.equal(applied.verified.organizationName, "Battlefords Agency Tribal Chiefs");
  assert.equal(applied.verified.subscriptionTier, "premium");
  assert.equal(applied.verified.unlimitedJobPostings, true);
});

test("applyHermesEmployer treats an already-correct target with older bookkeeping timestamps as a verified no-op", async () => {
  const normalized = normalizeHermesEmployerCommand(commandInput);
  assert.equal(normalized.ok, true);
  if (!normalized.ok) return;
  const plan = buildHermesEmployerMutationPlan(normalized.command, {
    orgId: "org_1",
    now: new Date("2026-08-19T18:00:00.000Z"),
  });
  const employerPatch = structuredClone(plan.employerPatch);
  const organizationPatch = structuredClone(plan.organizationPatch);
  for (const patch of [employerPatch, organizationPatch]) {
    patch.updatedAt = "2026-08-18T18:00:00.000Z";
    patch.approvedAt = "2026-08-18T18:00:00.000Z";
    patch.bonusAccessGrantedAt = "2026-08-18T18:00:00.000Z";
    patch.subscription.bonusAccessGrantedAt = "2026-08-18T18:00:00.000Z";
  }
  const subscriptionRecordPatch = structuredClone(plan.subscriptionRecordPatch);
  subscriptionRecordPatch.createdAt = "2026-08-18T18:00:00.000Z";
  subscriptionRecordPatch.updatedAt = "2026-08-18T18:00:00.000Z";
  subscriptionRecordPatch.bonusAccessGrantedAt = new Date("2026-08-18T18:00:00.000Z");
  const deps = serviceDeps({
    findUsersByEmail: async () => [doc("user_1", "u1", {
      email: "courtney.lewis@batc.ca",
      role: "employer",
      employerId: "org_1",
      orgId: "org_1",
      orgRole: "owner",
    })],
    findEmployersByEmail: async () => [doc("org_1", "e1", {
      email: "courtney.lewis@batc.ca",
      ...employerPatch,
      unrelatedEmployerField: "preserved",
    })],
    getOrganization: async () => doc("org_1", "o1", {
      ...organizationPatch,
      unrelatedOrganizationField: "preserved",
    }),
    getSubscription: async () => doc("subscription_1", "s1", {
      ...subscriptionRecordPatch,
      unrelatedSubscriptionField: "preserved",
    }),
  });
  const reviewed = await reviewHermesEmployer(commandInput, deps);
  assert.equal(reviewed.ok, true);
  if (!reviewed.ok) return;

  let commits = 0;
  let recordedNoops = 0;
  const applied = await applyHermesEmployer(
    {
      command: commandInput,
      reviewToken: reviewed.reviewToken,
      confirmation: "APPLY IOPPS EMPLOYER UPDATE",
    },
    {
      ...deps,
      commit: async () => {
        commits += 1;
        return { committedAt: "never", verified: verifiedProjection(), userVerified: true, employerVerified: true, organizationVerified: true };
      },
      recordVerifiedNoop: async () => { recordedNoops += 1; },
    },
  );
  assert.equal(applied.ok, true);
  if (applied.ok) assert.equal(applied.status, "verified_noop");
  assert.equal(commits, 0);
  assert.equal(recordedNoops, 1);
});

test("applyHermesEmployer repairs mismatched user account links instead of reporting a no-op", async () => {
  const normalized = normalizeHermesEmployerCommand(commandInput);
  assert.equal(normalized.ok, true);
  if (!normalized.ok) return;
  const organizationId = "organization_auto_1";
  const plan = buildHermesEmployerMutationPlan(normalized.command, {
    orgId: "org_1",
    organizationId,
    now: new Date("2026-08-19T18:00:00.000Z"),
  });
  const deps = serviceDeps({
    findUsersByEmail: async () => [doc("user_1", "u1", {
      email: "courtney.lewis@batc.ca",
      role: "employer",
      employerId: "wrong-employer",
      orgId: "wrong-organization",
      orgRole: "owner",
      unrelatedUserField: "preserved",
    })],
    findEmployersByEmail: async () => [doc("org_1", "e1", {
      email: "courtney.lewis@batc.ca",
      ...plan.employerPatch,
    })],
    findOrganizationsByEmployerId: async () => [doc(organizationId, "o1", {
      ...plan.organizationPatch,
    })],
    getOrganization: async () => null,
    getSubscription: async () => doc("subscription_1", "s1", {
      ...plan.subscriptionRecordPatch,
    }),
  });
  const reviewed = await reviewHermesEmployer(commandInput, deps);
  assert.equal(reviewed.ok, true);
  if (!reviewed.ok) return;

  let commits = 0;
  let recordedNoops = 0;
  const applied = await applyHermesEmployer(
    { command: commandInput, reviewToken: reviewed.reviewToken, confirmation: "APPLY IOPPS EMPLOYER UPDATE" },
    {
      ...deps,
      commit: async ({ plan: committedPlan }) => {
        commits += 1;
        assert.deepEqual(committedPlan.userPatch, {
          role: "employer",
          employerId: "org_1",
          orgId: organizationId,
          orgRole: "owner",
        });
        return {
          committedAt: "2026-08-19T18:00:00.000Z",
          verified: verifiedProjection(),
          userVerified: true,
          employerVerified: true,
          organizationVerified: true,
        };
      },
      recordVerifiedNoop: async () => { recordedNoops += 1; },
    },
  );

  assert.equal(applied.ok, true);
  if (applied.ok) assert.equal(applied.status, "applied");
  assert.equal(commits, 1);
  assert.equal(recordedNoops, 0);
});

test("applyHermesEmployer does not let a correct organization hide a stale employer", async () => {
  const desiredData = {
    organizationName: "Battlefords Agency Tribal Chiefs",
    status: "approved",
    verified: true,
    subscriptionTier: "premium",
    subscriptionStart: "2026-08-19T00:00:00.000Z",
    subscriptionEnd: "2027-08-19T00:00:00.000Z",
    subscription: { tier: "premium", status: "active", amountPaid: 0 },
  };
  const deps = serviceDeps({
    findUsersByEmail: async () => [doc("user_1", "u1", { email: "courtney.lewis@batc.ca", role: "employer" })],
    findEmployersByEmail: async () => [doc("org_1", "e1", {
      email: "courtney.lewis@batc.ca",
      ...desiredData,
      organizationName: "Stale Employer Name",
    })],
    getOrganization: async () => doc("org_1", "o1", desiredData),
    getSubscription: async () => doc("subscription_1", "s1", {
      orgId: "org_1",
      plan: "tier2",
      status: "active",
      amount: 0,
      gstAmount: 0,
      totalAmount: 0,
      billingCycle: "annual",
      manualOverride: true,
      startsAt: new Date("2026-08-19T00:00:00.000Z"),
      expiresAt: new Date("2027-08-19T00:00:00.000Z"),
    }),
  });
  const reviewed = await reviewHermesEmployer(commandInput, deps);
  assert.equal(reviewed.ok, true);
  if (!reviewed.ok) return;

  let commits = 0;
  let recordedNoops = 0;
  const applied = await applyHermesEmployer(
    { command: commandInput, reviewToken: reviewed.reviewToken, confirmation: "APPLY IOPPS EMPLOYER UPDATE" },
    {
      ...deps,
      commit: async () => {
        commits += 1;
        return {
          committedAt: "2026-08-19T18:00:00.000Z",
          verified: verifiedProjection(),
          userVerified: true,
          employerVerified: true,
          organizationVerified: true,
        };
      },
      recordVerifiedNoop: async () => { recordedNoops += 1; },
    },
  );

  assert.equal(applied.ok, true);
  if (applied.ok) assert.equal(applied.status, "applied");
  assert.equal(commits, 1);
  assert.equal(recordedNoops, 0);
});

test("applyHermesEmployer repairs a missing deterministic subscription record instead of reporting a no-op", async () => {
  const desiredData = {
    organizationName: "Battlefords Agency Tribal Chiefs",
    status: "approved",
    verified: true,
    subscriptionTier: "premium",
    subscriptionStart: "2026-08-19T00:00:00.000Z",
    subscriptionEnd: "2027-08-19T00:00:00.000Z",
    subscription: { tier: "premium", status: "active", amountPaid: 0 },
  };
  const deps = serviceDeps({
    findUsersByEmail: async () => [doc("user_1", "u1", { email: "courtney.lewis@batc.ca", role: "employer" })],
    findEmployersByEmail: async () => [doc("org_1", "e1", { email: "courtney.lewis@batc.ca", ...desiredData })],
    getOrganization: async () => doc("org_1", "o1", desiredData),
    getSubscription: async () => null,
  });
  const reviewed = await reviewHermesEmployer(commandInput, deps);
  assert.equal(reviewed.ok, true);
  if (!reviewed.ok) return;

  let commits = 0;
  const applied = await applyHermesEmployer(
    { command: commandInput, reviewToken: reviewed.reviewToken, confirmation: "APPLY IOPPS EMPLOYER UPDATE" },
    {
      ...deps,
      commit: async () => {
        commits += 1;
        return {
          committedAt: "2026-08-19T18:00:00.000Z",
          verified: verifiedProjection(),
          userVerified: true,
          employerVerified: true,
          organizationVerified: true,
        };
      },
    },
  );
  assert.equal(applied.ok, true);
  if (applied.ok) assert.equal(applied.status, "applied");
  assert.equal(commits, 1);
});
