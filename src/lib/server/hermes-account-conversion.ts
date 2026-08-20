import { createHmac, timingSafeEqual } from "node:crypto";
import { isDeepStrictEqual } from "node:util";

export const ACCOUNT_CONVERSION_CONFIRMATION = "CONVERT IOPPS ACCOUNT TO INDIVIDUAL";

export interface HermesAccountConversionCommand {
  email: string;
}

export interface HermesAccountConversionDocument {
  id: string;
  version: string;
  data: Record<string, unknown>;
}

export interface HermesAccountConversionBoundState {
  user: { id: string; version: string };
  member: { id: string; version: string };
  employer: { id: string; version: string };
  organization: { id: string; version: string };
  subscriptions: Array<{ id: string; version: string }>;
}

export interface HermesAccountConversionVerifiedProjection {
  accountRole: "community";
  memberRole: "community";
  employerDisabled: true;
  organizationDisabled: true;
  subscriptionStatus: "expired";
  complimentarySubscriptionsExpired: number;
}

export interface HermesAccountConversionCommitResult {
  status: "applied" | "verified_noop";
  committedAt?: string;
  userId: string;
  verified: HermesAccountConversionVerifiedProjection;
}

export interface HermesAccountConversionServiceDeps {
  reviewSecret: string;
  now?: () => Date;
  findUsersByEmail: (email: string) => Promise<HermesAccountConversionDocument[]>;
  getMember: (userId: string) => Promise<HermesAccountConversionDocument | null>;
  findLinkedEmployers: (
    user: HermesAccountConversionDocument,
  ) => Promise<HermesAccountConversionDocument[]>;
  findLinkedOrganizations: (
    user: HermesAccountConversionDocument,
    employer: HermesAccountConversionDocument,
  ) => Promise<HermesAccountConversionDocument[]>;
  findLinkedSubscriptions: (
    employer: HermesAccountConversionDocument,
    organization: HermesAccountConversionDocument,
  ) => Promise<HermesAccountConversionDocument[]>;
  commit: (input: {
    command: HermesAccountConversionCommand;
    boundState: HermesAccountConversionBoundState;
    plan: ReturnType<typeof buildHermesAccountConversionPlan>;
  }) => Promise<HermesAccountConversionCommitResult>;
  cleanupAuthClaims: (userId: string) => Promise<void>;
  markAuthCleanupComplete: (result: HermesAccountConversionCommitResult) => Promise<void>;
}

type ServiceError = { ok: false; status: number; error: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function text(data: Record<string, unknown>, key: string): string {
  const value = data[key];
  return typeof value === "string" ? value.trim() : "";
}

function canonicalize(value: unknown): string {
  if (value === null || typeof value === "boolean" || typeof value === "number" || typeof value === "string") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;
  if (isRecord(value)) {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalize(value[key])}`).join(",")}}`;
  }
  throw new TypeError("Unsupported canonical value");
}

export function normalizeHermesAccountConversionCommand(value: unknown):
  | { ok: true; command: HermesAccountConversionCommand }
  | { ok: false; error: string } {
  if (!isRecord(value) || Object.keys(value).length !== 1 || !("email" in value)) {
    return { ok: false, error: "Review request must contain exactly email" };
  }
  const email = typeof value.email === "string" ? value.email.trim().toLowerCase() : "";
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "A valid exact email is required" };
  }
  return { ok: true, command: { email } };
}

function isComplimentarySubscription(document: HermesAccountConversionDocument): boolean {
  const data = document.data;
  const zeroAmount = [data.amount, data.totalAmount, data.amountPaid]
    .filter((value) => value !== undefined)
    .every((value) => value === 0);
  const explicitHermesGrant =
    text(data, "bonusAccessReason") === "Complimentary Hermes administrator grant" ||
    text(data, "paymentId") === "admin-grant-tier2";
  const plan = text(data, "plan").toLowerCase();
  const complimentaryManualTier = data.manualOverride === true && (plan === "tier2" || plan === "premium");
  return zeroAmount && (explicitHermesGrant || complimentaryManualTier);
}

function isActiveSubscription(document: HermesAccountConversionDocument): boolean {
  return text(document.data, "status").toLowerCase() === "active";
}

