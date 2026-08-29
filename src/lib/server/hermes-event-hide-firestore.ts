import { createHash } from "node:crypto";

import type { HermesExecutionContext, HermesFirestorePort } from "./hermes-firestore-adapter.ts";
import { HermesFirestoreConflictError } from "./hermes-firestore-adapter.ts";
import type {
  HermesEventHideCommand,
  HermesEventHideDocument,
  HermesEventHideProjection,
  HermesEventHideServiceDeps,
} from "./hermes-event-hide.ts";

const IDEMPOTENCY_COLLECTION = "hermesAdminIdempotency";
const AUDIT_COLLECTION = "hermesAdminAudit";

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function hermesEventHideIdempotencyDocumentId(
  execution: Pick<HermesExecutionContext, "keyId" | "idempotencyKey">,
): string {
  return sha256(`iopps-hermes-admin-idempotency-v1\0hide-event\0${execution.keyId}\0${execution.idempotencyKey}`);
}

function assertExecution(execution: HermesExecutionContext): void {
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(execution.keyId) ||
      !/^[A-Za-z0-9._:-]{1,128}$/.test(execution.idempotencyKey) ||
      !/^[a-f0-9]{64}$/.test(execution.requestHash)) throw new Error("Invalid Hermes execution context");
}

function organization(data: Record<string, unknown>): string {
  for (const key of ["organizerName", "orgName", "organizationName", "organization", "companyName", "orgShort"]) {
    const value = data[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return "";
}

function effectiveActive(data: Record<string, unknown>): boolean {
  return data.status === "active" && (data.active === true || data.active === undefined);
}

function eventTypeMatches(data: Record<string, unknown>): boolean {
  return data.type === undefined || data.type === "event";
}

function project(document: HermesEventHideDocument): HermesEventHideProjection {
  return {
    id: document.id,
    title: typeof document.data.title === "string" ? document.data.title : "",
    organization: organization(document.data),
    type: "event",
    status: typeof document.data.status === "string" ? document.data.status : "",
    active: effectiveActive(document.data),
  };
}

function matches(command: HermesEventHideCommand, document: HermesEventHideDocument): boolean {
  const current = project(document);
  const activeMirrorMatches = command.status === "active"
    ? effectiveActive(document.data)
    : document.data.active === false;
  return document.id === command.eventId && current.title === command.title &&
    current.organization === command.organization && eventTypeMatches(document.data) &&
    current.status === command.status && activeMirrorMatches;
}

export function createHermesEventHideFirestoreAdapter(
  port: HermesFirestorePort,
  options: { now?: () => Date; timestampToken?: () => unknown } = {},
) {
  const now = options.now ?? (() => new Date());
  const timestampToken = options.timestampToken ?? now;

  async function rereadAndVerify(eventId: string): Promise<HermesEventHideProjection> {
    const reread = await port.getDocument("events", eventId);
    if (!reread || reread.id !== eventId || !eventTypeMatches(reread.data) ||
        reread.data.status !== "hidden" || reread.data.active !== false) {
      throw new Error("Event-hide readback verification failed");
    }
    return project(reread);
  }

  return {
    async getIdempotentApply(execution: HermesExecutionContext) {
      assertExecution(execution);
      const id = hermesEventHideIdempotencyDocumentId(execution);
      const record = await port.getDocument(IDEMPOTENCY_COLLECTION, id);
      if (!record) return null;
      if (record.data.operation !== "hide_event" || record.data.keyId !== execution.keyId ||
          record.data.requestHash !== execution.requestHash) {
        throw new HermesFirestoreConflictError("Idempotency key was already used for another request");
      }
      const eventId = record.data.eventId;
      const status = record.data.resultStatus;
      if (typeof eventId !== "string" || (status !== "applied" && status !== "verified_noop")) {
        throw new HermesFirestoreConflictError("Idempotent request record is invalid");
      }
      const verifiedStatus: "applied" | "verified_noop" = status;
      return {
        status: verifiedStatus,
        ...(typeof record.data.committedAt === "string" ? { committedAt: record.data.committedAt } : {}),
        verified: await rereadAndVerify(eventId),
      };
    },

    createServiceDeps(input: { reviewSecret: string; execution: HermesExecutionContext }): HermesEventHideServiceDeps {
      assertExecution(input.execution);
      return {
        reviewSecret: input.reviewSecret,
        async getEvent(eventId) {
          const document = await port.getDocument("events", eventId);
          return document ? { ...document } : null;
        },
        async commit({ command, current }) {
          const id = hermesEventHideIdempotencyDocumentId(input.execution);
          const transactionResult = await port.runTransaction<{
            status: "applied" | "verified_noop";
            committedAt: string;
          }>(async (transaction) => {
            const existing = await transaction.getDocument(IDEMPOTENCY_COLLECTION, id);
            if (existing) {
              if (existing.data.operation !== "hide_event" || existing.data.keyId !== input.execution.keyId ||
                  existing.data.requestHash !== input.execution.requestHash || existing.data.eventId !== command.eventId ||
                  (existing.data.resultStatus !== "applied" && existing.data.resultStatus !== "verified_noop") ||
                  typeof existing.data.committedAt !== "string") {
                throw new HermesFirestoreConflictError("Idempotent request record is invalid or conflicting");
              }
              return { status: existing.data.resultStatus, committedAt: existing.data.committedAt };
            }
            const target = await transaction.getDocument("events", command.eventId);
            if (!target || target.version !== current.version || !matches(command, target)) {
              throw new HermesFirestoreConflictError("Event changed since review");
            }
            const alreadyHidden = target.data.status === "hidden" && target.data.active === false;
            const mutationTimestamp = timestampToken();
            const patch = alreadyHidden ? {} : {
              status: "hidden",
              active: false,
              hiddenAt: mutationTimestamp,
              updatedAt: mutationTimestamp,
            };
            if (!alreadyHidden) transaction.updateDocument("events", command.eventId, patch);
            const status: "applied" | "verified_noop" = alreadyHidden ? "verified_noop" : "applied";
            const committedAt = now().toISOString();
            transaction.setDocument(AUDIT_COLLECTION, id, {
              protocol: "iopps-hermes-admin-audit-v1",
              action: "hide_event",
              actorKeyId: input.execution.keyId,
              requestHash: input.execution.requestHash,
              target: { collection: "events", documentId: command.eventId },
              changedFields: Object.keys(patch).sort(),
              outcome: status,
              occurredAt: committedAt,
            });
            transaction.setDocument(IDEMPOTENCY_COLLECTION, id, {
              protocol: "iopps-hermes-admin-idempotency-v1",
              operation: "hide_event",
              keyId: input.execution.keyId,
              requestHash: input.execution.requestHash,
              eventId: command.eventId,
              resultStatus: status,
              committedAt,
            });
            return { status, committedAt };
          });
          return { ...transactionResult, verified: await rereadAndVerify(command.eventId) };
        },
      };
    },
  };
}
