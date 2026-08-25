import { createHash } from "node:crypto";

import type {
  HermesExecutionContext,
  HermesFirestorePort,
} from "./hermes-firestore-adapter.ts";
import { HermesFirestoreConflictError } from "./hermes-firestore-adapter.ts";
import type {
  HermesJobApprovalBoundState,
  HermesJobApprovalDocument,
  HermesJobApprovalProjection,
  HermesJobApprovalServiceDeps,
} from "./hermes-job-approval.ts";

const IDEMPOTENCY_COLLECTION = "hermesAdminIdempotency";
const AUDIT_COLLECTION = "hermesAdminAudit";

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

export function createHermesJobApprovalFirestoreAdapter(
  port: HermesFirestorePort,
  options: { now?: () => Date; timestampToken?: () => unknown } = {},
) {
  const now = options.now ?? (() => new Date());
  const timestampToken = options.timestampToken ?? now;

  function project(document: HermesJobApprovalDocument): HermesJobApprovalProjection {
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
    };
  }

  function targetFrom(state: HermesJobApprovalBoundState) {
    return { documentId: state.documentId, collection: state.collection, schema: state.schema };
  }

  function parseTarget(value: unknown): {
    documentId: string;
    collection: "jobs" | "posts";
    schema: "employer-job-v1" | "legacy-job-post-v1";
  } | null {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const target = value as Record<string, unknown>;
    if (typeof target.documentId !== "string" ||
        (target.collection !== "jobs" && target.collection !== "posts") ||
        (target.schema !== "employer-job-v1" && target.schema !== "legacy-job-post-v1")) return null;
    if ((target.collection === "jobs") !== (target.schema === "employer-job-v1")) return null;
    return target as ReturnType<typeof targetFrom>;
  }

  function isConflictingOppositeDocument(
    targetCollection: "jobs" | "posts",
    other: { data: Record<string, unknown> } | null,
  ): boolean {
    if (!other) return false;
    return targetCollection === "posts" || other.data.type === "job";
  }

  async function rereadAndVerify(state: HermesJobApprovalBoundState): Promise<HermesJobApprovalProjection> {
    const reread = await port.getDocument(state.collection, state.documentId);
    if (!reread || (state.collection === "posts" && reread.data.type !== "job") ||
        reread.data.status !== "active" || reread.data.active !== true ||
        (state.desiredState.setPostedAt && reread.data.postedAt == null)) {
      throw new Error("Post-write public-active verification failed");
    }
    return project({ ...reread, collection: state.collection, schema: state.schema });
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
      const [document, other] = await Promise.all([
        port.getDocument(target.collection, target.documentId),
        port.getDocument(otherCollection, target.documentId),
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
      return {
        status: verifiedStatus,
        ...(typeof record.data.committedAt === "string" ? { committedAt: record.data.committedAt } : {}),
        verified: project({ ...document, collection: target.collection, schema: target.schema }),
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
        async commit({ boundState, current }) {
          const id = hermesJobApprovalIdempotencyDocumentId(input.execution);
          const transactionResult = await port.runTransaction<{
            status: "applied" | "verified_noop";
            committedAt: string;
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
              return {
                status: resultStatus as "applied" | "verified_noop",
                committedAt: existing.data.committedAt,
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

            const alreadyActive = target.data.status === "active" && target.data.active === true &&
              (!boundState.desiredState.setPostedAt || target.data.postedAt != null);
            const patch: Record<string, unknown> = alreadyActive ? {} : {
              status: "active",
              active: true,
              updatedAt: timestampToken(),
              ...(boundState.desiredState.setPostedAt && target.data.postedAt == null
                ? { postedAt: timestampToken() }
                : {}),
            };
            if (!alreadyActive && (target.data.status !== "draft" || target.data.active === true)) {
              throw new HermesFirestoreConflictError("Job is no longer eligible for approval");
            }
            if (Object.keys(patch).length > 0) {
              transaction.updateDocument(boundState.collection, boundState.documentId, patch);
            }
            const status: "applied" | "verified_noop" = Object.keys(patch).length > 0 ? "applied" : "verified_noop";
            const committedAt = now().toISOString();
            const targetIdentity = targetFrom(boundState);
            const changedFields = Object.keys(patch).sort();
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
            });
            return { status, committedAt };
          });
          const verified = await rereadAndVerify(boundState);
          return { ...transactionResult, verified };
        },
      };
    },
  };
}
