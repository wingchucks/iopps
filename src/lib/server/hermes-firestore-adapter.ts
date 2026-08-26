import { createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";

import type { DocumentSnapshot, Firestore, Query, Transaction } from "firebase-admin/firestore";

import {
  buildHermesEmployerMutationPlan,
  projectHermesEmployerState,
  hermesEmployerSubscriptionMatches,
  verifyHermesEmployerDesiredDocuments,
  type HermesEmployerCommand,
  type HermesEmployerBoundState,
  type HermesEmployerDocument,
  type HermesEmployerJobTarget,
  type HermesEmployerServiceDeps,
  type HermesEmployerVerifiedProjection,
} from "./hermes-employer-admin.ts";

const NONCE_COLLECTION = "hermesAdminNonces";
const IDEMPOTENCY_COLLECTION = "hermesAdminIdempotency";
const AUDIT_COLLECTION = "hermesAdminAudit";

export interface HermesFirestorePortTransaction {
  getDocument: (collection: string, id: string) => Promise<HermesEmployerDocument | null>;
  queryExact?: (
    collection: string,
    field: string,
    value: string,
    limit: number,
  ) => Promise<HermesEmployerDocument[]>;
  setDocument: (
    collection: string,
    id: string,
    data: Record<string, unknown>,
    options?: { merge?: boolean },
  ) => void;
  updateDocument: (collection: string, id: string, data: Record<string, unknown>) => void;
}

export interface HermesFirestorePort {
  queryExact: (
    collection: string,
    field: string,
    value: string,
    limit: number,
  ) => Promise<HermesEmployerDocument[]>;
  queryExactFields: (
    collection: string,
    filters: readonly { field: string; value: string }[],
    limit: number,
  ) => Promise<HermesEmployerDocument[]>;
  getDocument: (collection: string, id: string) => Promise<HermesEmployerDocument | null>;
  runTransaction: <T>(handler: (transaction: HermesFirestorePortTransaction) => Promise<T>) => Promise<T>;
}

export interface HermesExecutionContext {
  keyId: string;
  idempotencyKey: string;
  requestHash: string;
}

export interface HermesIdempotentApplyResult {
  status: "applied" | "verified_noop";
  committedAt?: string;
  verified: HermesEmployerVerifiedProjection;
}

export class HermesFirestoreConflictError extends Error {
  readonly status = 409;
}

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function hermesIdempotencyDocumentId(
  input: Pick<HermesExecutionContext, "keyId" | "idempotencyKey">,
): string {
  return sha256(`iopps-hermes-admin-idempotency-v1\0apply\0${input.keyId}\0${input.idempotencyKey}`);
}

function assertExecution(execution: HermesExecutionContext): void {
  if (
    !/^[A-Za-z0-9_-]{1,64}$/.test(execution.keyId) ||
    !/^[A-Za-z0-9._:-]{1,128}$/.test(execution.idempotencyKey) ||
    !/^[a-f0-9]{64}$/.test(execution.requestHash)
  ) {
    throw new Error("Invalid Hermes execution context");
  }
}

function assertAllowedKeys(
  label: string,
  patch: Record<string, unknown>,
  allowed: readonly string[],
): void {
  const allowedSet = new Set(allowed);
  const unsupported = Object.keys(patch).filter((key) => !allowedSet.has(key));
  if (unsupported.length > 0) throw new Error(`${label} contains unsupported fields`);
}

function minimalPatch(
  current: Record<string, unknown>,
  desired: Record<string, unknown>,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(desired).filter(([key, value]) => !isDeepStrictEqual(current[key], value)),
  );
}

const EMPLOYER_FIELDS = [
  "plan", "subscriptionTier", "subscriptionStatus", "subscriptionStart", "subscriptionEnd",
  "billingStartAt", "bonusAccessGrantedAt", "bonusAccessReason", "updatedAt", "subscription",
  "organizationName", "name", "companyName", "status", "approved", "approvedAt", "verified",
  "verificationStatus", "disabled",
] as const;
const ORGANIZATION_FIELDS = [...EMPLOYER_FIELDS, "tier", "employerId"] as const;
const SUBSCRIPTION_FIELDS = [
  "employerId", "orgId", "organizationId", "plan", "status", "amount", "gstAmount", "totalAmount", "billingCycle", "createdAt",
  "startsAt", "expiresAt", "manualOverride", "bonusAccessGrantedAt", "bonusAccessReason", "updatedAt",
] as const;

