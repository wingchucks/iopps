import { createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";

import {
  type HermesAccountConversionBoundState,
  type HermesAccountConversionCommitResult,
  type HermesAccountConversionDocument,
  type HermesAccountConversionServiceDeps,
  type HermesAccountConversionVerifiedProjection,
} from "./hermes-account-conversion.ts";
import {
  HermesFirestoreConflictError,
  type HermesExecutionContext,
  type HermesFirestorePort,
} from "./hermes-firestore-adapter.ts";

const IDEMPOTENCY_COLLECTION = "hermesAdminIdempotency";
const AUDIT_COLLECTION = "hermesAdminAudit";

export interface HermesAccountConversionIdempotentResult extends HermesAccountConversionCommitResult {
  authCleanupComplete: boolean;
}

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function hermesAccountConversionIdempotencyDocumentId(
  execution: Pick<HermesExecutionContext, "keyId" | "idempotencyKey">,
): string {
  return sha256(`iopps-hermes-admin-idempotency-v1\0convert-to-individual\0${execution.keyId}\0${execution.idempotencyKey}`);
}

function assertExecution(execution: HermesExecutionContext): void {
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(execution.keyId) ||
      !/^[A-Za-z0-9._:-]{1,128}$/.test(execution.idempotencyKey) ||
      !/^[a-f0-9]{64}$/.test(execution.requestHash)) {
    throw new Error("Invalid Hermes execution context");
  }
}

function stringField(data: Record<string, unknown>, field: string): string {
  const value = data[field];
  return typeof value === "string" ? value.trim() : "";
}

function deduplicate(groups: HermesAccountConversionDocument[][]): HermesAccountConversionDocument[] {
  const documents = new Map<string, HermesAccountConversionDocument>();
  for (const document of groups.flat()) documents.set(document.id, document);
  return [...documents.values()].sort((a, b) => a.id.localeCompare(b.id));
}

function minimalPatch(current: Record<string, unknown>, desired: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(desired).filter(([key, value]) => !isDeepStrictEqual(current[key], value)));
}

function stablePatch(current: Record<string, unknown>, desired: Record<string, unknown>) {
  const stableDesired = Object.fromEntries(Object.entries(desired).filter(([key]) => key !== "updatedAt"));
  const patch = minimalPatch(current, stableDesired);
  if (Object.keys(patch).length > 0 && "updatedAt" in desired) patch.updatedAt = desired.updatedAt;
  return patch;
}

function verifyVersion(
  label: string,
  document: HermesAccountConversionDocument | null,
  expected: { id: string; version: string },
) {
  if (!document || document.id !== expected.id || document.version !== expected.version) {
    throw new HermesFirestoreConflictError(`${label} changed since review`);
  }
}

function desiredProjection(subscriptionCount: number): HermesAccountConversionVerifiedProjection {
  return {
    accountRole: "community",
    memberRole: "community",
    employerDisabled: true,
    organizationDisabled: true,
    subscriptionStatus: "expired",
    complimentarySubscriptionsExpired: subscriptionCount,
  };
}

function valueMatches(current: unknown, desired: unknown): boolean {
  if (desired && typeof desired === "object" && !Array.isArray(desired) &&
      current && typeof current === "object" && !Array.isArray(current)) {
    return Object.entries(desired as Record<string, unknown>).every(([key, value]) =>
      valueMatches((current as Record<string, unknown>)[key], value));
  }
  return isDeepStrictEqual(current, desired);
}

function documentMatches(
  document: HermesAccountConversionDocument | null,
  desired: Record<string, unknown>,
  options: { ignoreUpdatedAt?: boolean } = {},
): boolean {
  return Boolean(document) && Object.entries(desired).every(([key, value]) =>
    (options.ignoreUpdatedAt === true && key === "updatedAt") || valueMatches(document!.data[key], value));
}

function preserveNestedSubscription(
  current: Record<string, unknown>,
  desired: Record<string, unknown>,
): Record<string, unknown> {
  const desiredSubscription = desired.subscription;
  if (!desiredSubscription || typeof desiredSubscription !== "object" || Array.isArray(desiredSubscription)) {
    return desired;
  }
  const currentSubscription = current.subscription;
  const currentSubscriptionRecord = currentSubscription && typeof currentSubscription === "object" &&
    !Array.isArray(currentSubscription)
    ? currentSubscription as Record<string, unknown>
    : {};
  const desiredSubscriptionRecord = desiredSubscription as Record<string, unknown>;
  return {
    ...desired,
    subscription: {
      ...currentSubscriptionRecord,
      ...desiredSubscriptionRecord,
    },
  };
}

