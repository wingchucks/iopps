import { createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";

import type {
  HermesExecutionContext,
  HermesFirestorePort,
} from "./hermes-firestore-adapter.ts";
import { HermesFirestoreConflictError } from "./hermes-firestore-adapter.ts";
import {
  buildFeaturedJobSummary,
  evaluateFeaturedActivation,
} from "./featured-job-entitlements.ts";
import type {
  HermesFeaturedEntitlementBoundState,
  HermesFeaturedJobIdentity,
  HermesJobApprovalBoundState,
  HermesJobApprovalDocument,
  HermesJobApprovalProjection,
  HermesJobApprovalServiceDeps,
} from "./hermes-job-approval.ts";

const IDEMPOTENCY_COLLECTION = "hermesAdminIdempotency";
const AUDIT_COLLECTION = "hermesAdminAudit";
const FEATURED_QUERY_LIMIT = 501;

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function hermesJobApprovalIdempotencyDocumentId(
  execution: Pick<HermesExecutionContext, "keyId" | "idempotencyKey">,
): string {
  return sha256(`iopps-hermes-admin-idempotency-v1\0approve-job\0${execution.keyId}\0${execution.idempotencyKey}`);
}

function assertExecution(execution: HermesExecutionContext): void {
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(execution.keyId) ||
      !/^[A-Za-z0-9._:-]{1,128}$/.test(execution.idempotencyKey) ||
      !/^[a-f0-9]{64}$/.test(execution.requestHash)) {
    throw new Error("Invalid Hermes execution context");
  }
}

interface FeaturedReader {
  getDocument: HermesFirestorePort["getDocument"];
  queryExact: HermesFirestorePort["queryExact"];
}

function isActiveFeaturedJob(data: Record<string, unknown>): boolean {
  return Boolean(data.featured) && (data.active === true || data.status === "active");
}

function nullableString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function normalizedCredits(value: unknown): number {
  return Math.max(0, Number(value ?? 0) || 0);
}

function featuredIdentity(
  collection: "jobs" | "posts",
  document: { id: string; version: string },
): HermesFeaturedJobIdentity {
  return { collection, documentId: document.id, version: document.version };
}

function sortFeaturedIdentities(identities: HermesFeaturedJobIdentity[]): HermesFeaturedJobIdentity[] {
  return identities.sort((left, right) =>
    `${left.collection}\0${left.documentId}`.localeCompare(`${right.collection}\0${right.documentId}`));
}

async function readFeaturedEntitlement(
  document: HermesJobApprovalDocument,
  reader: FeaturedReader,
): Promise<
  | { ok: true; state: HermesFeaturedEntitlementBoundState }
  | { ok: false; status: number; error: string }