function verifyVersion(
  label: string,
  document: HermesEmployerDocument | null,
  expectedId: string,
  expectedVersion: string,
): void {
  const actualVersion = document?.version ?? "missing";
  const idMismatch = document ? document.id !== expectedId : expectedVersion !== "missing";
  if (idMismatch || actualVersion !== expectedVersion) {
    throw new HermesFirestoreConflictError(`${label} changed since review`);
  }
}

function deduplicateDocuments(groups: HermesEmployerDocument[][]): HermesEmployerDocument[] {
  const byId = new Map<string, HermesEmployerDocument>();
  for (const document of groups.flat()) byId.set(document.id, document);
  return [...byId.values()].sort((a, b) => a.id.localeCompare(b.id));
}

function stringField(data: Record<string, unknown>, field: string): string {
  const value = data[field];
  return typeof value === "string" ? value.trim() : "";
}

function serializedJobTarget(boundState: HermesEmployerBoundState, includeVersion: boolean) {
  const target = boundState.jobTarget;
  if (!target) return undefined;
  return {
    documentId: target.documentId,
    collection: target.collection,
    schema: target.schema,
    ...(includeVersion ? { version: target.version } : {}),
    authorId: target.authorId,
    employerId: target.employerId,
    organizationId: target.organizationId,
  };
}

function verifyJobTarget(
  document: HermesEmployerDocument | null,
  target: HermesEmployerJobTarget | undefined,
): void {
  if (!target) return;
  const expectedSchema = target.collection === "jobs" ? "employer-job-v1" : "legacy-job-post-v1";
  if (target.schema !== expectedSchema) {
    throw new HermesFirestoreConflictError("Job target schema changed since review");
  }
  verifyVersion("Job target", document, target.documentId, target.version);
  if (!document || stringField(document.data, "authorId") !== target.authorId ||
      (target.collection === "jobs"
        ? stringField(document.data, "employerId") !== target.employerId ||
          stringField(document.data, "orgId") !== target.organizationId
        : document.data.type !== "job" || stringField(document.data, "orgId") !== target.employerId ||
          target.organizationId !== target.employerId)) {
    throw new HermesFirestoreConflictError("Job target links changed since review");
  }
}

