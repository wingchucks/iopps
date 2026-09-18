import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { isOrganizationPubliclyVisible, normalizeOrganizationRecord } from "../organization-profile.ts";

type Data = Record<string, unknown>;
export type AssignmentDocument = { version: string; data: Data };
export interface AssignmentState {
  auth: { uid: string; email: string; disabled: boolean; customClaims: Data; [key: string]: unknown };
  user: AssignmentDocument;
  member: AssignmentDocument | null;
  employer: AssignmentDocument;
  organization: AssignmentDocument;
  identityIds: string[];
  mirrorIds: string[];
  peers?: unknown;
}
export interface AssignmentDesired { email: string; orgId: string; role: "admin"; enable: boolean }
export interface AssignmentApply extends AssignmentDesired { token: string; confirmation: string }
type Patches = Partial<Record<"user" | "member" | "employer" | "organization", Data>>;
interface Receipt { requestHash: string; expectedHash: string; actor: string; orgId: string; uid: string; role: "admin"; enable: boolean; timestamp: string; action: "assign_organization_admin" }
export interface AssignmentStore {
  read(): Promise<AssignmentState>;
  readReceipt(id: string): Promise<unknown>;
  transact<T>(id: string, callback: (state: AssignmentState, receipt: unknown, write: (patches: Patches, receipt: Receipt) => Promise<void>) => Promise<T>): Promise<T>;
}
interface Options { actor: string; secret: string; now?: number }
export class AssignmentError extends Error {
  status: number;
  constructor(message: string, status = 409) { super(message); this.status = status; }
}
function fail(message: string, status = 409): never { throw new AssignmentError(message, status); }
function canonical(value: unknown): string {
  if (value === undefined) return "null";
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([k,v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(",")}}`;
}
function hash(value: unknown): string { return createHash("sha256").update(canonical(value)).digest("hex"); }
function equal(a: string, b: string): boolean { const x = Buffer.from(a); const y = Buffer.from(b); return x.length === y.length && timingSafeEqual(x,y); }
const normalizeEmail = (value: unknown) => typeof value === "string" ? value.trim().toLowerCase() : "";
const status = (data: Data) => typeof data.status === "string" ? data.status.trim().toLowerCase() : "";
function desiredOnly(input: AssignmentDesired): AssignmentDesired { return {email:input.email,orgId:input.orgId,role:input.role,enable:input.enable}; }
function validateDesired(input: AssignmentDesired) {
  if (!input || typeof input.email !== "string" || input.email !== input.email.trim() || input.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email) || !/^[A-Za-z0-9_-]{1,128}$/.test(input.orgId) || input.role !== "admin" || typeof input.enable !== "boolean") fail("Invalid assignment request",400);
}
function validate(state: AssignmentState, input: AssignmentDesired) {
  validateDesired(input);
  if (!state.user || !state.employer || !state.organization) fail("Existing user and both exact organization mirrors are required");
  if (!state.auth || normalizeEmail(state.auth.email) !== normalizeEmail(input.email) || normalizeEmail(state.user.data.email) !== normalizeEmail(input.email)) fail("User identity does not match");
  if (state.identityIds.length !== 1 || state.identityIds[0] !== state.auth.uid) fail("Ambiguous or missing user identity");
  if (state.mirrorIds.length !== 1 || state.mirrorIds[0] !== input.orgId) fail("Ambiguous organization mirrors");
  if (state.auth.disabled) fail("User is disabled");
  for (const data of [state.user.data, state.member?.data ?? {}]) {
    if (data.disabled === true || data.deleted === true || data.deletedAt != null || ["disabled","deleted","suspended","archived"].includes(status(data))) fail("User is disabled or deleted");
    if (data.email != null && normalizeEmail(data.email) !== normalizeEmail(input.email)) fail("Conflicting user email");
    if (data.orgRole === "owner") fail("Existing owner role cannot be replaced");
  }
  for (const data of [state.user.data,state.member?.data ?? {},state.auth.customClaims]) {
    for (const field of ["orgId","employerId","organizationId"]) {
      if (data[field] != null && data[field] !== "" && data[field] !== input.orgId) fail("Conflicting organization affiliation");
    }
    if (data.orgRole != null && !["","member","admin"].includes(String(data.orgRole))) fail("Unsupported existing organization role");
  }
  for (const data of [state.employer.data,state.organization.data]) {
    if (data.deleted === true || data.deletedAt != null || ["deleted","archived"].includes(status(data))) fail("Deleted or archived organization");
    for (const field of ["orgId","organizationId","employerId"]) {
      if (data[field] != null && data[field] !== "" && data[field] !== input.orgId) fail("Split organization mirrors require separate reconciliation");
    }
    if ((data.status != null && typeof data.status !== "string") || !["","disabled","incomplete","pending","approved","active"].includes(status(data))) fail("Unsupported or unavailable organization status");
    if (data.disabled != null && typeof data.disabled !== "boolean") fail("Invalid organization disabled state");
    if (!input.enable && (data.disabled === true || status(data) === "disabled")) fail("Explicit enable is required before assigning access to a disabled organization");
  }

}
function patchesFor(state: AssignmentState, input: AssignmentDesired): Patches {
  const patches: Patches = { user:{orgId:input.orgId,employerId:input.orgId,orgRole:input.role},member:{orgId:input.orgId,orgRole:input.role} };
  if (input.enable) for (const key of ["employer","organization"] as const) {
    const data = state[key].data;
    const patch: Data = {};
    if (data.disabled === true) patch.disabled = false;
    // "incomplete" removes only the lifecycle block; it does not approve/publish.
    if (status(data) === "disabled") patch.status = "incomplete";
    if (Object.keys(patch).length) patches[key] = patch;
  }
  if (input.enable && (patches.employer || patches.organization)) {
    const before = [state.employer.data,state.organization.data];
    const after = [{...before[0],...patches.employer},{...before[1],...patches.organization}];
    // Public consumers normalize individual mirrors and merged records. A single
    // explicit field on both mirrors prevents merge order from undoing the block.
    const views = (docs: Data[]) => [...docs,{...docs[0],...docs[1]},{...docs[1],...docs[0]}];
    const prior = views(before);
    if (views(after).some((data,index) => isOrganizationPubliclyVisible(normalizeOrganizationRecord(data)) && !isOrganizationPubliclyVisible(normalizeOrganizationRecord(prior[index])))) {
      for (const key of ["employer","organization"] as const) {
        patches[key] = {...patches[key],publicVisibility:"hidden"};
      }
    }
  }
  return patches;
}
function projected(state: AssignmentState, patches: Patches = {}) {
  return { auth: state.auth, identityIds: state.identityIds, mirrorIds:state.mirrorIds, peers:state.peers ?? null,
    ...Object.fromEntries((["user","member","employer","organization"] as const).map(k => [k, state[k] || patches[k] ? {...state[k]?.data,...patches[k]} : null])) };
}
function confirmation(input: AssignmentDesired) { return `ASSIGN ${input.email} TO ${input.orgId} AS admin ENABLE ${input.enable ? "YES" : "NO"}`; }
function mac(input: AssignmentDesired, state: AssignmentState, prefix: string, options: Options) {
  if (Buffer.byteLength(options.secret) < 32) fail("Assignment review is not configured",503);
  return createHmac("sha256", options.secret).update(canonical({domain:"organization-admin-assignment-v1",actor:options.actor,desired:desiredOnly(input),state,prefix})).digest("base64url");
}
export async function reviewAssignment(input: AssignmentDesired, store: AssignmentStore, options: Options) {
  validateDesired(input);
  const state = await store.read(); validate(state,input);
  const expiresAt = (options.now ?? Date.now()) + 10 * 60 * 1000;
  const prefix = `v1.${expiresAt}.${randomBytes(24).toString("hex")}`;
  const patches = patchesFor(state,input);
  return { token:`${prefix}.${mac(input,state,prefix,options)}`, confirmation:confirmation(input), expiresAt,
    uid:state.auth.uid, email:state.auth.email, orgId:input.orgId,
    current:{employerPublicVisibility:state.employer.data.publicVisibility ?? null,organizationPublicVisibility:state.organization.data.publicVisibility ?? null,userOrgId:state.user.data.orgId ?? null,employerId:state.user.data.employerId ?? null,memberOrgId:state.member?.data.orgId ?? null,userOrgRole:state.user.data.orgRole ?? null,memberOrgRole:state.member?.data.orgRole ?? null,platformRole:state.user.data.role ?? null,memberPlatformRole:state.member?.data.role ?? null,employerDisabled:state.employer.data.disabled ?? false,organizationDisabled:state.organization.data.disabled ?? false,employerStatus:state.employer.data.status ?? null,organizationStatus:state.organization.data.status ?? null,ownerId:state.employer.data.ownerId ?? null,organizationOwnerId:state.organization.data.ownerId ?? null,employerUid:state.employer.data.uid ?? null,organizationUid:state.organization.data.uid ?? null},
    desired:desiredOnly(input), changes:patches };
}
export async function applyAssignment(input: AssignmentApply, store: AssignmentStore, options: Options) {
  validateDesired(input);
  if (input.confirmation !== confirmation(input)) fail("Exact confirmation is required",400);
  const match = /^v1\.(\d{13}|\d{6,12})\.([a-f0-9]{48})\.([A-Za-z0-9_-]{43})$/.exec(input.token);
  if (!match) fail("Invalid review token",400);
  const now = options.now ?? Date.now();
  if (Number(match[1]) <= now || Number(match[1]) > now + 600000) fail("Review expired; review again");
  const prefix = input.token.slice(0,input.token.lastIndexOf("."));
  const requestHash = hash({actor:options.actor,desired:desiredOnly(input),token:input.token,confirmation:input.confirmation});
  const outcome = await store.transact(match[2], async (state, existing, write) => {
    if (existing) {
      const receipt = existing as Receipt;
      if (!equal(receipt.requestHash ?? "",requestHash)) fail("Retry does not match original assignment");
      if (hash(projected(state)) !== receipt.expectedHash) fail("Assignment readback drift; do not reapply");
      return {receipt,replayed:true};
    }
    validate(state,input);
    if (!equal(mac(input,state,prefix,options),match[3])) fail("Review is stale or does not match; review again");
    const patches = patchesFor(state,input);
    const receipt: Receipt = {requestHash,expectedHash:hash(projected(state,patches)),actor:options.actor,uid:state.auth.uid,orgId:input.orgId,role:input.role,enable:input.enable,timestamp:new Date(now).toISOString(),action:"assign_organization_admin"};
    await write(patches,receipt);
    return {receipt,replayed:false};
  });
  // Never infer success from transaction return values or repeat writes to repair drift.
  const readback = await store.read();
  const durableReceipt = await store.readReceipt(match[2]);
  if (hash(durableReceipt) !== hash(outcome.receipt)) fail("Assignment audit receipt readback mismatch; inspect before another review");
  if (hash(projected(readback)) !== outcome.receipt.expectedHash) fail("Assignment readback mismatch; inspect before another review");
  return {verified:true,replayed:outcome.replayed,uid:readback.auth.uid,orgId:input.orgId,role:input.role,enabled:input.enable,
    readback:{userOrgId:readback.user.data.orgId,employerId:readback.user.data.employerId,userOrgRole:readback.user.data.orgRole,memberOrgId:readback.member?.data.orgId,memberOrgRole:readback.member?.data.orgRole,employerDisabled:readback.employer.data.disabled ?? false,organizationDisabled:readback.organization.data.disabled ?? false}};
}

/** Flat primitive JSON grammar intentionally rejects duplicate decoded keys and nested values. */
export async function parseAssignmentRequest(request: Request, orgId: string): Promise<(AssignmentDesired & {action:"review"}) | (AssignmentApply & {action:"apply"})> {
  if (!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(request.headers.get("content-type") ?? "") || request.headers.has("content-encoding")) fail("Expected unencoded JSON",400);
  const reader = request.body?.getReader(); if (!reader) fail("Missing request body",400);
  const chunks: Uint8Array[] = []; let size = 0;
  try { while (true) { const {done,value} = await reader.read(); if (done) break; size += value.length; if (size > 4096) { await reader.cancel(); fail("Request body too large",413); } chunks.push(value); } }
  finally { reader.releaseLock(); }
  let raw: string;
  try { raw = new TextDecoder("utf-8",{fatal:true}).decode(Buffer.concat(chunks)); } catch { fail("Invalid UTF-8 JSON",400); }
  const string = '"(?:[^"\\\\\\x00-\\x1f]|\\\\(?:["\\\\/bfnrt]|u[0-9a-fA-F]{4}))*"';
  const pair = new RegExp(`\\s*(${string})\\s*:\\s*(${string}|true|false|null|-?(?:0|[1-9][0-9]*)(?:\\.[0-9]+)?(?:[eE][+-]?[0-9]+)?)\\s*`,"y");
  const body = raw.trim(); if (!body.startsWith("{") || !body.endsWith("}")) fail("Expected flat JSON object",400);
  const result: Data = Object.create(null); let offset = 1;
  while (offset < body.length - 1) {
    pair.lastIndex = offset; const m = pair.exec(body); if (!m) fail("Invalid flat JSON object",400);
    const key = JSON.parse(m[1]); if (Object.hasOwn(result,key)) fail("Duplicate JSON key",400);
    result[key] = JSON.parse(m[2]); offset = pair.lastIndex;
    if (offset === body.length - 1) break;
    if (body[offset] !== "," || offset + 1 >= body.length - 1) fail("Invalid JSON object",400);
    offset++;
  }
  const keys = result.action === "review" ? ["action","email","orgId","role","enable"] : result.action === "apply" ? ["action","email","orgId","role","enable","token","confirmation"] : [];
  if (!keys.length || Object.keys(result).length !== keys.length || keys.some(k => !Object.hasOwn(result,k))) fail("Invalid request fields",400);
  validateDesired(result as unknown as AssignmentDesired);
  if (result.orgId !== orgId) fail("Organization does not match URL",400);
  if (result.action === "apply" && (typeof result.token !== "string" || result.token.length > 180 || typeof result.confirmation !== "string" || result.confirmation.length > 512)) fail("Invalid apply fields",400);
  return {...result} as unknown as Awaited<ReturnType<typeof parseAssignmentRequest>>;
}