> {
  if (!document.data.featured) {
    return { ok: false, status: 409, error: "Featured job intent changed since review" };
  }
  const employerId = document.collection === "jobs"
    ? nullableString(document.data.employerId)
    : nullableString(document.data.orgId);
  if (!employerId) {
    return { ok: false, status: 409, error: "Featured job has no exact employer entitlement identity" };
  }
  const [employer, jobs, posts] = await Promise.all([
    reader.getDocument("employers", employerId),
    reader.queryExact("jobs", "employerId", employerId, FEATURED_QUERY_LIMIT),
    reader.queryExact("posts", "orgId", employerId, FEATURED_QUERY_LIMIT),
  ]);
  if (!employer) {
    return { ok: false, status: 409, error: "Featured job employer entitlement was not found" };
  }
  if (jobs.length >= FEATURED_QUERY_LIMIT || posts.length >= FEATURED_QUERY_LIMIT) {
    return { ok: false, status: 409, error: "Featured job usage could not be bound unambiguously" };
  }
  const activeFeaturedJobs = sortFeaturedIdentities([
    ...jobs.filter((candidate) => isActiveFeaturedJob(candidate.data)).map((candidate) => featuredIdentity("jobs", candidate)),
    ...posts
      .filter((candidate) => candidate.data.type === "job" && isActiveFeaturedJob(candidate.data))
      .map((candidate) => featuredIdentity("posts", candidate)),
  ]);
  const currentIdentity = `${document.collection}\0${document.id}`;
  const activeFeaturedCountExcludingCurrent = activeFeaturedJobs.filter(
    (candidate) => `${candidate.collection}\0${candidate.documentId}` !== currentIdentity,
  ).length;
  const plan = nullableString(employer.data.plan);
  const subscriptionTier = nullableString(employer.data.subscriptionTier);
  const featuredPostCredits = normalizedCredits(employer.data.featuredPostCredits);
  const summary = buildFeaturedJobSummary({
    plan,
    subscriptionTier,
    featuredJobsUsed: activeFeaturedJobs.length,
    featuredPostCredits,
  });
  const existingActiveFeatured = isActiveFeaturedJob(document.data);
  const existingFeaturedCreditConsumed = Boolean(document.data.featuredCreditConsumed);
  const decision = evaluateFeaturedActivation({
    requestedActiveFeatured: true,
    existingActiveFeatured,
    existingFeaturedCreditConsumed,
    activeFeaturedCountExcludingCurrent,
    summary,
  });
  if (!decision.allowed) {
    return { ok: false, status: 400, error: decision.reason || "This job cannot be featured." };
  }
  return {
    ok: true,
    state: {
      employerId,
      employerVersion: employer.version,
      plan,
      subscriptionTier,
      featuredPostCredits,
      existingFeaturedCreditConsumed,
      activeFeaturedJobs,
      decision: existingActiveFeatured || existingFeaturedCreditConsumed
        ? "existing_entitlement"
        : decision.consumeCredit
          ? "featured_post_credit"
          : "included_slot",
      consumeCredit: decision.consumeCredit,
    },
  };
}