export function createHermesFirestoreAdapter(
  port: HermesFirestorePort,
  options: { now?: () => Date } = {},
) {
  const now = options.now ?? (() => new Date());

  return {
    async consumeNonce(input: { keyId: string; nonceHash: string; expiresAt: Date }): Promise<boolean> {
      if (!/^[A-Za-z0-9_-]{1,64}$/.test(input.keyId) || !/^[a-f0-9]{64}$/.test(input.nonceHash)) {
        return false;
      }
      const id = sha256(`iopps-hermes-admin-nonce-v1\0${input.keyId}\0${input.nonceHash}`);
      return port.runTransaction(async (transaction) => {
        if (await transaction.getDocument(NONCE_COLLECTION, id)) return false;
        transaction.setDocument(NONCE_COLLECTION, id, {
          protocol: "iopps-hermes-admin-nonce-v1",
          keyId: input.keyId,
          createdAt: now(),
          expiresAt: input.expiresAt,
        });
        return true;
      });
    },

    async getIdempotentApply(
      command: HermesEmployerCommand,
      execution: HermesExecutionContext,
    ): Promise<HermesIdempotentApplyResult | null> {
      assertExecution(execution);
      const id = hermesIdempotencyDocumentId(execution);
      const record = await port.getDocument(IDEMPOTENCY_COLLECTION, id);
      if (!record) return null;
      if (record.data.requestHash !== execution.requestHash || record.data.keyId !== execution.keyId) {
        throw new HermesFirestoreConflictError("Idempotency key was already used for another request");
      }
      const target = record.data.target;
      if (!target || typeof target !== "object" || Array.isArray(target)) {
        throw new HermesFirestoreConflictError("Idempotent request record is invalid");
      }
      const targetRecord = target as Record<string, unknown>;
      const userId = typeof targetRecord.userId === "string" ? targetRecord.userId : "";
      const employerId = typeof targetRecord.employerId === "string" ? targetRecord.employerId : "";
      const organizationId = typeof targetRecord.organizationId === "string" ? targetRecord.organizationId : "";
      const subscriptionId = typeof targetRecord.subscriptionId === "string" ? targetRecord.subscriptionId : "";
      const rawJobTarget = targetRecord.jobTarget;
      const jobTarget = rawJobTarget && typeof rawJobTarget === "object" && !Array.isArray(rawJobTarget)
        ? rawJobTarget as unknown as HermesEmployerJobTarget
        : undefined;
      const resultStatus = record.data.resultStatus;
      if (
        !userId || !employerId || !organizationId || !subscriptionId ||
        (command.jobId
          ? !jobTarget || jobTarget.documentId !== command.jobId ||
            (jobTarget.collection !== "jobs" && jobTarget.collection !== "posts") ||
            (jobTarget.collection === "jobs"
              ? jobTarget.schema !== "employer-job-v1"
              : jobTarget.schema !== "legacy-job-post-v1") ||
            typeof jobTarget.version !== "string" || jobTarget.authorId !== userId ||
            jobTarget.employerId !== employerId || jobTarget.organizationId !== organizationId
          : Boolean(jobTarget)) ||
        (resultStatus !== "applied" && resultStatus !== "verified_noop")
      ) {
        throw new HermesFirestoreConflictError("Idempotent request record is invalid");
      }
      const [user, employer, organization, subscription, job] = await Promise.all([
        port.getDocument("users", userId),
        port.getDocument("employers", employerId),
        port.getDocument("organizations", organizationId),
        port.getDocument("subscriptions", subscriptionId),
        jobTarget ? port.getDocument(jobTarget.collection, jobTarget.documentId) : Promise.resolve(null),
      ]);
      verifyJobTarget(job, jobTarget);
      if (
        !user || !employer || !organization || !subscription ||
        !hermesEmployerSubscriptionMatches(command, subscription, employerId, organizationId)
      ) {
        throw new Error("Idempotent result verification could not reread the target documents");
      }
      const plan = buildHermesEmployerMutationPlan(command, {
        orgId: employerId,
        organizationId,
        now: now(),
        createdAtToken: subscription.data.createdAt,
      });
      const desiredDocuments = verifyHermesEmployerDesiredDocuments(
        command,
        user,
        employer,
        organization,
        plan,
        "stable",
      );
      if (!desiredDocuments.user || !desiredDocuments.employer || !desiredDocuments.organization) {
        throw new Error("Idempotent result verification failed");
      }
      const committedAt = record.data.committedAt;
      return {
        status: resultStatus,
        ...(typeof committedAt === "string" ? { committedAt } : {}),
        verified: projectHermesEmployerState(command, user, employer, organization),
      };
    },

    createEmployerServiceDeps(input: {
      reviewSecret: string;
      execution: HermesExecutionContext;
    }): HermesEmployerServiceDeps {
      assertExecution(input.execution);
      const idempotencyId = hermesIdempotencyDocumentId(input.execution);

      return {
        reviewSecret: input.reviewSecret,
        now,
        findUsersByEmail: (email) => port.queryExact("users", "email", email, 2),
        async findEmployersByEmail(email) {
          const matches = await Promise.all([
            port.queryExact("employers", "email", email, 2),
            port.queryExact("employers", "contactEmail", email, 2),
          ]);
          return deduplicateDocuments(matches);
        },
        async findJobCandidates(jobId) {
          const [canonical, legacy] = await Promise.all([
            port.getDocument("jobs", jobId),
            port.getDocument("posts", jobId),
          ]);
          return [
            ...(canonical ? [{ ...canonical, collection: "jobs" as const, schema: "employer-job-v1" as const }] : []),
            ...(legacy?.data.type === "job"
              ? [{ ...legacy, collection: "posts" as const, schema: "legacy-job-post-v1" as const }]
              : []),
          ];
        },
        async findUsersByAuthorId(authorId) {
          const [direct, byUid] = await Promise.all([
            port.getDocument("users", authorId),
            port.queryExact("users", "uid", authorId, 2),
          ]);
          return deduplicateDocuments([direct ? [direct] : [], byUid]);
        },
        async findLinkedEmployers(user) {
          const candidateIds = new Set([
            user.id,
            stringField(user.data, "employerId"),
            stringField(user.data, "orgId"),
          ].filter(Boolean));
          const [direct, byUid, byOwnerId, byEmail, byContactEmail] = await Promise.all([
            Promise.all([...candidateIds].map((id) => port.getDocument("employers", id))),
            port.queryExact("employers", "uid", user.id, 2),
            port.queryExact("employers", "ownerId", user.id, 2),
            port.queryExact("employers", "email", stringField(user.data, "email"), 2),
            port.queryExact("employers", "contactEmail", stringField(user.data, "email"), 2),
          ]);
          return deduplicateDocuments([
            direct.filter((document): document is HermesEmployerDocument => Boolean(document)),
            byUid, byOwnerId, byEmail, byContactEmail,
          ]);
        },
        async findLinkedOrganizations(user, employer) {
          const candidateIds = new Set([
            employer.id,
            stringField(user.data, "orgId"),
          ].filter(Boolean));
          const [direct, byEmployerId, byOwnerId, byUid] = await Promise.all([
            Promise.all([...candidateIds].map((id) => port.getDocument("organizations", id))),
            port.queryExact("organizations", "employerId", employer.id, 2),
            port.queryExact("organizations", "ownerId", user.id, 2),
            port.queryExact("organizations", "uid", user.id, 2),
          ]);
          return deduplicateDocuments([
            direct.filter((document): document is HermesEmployerDocument => Boolean(document)),
            byEmployerId, byOwnerId, byUid,
          ]);
        },
        findOrganizationsByEmployerId: (employerId) =>
          port.queryExact("organizations", "employerId", employerId, 2),
        findSubscriptions: (orgId, plan, billingCycle) => port.queryExactFields(
          "subscriptions",
          [
            { field: "orgId", value: orgId },
            { field: "plan", value: plan },
            { field: "billingCycle", value: billingCycle },
          ],
          2,
        ),
        findSubscriptionsByEmployerId: (employerId, plan, billingCycle) => port.queryExactFields(
          "subscriptions",
          [
            { field: "employerId", value: employerId },
            { field: "plan", value: plan },
            { field: "billingCycle", value: billingCycle },
          ],
          2,
        ),
        findSubscriptionsByOrganizationId: (organizationId, plan, billingCycle) => port.queryExactFields(
          "subscriptions",
          [
            { field: "organizationId", value: organizationId },
            { field: "plan", value: plan },
            { field: "billingCycle", value: billingCycle },
          ],
          2,
        ),
        getOrganization: (orgId) => port.getDocument("organizations", orgId),
        getSubscription: (subscriptionId) => port.getDocument("subscriptions", subscriptionId),
        async recordVerifiedNoop({ boundState }) {
          await port.runTransaction(async (transaction) => {
            const existing = await transaction.getDocument(IDEMPOTENCY_COLLECTION, idempotencyId);
            if (existing) {
              if (
                existing.data.requestHash !== input.execution.requestHash ||
                existing.data.keyId !== input.execution.keyId
              ) {
                throw new HermesFirestoreConflictError("Idempotency key was already used for another request");
              }
              return;
            }
            const [user, employer, organization, subscription, job] = await Promise.all([
              transaction.getDocument("users", boundState.userId),
              transaction.getDocument("employers", boundState.employerId),
              transaction.getDocument("organizations", boundState.organizationId),
              transaction.getDocument("subscriptions", boundState.subscriptionId),
              boundState.jobTarget
                ? transaction.getDocument(boundState.jobTarget.collection, boundState.jobTarget.documentId)
                : Promise.resolve(null),
            ]);
            verifyVersion("User document", user, boundState.userId, boundState.userVersion);
            verifyVersion("Employer document", employer, boundState.employerId, boundState.employerVersion);
            verifyVersion("Organization document", organization, boundState.organizationId, boundState.organizationVersion);
            verifyVersion("Subscription document", subscription, boundState.subscriptionId, boundState.subscriptionVersion);
            verifyJobTarget(job, boundState.jobTarget);

            const timestamp = now().toISOString();
            const target = {
              userId: boundState.userId,
              employerId: boundState.employerId,
              organizationId: boundState.organizationId,
              subscriptionId: boundState.subscriptionId,
              ...(boundState.jobTarget ? { jobTarget: serializedJobTarget(boundState, false) } : {}),
            };
            transaction.setDocument(AUDIT_COLLECTION, idempotencyId, {
              protocol: "iopps-hermes-admin-audit-v1",
              action: "employer_apply",
              actorKeyId: input.execution.keyId,
              requestHash: input.execution.requestHash,
              target,
              changedFields: { user: [], employer: [], organization: [], subscription: [] },
              outcome: "verified_noop",
              occurredAt: timestamp,
            });
            transaction.setDocument(IDEMPOTENCY_COLLECTION, idempotencyId, {
              protocol: "iopps-hermes-admin-idempotency-v1",
              operation: "employer_apply",
              keyId: input.execution.keyId,
              requestHash: input.execution.requestHash,
              target: {
                ...target,
                ...(boundState.jobTarget ? { jobTarget: serializedJobTarget(boundState, true) } : {}),
              },
              status: "committed",
              resultStatus: "verified_noop",
              committedAt: timestamp,
            });
          });
        },
        async commit({ command, boundState, plan }) {
          assertAllowedKeys("user patch", plan.userPatch, ["role", "employerId", "orgId", "orgRole"]);
          assertAllowedKeys("employer patch", plan.employerPatch, EMPLOYER_FIELDS);
          assertAllowedKeys("organization patch", plan.organizationPatch, ORGANIZATION_FIELDS);
          assertAllowedKeys("subscription patch", plan.subscriptionRecordPatch, SUBSCRIPTION_FIELDS);

          const committedAt = await port.runTransaction(async (transaction) => {
            const existingIdempotency = await transaction.getDocument(IDEMPOTENCY_COLLECTION, idempotencyId);
            if (existingIdempotency) {
              if (
                existingIdempotency.data.requestHash !== input.execution.requestHash ||
                existingIdempotency.data.keyId !== input.execution.keyId
              ) {
                throw new HermesFirestoreConflictError("Idempotency key was already used for another request");
              }
              const cachedTime = existingIdempotency.data.committedAt;
              if (typeof cachedTime !== "string") {
                throw new HermesFirestoreConflictError("Idempotent request is not in a completed state");
              }
              return cachedTime;
            }

            const [user, employer, organization, subscription, job] = await Promise.all([
              transaction.getDocument("users", boundState.userId),
              transaction.getDocument("employers", boundState.employerId),
              transaction.getDocument("organizations", boundState.organizationId),
              transaction.getDocument("subscriptions", boundState.subscriptionId),
              boundState.jobTarget
                ? transaction.getDocument(boundState.jobTarget.collection, boundState.jobTarget.documentId)
                : Promise.resolve(null),
            ]);
            verifyVersion("User document", user, boundState.userId, boundState.userVersion);
            verifyVersion("Employer document", employer, boundState.employerId, boundState.employerVersion);
            verifyVersion(
              "Organization document",
              organization,
              boundState.organizationId,
              boundState.organizationVersion,
            );
            verifyVersion(
              "Subscription document",
              subscription,
              boundState.subscriptionId,
              boundState.subscriptionVersion,
            );
            verifyJobTarget(job, boundState.jobTarget);

            const userPatch = minimalPatch(user?.data ?? {}, plan.userPatch);
            const employerPatch = minimalPatch(employer?.data ?? {}, plan.employerPatch);
            const organizationPatch = minimalPatch(organization?.data ?? {}, plan.organizationPatch);
            const subscriptionPatch = minimalPatch(subscription?.data ?? {}, plan.subscriptionRecordPatch);
            if (Object.keys(userPatch).length > 0) {
              transaction.updateDocument("users", boundState.userId, userPatch);
            }
            if (Object.keys(employerPatch).length > 0) {
              transaction.updateDocument("employers", boundState.employerId, employerPatch);
            }
            if (Object.keys(organizationPatch).length > 0) {
              transaction.setDocument("organizations", boundState.organizationId, organizationPatch, { merge: true });
            }
            if (Object.keys(subscriptionPatch).length > 0) {
              transaction.setDocument("subscriptions", boundState.subscriptionId, subscriptionPatch, { merge: true });
            }

            const timestamp = now().toISOString();
            const target = {
              userId: boundState.userId,
              employerId: boundState.employerId,
              organizationId: boundState.organizationId,
              subscriptionId: boundState.subscriptionId,
              ...(boundState.jobTarget ? { jobTarget: serializedJobTarget(boundState, false) } : {}),
            };
            transaction.setDocument(AUDIT_COLLECTION, idempotencyId, {
              protocol: "iopps-hermes-admin-audit-v1",
              action: "employer_apply",
              actorKeyId: input.execution.keyId,
              requestHash: input.execution.requestHash,
              target,
              changedFields: {
                user: Object.keys(userPatch).sort(),
                employer: Object.keys(employerPatch).sort(),
                organization: Object.keys(organizationPatch).sort(),
                subscription: Object.keys(subscriptionPatch).sort(),
              },
              outcome: "applied",
              occurredAt: timestamp,
            });
            transaction.setDocument(IDEMPOTENCY_COLLECTION, idempotencyId, {
              protocol: "iopps-hermes-admin-idempotency-v1",
              operation: "employer_apply",
              keyId: input.execution.keyId,
              requestHash: input.execution.requestHash,
              target: {
                ...target,
                ...(boundState.jobTarget ? { jobTarget: serializedJobTarget(boundState, true) } : {}),
              },
              status: "committed",
              resultStatus: "applied",
              committedAt: timestamp,
            });
            return timestamp;
          });

          const [user, employer, organization, subscription, job] = await Promise.all([
            port.getDocument("users", boundState.userId),
            port.getDocument("employers", boundState.employerId),
            port.getDocument("organizations", boundState.organizationId),
            port.getDocument("subscriptions", boundState.subscriptionId),
            boundState.jobTarget
              ? port.getDocument(boundState.jobTarget.collection, boundState.jobTarget.documentId)
              : Promise.resolve(null),
          ]);
          verifyJobTarget(job, boundState.jobTarget);
          if (
            !user || !employer || !organization ||
            !hermesEmployerSubscriptionMatches(
              command,
              subscription,
              boundState.employerId,
              boundState.organizationId,
              "exact",
            )
          ) {
            throw new Error("Post-write verification could not reread the target documents");
          }
          const desiredDocuments = verifyHermesEmployerDesiredDocuments(command, user, employer, organization, plan);
          if (!desiredDocuments.user || !desiredDocuments.employer || !desiredDocuments.organization) {
            throw new Error("Post-write verification failed");
          }
          return {
            committedAt,
            verified: projectHermesEmployerState(command, user, employer, organization),
            userVerified: desiredDocuments.user,
            employerVerified: desiredDocuments.employer,
            organizationVerified: desiredDocuments.organization,
          };
        },
      };
    },
  };
}