function targetFromBoundState(boundState: HermesAccountConversionBoundState) {
  return {
    userId: boundState.user.id,
    memberId: boundState.member.id,
    employerId: boundState.employer.id,
    organizationId: boundState.organization.id,
    subscriptionIds: boundState.subscriptions.map(({ id }) => id),
  };
}

function parseTarget(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const target = value as Record<string, unknown>;
  if (typeof target.userId !== "string" || typeof target.memberId !== "string" ||
      typeof target.employerId !== "string" || typeof target.organizationId !== "string" ||
      !Array.isArray(target.subscriptionIds) || target.subscriptionIds.some((id) => typeof id !== "string")) return null;
  return target as {
    userId: string; memberId: string; employerId: string; organizationId: string; subscriptionIds: string[];
  };
}

export function createHermesAccountConversionFirestoreAdapter(
  port: HermesFirestorePort,
  options: { now?: () => Date; cleanupAuthClaims?: (userId: string) => Promise<void> } = {},
) {
  const now = options.now ?? (() => new Date());

  async function getIdempotentApply(execution: HermesExecutionContext): Promise<HermesAccountConversionIdempotentResult | null> {
    assertExecution(execution);
    const record = await port.getDocument(IDEMPOTENCY_COLLECTION, hermesAccountConversionIdempotencyDocumentId(execution));
    if (!record) return null;
    if (record.data.operation !== "convert_to_individual" || record.data.keyId !== execution.keyId ||
        record.data.requestHash !== execution.requestHash) {
      throw new HermesFirestoreConflictError("Idempotency key was already used for another request");
    }
    const target = parseTarget(record.data.target);
    const status = record.data.resultStatus;
    if (!target || (status !== "applied" && status !== "verified_noop")) {
      throw new HermesFirestoreConflictError("Idempotent request record is invalid");
    }
    const [user, member, employer, organization, ...subscriptions] = await Promise.all([
      port.getDocument("users", target.userId),
      port.getDocument("members", target.memberId),
      port.getDocument("employers", target.employerId),
      port.getDocument("organizations", target.organizationId),
      ...target.subscriptionIds.map((id) => port.getDocument("subscriptions", id)),
    ]);
    const stableAccount = { role: "community", employerId: null, orgId: null, orgRole: null };
    const stableMember = { role: "community", orgId: null, orgRole: null };
    const stableDisabled = {
      disabled: true, status: "disabled", isPublished: false, publicationStatus: "SUSPENDED",
      publicVisibility: "hidden", directoryVisible: false, isDirectoryVisible: false,
      plan: "free", subscriptionTier: "free", subscriptionStatus: "expired",
      subscription: { tier: "free", status: "expired" },
    };
    if (!documentMatches(user, stableAccount) || !documentMatches(member, stableMember) ||
        !documentMatches(employer, stableDisabled) || !documentMatches(organization, { ...stableDisabled, tier: "free" }) ||
        subscriptions.some((subscription) => !documentMatches(subscription, { status: "expired" }))) {
      throw new Error("Idempotent result verification failed");
    }
    return {
      status,
      ...(typeof record.data.committedAt === "string" ? { committedAt: record.data.committedAt } : {}),
      userId: target.userId,
      verified: desiredProjection(target.subscriptionIds.length),
      authCleanupComplete: record.data.authCleanupComplete === true,
    };
  }

  function createServiceDeps(input: {
    reviewSecret: string;
    execution: HermesExecutionContext;
  }): HermesAccountConversionServiceDeps {
    assertExecution(input.execution);
    const idempotencyId = hermesAccountConversionIdempotencyDocumentId(input.execution);
    return {
      reviewSecret: input.reviewSecret,
      now,
      findUsersByEmail: (email) => port.queryExact("users", "email", email, 2),
      getMember: (userId) => port.getDocument("members", userId),
      async findLinkedEmployers(user) {
        const candidateIds = new Set([user.id, stringField(user.data, "employerId"), stringField(user.data, "orgId")].filter(Boolean));
        const [direct, byUid, byOwnerId, byEmail, byContactEmail] = await Promise.all([
          Promise.all([...candidateIds].map((id) => port.getDocument("employers", id))),
          port.queryExact("employers", "uid", user.id, 2),
          port.queryExact("employers", "ownerId", user.id, 2),
          port.queryExact("employers", "email", stringField(user.data, "email"), 2),
          port.queryExact("employers", "contactEmail", stringField(user.data, "email"), 2),
        ]);
        return deduplicate([direct.filter((document): document is HermesAccountConversionDocument => Boolean(document)), byUid, byOwnerId, byEmail, byContactEmail]);
      },
      async findLinkedOrganizations(user, employer) {
        const candidateIds = new Set([employer.id, stringField(user.data, "orgId")].filter(Boolean));
        const [direct, byEmployerId, byOwnerId, byUid] = await Promise.all([
          Promise.all([...candidateIds].map((id) => port.getDocument("organizations", id))),
          port.queryExact("organizations", "employerId", employer.id, 2),
          port.queryExact("organizations", "ownerId", user.id, 2),
          port.queryExact("organizations", "uid", user.id, 2),
        ]);
        return deduplicate([direct.filter((document): document is HermesAccountConversionDocument => Boolean(document)), byEmployerId, byOwnerId, byUid]);
      },
      async findLinkedSubscriptions(employer, organization) {
        const ids = [...new Set([employer.id, organization.id])];
        const groups = await Promise.all(ids.flatMap((id) => [
          port.queryExact("subscriptions", "employerId", id, 500),
          port.queryExact("subscriptions", "orgId", id, 500),
          port.queryExact("subscriptions", "organizationId", id, 500),
        ]));
        return deduplicate(groups);
      },
      async commit({ boundState, plan }) {
        const transactionResult = await port.runTransaction(async (transaction) => {
          const existing = await transaction.getDocument(IDEMPOTENCY_COLLECTION, idempotencyId);
          if (existing) {
            if (existing.data.keyId !== input.execution.keyId || existing.data.requestHash !== input.execution.requestHash) {
              throw new HermesFirestoreConflictError("Idempotency key was already used for another request");
            }
            const existingTarget = parseTarget(existing.data.target);
            if (!existingTarget || typeof existing.data.committedAt !== "string") {
              throw new HermesFirestoreConflictError("Idempotent request is not completed");
            }
            return {
              status: existing.data.resultStatus as "applied" | "verified_noop",
              committedAt: existing.data.committedAt,
              patchedSubscriptionIds: [] as string[],
              employerUpdatedAtWritten: false,
              organizationUpdatedAtWritten: false,
            };
          }
          const [user, member, employer, organization, ...subscriptions] = await Promise.all([
            transaction.getDocument("users", boundState.user.id),
            transaction.getDocument("members", boundState.member.id),
            transaction.getDocument("employers", boundState.employer.id),
            transaction.getDocument("organizations", boundState.organization.id),
            ...boundState.subscriptions.map(({ id }) => transaction.getDocument("subscriptions", id)),
          ]);
          verifyVersion("User document", user, boundState.user);
          verifyVersion("Member document", member, boundState.member);
          verifyVersion("Employer document", employer, boundState.employer);
          verifyVersion("Organization document", organization, boundState.organization);
          subscriptions.forEach((subscription, index) => verifyVersion("Subscription document", subscription, boundState.subscriptions[index]));

          const employerDesired = preserveNestedSubscription(employer!.data, plan.employerPatch);
          const organizationDesired = preserveNestedSubscription(organization!.data, plan.organizationPatch);
          const subscriptionPatches: Record<string, unknown>[] = subscriptions.map((subscription) =>
            stringField(subscription!.data, "status").toLowerCase() === "expired"
              ? {}
              : { ...plan.subscriptionPatch });
          const patches: {
            user: Record<string, unknown>;
            member: Record<string, unknown>;
            employer: Record<string, unknown>;
            organization: Record<string, unknown>;
            subscriptions: Record<string, unknown>[];
          } = {
            user: minimalPatch(user!.data, plan.userPatch),
            member: minimalPatch(member!.data, plan.memberPatch),
            employer: stablePatch(employer!.data, employerDesired),
            organization: stablePatch(organization!.data, organizationDesired),
            subscriptions: subscriptionPatches,
          };
          if (Object.keys(patches.user).length) transaction.updateDocument("users", boundState.user.id, patches.user);
          if (Object.keys(patches.member).length) transaction.updateDocument("members", boundState.member.id, patches.member);
          if (Object.keys(patches.employer).length) transaction.updateDocument("employers", boundState.employer.id, patches.employer);
          if (Object.keys(patches.organization).length) transaction.updateDocument("organizations", boundState.organization.id, patches.organization);
          patches.subscriptions.forEach((patch, index) => {
            if (Object.keys(patch).length) transaction.updateDocument("subscriptions", boundState.subscriptions[index].id, patch);
          });
          const targetWriteCount = Object.keys(patches.user).length + Object.keys(patches.member).length +
            Object.keys(patches.employer).length + Object.keys(patches.organization).length +
            patches.subscriptions.reduce((total, patch) => total + Object.keys(patch).length, 0);
          const status: "applied" | "verified_noop" = targetWriteCount > 0
            ? "applied"
            : "verified_noop";
          const committedAt = now().toISOString();
          const target = targetFromBoundState(boundState);
          transaction.setDocument(AUDIT_COLLECTION, idempotencyId, {
            protocol: "iopps-hermes-admin-audit-v1",
            action: "convert_to_individual",
            actorKeyId: input.execution.keyId,
            requestHash: input.execution.requestHash,
            target,
            changedFields: {
              user: Object.keys(patches.user).sort(), member: Object.keys(patches.member).sort(),
              employer: Object.keys(patches.employer).sort(), organization: Object.keys(patches.organization).sort(),
              subscriptions: patches.subscriptions.map((patch, index) => ({
                id: boundState.subscriptions[index].id, fields: Object.keys(patch).sort(),
              })),
            },
            outcome: status,
            occurredAt: committedAt,
          });
          transaction.setDocument(IDEMPOTENCY_COLLECTION, idempotencyId, {
            protocol: "iopps-hermes-admin-idempotency-v1",
            operation: "convert_to_individual",
            keyId: input.execution.keyId,
            requestHash: input.execution.requestHash,
            target,
            status: "firestore_committed",
            resultStatus: status,
            committedAt,
            authCleanupComplete: false,
          });
          return {
            status,
            committedAt,
            patchedSubscriptionIds: patches.subscriptions.flatMap((patch, index) =>
              Object.keys(patch).length ? [boundState.subscriptions[index].id] : []),
            employerUpdatedAtWritten: Object.prototype.hasOwnProperty.call(
              patches.employer,
              "updatedAt",
            ),
            organizationUpdatedAtWritten: Object.prototype.hasOwnProperty.call(
              patches.organization,
              "updatedAt",
            ),
          };
        });

        const [user, member, employer, organization, ...subscriptions] = await Promise.all([
          port.getDocument("users", boundState.user.id), port.getDocument("members", boundState.member.id),
          port.getDocument("employers", boundState.employer.id), port.getDocument("organizations", boundState.organization.id),
          ...boundState.subscriptions.map(({ id }) => port.getDocument("subscriptions", id)),
        ]);
        const ignoreEmployerUpdatedAt = !transactionResult.employerUpdatedAtWritten;
        const ignoreOrganizationUpdatedAt = !transactionResult.organizationUpdatedAtWritten;
        const patchedSubscriptions = new Set(transactionResult.patchedSubscriptionIds);
        if (!documentMatches(user, plan.userPatch) || !documentMatches(member, plan.memberPatch) ||
            !documentMatches(employer, plan.employerPatch, { ignoreUpdatedAt: ignoreEmployerUpdatedAt }) ||
            !documentMatches(organization, plan.organizationPatch, { ignoreUpdatedAt: ignoreOrganizationUpdatedAt }) ||
            subscriptions.some((subscription, index) => documentMatches(
              subscription,
              patchedSubscriptions.has(boundState.subscriptions[index].id)
                ? plan.subscriptionPatch
                : { status: "expired" },
            ) === false)) {
          throw new Error("Post-write verification failed");
        }
        return {
          ...transactionResult,
          userId: boundState.user.id,
          verified: desiredProjection(subscriptions.length),
        };
      },
      cleanupAuthClaims: options.cleanupAuthClaims ?? (async () => {}),
      async markAuthCleanupComplete(result) {
        await port.runTransaction(async (transaction) => {
          const [record, audit] = await Promise.all([
            transaction.getDocument(IDEMPOTENCY_COLLECTION, idempotencyId),
            transaction.getDocument(AUDIT_COLLECTION, idempotencyId),
          ]);
          if (!record || record.data.requestHash !== input.execution.requestHash || record.data.keyId !== input.execution.keyId) {
            throw new HermesFirestoreConflictError("Idempotent request record is unavailable");
          }
          if (record.data.authCleanupComplete === true) return;
          transaction.updateDocument(IDEMPOTENCY_COLLECTION, idempotencyId, {
            status: "completed",
            authCleanupComplete: true,
            authCleanupCompletedAt: now().toISOString(),
          });
          if (audit) transaction.updateDocument(AUDIT_COLLECTION, idempotencyId, { authCleanupComplete: true });
          void result;
        });
      },
    };
  }

  return { createServiceDeps, getIdempotentApply };
}
