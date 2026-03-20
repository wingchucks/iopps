import { createHash } from "crypto";
import type { Firestore, Transaction } from "firebase-admin/firestore";
import { FieldValue } from "firebase-admin/firestore";

type SignupKind = "employer_signup" | "employer_upgrade";

interface SignupProtectionInput {
  uid: string;
  kind: SignupKind;
  name: string;
  contactName?: string;
  contactEmail: string;
  website?: string;
  description?: string;
  honeypot?: string;
  formStartedAt?: unknown;
  clientIp?: string | null;
}

interface SignupProtectionDecision {
  allow: boolean;
  hardBlock: boolean;
  status: number;
  message: string;
  reasons: string[];
  riskScore: number;
}

const DISPOSABLE_EMAIL_DOMAINS = new Set([
  "10minutemail.com",
  "guerrillamail.com",
  "mailinator.com",
  "sharklasers.com",
  "temp-mail.org",
  "tempmail.com",
  "yopmail.com",
]);

const HIGH_CONFIDENCE_SPAM_PATTERNS = [
  /\bpay\s*for\s*my\s*exam\b/i,
  /\btake\s*my\s*exam\b/i,
  /\bdo\s*my\s*(assignment|exam|essay|homework)\b/i,
  /\bessay\s*(writer|writing|service)\b/i,
  /\bassignment\s*(help|writer|service)\b/i,
  /\bhomework\s*(help|service)\b/i,
  /\bthesis\s*(help|writer|writing)\b/i,
  /\bexam\s*(helper|solver|service)\b/i,
];

const MODERATE_SPAM_PATTERNS = [
  /\bacademic\s+help\b/i,
  /\bclass\s+help\b/i,
  /\btest\s+taker\b/i,
  /\bonline\s+exam\b/i,
];

const RATE_LIMITS = [
  { scope: "ip", windowMs: 30 * 60 * 1000, maxAttempts: 5 },
  { scope: "email", windowMs: 24 * 60 * 60 * 1000, maxAttempts: 3 },
  { scope: "org", windowMs: 24 * 60 * 60 * 1000, maxAttempts: 3 },
] as const;

function normalizeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function hashValue(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 24);
}

function extractClientIp(ip: string | null | undefined): string {
  return normalizeString(ip).split(",")[0]?.trim() || "unknown";
}

function parseFormAgeMs(value: unknown): number | null {
  const num = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  if (!Number.isFinite(num) || num <= 0) return null;
  return Math.max(0, Date.now() - num);
}

function extractEmailDomain(email: string): string {
  const parts = email.toLowerCase().split("@");
  return parts[1] || "";
}

function collectSignals(input: SignupProtectionInput): {
  reasons: string[];
  riskScore: number;
  hardBlock: boolean;
} {
  const reasons: string[] = [];
  let riskScore = 0;
  let hardBlock = false;

  const name = normalizeString(input.name);
  const contactName = normalizeString(input.contactName);
  const email = normalizeString(input.contactEmail).toLowerCase();
  const emailLocalPart = email.split("@")[0] || "";
  const website = normalizeString(input.website);
  const description = normalizeString(input.description);
  const honeypot = normalizeString(input.honeypot);
  const formAgeMs = parseFormAgeMs(input.formStartedAt);
  const signalText = [name, contactName, emailLocalPart, website, description].join(" ");

  if (honeypot) {
    reasons.push("honeypot_filled");
    riskScore += 10;
    hardBlock = true;
  }

  if (HIGH_CONFIDENCE_SPAM_PATTERNS.some((pattern) => pattern.test(signalText))) {
    reasons.push("high_confidence_spam_phrase");
    riskScore += 10;
    hardBlock = true;
  } else if (MODERATE_SPAM_PATTERNS.some((pattern) => pattern.test(signalText))) {
    reasons.push("suspicious_phrase");
    riskScore += 4;
  }

  const emailDomain = extractEmailDomain(email);
  if (DISPOSABLE_EMAIL_DOMAINS.has(emailDomain)) {
    reasons.push("disposable_email_domain");
    riskScore += 8;
    hardBlock = true;
  }

  if (formAgeMs !== null) {
    if (formAgeMs < 2500) {
      reasons.push("submitted_too_fast");
      riskScore += 3;
    } else if (formAgeMs < 7000) {
      reasons.push("submitted_very_fast");
      riskScore += 1;
    }
  }

  return { reasons, riskScore, hardBlock };
}