function snapshotVersion(snapshot: DocumentSnapshot): string {
  const updateTime = snapshot.updateTime;
  if (!updateTime) throw new Error("Firestore document is missing an update version");
  return `${updateTime.seconds}:${String(updateTime.nanoseconds).padStart(9, "0")}`;
}

function toPortDocument(snapshot: DocumentSnapshot): HermesEmployerDocument | null {
  if (!snapshot.exists) return null;
  return { id: snapshot.id, version: snapshotVersion(snapshot), data: snapshot.data() ?? {} };
}

function transactionPort(db: Firestore, transaction: Transaction): HermesFirestorePortTransaction {
  return {
    async getDocument(collection, id) {
      return toPortDocument(await transaction.get(db.collection(collection).doc(id)));
    },
    async queryExact(collection, field, value, limit) {
      const snapshot = await transaction.get(db.collection(collection).where(field, "==", value).limit(limit));
      return snapshot.docs.map((document) => {
        const converted = toPortDocument(document);
        if (!converted) throw new Error("Firestore transaction query returned a missing document");
        return converted;
      });
    },
    setDocument(collection, id, data, options) {
      const ref = db.collection(collection).doc(id);
      if (options?.merge) transaction.set(ref, data, { merge: true });
      else transaction.set(ref, data);
    },
    updateDocument(collection, id, data) {
      transaction.update(db.collection(collection).doc(id), data);
    },
  };
}

export function createFirebaseHermesFirestorePort(db: Firestore): HermesFirestorePort {
  return {
    async queryExact(collection, field, value, limit) {
      const snapshot = await db.collection(collection).where(field, "==", value).limit(limit).get();
      return snapshot.docs.map((document) => {
        const converted = toPortDocument(document);
        if (!converted) throw new Error("Firestore query returned a missing document");
        return converted;
      });
    },
    async queryExactFields(collection, filters, limit) {
      let query: Query = db.collection(collection);
      for (const filter of filters) query = query.where(filter.field, "==", filter.value);
      const snapshot = await query.limit(limit).get();
      return snapshot.docs.map((document) => {
        const converted = toPortDocument(document);
        if (!converted) throw new Error("Firestore query returned a missing document");
        return converted;
      });
    },
    async getDocument(collection, id) {
      return toPortDocument(await db.collection(collection).doc(id).get());
    },
    runTransaction(handler) {
      return db.runTransaction((transaction) => handler(transactionPort(db, transaction)));
    },
  };
}
