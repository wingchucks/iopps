import { createHmac, timingSafeEqual } from "node:crypto";

export const EVENT_HIDE_CONFIRMATION = "HIDE IOPPS EVENT";

export interface HermesEventHideCommand {
  eventId: string;
  title: string;
  organization: string;
  type: "event";
  status: "active" | "hidden";
}

export interface HermesEventHideDocument {
  id: string;
  version: string;
  data: Record<string, unknown>;
}

export interface HermesEventHideProjection {
  id: string;
  title: string;
  organization: string;
  type: "event";
  status: string;
  active: boolean;
}

export interface HermesEventHideServiceDeps {
  reviewSecret: string;
  getEvent: (eventId: string) => Promise<HermesEventHideDocument | null>;
  commit: (input: { command: HermesEventHideCommand; current: HermesEventHideDocument }) => Promise<{
    status: "applied" | "verified_noop";
    committedAt?: string;
    verified: HermesEventHideProjection;
  }>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function normalizeHermesEventHideCommand(value: unknown):
  | { ok: true; command: HermesEventHideCommand }
  | { ok: false; error: string } {
  const keys = ["eventId", "organization", "status", "title", "type"];
  if (!isRecord(value) || Object.keys(value).sort().join("\0") !== keys.join("\0")) {
    return { ok: false, error: "Event-hide review requires exact eventId, title, organization, type, and status" };
  }
  const validText = (candidate: unknown, max: number) => typeof candidate === "string" &&
    candidate.length > 0 && candidate.length <= max && candidate === candidate.trim() &&
    !/[\u0000-\u001f\u007f]/.test(candidate);
  if (!validText(value.eventId, 512) || (value.eventId as string).includes("/") ||
      !validText(value.title, 1_500) || !validText(value.organization, 1_500) ||
      value.type !== "event" || (value.status !== "active" && value.status !== "hidden")) {
    return { ok: false, error: "Event-hide command fields are invalid" };
  }
  return { ok: true, command: value as unknown as HermesEventHideCommand };
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

function tokenFor(command: HermesEventHideCommand, document: HermesEventHideDocument, secret: string): string {
  if (Buffer.byteLength(secret, "utf8") < 32) throw new Error("Hermes review secret must be at least 32 bytes");
  const bound = canonicalize({
    protocol: "iopps-hermes-event-hide-review-v1",
    command,
    documentId: document.id,
    version: document.version,
    current: project(document),
  });
  return `v1.${createHmac("sha256", secret).update(bound, "utf8").digest("base64url")}`;
}

function exactMatch(command: HermesEventHideCommand, document: HermesEventHideDocument): boolean {
  const current = project(document);
  const activeMirrorMatches = command.status === "active"
    ? effectiveActive(document.data)
    : document.data.active === false;
  return document.id === command.eventId && current.title === command.title &&
    current.organization === command.organization && eventTypeMatches(document.data) &&
    current.status === command.status && activeMirrorMatches;
}

export async function reviewHermesEventHide(value: unknown, deps: HermesEventHideServiceDeps) {
  const normalized = normalizeHermesEventHideCommand(value);
  if (!normalized.ok) return { ok: false as const, status: 400, error: normalized.error };
  const document = await deps.getEvent(normalized.command.eventId);
  if (!document) return { ok: false as const, status: 404, error: "Event target was not found" };
  if (!exactMatch(normalized.command, document)) {
    return { ok: false as const, status: 409, error: "Event target did not match the exact requested projection" };
  }
  const current = project(document);
  return {
    ok: true as const,
    reviewToken: tokenFor(normalized.command, document, deps.reviewSecret),
    current,
    desired: { ...current, status: "hidden", active: false },
  };
}

function validToken(token: string, expected: string): boolean {
  if (!/^v1\.[A-Za-z0-9_-]{43}$/.test(token)) return false;
  const actualBytes = Buffer.from(token.slice(3), "base64url");
  const expectedBytes = Buffer.from(expected.slice(3), "base64url");
  return actualBytes.length === expectedBytes.length && timingSafeEqual(actualBytes, expectedBytes);
}

export async function applyHermesEventHide(value: unknown, deps: HermesEventHideServiceDeps) {
  if (!isRecord(value) || Object.keys(value).sort().join("\0") !== ["command", "confirmation", "reviewToken"].join("\0") ||
      value.confirmation !== EVENT_HIDE_CONFIRMATION || typeof value.reviewToken !== "string" || !value.reviewToken) {
    return { ok: false as const, status: 400, error: "Apply requires the exact command, review token, and confirmation" };
  }
  const normalized = normalizeHermesEventHideCommand(value.command);
  if (!normalized.ok) return { ok: false as const, status: 400, error: normalized.error };
  const document = await deps.getEvent(normalized.command.eventId);
  if (!document || !exactMatch(normalized.command, document) ||
      !validToken(value.reviewToken, tokenFor(normalized.command, document, deps.reviewSecret))) {
    return { ok: false as const, status: 409, error: "Review token is invalid or stale" };
  }
  const result = await deps.commit({ command: normalized.command, current: document });
  return { ok: true as const, ...result };
}
