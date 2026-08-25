import {
  createCipheriv,
  createDecipheriv,
  hkdfSync,
  randomBytes,
} from "node:crypto";
import { isDeepStrictEqual } from "node:util";

export const JOB_APPROVAL_CONFIRMATION = "APPROVE IOPPS JOB";

export interface HermesJobApprovalCommand {
  jobId: string;
  featured?: false;
}

export interface HermesJobApprovalDocument {
  id: string;
  collection: "jobs" | "posts";
  schema: "employer-job-v1" | "legacy-job-post-v1";
  version: string;
  data: Record<string, unknown>;
}

export interface HermesJobApprovalProjection {
  title: string;
  organization: string;
  status: string;
  featuredIntent: "standard" | "featured";
  entitlementDecision: "not_required" | "included_slot" | "featured_post_credit" | "existing_entitlement";
}

export interface HermesFeaturedJobIdentity {
  collection: "jobs" | "posts";
  documentId: string;
  version: string;
}

export interface HermesFeaturedEntitlementBoundState {
  employerId: string;
  employerVersion: string;
  plan: string | null;
  subscriptionTier: string | null;
  featuredPostCredits: number;
  existingFeaturedCreditConsumed: boolean;
  activeFeaturedJobsDigest: string;
  activeFeaturedJobsCount: number;
  decision: "included_slot" | "featured_post_credit" | "existing_entitlement";
  consumeCredit: boolean;
}

export interface HermesJobApprovalBoundState {
  documentId: string;
  collection: HermesJobApprovalDocument["collection"];
  schema: HermesJobApprovalDocument["schema"];
  version: string;
  desiredState: {
    status: "active";
    active: true;
    setPostedAt: boolean;
    featured: boolean;
  };
  featuredEntitlement: HermesFeaturedEntitlementBoundState | null;
}