function getLimitDocId(scope: string, normalizedValue: string): string {
  return `${scope}_${hashValue(normalizedValue)}`;
}

function readWindowState(snapshotData: Record<string, unknown> | undefined, windowMs: number, nowMs: number) {
  const startedAtRaw = snapshotData?.windowStartedAt;
  const startedAt =
    startedAtRaw instanceof Date
      ? startedAtRaw.getTime()
      : typeof startedAtRaw === "object" &&
          startedAtRaw !== null &&
          typeof (startedAtRaw as { toDate?: () => Date }).toDate === "function"
        ? (startedAtRaw as { toDate: () => Date }).toDate().getTime()
        : 0;

  if (!startedAt || nowMs - startedAt > windowMs) {
    return { count: 0, windowStartedAt: nowMs };
  }

  const count = Number(snapshotData?.count ?? 0) || 0;
  return { count, windowStartedAt: startedAt };
}

async function applyRateLimit(
  db: Firestore,
  input: SignupProtectionInput,
): Promise<{ blocked: boolean; reasons: string[] }> {
  const now = new Date();
  const nowMs = now.getTime();
  const normalizedInputs = {
    ip: extractClientIp(input.clientIp),
    email: normalizeString(input.contactEmail).toLowerCase(),
    org: normalizeString(input.name).toLowerCase(),
  };

  return db.runTransaction(async (transaction: Transaction) => {
    const reasons: string[] = [];

    for (const limit of RATE_LIMITS) {
      const value = normalizedInputs[limit.scope];
      if (!value) continue;

      const ref = db.collection("signup_security_limits").doc(getLimitDocId(limit.scope, value));
      const snap = await transaction.get(ref);
      const data = snap.exists ? (snap.data() as Record<string, unknown>) : undefined;
      const state = readWindowState(data, limit.windowMs, nowMs);
      const nextCount = state.count + 1;

      transaction.set(ref, {
        scope: limit.scope,
        count: nextCount,
        windowStartedAt: new Date(state.windowStartedAt),
        updatedAt: now,
        expiresAt: new Date(state.windowStartedAt + limit.windowMs),
        lastKind: input.kind,
      });

      if (nextCount > limit.maxAttempts) {
        reasons.push(`rate_limit_${limit.scope}`);
      }
    }

    return { blocked: reasons.length > 0, reasons };
  });
}

export function getSignupClientIp(req: Request): string | null {
  return (
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-real-ip") ||
    req.headers.get("x-forwarded-for")
  );
}

export async function evaluateEmployerSignupProtection(
  db: Firestore,
  input: SignupProtectionInput,
): Promise<SignupProtectionDecision> {
  const signalDecision = collectSignals(input);
  const rateLimit = await applyRateLimit(db, input);
  const reasons = [...signalDecision.reasons, ...rateLimit.reasons];

  const riskScore = signalDecision.riskScore + (rateLimit.blocked ? 4 : 0);
  const hardBlock = signalDecision.hardBlock;
  const allow = !hardBlock && !rateLimit.blocked && riskScore < 6;

  await db.collection("signup_security_events").add({
    uid: input.uid,
    kind: input.kind,
    name: normalizeString(input.name),
    contactName: normalizeString(input.contactName),
    contactEmail: normalizeString(input.contactEmail).toLowerCase(),
    clientIpHash: hashValue(extractClientIp(input.clientIp)),
    reasons,
    riskScore,
    blocked: !allow,
    hardBlock,
    createdAt: FieldValue.serverTimestamp(),
  });

  if (allow) {
    return {
      allow: true,
      hardBlock: false,
      status: 200,
      message: "ok",
      reasons,
      riskScore,
    };
  }

  return {
    allow: false,
    hardBlock,
    status: rateLimit.blocked ? 429 : 403,
    message: "We couldn't verify this organization signup. Please contact support if this is a legitimate organization.",
    reasons,
    riskScore,
  };
}
