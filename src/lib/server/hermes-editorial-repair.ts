import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import type { HermesExecutionContext, HermesFirestorePort } from "./hermes-firestore-adapter.ts";

// This is an editorial authorization, NOT an encoding-recovery rule.
export const REPAIR = Object.freeze({
  id: "siga-payroll-possessive-v1",
  jobId: "r9ASuHeZH2SIg9WLcDyh",
  slug: "senior-payroll-officer-1-ft",
  title: "Senior Payroll Officer - 1 FT",
  employer: "Saskatchewan Indian Gaming Authority",
  urls: Object.freeze([
    "https://iaayzv.fa.ocs.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1001/job/251052",
    "https://iaayzv.fa.ocs.oraclecloud.com/hcmUI/CandidateExperience/en/sites/SIGA/job/251052",
  ]),
  original: "This position focuses on organizational excellence, by ensuring SIGA \uFFFDds employees are paid accurately and promptly.",
  replacement: "This position focuses on organizational excellence, by ensuring SIGA’s employees are paid accurately and promptly.",
});
export const CONFIRMATION = "APPLY SIGA PAYROLL EDITORIAL CORRECTION";
export class EditorialConflict extends Error { readonly status = 409; }
function fail(): never { throw new EditorialConflict("Editorial review is invalid, stale, or target/source drifted"); }
export function canonicalEditorial(value: unknown): string {
  if (value === null) return "null";
  if (typeof value !== "object") return JSON.stringify([typeof value, typeof value === "number" ? (Object.is(value, -0) ? "-0" : String(value)) : value]);
  if (value instanceof Date) return JSON.stringify(["Date", value.toISOString()]);
  if (Array.isArray(value)) return `["Array",${value.map(canonicalEditorial).join(",")}]`;
  // Class tagging keeps Timestamp/GeoPoint/bytes distinct from lookalike maps.
  // Unsupported cyclic values fail closed rather than dropping preservation fields.
  return `[${JSON.stringify(value.constructor?.name ?? "Object")},{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${canonicalEditorial((value as Record<string, unknown>)[k])}`).join(",")}}]`;
}
export function editorialDigest(value: unknown): string {
  return createHash("sha256").update(canonicalEditorial(value)).digest("hex");
}
export function matchesEditorialIdentity(id: string, data: Record<string, unknown>): boolean {
  const names = [data.employerName, data.orgName, data.companyName].filter(v => typeof v === "string" && v.length);
  return id === REPAIR.jobId && data.title === REPAIR.title &&
    (data.slug === undefined || data.slug === REPAIR.slug) && names.length > 0 && names.every(v => v === REPAIR.employer) &&
    typeof data.externalUrl === "string" && REPAIR.urls.includes(data.externalUrl) &&
    (data.externalId == null || String(data.externalId) === "251052");
}
function exactObject(value: unknown, keys: string[]): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value) &&
    Object.keys(value).sort().join("\0") === keys.sort().join("\0");
}
export function validEditorialApply(value: unknown): value is Record<string, unknown> {
  return exactObject(value, ["repairId", "expiresAt", "reviewToken", "confirmation"]) &&
    value.repairId === REPAIR.id && value.confirmation === CONFIRMATION &&
    Number.isSafeInteger(value.expiresAt) && typeof value.reviewToken === "string" && /^[a-f0-9]{64}$/.test(value.reviewToken);
}

export function createEditorialRepair(port: HermesFirestorePort, options: { secret: string; now?: () => number; normalize?: (text: string, format?: unknown) => string }) {
  if (Buffer.byteLength(options.secret) < 32) throw new Error("Missing review secret");
  const now = options.now ?? Date.now;
  const normalize = options.normalize ?? ((text: string) => text);
  const token = (doc: {version: string; data: Record<string, unknown>}, keyId: string, expiresAt: number, source: unknown) =>
    createHmac("sha256", options.secret).update(canonicalEditorial({ protocol: "editorial-review-v1", repair: REPAIR, keyId, expiresAt, version: doc.version, data: editorialDigest(doc.data), source })).digest("hex");
  function plan(data: Record<string, unknown>) {
    if (!matchesEditorialIdentity(REPAIR.jobId, data) || typeof data.description !== "string") fail();
    const raw = data.description;
    // Bind real stored bytes, including any harmless markup. Only the exact approved phrase changes.
    if (normalize(raw, data.descriptionFormat) !== REPAIR.original || raw.split("SIGA \uFFFDds employees").length !== 2 || data.editorialCorrection != null) fail();
    const description = raw.replace("SIGA \uFFFDds employees", "SIGA’s employees");
    if (normalize(description, data.descriptionFormat) !== REPAIR.replacement) fail();
    return { description, editorialCorrection: {
      repairId: REPAIR.id, kind: "user-approved-editorial", originalDescription: raw,
      approvedDescription: description, sourceUrl: data.externalUrl,
      originalDigest: editorialDigest(REPAIR.original), approvedDigest: editorialDigest(REPAIR.replacement),
    } };
  }
  async function target() {
    const [job, post] = await Promise.all([port.getDocument("jobs", REPAIR.jobId), port.getDocument("posts", REPAIR.jobId)]);
    if (!job || post || job.id !== REPAIR.jobId || !job.version) fail();
    return job;
  }
  async function sourceState(data: Record<string, unknown>, reader: Pick<HermesFirestorePort, "getDocument"> = port) {
    if (data.feedId == null) return null;
    if (typeof data.feedId !== "string" || !data.feedId || data.feedId.includes("/")) fail();
    const feed = await reader.getDocument("rssFeeds", data.feedId);
    if (!feed || !feed.version || feed.id !== data.feedId || feed.data.employerId !== data.employerId) fail();
    return { id: feed.id, version: feed.version, digest: editorialDigest(feed.data) };
  }
  async function verify(expectedDigest: unknown, expectedSource: unknown) {
    const doc = await target();
    if (editorialDigest(await sourceState(doc.data)) !== expectedSource ||
      typeof expectedDigest !== "string" || editorialDigest(doc.data) !== expectedDigest ||
      !matchesEditorialIdentity(doc.id, doc.data) || normalize(String(doc.data.description), doc.data.descriptionFormat) !== REPAIR.replacement) fail();
    return { jobId: REPAIR.jobId, description: REPAIR.replacement, preservationVerified: true };
  }
  return {
    async review(value: unknown, keyId: string) {
      if (!exactObject(value, ["repairId"]) || value.repairId !== REPAIR.id) fail();
      const doc = await target(); plan(doc.data);
      const source = await sourceState(doc.data);
      const expiresAt = now() + 600_000;
      return { ok: true, repairId: REPAIR.id, current: REPAIR.original, desired: REPAIR.replacement,
        kind: "user-approved-editorial", expiresAt, reviewToken: token(doc, keyId, expiresAt, source), confirmation: CONFIRMATION };
    },
    async apply(value: unknown, execution: HermesExecutionContext) {
      if (!validEditorialApply(value) || !/^[A-Za-z0-9_-]{1,64}$/.test(execution.keyId) ||
        !/^[A-Za-z0-9._:-]{1,128}$/.test(execution.idempotencyKey) || !/^[a-f0-9]{64}$/.test(execution.requestHash)) fail();
      const expiresAt = value.expiresAt as number;
      const id = editorialDigest(["editorial-apply-v1", execution.keyId, execution.idempotencyKey]);
      const result = await port.runTransaction(async tx => {
        const prior = await tx.getDocument("hermesAdminIdempotency", id);
        const doc = await tx.getDocument("jobs", REPAIR.jobId);
        const mirror = await tx.getDocument("posts", REPAIR.jobId);
        if (!doc || mirror || doc.id !== REPAIR.jobId || !doc.version) fail();
        const source = await sourceState(doc.data, tx);
        const expectedSource = editorialDigest(source);
        if (prior) {
          if (prior.data.requestHash !== execution.requestHash || prior.data.keyId !== execution.keyId ||
            prior.data.operation !== REPAIR.id || prior.data.resultStatus !== "applied" ||
            editorialDigest(doc.data) !== prior.data.expectedDigest || expectedSource !== prior.data.expectedSource) fail();
          return { expectedDigest: prior.data.expectedDigest, expectedSource, committedAt: prior.data.committedAt };
        }
        if (expiresAt <= now() || expiresAt > now() + 600_000) fail();
        const expectedToken = token(doc, execution.keyId, expiresAt, source);
        if (!timingSafeEqual(Buffer.from(expectedToken, "hex"), Buffer.from(value.reviewToken as string, "hex"))) fail();
        const patch = plan(doc.data);
        const committedAt = new Date(now()).toISOString();
        const correction = { ...patch.editorialCorrection, approvedAt: committedAt, actorKeyId: execution.keyId };
        const finalPatch = { description: patch.description, editorialCorrection: correction };
        const expectedDigest = editorialDigest({ ...doc.data, ...finalPatch });
        tx.updateDocument("jobs", REPAIR.jobId, finalPatch);
        tx.setDocument("hermesAdminAudit", id, { protocol: "iopps-hermes-admin-audit-v1", action: REPAIR.id,
          actorKeyId: execution.keyId, requestHash: execution.requestHash, target: { collection: "jobs", documentId: REPAIR.jobId },
          changedFields: ["description", "editorialCorrection"], outcome: "applied", occurredAt: committedAt });
        tx.setDocument("hermesAdminIdempotency", id, { operation: REPAIR.id, keyId: execution.keyId,
          requestHash: execution.requestHash, resultStatus: "applied", expectedDigest, expectedSource, committedAt });
        return { expectedDigest, expectedSource, committedAt };
      });
      return { ok: true, status: "applied", committedAt: result.committedAt, verified: await verify(result.expectedDigest, result.expectedSource) };
    },
  };
}