function deduplicate(documents: HermesAccountConversionDocument[]): HermesAccountConversionDocument[] {
  return [...new Map(documents.map((document) => [document.id, document])).values()]
    .sort((a, b) => a.id.localeCompare(b.id));
}

function boundStateFor(input: {
  user: HermesAccountConversionDocument;
  member: HermesAccountConversionDocument;
  employer: HermesAccountConversionDocument;
  organization: HermesAccountConversionDocument;
  subscriptions: HermesAccountConversionDocument[];
}): HermesAccountConversionBoundState {
  const bind = (document: HermesAccountConversionDocument) => ({ id: document.id, version: document.version });
  return {
    user: bind(input.user),
    member: bind(input.member),
    employer: bind(input.employer),
    organization: bind(input.organization),
    subscriptions: input.subscriptions.map(bind),
  };
}

type Resolved = {
  command: HermesAccountConversionCommand;
  user: HermesAccountConversionDocument;
  member: HermesAccountConversionDocument;
  employer: HermesAccountConversionDocument;
  organization: HermesAccountConversionDocument;
  subscriptions: HermesAccountConversionDocument[];
  boundState: HermesAccountConversionBoundState;
};

async function resolveState(
  command: HermesAccountConversionCommand,
  deps: HermesAccountConversionServiceDeps,
): Promise<{ resolved: Resolved } | { error: ServiceError }> {
  const users = await deps.findUsersByEmail(command.email);
  if (users.length !== 1) return { error: { ok: false, status: 409, error: "Exact user lookup was not unique" } };
  const user = users[0];
  const member = await deps.getMember(user.id);
  if (!member || member.id !== user.id) {
    return { error: { ok: false, status: 409, error: "Same-ID member record was not found" } };
  }
  const employers = deduplicate(await deps.findLinkedEmployers(user));
  if (employers.length !== 1) {
    return { error: { ok: false, status: 409, error: "Linked employer lookup was not unique" } };
  }
  const employer = employers[0];
  const organizations = deduplicate(await deps.findLinkedOrganizations(user, employer));
  if (organizations.length !== 1) {
    return { error: { ok: false, status: 409, error: "Linked organization lookup was not unique" } };
  }
  const organization = organizations[0];
  const subscriptions = deduplicate(await deps.findLinkedSubscriptions(employer, organization))
    .filter(isComplimentarySubscription);
  const resolved = {
    command,
    user,
    member,
    employer,
    organization,
    subscriptions,
    boundState: boundStateFor({ user, member, employer, organization, subscriptions }),
  };
  return { resolved };
}

function reviewPayload(command: HermesAccountConversionCommand, boundState: HermesAccountConversionBoundState) {
  return {
    protocol: "iopps-hermes-account-conversion-review-v1",
    command,
    boundState,
  };
}

function reviewMac(payloadText: string, secret: string): Buffer {
  if (Buffer.byteLength(secret, "utf8") < 32) throw new Error("Hermes review secret must be at least 32 bytes");
  return createHmac("sha256", secret).update(payloadText, "utf8").digest();
}

function createReviewToken(command: HermesAccountConversionCommand, boundState: HermesAccountConversionBoundState, secret: string) {
  const payloadText = canonicalize(reviewPayload(command, boundState));
  return `${Buffer.from(payloadText, "utf8").toString("base64url")}.${reviewMac(payloadText, secret).toString("base64url")}`;
}

function parseReviewToken(token: string, secret: string): {
  command: HermesAccountConversionCommand;
  boundState: HermesAccountConversionBoundState;
} | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 2) return null;
    const encoded = parts[0] ?? "";
    const encodedMac = parts[1] ?? "";
    if (!encoded || !/^[A-Za-z0-9_-]+$/.test(encoded) || !/^[A-Za-z0-9_-]{43}$/.test(encodedMac)) return null;
    const payloadText = Buffer.from(encoded, "base64url").toString("utf8");
    const supplied = Buffer.from(encodedMac, "base64url");
    const expected = reviewMac(payloadText, secret);
    if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return null;
    const payload = JSON.parse(payloadText) as Record<string, unknown>;
    if (payload.protocol !== "iopps-hermes-account-conversion-review-v1") return null;
    const normalized = normalizeHermesAccountConversionCommand(payload.command);
    if (!normalized.ok || !isRecord(payload.boundState)) return null;
    return {
      command: normalized.command,
      boundState: payload.boundState as unknown as HermesAccountConversionBoundState,
    };
  } catch {
    return null;
  }
}