export function createHermesJobApprovalFirestoreAdapter(
  port: HermesFirestorePort,
  options: { now?: () => Date; timestampToken?: () => unknown } = {},
) {
  const now = options.now ?? (() => new Date());
  const timestampToken = options.timestampToken ?? now;

  function project(
    document: HermesJobApprovalDocument,
    entitlementDecision?: HermesFeaturedEntitlementBoundState["decision"],
  ): HermesJobApprovalProjection {
    const pick = (...keys: string[]) => {
      for (const key of keys) {
        const value = document.data[key];
        if (typeof value === "string" && value.trim()) return value.trim();
      }
      return "";
    };
    return {
      title: pick("title"),
      organization: pick("orgName", "organizationName", "companyName", "orgShort"),
      status: pick("status"),
      featuredIntent: document.data.featured ? "featured" : "standard",
      entitlementDecision: document.data.featured
        ? entitlementDecision ?? "existing_entitlement"
        : "not_required",
    };
  }

  function targetFrom(state: HermesJobApprovalBoundState) {
    return {
      documentId: state.documentId,
      collection: state.collection,
      schema: state.schema,
      ...(state.featuredEntitlement ? { employerId: state.featuredEntitlement.employerId } : {}),
    };
  }

  function parseTarget(value: unknown): {
    documentId: string;
    collection: "jobs" | "posts";
    schema: "employer-job-v1" | "legacy-job-post-v1";
    employerId?: string;
  } | null {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const target = value as Record<string, unknown>;
    if (typeof target.documentId !== "string" ||
        (target.collection !== "jobs" && target.collection !== "posts") ||
        (target.schema !== "employer-job-v1" && target.schema !== "legacy-job-post-v1")) return null;
    if ((target.collection === "jobs") !== (target.schema === "employer-job-v1")) return null;
    if (target.employerId !== undefined && (typeof target.employerId !== "string" || !target.employerId)) return null;
    return target as ReturnType<typeof targetFrom>;
  }

  function isConflictingOppositeDocument(
    targetCollection: "jobs" | "posts",
    other: { data: Record<string, unknown> } | null,
  ): boolean {
    if (!other) return false;
    return targetCollection === "posts" || other.data.type === "job";
  }

  function parseFeaturedVerification(value: unknown): {
    decision: HermesFeaturedEntitlementBoundState["decision"];
    expectedEmployerCredits: number;
    featuredCreditConsumed: boolean;
  } | null {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const verification = value as Record<string, unknown>;
    if ((verification.decision !== "included_slot" && verification.decision !== "featured_post_credit" &&
          verification.decision !== "existing_entitlement") ||
        typeof verification.expectedEmployerCredits !== "number" ||
        !Number.isFinite(verification.expectedEmployerCredits) || verification.expectedEmployerCredits < 0 ||
        typeof verification.featuredCreditConsumed !== "boolean") return null;
    return verification as ReturnType<typeof parseFeaturedVerification> & object;
  }

  async function rereadAndVerify(
    state: HermesJobApprovalBoundState,
    expectedEmployerCredits?: number,
  ): Promise<HermesJobApprovalProjection> {
    const [reread, employer] = await Promise.all([
      port.getDocument(state.collection, state.documentId),
      state.featuredEntitlement
        ? port.getDocument("employers", state.featuredEntitlement.employerId)
        : Promise.resolve(null),
    ]);
    if (!reread || (state.collection === "posts" && reread.data.type !== "job") ||
        reread.data.status !== "active" || reread.data.active !== true ||
        Boolean(reread.data.featured) !== state.desiredState.featured ||
        (state.desiredState.setPostedAt && reread.data.postedAt == null)) {
      throw new Error("Post-write public-active verification failed");
    }
    if (state.featuredEntitlement) {
      const expectedConsumed = state.featuredEntitlement.existingFeaturedCreditConsumed ||
        state.featuredEntitlement.consumeCredit;
      if (!reread.data.featured || Boolean(reread.data.featuredCreditConsumed) !== expectedConsumed ||
          (state.featuredEntitlement.consumeCredit && reread.data.featuredCreditConsumedAt == null) ||
          !employer || normalizedCredits(employer.data.featuredPostCredits) !== expectedEmployerCredits) {
        throw new Error("Post-write featured entitlement verification failed");
      }
    }
    return project(
      { ...reread, collection: state.collection, schema: state.schema },
      state.featuredEntitlement?.decision,
    );
  }

  return {
    async getIdempotentApply(execution: HermesExecutionContext) {
      assertExecution(execution);
      const record = await port.getDocument(IDEMPOTENCY_COLLECTION, hermesJobApprovalIdempotencyDocumentId(execution));
      if (!record) return null;
      if (record.data.operation !== "approve_job" || record.data.keyId !== execution.keyId ||
          record.data.requestHash !== execution.requestHash) {
        throw new HermesFirestoreConflictError("Idempotency key was already used for another request");
      }
      const target = parseTarget(record.data.target);
      const status = record.data.resultStatus;
      if (!target || (status !== "applied" && status !== "verified_noop")) {
        throw new HermesFirestoreConflictError("Idempotent request record is invalid");
      }
      const verifiedStatus: "applied" | "verified_noop" = status;
      const otherCollection = target.collection === "jobs" ? "posts" : "jobs";
      const featuredVerification = target.employerId
        ? parseFeaturedVerification(record.data.featuredVerification)
        : null;
      if (target.employerId && !featuredVerification) {
        throw new HermesFirestoreConflictError("Idempotent featured verification record is invalid");
      }
      const [document, other, employer] = await Promise.all([
        port.getDocument(target.collection, target.documentId),
        port.getDocument(otherCollection, target.documentId),
        target.employerId ? port.getDocument("employers", target.employerId) : Promise.resolve(null),
      ]);
      if (isConflictingOppositeDocument(target.collection, other)) {
        throw new HermesFirestoreConflictError("Idempotent job target is ambiguous");
      }
      if (target.collection === "posts" && document?.data.type !== "job") {
        throw new Error("Idempotent legacy job schema verification failed");
      }
      if (!document || document.data.status !== "active" || document.data.active !== true || document.data.postedAt == null) {
        throw new Error("Idempotent public-active verification failed");
      }
      if (target.employerId && featuredVerification &&
          (!document.data.featured ||
            Boolean(document.data.featuredCreditConsumed) !== featuredVerification.featuredCreditConsumed ||
            (featuredVerification.decision === "featured_post_credit" && document.data.featuredCreditConsumedAt == null) ||
            !employer ||
            normalizedCredits(employer.data.featuredPostCredits) !== featuredVerification.expectedEmployerCredits)) {
        throw new Error("Idempotent featured entitlement verification failed");
      }
      return {
        status: verifiedStatus,
        ...(typeof record.data.committedAt === "string" ? { committedAt: record.data.committedAt } : {}),
        verified: project(
          { ...document, collection: target.collection, schema: target.schema },
          featuredVerification?.decision,
        ),
      };
    },
    createServiceDeps(input: {
      reviewSecret: string;
      execution: HermesExecutionContext;
    }): HermesJobApprovalServiceDeps {
      assertExecution(input.execution);
      return {
        reviewSecret: input.reviewSecret,
        async findJobCandidates(jobId) {
          const [job, post] = await Promise.all([
            port.getDocument("jobs", jobId),
            port.getDocument("posts", jobId),
          ]);
          return [
            ...(job ? [{ ...job, collection: "jobs" as const, schema: "employer-job-v1" as const }] : []),
            ...(post?.data.type === "job"
              ? [{ ...post, collection: "posts" as const, schema: "legacy-job-post-v1" as const }]
              : []),
          ] satisfies HermesJobApprovalDocument[];
        },
        async resolveFeaturedEntitlement(document) {
          return readFeaturedEntitlement(document, port);
        },
        async commit({ boundState, current }) {
          const id = hermesJobApprovalIdempotencyDocumentId(input.execution);
          const transactionResult = await port.runTransaction<{
            status: "applied" | "verified_noop";
            committedAt: string;
            expectedEmployerCredits?: number;
          }>(async (transaction) => {
            const existing = await transaction.getDocument(IDEMPOTENCY_COLLECTION, id);
            if (existing) {
              if (existing.data.operation !== "approve_job" || existing.data.keyId !== input.execution.keyId ||
                  existing.data.requestHash !== input.execution.requestHash) {
                throw new HermesFirestoreConflictError("Idempotency key was already used for another request");
              }
              const resultStatus = existing.data.resultStatus;
              if ((resultStatus !== "applied" && resultStatus !== "verified_noop") ||
                  typeof existing.data.committedAt !== "string") {
                throw new HermesFirestoreConflictError("Idempotent request record is invalid");
              }
              const featuredVerification = boundState.featuredEntitlement
                ? parseFeaturedVerification(existing.data.featuredVerification)
                : null;
              if (boundState.featuredEntitlement && !featuredVerification) {
                throw new HermesFirestoreConflictError("Idempotent featured verification record is invalid");
              }
              return {
                status: resultStatus as "applied" | "verified_noop",
                committedAt: existing.data.committedAt,
                ...(featuredVerification
                  ? { expectedEmployerCredits: featuredVerification.expectedEmployerCredits }
                  : {}),
              };
            }

            const otherCollection = boundState.collection === "jobs" ? "posts" : "jobs";
            const [target, other] = await Promise.all([
              transaction.getDocument(boundState.collection, boundState.documentId),
              transaction.getDocument(otherCollection, boundState.documentId),
            ]);
            if (isConflictingOppositeDocument(boundState.collection, other)) {
              throw new HermesFirestoreConflictError("Job target became ambiguous after review");
            }
            if (!target || target.id !== boundState.documentId || target.version !== boundState.version) {
              throw new HermesFirestoreConflictError("Job changed since review");
            }
            if (boundState.collection === "posts" && target.data.type !== "job") {
              throw new HermesFirestoreConflictError("Legacy job schema changed since review");
            }
            if (current.id !== target.id || current.collection !== boundState.collection || current.schema !== boundState.schema) {
              throw new HermesFirestoreConflictError("Reviewed job identity is invalid");
            }

            let transactionEntitlement: HermesFeaturedEntitlementBoundState | null = null;
            if (boundState.featuredEntitlement) {
              if (!transaction.queryExact) {
                throw new Error("Firestore transaction queries are required for featured approval");
              }
              const resolvedEntitlement = await readFeaturedEntitlement(
                { ...target, collection: boundState.collection, schema: boundState.schema },
                {
                  getDocument: transaction.getDocument,
                  queryExact: transaction.queryExact,
                },
              );
              if (!resolvedEntitlement.ok ||
                  !isDeepStrictEqual(resolvedEntitlement.state, boundState.featuredEntitlement)) {
                throw new HermesFirestoreConflictError("Featured entitlement changed since review");
              }
              transactionEntitlement = resolvedEntitlement.state;
            }

            const alreadyActive = target.data.status === "active" && target.data.active === true &&
              (!boundState.desiredState.setPostedAt || target.data.postedAt != null);
            const mutationTimestamp = timestampToken();
            const patch: Record<string, unknown> = alreadyActive ? {} : {
              status: "active",
              active: true,
              ...(Boolean(target.data.featured) !== boundState.desiredState.featured
                ? { featured: boundState.desiredState.featured }
                : {}),
              updatedAt: mutationTimestamp,
              ...(boundState.desiredState.setPostedAt && target.data.postedAt == null
                ? { postedAt: mutationTimestamp }
                : {}),
              ...(transactionEntitlement
                ? {
                    featuredCreditConsumed: transactionEntitlement.existingFeaturedCreditConsumed ||
                      transactionEntitlement.consumeCredit,
                    ...(!transactionEntitlement.existingFeaturedCreditConsumed && transactionEntitlement.consumeCredit
                      ? { featuredCreditConsumedAt: mutationTimestamp }
                      : target.data.featuredCreditConsumedAt !== undefined
                        ? { featuredCreditConsumedAt: target.data.featuredCreditConsumedAt }
                        : {}),
                  }
                : {}),
            };
            if (!alreadyActive && (target.data.status !== "draft" || target.data.active === true)) {
              throw new HermesFirestoreConflictError("Job is no longer eligible for approval");
            }
            if (Object.keys(patch).length > 0) {
              transaction.updateDocument(boundState.collection, boundState.documentId, patch);
            }
            const expectedEmployerCredits = transactionEntitlement
              ? transactionEntitlement.featuredPostCredits - (transactionEntitlement.consumeCredit ? 1 : 0)
              : undefined;
            const employerPatch = transactionEntitlement?.consumeCredit
              ? { featuredPostCredits: expectedEmployerCredits, updatedAt: mutationTimestamp }
              : {};
            if (transactionEntitlement?.consumeCredit) {
              transaction.updateDocument("employers", transactionEntitlement.employerId, employerPatch);
            }
            const status: "applied" | "verified_noop" = Object.keys(patch).length > 0 ? "applied" : "verified_noop";
            const committedAt = now().toISOString();
            const targetIdentity = targetFrom(boundState);
            const changedFields = transactionEntitlement
              ? { job: Object.keys(patch).sort(), employer: Object.keys(employerPatch).sort() }
              : Object.keys(patch).sort();
            transaction.setDocument(AUDIT_COLLECTION, id, {
              protocol: "iopps-hermes-admin-audit-v1",
              action: "approve_job",
              actorKeyId: input.execution.keyId,
              requestHash: input.execution.requestHash,
              target: targetIdentity,
              changedFields,
              outcome: status,
              occurredAt: committedAt,
            });
            transaction.setDocument(IDEMPOTENCY_COLLECTION, id, {
              protocol: "iopps-hermes-admin-idempotency-v1",
              operation: "approve_job",
              keyId: input.execution.keyId,
              requestHash: input.execution.requestHash,
              target: targetIdentity,
              resultStatus: status,
              committedAt,
              ...(transactionEntitlement
                ? {
                    featuredVerification: {
                      decision: transactionEntitlement.decision,
                      expectedEmployerCredits,
                      featuredCreditConsumed: transactionEntitlement.existingFeaturedCreditConsumed ||
                        transactionEntitlement.consumeCredit,
                    },
                  }
                : {}),
            });
            return {
              status,
              committedAt,
              ...(expectedEmployerCredits !== undefined ? { expectedEmployerCredits } : {}),
            };
          });
          const verified = await rereadAndVerify(boundState, transactionResult.expectedEmployerCredits);
          return { ...transactionResult, verified };
        },
      };
    },
  };
}
