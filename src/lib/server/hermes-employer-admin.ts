import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { isDeepStrictEqual } from "node:util";

interface HermesEmployerCommandIntent {
  organizationName: string;
  role: "employer";
  approved: true;
  verified: true;
  subscriptionTier: "premium";
  subscriptionStart: string;
  subscriptionEnd: string;
  amount: 0;
  gstAmount: 0;
  totalAmount: 0;
}

export type HermesEmployerCommand = HermesEmployerCommandIntent & (
  | { email: string; jobId?: never }
  | { jobId: string; email?: never }
);

export interface HermesEmployerJobTarget {
  documentId: string;
  collection: "jobs" | "posts";
  schema: "employer-job-v1" | "legacy-job-post-v1";
  version: string;
  authorId: string;
  employerId: string;
  organizationId: string;
}

export interface HermesEmployerBoundState {
  userId: string;
  userVersion: string;
  employerId: string;
  employerVersion: string;
  organizationId: string;
  organizationVersion: string;
  subscriptionId: string;
  subscriptionVersion: string;
  jobTarget?: HermesEmployerJobTarget;
}

type NormalizeResult =
  | { ok: true; command: HermesEmployerCommand }
  | { ok: false; error: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isStrictDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function normalizeHermesEmployerCommand(value: unknown): NormalizeResult {
  if (!isRecord(value)) return { ok: false, error: "Command must be an object" };
  const allowed = new Set(["email", "jobId", "organizationName", "subscriptionStart", "subscriptionEnd"]);
  const keys = Object.keys(value);
  if (keys.some((key) => !allowed.has(key))) {
    return { ok: false, error: "Command contains unsupported fields" };
  }

  const email = typeof value.email === "string" ? value.email.trim().toLowerCase() : "";
  const jobId = typeof value.jobId === "string" ? value.jobId.trim() : "";
  const organizationName = typeof value.organizationName === "string" ? value.organizationName.trim() : "";
  const subscriptionStart = typeof value.subscriptionStart === "string" ? value.subscriptionStart.trim() : "";
  const subscriptionEnd = typeof value.subscriptionEnd === "string" ? value.subscriptionEnd.trim() : "";

  if (keys.length !== 4 || Boolean(email) === Boolean(jobId)) {
    return { ok: false, error: "Exactly one exact email or jobId target is required" };
  }
  if (email && (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
    return { ok: false, error: "A valid exact email is required" };
  }
  if (jobId && (jobId.length > 512 || jobId.includes("/") || /[\u0000-\u001f\u007f]/.test(jobId))) {
    return { ok: false, error: "A valid exact jobId is required" };
  }
  if (
    organizationName.length < 2 ||
    organizationName.length > 160 ||
    /[\u0000-\u001f\u007f]/.test(organizationName)
  ) {
    return { ok: false, error: "A valid organization name is required" };
  }
  if (!isStrictDate(subscriptionStart) || !isStrictDate(subscriptionEnd)) {
    return { ok: false, error: "Subscription dates must be valid YYYY-MM-DD dates" };
  }
  if (subscriptionEnd <= subscriptionStart) {
    return { ok: false, error: "Subscription end must be after its start" };
  }

  return {
    ok: true,
    command: {
      ...(email ? { email } : { jobId }),
      organizationName,
      role: "employer",
      approved: true,
      verified: true,
      subscriptionTier: "premium",
      subscriptionStart,
      subscriptionEnd,
      amount: 0,
      gstAmount: 0,
      totalAmount: 0,
    },
  };
}

function canonicalize(value: unknown): string {
  if (value === null || typeof value === "boolean" || typeof value === "number" || typeof value === "string") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalize).join(",")}]`;
  }
  if (isRecord(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalize(value[key])}`)
      .join(",")}}`;
  }
  throw new TypeError("Unsupported canonical value");
}

function reviewPayload(command: HermesEmployerCommand, boundState: HermesEmployerBoundState): string {
  return canonicalize({ protocol: "iopps-hermes-employer-review-v1", command, boundState });
}

function reviewMac(input: {
  command: HermesEmployerCommand;
  boundState: HermesEmployerBoundState;
  secret: string;
}): Buffer {
  if (Buffer.byteLength(input.secret, "utf8") < 32) {
    throw new Error("Hermes review secret must be at least 32 bytes");
  }
  return createHmac("sha256", input.secret)
    .update(reviewPayload(input.command, input.boundState), "utf8")
    .digest();
}

export function createHermesEmployerReviewToken(input: {
  command: HermesEmployerCommand;
  boundState: HermesEmployerBoundState;
  secret: string;
}): string {
  return reviewMac(input).toString("base64url");
}

export function verifyHermesEmployerReviewToken(input: {
  token: string;
  command: HermesEmployerCommand;
  boundState: HermesEmployerBoundState;
  secret: string;
}): boolean {
  try {
    if (!/^[A-Za-z0-9_-]{43}$/.test(input.token)) return false;
    const provided = Buffer.from(input.token, "base64url");
    const expected = reviewMac(input);
    return provided.length === expected.length && timingSafeEqual(provided, expected);
  } catch {
    return false;
  }
}

export function buildHermesEmployerMutationPlan(
  command: HermesEmployerCommand,
  options: {
    orgId: string;
    organizationId?: string;
    now?: Date;
    createdAtToken?: unknown;
    updatedAtToken?: unknown;
  },
) {
  const now = options.now ?? new Date();
  const updatedAt = now.toISOString();
  const subscriptionCreatedAt = Object.prototype.hasOwnProperty.call(options, "createdAtToken")
    ? options.createdAtToken
    : now;
  const subscriptionStart = new Date(`${command.subscriptionStart}T00:00:00.000Z`);
  const subscriptionEnd = new Date(`${command.subscriptionEnd}T00:00:00.000Z`);
  const subscriptionStartIso = subscriptionStart.toISOString();
  const subscriptionEndIso = subscriptionEnd.toISOString();
  const bonusAccessReason = "Complimentary Hermes administrator grant";
  const subscription = {
    tier: "premium",
    status: "active",
    billingStartAt: subscriptionStartIso,
    subscriptionEnd: subscriptionEndIso,
    expiresAt: subscriptionEndIso,
    bonusAccessGrantedAt: updatedAt,
    bonusAccessReason,
    paymentId: "admin-grant-tier2",
    amountPaid: 0,
    gstAmount: 0,
    totalAmount: 0,
  };

  const identityPatch = {
    organizationName: command.organizationName,
    name: command.organizationName,
    companyName: command.organizationName,
  };

  return {
    userPatch: {
      role: command.role,
      employerId: options.orgId,
      orgId: options.organizationId ?? options.orgId,
      orgRole: "owner",
    },
    employerPatch: {
      plan: "premium",
      subscriptionTier: "premium",
      subscriptionStatus: "active",
      subscriptionStart: subscriptionStartIso,
      subscriptionEnd: subscriptionEndIso,
      billingStartAt: subscriptionStartIso,
      bonusAccessGrantedAt: updatedAt,
      bonusAccessReason,
      updatedAt,
      subscription,
      ...identityPatch,
      status: "approved",
      approved: true,
      approvedAt: updatedAt,
      verified: true,
      verificationStatus: "verified",
      disabled: false,
    },
    organizationPatch: {
      plan: "premium",
      tier: "premium",
      subscriptionTier: "premium",
      subscriptionStatus: "active",
      employerId: options.orgId,
      subscriptionStart: subscriptionStartIso,
      subscriptionEnd: subscriptionEndIso,
      billingStartAt: subscriptionStartIso,
      bonusAccessGrantedAt: updatedAt,
      bonusAccessReason,
      updatedAt,
      subscription,
      ...identityPatch,
      status: "approved",
      approved: true,
      approvedAt: updatedAt,
      verified: true,
      verificationStatus: "verified",
      disabled: false,
    },
    subscriptionRecordPatch: {
      employerId: options.orgId,
      orgId: options.orgId,
      organizationId: options.organizationId ?? options.orgId,
      plan: "tier2",
      status: "active",
      amount: 0,
      gstAmount: 0,
      totalAmount: 0,
      billingCycle: "annual",
      createdAt: subscriptionCreatedAt,
      startsAt: subscriptionStart,
      expiresAt: subscriptionEnd,
      manualOverride: true,
      bonusAccessGrantedAt: now,
      bonusAccessReason,
      updatedAt: options.updatedAtToken ?? updatedAt,
    },
    actionHistoryDetails: {
      planId: "tier2",
      tier: "premium",
      subscriptionStart: subscriptionStartIso,
      subscriptionEnd: subscriptionEndIso,
      amount: 0,
      gstAmount: 0,
      totalAmount: 0,
      billingCycle: "annual",
    },
  };
}

export interface HermesEmployerDocument {
  id: string;
  version: string;
  data: Record<string, unknown>;
}

export interface HermesEmployerJobDocument extends HermesEmployerDocument {
  collection: HermesEmployerJobTarget["collection"];
  schema: HermesEmployerJobTarget["schema"];
}

export interface HermesEmployerVerifiedProjection {
  email?: string;
  jobId?: string;
  organizationName: string;
  role: string;
  status: string;
  verified: boolean;
  subscriptionTier: string;
  unlimitedJobPostings: boolean;
  subscriptionStart: string;
  subscriptionEnd: string;
}

export interface HermesEmployerServiceDeps {
  reviewSecret: string;
  now?: () => Date;
  findUsersByEmail: (email: string) => Promise<HermesEmployerDocument[]>;
  findEmployersByEmail: (email: string) => Promise<HermesEmployerDocument[]>;
  findJobCandidates?: (jobId: string) => Promise<HermesEmployerJobDocument[]>;
  findUsersByAuthorId?: (authorId: string) => Promise<HermesEmployerDocument[]>;
  findLinkedEmployers?: (user: HermesEmployerDocument) => Promise<HermesEmployerDocument[]>;
  findLinkedOrganizations?: (
    user: HermesEmployerDocument,
    employer: HermesEmployerDocument,
  ) => Promise<HermesEmployerDocument[]>;
  findOrganizationsByEmployerId: (employerId: string) => Promise<HermesEmployerDocument[]>;
  findSubscriptions: (
    orgId: string,
    plan: "tier2",
    billingCycle: "annual",
  ) => Promise<HermesEmployerDocument[]>;
  findSubscriptionsByEmployerId: (
    employerId: string,
    plan: "tier2",
    billingCycle: "annual",
  ) => Promise<HermesEmployerDocument[]>;
  findSubscriptionsByOrganizationId: (
    organizationId: string,
    plan: "tier2",
    billingCycle: "annual",
  ) => Promise<HermesEmployerDocument[]>;
  getOrganization: (orgId: string) => Promise<HermesEmployerDocument | null>;
  getSubscription: (subscriptionId: string) => Promise<HermesEmployerDocument | null>;
  commit: (input: {
    command: HermesEmployerCommand;
    boundState: HermesEmployerBoundState;
    plan: ReturnType<typeof buildHermesEmployerMutationPlan>;
  }) => Promise<{
    committedAt: string;
    verified: HermesEmployerVerifiedProjection;
    userVerified: boolean;
    employerVerified: boolean;
    organizationVerified: boolean;
  }>;
  recordVerifiedNoop?: (input: {
    command: HermesEmployerCommand;
    boundState: HermesEmployerBoundState;
    verified: HermesEmployerVerifiedProjection;
  }) => Promise<void>;
}

type HermesEmployerServiceError = { ok: false; status: number; error: string };

function pickText(record: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

type ResolvedEmployerState =
  | { error: HermesEmployerServiceError }
  | {
      user: HermesEmployerDocument;
      employer: HermesEmployerDocument;
      organization: HermesEmployerDocument | null;
      subscription: HermesEmployerDocument | null;
      boundState: HermesEmployerBoundState;
    };

async function resolveEmployerState(
  command: HermesEmployerCommand,
  deps: HermesEmployerServiceDeps,
): Promise<ResolvedEmployerState> {
  let users: HermesEmployerDocument[];
  let employers: HermesEmployerDocument[];
  let organization: HermesEmployerDocument | null;
  let jobTarget: HermesEmployerJobTarget | undefined;

  if (command.jobId) {
    if (!deps.findJobCandidates || !deps.findUsersByAuthorId ||
        !deps.findLinkedEmployers || !deps.findLinkedOrganizations) {
      return { error: { ok: false, status: 409, error: "Exact job link resolution is unavailable" } };
    }
    const jobs = await deps.findJobCandidates(command.jobId);
    if (jobs.length === 0) {
      return { error: { ok: false, status: 404, error: "Job target was not found" } };
    }
    if (jobs.length !== 1) {
      return { error: { ok: false, status: 409, error: "Job target was ambiguous" } };
    }
    const job = jobs[0];
    const expectedSchema = job.collection === "jobs" ? "employer-job-v1" : "legacy-job-post-v1";
    if (job.id !== command.jobId || job.schema !== expectedSchema ||
        (job.collection === "posts" && job.data.type !== "job")) {
      return { error: { ok: false, status: 409, error: "Job target identity did not match the exact request" } };
    }
    const authorId = pickText(job.data, "authorId");
    const employerId = job.collection === "jobs"
      ? pickText(job.data, "employerId")
      : pickText(job.data, "orgId");
    const organizationId = pickText(job.data, "orgId");
    if (!authorId || !employerId || !organizationId) {
      return { error: { ok: false, status: 409, error: "Job target is missing exact author, employer, or organization links" } };
    }
    users = deduplicateDocuments(await deps.findUsersByAuthorId(authorId));
    if (users.length !== 1 || users[0].id !== authorId) {
      return { error: { ok: false, status: 409, error: "Exact job author lookup was not unique" } };
    }
    employers = deduplicateDocuments(await deps.findLinkedEmployers(users[0]));
    if (employers.length !== 1 || employers[0].id !== employerId) {
      return { error: { ok: false, status: 409, error: "Exact job employer link was not unique" } };
    }
    const organizations = deduplicateDocuments(await deps.findLinkedOrganizations(users[0], employers[0]));
    if (organizations.length !== 1 || organizations[0].id !== organizationId) {
      return { error: { ok: false, status: 409, error: "Exact job organization link was not unique" } };
    }
    organization = organizations[0];
    const resolvedName = pickText(organization.data, "organizationName", "name", "companyName");
    if (resolvedName !== command.organizationName) {
      return { error: { ok: false, status: 409, error: "Organization name did not match the exact job target" } };
    }
    jobTarget = {
      documentId: job.id,
      collection: job.collection,
      schema: job.schema,
      version: job.version,
      authorId,
      employerId,
      organizationId,
    };
  } else {
    const email = command.email;
    if (!email) {
      return { error: { ok: false, status: 409, error: "Exact email target was missing" } };
    }
    [users, employers] = await Promise.all([
      deps.findUsersByEmail(email),
      deps.findEmployersByEmail(email),
    ]);
    organization = null;
  }
  if (users.length !== 1) {
    return { error: { ok: false, status: 409, error: "Exact user lookup was not unique" } as HermesEmployerServiceError };
  }
  if (employers.length !== 1) {
    return { error: { ok: false, status: 409, error: "Exact employer lookup was not unique" } as HermesEmployerServiceError };
  }

  const user = users[0];
  const employer = employers[0];
  const subscriptionId = hermesEmployerSubscriptionDocumentId(command, employer.id);
  if (!jobTarget) {
    const [directOrganization, linkedOrganizations] = await Promise.all([
      deps.getOrganization(employer.id),
      deps.findOrganizationsByEmployerId(employer.id),
    ]);
    const organizations = deduplicateDocuments([
      ...(directOrganization ? [directOrganization] : []),
      ...linkedOrganizations,
    ]);
    if (organizations.length > 1) {
      return { error: { ok: false, status: 409, error: "Organization lookup was not unique" } };
    }
    organization = organizations[0] ?? null;
  }
  const organizationId = organization?.id ?? employer.id;
  const [
    employerSubscriptions,
    organizationSubscriptions,
    legacyEmployerSubscriptions,
    legacyOrganizationSubscriptions,
    deterministicSubscription,
  ] = await Promise.all([
    deps.findSubscriptionsByEmployerId(employer.id, "tier2", "annual"),
    deps.findSubscriptionsByOrganizationId(organizationId, "tier2", "annual"),
    deps.findSubscriptions(employer.id, "tier2", "annual"),
    organizationId === employer.id
      ? Promise.resolve([])
      : deps.findSubscriptions(organizationId, "tier2", "annual"),
    deps.getSubscription(subscriptionId),
  ]);
  const matchingSubscriptions = deduplicateDocuments([
    ...employerSubscriptions,
    ...organizationSubscriptions,
    ...legacyEmployerSubscriptions,
    ...legacyOrganizationSubscriptions,
    ...(deterministicSubscription ? [deterministicSubscription] : []),
  ]);
  if (matchingSubscriptions.length > 1) {
    return { error: { ok: false, status: 409, error: "Subscription lookup was not unique" } };
  }
  const subscription = matchingSubscriptions[0] ?? null;
  const resolvedSubscriptionId = subscription?.id ?? subscriptionId;
  const boundState: HermesEmployerBoundState = {
    userId: user.id,
    userVersion: user.version,
    employerId: employer.id,
    employerVersion: employer.version,
    organizationId,
    organizationVersion: organization?.version ?? "missing",
    subscriptionId: resolvedSubscriptionId,
    subscriptionVersion: subscription?.version ?? "missing",
    ...(jobTarget ? { jobTarget } : {}),
  };
  return { user, employer, organization, subscription, boundState };
}

function deduplicateDocuments(documents: HermesEmployerDocument[]): HermesEmployerDocument[] {
  return [...new Map(documents.map((document) => [document.id, document])).values()]
    .sort((a, b) => a.id.localeCompare(b.id));
}

export function hermesEmployerSubscriptionDocumentId(
  command: Pick<HermesEmployerCommand, "subscriptionStart" | "subscriptionEnd">,
  employerId: string,
): string {
  return createHash("sha256")
    .update(
      `iopps-hermes-admin-subscription-v1\0${employerId}\0tier2\0${command.subscriptionStart}\0${command.subscriptionEnd}`,
      "utf8",
    )
    .digest("hex");
}

function dateOnlyValue(value: unknown): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (value && typeof value === "object" && "toDate" in value) {
    const toDate = (value as { toDate?: unknown }).toDate;
    if (typeof toDate === "function") {
      const converted = toDate.call(value);
      if (converted instanceof Date) return converted.toISOString().slice(0, 10);
    }
  }
  return dateOnly(value);
}

export function hermesEmployerSubscriptionMatches(
  command: HermesEmployerCommand,
  subscription: HermesEmployerDocument | null,
  employerId: string,
  organizationId: string,
  identityMode: "compatible" | "exact" = "compatible",
): boolean {
  if (!subscription) return false;
  const data = subscription.data;
  const exactIdentity = data.employerId === employerId &&
    data.orgId === employerId &&
    data.organizationId === organizationId;
  const legacyIdentity = data.organizationId === undefined && (
    (data.orgId === employerId && (data.employerId === undefined || data.employerId === employerId)) ||
    (data.employerId === employerId && data.orgId === organizationId)
  );
  return (
    (exactIdentity || (identityMode === "compatible" && legacyIdentity)) &&
    data.plan === "tier2" &&
    data.status === "active" &&
    Number(data.amount) === 0 &&
    Number(data.gstAmount) === 0 &&
    Number(data.totalAmount) === 0 &&
    data.billingCycle === "annual" &&
    data.manualOverride === true &&
    data.bonusAccessReason === "Complimentary Hermes administrator grant" &&
    dateOnlyValue(data.startsAt) === command.subscriptionStart &&
    dateOnlyValue(data.expiresAt) === command.subscriptionEnd
  );
}

function dateOnly(value: unknown): string {
  if (typeof value !== "string") return "";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value.slice(0, 10) : parsed.toISOString().slice(0, 10);
}

export function projectHermesEmployerState(
  command: HermesEmployerCommand,
  user: HermesEmployerDocument,
  employer: HermesEmployerDocument,
  organization: HermesEmployerDocument | null,
): HermesEmployerVerifiedProjection {
  const source = organization?.data ?? employer.data;
  const subscription = isRecord(source.subscription)
    ? source.subscription
    : isRecord(employer.data.subscription)
      ? employer.data.subscription
      : {};
  const tier = pickText(source, "subscriptionTier", "plan", "tier") || pickText(employer.data, "subscriptionTier", "plan", "tier");
  const start = pickText(source, "subscriptionStart", "billingStartAt") || pickText(employer.data, "subscriptionStart", "billingStartAt");
  const end = pickText(source, "subscriptionEnd", "expiresAt") || pickText(employer.data, "subscriptionEnd", "expiresAt");
  return {
    ...(command.email ? { email: command.email } : { jobId: command.jobId }),
    organizationName: pickText(source, "organizationName", "name", "companyName") || pickText(employer.data, "organizationName", "name", "companyName"),
    role: pickText(user.data, "role"),
    status: pickText(source, "status") || pickText(employer.data, "status"),
    verified: source.verified === true || employer.data.verified === true,
    subscriptionTier: tier,
    unlimitedJobPostings: tier === "premium" && Number(subscription.amountPaid ?? 0) === 0,
    subscriptionStart: dateOnly(start),
    subscriptionEnd: dateOnly(end),
  };
}

function desiredProjection(command: HermesEmployerCommand): HermesEmployerVerifiedProjection {
  return {
    ...(command.email ? { email: command.email } : { jobId: command.jobId }),
    organizationName: command.organizationName,
    role: command.role,
    status: "approved",
    verified: true,
    subscriptionTier: "premium",
    unlimitedJobPostings: true,
    subscriptionStart: command.subscriptionStart,
    subscriptionEnd: command.subscriptionEnd,
  };
}

function projectionMatches(a: HermesEmployerVerifiedProjection, b: HermesEmployerVerifiedProjection): boolean {
  return Object.keys(a).every(
    (key) => a[key as keyof HermesEmployerVerifiedProjection] === b[key as keyof HermesEmployerVerifiedProjection],
  );
}

export function verifyHermesEmployerDesiredDocuments(
  command: HermesEmployerCommand,
  user: HermesEmployerDocument,
  employer: HermesEmployerDocument,
  organization: HermesEmployerDocument | null,
  plan?: ReturnType<typeof buildHermesEmployerMutationPlan>,
  mode: "exact" | "stable" = "exact",
): { user: boolean; employer: boolean; organization: boolean } {
  const generatedTimestampFields = new Set(["updatedAt", "approvedAt", "bonusAccessGrantedAt"]);
  if (plan) {
    const matchesPatch = (
      document: HermesEmployerDocument,
      patch: Record<string, unknown>,
    ): boolean => Object.entries(patch).every(([field, intendedValue]) => {
      if (mode === "stable" && generatedTimestampFields.has(field)) return true;
      if (mode === "stable" && field === "subscription" && isRecord(intendedValue)) {
        const currentSubscription = document.data.subscription;
        if (!isRecord(currentSubscription)) return false;
        return Object.entries(intendedValue).every(([nestedField, nestedValue]) =>
          nestedField === "bonusAccessGrantedAt" ||
          isDeepStrictEqual(currentSubscription[nestedField], nestedValue));
      }
      return isDeepStrictEqual(document.data[field], intendedValue);
    });
    return {
      user: matchesPatch(user, plan.userPatch),
      employer: matchesPatch(employer, plan.employerPatch),
      organization: organization !== null && matchesPatch(organization, plan.organizationPatch),
    };
  }
  const desired = desiredProjection(command);
  return {
    user: user.data.role === command.role &&
      user.data.employerId === employer.id &&
      user.data.orgId === organization?.id &&
      user.data.orgRole === "owner",
    employer: projectionMatches(projectHermesEmployerState(command, user, employer, null), desired),
    organization: organization !== null &&
      projectionMatches(projectHermesEmployerState(command, user, organization, null), desired),
  };
}

export async function reviewHermesEmployer(
  commandInput: unknown,
  deps: HermesEmployerServiceDeps,
): Promise<
  | HermesEmployerServiceError
  | {
      ok: true;
      reviewToken: string;
      target: { userId: string; employerId: string; organizationId: string; email?: string; jobId?: string };
      current: HermesEmployerVerifiedProjection;
      desired: HermesEmployerVerifiedProjection;
    }
> {
  const normalized = normalizeHermesEmployerCommand(commandInput);
  if (!normalized.ok) return { ok: false, status: 400, error: normalized.error };
  const resolved = await resolveEmployerState(normalized.command, deps);
  if ("error" in resolved) return resolved.error;
  const current = projectHermesEmployerState(normalized.command, resolved.user, resolved.employer, resolved.organization);
  return {
    ok: true,
    reviewToken: createHermesEmployerReviewToken({
      command: normalized.command,
      boundState: resolved.boundState,
      secret: deps.reviewSecret,
    }),
    target: {
      userId: resolved.user.id,
      employerId: resolved.employer.id,
      organizationId: resolved.organization?.id ?? resolved.employer.id,
      ...(normalized.command.email
        ? { email: normalized.command.email }
        : { jobId: normalized.command.jobId }),
    },
    current,
    desired: desiredProjection(normalized.command),
  };
}

export async function applyHermesEmployer(
  input: { command: unknown; reviewToken: string; confirmation: string },
  deps: HermesEmployerServiceDeps,
): Promise<
  | HermesEmployerServiceError
  | { ok: true; status: "applied" | "verified_noop"; committedAt?: string; verified: HermesEmployerVerifiedProjection }
> {
  if (input.confirmation !== "APPLY IOPPS EMPLOYER UPDATE") {
    return { ok: false, status: 400, error: "Exact confirmation phrase is required" };
  }
  const normalized = normalizeHermesEmployerCommand(input.command);
  if (!normalized.ok) return { ok: false, status: 400, error: normalized.error };
  const resolved = await resolveEmployerState(normalized.command, deps);
  if ("error" in resolved) return resolved.error;
  if (!verifyHermesEmployerReviewToken({
    token: input.reviewToken,
    command: normalized.command,
    boundState: resolved.boundState,
    secret: deps.reviewSecret,
  })) {
    return { ok: false, status: 409, error: "Review token is invalid or stale" };
  }

  const current = projectHermesEmployerState(normalized.command, resolved.user, resolved.employer, resolved.organization);
  const desired = desiredProjection(normalized.command);
  const plan = buildHermesEmployerMutationPlan(normalized.command, {
    orgId: resolved.employer.id,
    organizationId: resolved.boundState.organizationId,
    now: deps.now?.(),
    ...(resolved.subscription
      ? { createdAtToken: resolved.subscription.data.createdAt }
      : {}),
  });
  const desiredDocuments = verifyHermesEmployerDesiredDocuments(
    normalized.command,
    resolved.user,
    resolved.employer,
    resolved.organization,
    plan,
    "stable",
  );
  if (
    desiredDocuments.user &&
    desiredDocuments.employer &&
    desiredDocuments.organization &&
    hermesEmployerSubscriptionMatches(
      normalized.command,
      resolved.subscription,
      resolved.employer.id,
      resolved.boundState.organizationId,
      "exact",
    )
  ) {
    await deps.recordVerifiedNoop?.({
      command: normalized.command,
      boundState: resolved.boundState,
      verified: current,
    });
    return { ok: true, status: "verified_noop", verified: current };
  }

  const committed = await deps.commit({ command: normalized.command, boundState: resolved.boundState, plan });
  if (
    !committed.userVerified ||
    !committed.employerVerified ||
    !committed.organizationVerified ||
    !projectionMatches(committed.verified, desired)
  ) {
    return { ok: false, status: 500, error: "Post-write verification failed" };
  }
  return {
    ok: true,
    status: "applied",
    committedAt: committed.committedAt,
    verified: committed.verified,
  };
}