function projections(resolved: Resolved) {
  const activeSubscriptions = resolved.subscriptions.filter(isActiveSubscription).length;
  return {
    current: {
      email: resolved.command.email,
      accountRole: text(resolved.user.data, "role"),
      memberRole: text(resolved.member.data, "role"),
      employerStatus: text(resolved.employer.data, "status"),
      organizationStatus: text(resolved.organization.data, "status"),
      subscriptionTier: text(resolved.employer.data, "subscriptionTier") || text(resolved.employer.data, "plan"),
      complimentarySubscriptionsActive: activeSubscriptions,
    },
    desired: {
      email: resolved.command.email,
      accountRole: "community" as const,
      memberRole: "community" as const,
      employerStatus: "disabled" as const,
      organizationStatus: "disabled" as const,
      subscriptionTier: "free" as const,
      complimentarySubscriptionsActive: 0,
    },
  };
}

export function buildHermesAccountConversionPlan(now: Date) {
  const timestamp = now.toISOString();
  const disabledFreePatch = {
    disabled: true,
    status: "disabled",
    isPublished: false,
    publicationStatus: "SUSPENDED",
    publicVisibility: "hidden",
    directoryVisible: false,
    isDirectoryVisible: false,
    plan: "free",
    subscriptionTier: "free",
    subscriptionStatus: "expired",
    subscription: { tier: "free", status: "expired" },
    updatedAt: timestamp,
  };
  return {
    userPatch: { role: "community", employerId: null, orgId: null, orgRole: null },
    memberPatch: { role: "community", orgId: null, orgRole: null },
    employerPatch: { ...disabledFreePatch },
    organizationPatch: { ...disabledFreePatch, tier: "free" },
    subscriptionPatch: { status: "expired", expiredAt: timestamp, updatedAt: timestamp },
  };
}

export async function reviewHermesAccountConversion(
  value: unknown,
  deps: HermesAccountConversionServiceDeps,
) {
  const normalized = normalizeHermesAccountConversionCommand(value);
  if (!normalized.ok) return { ok: false as const, status: 400, error: normalized.error };
  const state = await resolveState(normalized.command, deps);
  if ("error" in state) return state.error;
  const { current, desired } = projections(state.resolved);
  return {
    ok: true as const,
    reviewToken: createReviewToken(normalized.command, state.resolved.boundState, deps.reviewSecret),
    current,
    desired,
  };
}

export async function applyHermesAccountConversion(
  value: unknown,
  deps: HermesAccountConversionServiceDeps,
) {
  if (!isRecord(value) || Object.keys(value).length !== 2 || typeof value.reviewToken !== "string" ||
      value.confirmation !== ACCOUNT_CONVERSION_CONFIRMATION) {
    return { ok: false as const, status: 400, error: "Apply requires the review token and exact confirmation" };
  }
  const reviewed = parseReviewToken(value.reviewToken, deps.reviewSecret);
  if (!reviewed) return { ok: false as const, status: 409, error: "Review token is invalid or stale" };
  const state = await resolveState(reviewed.command, deps);
  if ("error" in state || !isDeepStrictEqual(state.resolved.boundState, reviewed.boundState)) {
    return { ok: false as const, status: 409, error: "Review token is invalid or stale" };
  }
  const result = await deps.commit({
    command: reviewed.command,
    boundState: reviewed.boundState,
    plan: buildHermesAccountConversionPlan((deps.now ?? (() => new Date()))()),
  });
  await deps.cleanupAuthClaims(result.userId);
  await deps.markAuthCleanupComplete(result);
  return {
    ok: true as const,
    status: result.status,
    ...(result.committedAt ? { committedAt: result.committedAt } : {}),
    verified: result.verified,
  };
}