export interface HermesJobApprovalServiceDeps {
  reviewSecret: string;
  now?: () => Date;
  findJobCandidates: (jobId: string) => Promise<HermesJobApprovalDocument[]>;
  resolveFeaturedEntitlement?: (document: HermesJobApprovalDocument) => Promise<
    | { ok: true; state: HermesFeaturedEntitlementBoundState }
    | { ok: false; status: number; error: string }
  >;
  commit: (input: {
    boundState: HermesJobApprovalBoundState;
    current: HermesJobApprovalDocument;
  }) => Promise<{
    status: "applied" | "verified_noop";
    committedAt?: string;
    verified: HermesJobApprovalProjection;
  }>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function normalizeHermesJobReviewCommand(value: unknown):
  | { ok: true; command: HermesJobApprovalCommand }
  | { ok: false; error: string } {
  if (!isRecord(value) || !("jobId" in value) ||
      Object.keys(value).some((key) => key !== "jobId" && key !== "featured") ||
      (Object.keys(value).length !== 1 && Object.keys(value).length !== 2) ||
      ("featured" in value && value.featured !== false)) {
    return { ok: false, error: "Review request must contain jobId and optional featured false" };
  }
  const jobId = typeof value.jobId === "string" ? value.jobId.trim() : "";
  if (!jobId || jobId.length > 512 || jobId.includes("/") || /[\u0000-\u001f\u007f]/.test(jobId)) {
    return { ok: false, error: "A valid exact jobId is required" };
  }
  return { ok: true, command: { jobId, ...(value.featured === false ? { featured: false as const } : {}) } };
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

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
}

function text(data: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const value = data[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function projection(
  document: HermesJobApprovalDocument,
  entitlement: HermesFeaturedEntitlementBoundState | null,
  status?: string,
  featuredOverride?: boolean,
): HermesJobApprovalProjection {
  const featured = featuredOverride ?? Boolean(document.data.featured);
  return {
    title: text(document.data, "title"),
    organization: text(document.data, "orgName", "organizationName", "companyName", "orgShort"),
    status: status ?? text(document.data, "status"),
    featuredIntent: featured ? "featured" : "standard",
    entitlementDecision: featured
      ? entitlement?.decision ?? "existing_entitlement"
      : "not_required",
  };
}

function boundState(
  document: HermesJobApprovalDocument,
  featuredEntitlement: HermesFeaturedEntitlementBoundState | null,
  desiredFeatured = Boolean(document.data.featured),
): HermesJobApprovalBoundState {
  return {
    documentId: document.id,
    collection: document.collection,
    schema: document.schema,
    version: document.version,
    desiredState: {
      status: "active",
      active: true,
      setPostedAt: document.data.postedAt == null,
      featured: desiredFeatured,
    },
    featuredEntitlement,
  };
}

function reviewPayload(command: HermesJobApprovalCommand, state: HermesJobApprovalBoundState) {
  return { protocol: "iopps-hermes-job-approval-review-v2", command, boundState: state };
}

const REVIEW_TOKEN_VERSION = "v1";
const REVIEW_TOKEN_AAD = Buffer.from("iopps-hermes-job-approval-review-token-v1", "utf8");
const REVIEW_TOKEN_NONCE_BYTES = 12;
const REVIEW_TOKEN_TAG_BYTES = 16;
const MAX_REVIEW_PAYLOAD_BYTES = 8_192;
const MAX_REVIEW_TOKEN_LENGTH = 12_000;
const MAX_BOUND_STRING_LENGTH = 1_500;
const MAX_ACTIVE_FEATURED_IDENTITIES = 1_000;

function reviewEncryptionKey(secret: string): Buffer {
  if (Buffer.byteLength(secret, "utf8") < 32) throw new Error("Hermes review secret must be at least 32 bytes");
  return Buffer.from(hkdfSync(
    "sha256",
    Buffer.from(secret, "utf8"),
    Buffer.from("iopps-hermes-review-key-derivation-v1", "utf8"),
    Buffer.from("job-approval-review-token-aes-256-gcm-v1", "utf8"),
    32,
  ));
}

function createReviewToken(
  command: HermesJobApprovalCommand,
  state: HermesJobApprovalBoundState,
  secret: string,
): string {
  const payloadText = canonicalize(reviewPayload(command, state));
  const payloadBytes = Buffer.from(payloadText, "utf8");
  if (payloadBytes.length > MAX_REVIEW_PAYLOAD_BYTES) throw new Error("Hermes review payload is too large");
  const nonce = randomBytes(REVIEW_TOKEN_NONCE_BYTES);
  const cipher = createCipheriv("aes-256-gcm", reviewEncryptionKey(secret), nonce);
  cipher.setAAD(REVIEW_TOKEN_AAD);
  const ciphertext = Buffer.concat([cipher.update(payloadBytes), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    REVIEW_TOKEN_VERSION,
    nonce.toString("base64url"),
    ciphertext.toString("base64url"),
    tag.toString("base64url"),
  ].join(".");
}

function parseReviewToken(token: string, secret: string): {
  command: HermesJobApprovalCommand;
  boundState: HermesJobApprovalBoundState;
} | null {
  try {
    if (!token || token.length > MAX_REVIEW_TOKEN_LENGTH) return null;
    const segments = token.split(".");
    if (segments.length !== 4) return null;
    const [version, encodedNonce, encodedCiphertext, encodedTag] = segments;
    if (version !== REVIEW_TOKEN_VERSION ||
        !/^[A-Za-z0-9_-]{16}$/.test(encodedNonce) ||
        !encodedCiphertext || encodedCiphertext.length > Math.ceil(MAX_REVIEW_PAYLOAD_BYTES * 4 / 3) ||
        !/^[A-Za-z0-9_-]+$/.test(encodedCiphertext) ||
        !/^[A-Za-z0-9_-]{22}$/.test(encodedTag)) return null;
    const nonce = Buffer.from(encodedNonce, "base64url");
    const ciphertext = Buffer.from(encodedCiphertext, "base64url");
    const tag = Buffer.from(encodedTag, "base64url");
    if (nonce.length !== REVIEW_TOKEN_NONCE_BYTES || nonce.toString("base64url") !== encodedNonce ||
        ciphertext.length === 0 || ciphertext.length > MAX_REVIEW_PAYLOAD_BYTES ||
        ciphertext.toString("base64url") !== encodedCiphertext ||
        tag.length !== REVIEW_TOKEN_TAG_BYTES || tag.toString("base64url") !== encodedTag) return null;
    const decipher = createDecipheriv("aes-256-gcm", reviewEncryptionKey(secret), nonce);
    decipher.setAAD(REVIEW_TOKEN_AAD);
    decipher.setAuthTag(tag);
    const payloadBytes = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    if (payloadBytes.length === 0 || payloadBytes.length > MAX_REVIEW_PAYLOAD_BYTES) return null;
    const payloadText = payloadBytes.toString("utf8");
    if (!Buffer.from(payloadText, "utf8").equals(payloadBytes)) return null;
    const payload = JSON.parse(payloadText) as Record<string, unknown>;
    if (!isRecord(payload) || canonicalize(payload) !== payloadText ||
        !hasExactKeys(payload, ["protocol", "command", "boundState"]) ||
        payload.protocol !== "iopps-hermes-job-approval-review-v2" || !isRecord(payload.boundState)) return null;
    const normalized = normalizeHermesJobReviewCommand(payload.command);
    if (!normalized.ok) return null;
    const state = payload.boundState;
    const desired = state.desiredState;
    if (!hasExactKeys(state, ["documentId", "collection", "schema", "version", "desiredState", "featuredEntitlement"]) ||
        typeof state.documentId !== "string" || !state.documentId || state.documentId.length > MAX_BOUND_STRING_LENGTH ||
        (state.collection !== "jobs" && state.collection !== "posts") ||
        (state.schema !== "employer-job-v1" && state.schema !== "legacy-job-post-v1") ||
        typeof state.version !== "string" || !state.version || state.version.length > MAX_BOUND_STRING_LENGTH ||
        !isRecord(desired) ||
        !hasExactKeys(desired, ["status", "active", "setPostedAt", "featured"]) ||
        desired.status !== "active" || desired.active !== true || typeof desired.setPostedAt !== "boolean" ||
        typeof desired.featured !== "boolean" ||
        !isValidFeaturedEntitlement(state.featuredEntitlement)) {
      return null;
    }
    return { command: normalized.command, boundState: state as unknown as HermesJobApprovalBoundState };
  } catch {
    return null;
  }
}

function isValidFeaturedEntitlement(value: unknown): value is HermesFeaturedEntitlementBoundState | null {
  if (value === null) return true;
  if (!isRecord(value) ||
      !hasExactKeys(value, [
        "employerId", "employerVersion", "plan", "subscriptionTier", "featuredPostCredits",
        "existingFeaturedCreditConsumed", "activeFeaturedJobsDigest", "activeFeaturedJobsCount",
        "decision", "consumeCredit",
      ]) ||
      typeof value.employerId !== "string" || !value.employerId || value.employerId.length > MAX_BOUND_STRING_LENGTH ||
      typeof value.employerVersion !== "string" || !value.employerVersion ||
      value.employerVersion.length > MAX_BOUND_STRING_LENGTH ||
      (value.plan !== null && (typeof value.plan !== "string" || value.plan.length > MAX_BOUND_STRING_LENGTH)) ||
      (value.subscriptionTier !== null &&
        (typeof value.subscriptionTier !== "string" || value.subscriptionTier.length > MAX_BOUND_STRING_LENGTH)) ||
      typeof value.featuredPostCredits !== "number" || !Number.isFinite(value.featuredPostCredits) ||
      value.featuredPostCredits < 0 || typeof value.existingFeaturedCreditConsumed !== "boolean" ||
      typeof value.activeFeaturedJobsDigest !== "string" ||
      !/^[a-f0-9]{64}$/.test(value.activeFeaturedJobsDigest) ||
      typeof value.activeFeaturedJobsCount !== "number" ||
      !Number.isInteger(value.activeFeaturedJobsCount) || value.activeFeaturedJobsCount < 0 ||
      value.activeFeaturedJobsCount > MAX_ACTIVE_FEATURED_IDENTITIES ||
      typeof value.consumeCredit !== "boolean" ||
      (value.decision !== "included_slot" && value.decision !== "featured_post_credit" &&
        value.decision !== "existing_entitlement")) return false;
  if (value.consumeCredit !== (value.decision === "featured_post_credit")) return false;
  return true;
}

function isPublicActive(document: HermesJobApprovalDocument): boolean {
  return document.data.status === "active" && document.data.active === true;
}

function isDraft(document: HermesJobApprovalDocument): boolean {
  return document.data.status === "draft" && document.data.active !== true;
}

async function resolveJob(
  command: HermesJobApprovalCommand,
  deps: HermesJobApprovalServiceDeps,
): Promise<{ document: HermesJobApprovalDocument } | { error: { ok: false; status: number; error: string } }> {
  const candidates = await deps.findJobCandidates(command.jobId);
  if (candidates.length === 0) {
    return { error: { ok: false, status: 404, error: "Job target was not found" } };
  }
  if (candidates.length !== 1) {
    return { error: { ok: false, status: 409, error: "Job target was ambiguous" } };
  }
  const document = candidates[0];
  const expectedSchema = document.collection === "jobs"
    ? "employer-job-v1"
    : document.collection === "posts"
      ? "legacy-job-post-v1"
      : "";
  if (document.id !== command.jobId || document.schema !== expectedSchema) {
    return { error: { ok: false, status: 409, error: "Job target identity did not match the exact request" } };
  }
  if ((document.collection === "posts" && document.data.type !== "job") ||
      (!isDraft(document) && !isPublicActive(document))) {
    return { error: { ok: false, status: 409, error: "Job target is not eligible for approval" } };
  }
  if (isPublicActive(document) && document.data.postedAt == null) {
    return {
      error: {
        ok: false,
        status: 409,
        error: "Active job is missing its publication timestamp",
      },
    };
  }
  return { document };
}

async function resolveBoundState(
  document: HermesJobApprovalDocument,
  command: HermesJobApprovalCommand,
  deps: HermesJobApprovalServiceDeps,
): Promise<
  | { ok: true; state: HermesJobApprovalBoundState }
  | { ok: false; status: number; error: string }
> {
  if (command.featured === false) {
    return { ok: true, state: boundState(document, null, false) };
  }
  if (!isDraft(document) || !Boolean(document.data.featured)) {
    return { ok: true, state: boundState(document, null) };
  }
  if (!deps.resolveFeaturedEntitlement) {
    return { ok: false, status: 409, error: "Featured entitlement state could not be resolved" };
  }
  const resolved = await deps.resolveFeaturedEntitlement(document);
  if (!resolved.ok) return resolved;
  return { ok: true, state: boundState(document, resolved.state) };
}

export async function reviewHermesJobApproval(
  value: unknown,
  deps: HermesJobApprovalServiceDeps,
) {
  const normalized = normalizeHermesJobReviewCommand(value);
  if (!normalized.ok) return { ok: false as const, status: 400, error: normalized.error };
  const resolved = await resolveJob(normalized.command, deps);
  if ("error" in resolved) return resolved.error;
  const bound = await resolveBoundState(resolved.document, normalized.command, deps);
  if (!bound.ok) return bound;
  const current = projection(resolved.document, bound.state.featuredEntitlement);
  const desired = projection(
    resolved.document,
    bound.state.featuredEntitlement,
    "active",
    bound.state.desiredState.featured,
  );
  return {
    ok: true as const,
    reviewToken: createReviewToken(normalized.command, bound.state, deps.reviewSecret),
    current,
    desired,
  };
}

export async function applyHermesJobApproval(
  value: unknown,
  deps: HermesJobApprovalServiceDeps,
) {
  if (!isRecord(value) || Object.keys(value).length !== 2 ||
      typeof value.reviewToken !== "string" || value.confirmation !== JOB_APPROVAL_CONFIRMATION) {
    return { ok: false as const, status: 400, error: "Apply requires the review token and exact confirmation" };
  }
  const reviewed = parseReviewToken(value.reviewToken, deps.reviewSecret);
  if (!reviewed) return { ok: false as const, status: 409, error: "Review token is invalid or stale" };
  const resolved = await resolveJob(reviewed.command, deps);
  if ("error" in resolved) {
    return { ok: false as const, status: 409, error: "Review token is invalid or stale" };
  }
  const currentState = await resolveBoundState(resolved.document, reviewed.command, deps);
  if (!currentState.ok || !isDeepStrictEqual(currentState.state, reviewed.boundState)) {
    return { ok: false as const, status: 409, error: "Review token is invalid or stale" };
  }
  const result = await deps.commit({ boundState: reviewed.boundState, current: resolved.document });
  return {
    ok: true as const,
    status: result.status,
    ...(result.committedAt ? { committedAt: result.committedAt } : {}),
    verified: result.verified,
  };
}
