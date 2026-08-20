import { hashHermesBody, type HermesMachineAuthDeps } from "./hermes-machine-auth.ts";
import { authenticateHermesJsonRequest } from "./hermes-admin-request.ts";
import {
  applyHermesEmployer,
  normalizeHermesEmployerCommand,
  reviewHermesEmployer,
  type HermesEmployerCommand,
  type HermesEmployerServiceDeps,
} from "./hermes-employer-admin.ts";
import type {
  HermesExecutionContext,
  HermesIdempotentApplyResult,
} from "./hermes-firestore-adapter.ts";

export interface HermesAdminApiDeps extends HermesMachineAuthDeps {
  reviewSecret: string;
  createEmployerServiceDeps: (execution: HermesExecutionContext) => HermesEmployerServiceDeps;
  getIdempotentApply?: (
    command: HermesEmployerCommand,
    execution: HermesExecutionContext,
  ) => Promise<HermesIdempotentApplyResult | null>;
}

function safeJson(payload: unknown, status = 200): Response {
  return Response.json(payload, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export function hermesAdminInternalErrorResponse(): Response {
  return safeJson({ ok: false, error: "Hermes administrator request failed" }, 500);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function requestError(status: number, error: string): Response {
  return safeJson({ ok: false, error }, status);
}

function validateEndpoint(request: Request, pathname: string): Response | null {
  if (request.method !== "POST" || new URL(request.url).pathname !== pathname) {
    return requestError(404, "Hermes administrator endpoint not found");
  }
  return null;
}

function executionFromAuthenticated(
  keyId: string,
  idempotencyKey: string,
  body: string,
): HermesExecutionContext {
  return { keyId, idempotencyKey, requestHash: hashHermesBody(body) };
}

export async function handleHermesEmployerReviewRequest(
  request: Request,
  deps: HermesAdminApiDeps,
): Promise<Response> {
  const endpointError = validateEndpoint(request, "/api/hermes/v1/employers/review");
  if (endpointError) return endpointError;
  try {
    const authenticated = await authenticateHermesJsonRequest(request, deps);
    if (!authenticated.ok) return requestError(authenticated.status, authenticated.error);

    const execution = executionFromAuthenticated(
      authenticated.keyId,
      authenticated.idempotencyKey,
      authenticated.body,
    );
    const serviceDeps = deps.createEmployerServiceDeps(execution);
    const result = await reviewHermesEmployer(authenticated.json, serviceDeps);
    return result.ok ? safeJson(result) : requestError(result.status, result.error);
  } catch {
    return hermesAdminInternalErrorResponse();
  }
}

function normalizeApplyEnvelope(value: unknown):
  | { ok: true; command: unknown; reviewToken: string; confirmation: string }
  | { ok: false; error: string } {
  if (!isRecord(value)) return { ok: false, error: "Apply request must be an object" };
  const allowed = new Set(["command", "reviewToken", "confirmation"]);
  if (
    Object.keys(value).length !== allowed.size ||
    Object.keys(value).some((key) => !allowed.has(key)) ||
    typeof value.reviewToken !== "string" ||
    typeof value.confirmation !== "string" ||
    !("command" in value)
  ) {
    return { ok: false, error: "Apply request has an invalid envelope" };
  }
  return {
    ok: true,
    command: value.command,
    reviewToken: value.reviewToken,
    confirmation: value.confirmation,
  };
}

export async function handleHermesEmployerApplyRequest(
  request: Request,
  deps: HermesAdminApiDeps,
): Promise<Response> {
  const endpointError = validateEndpoint(request, "/api/hermes/v1/employers/apply");
  if (endpointError) return endpointError;
  try {
    const authenticated = await authenticateHermesJsonRequest(request, deps);
    if (!authenticated.ok) return requestError(authenticated.status, authenticated.error);
    const envelope = normalizeApplyEnvelope(authenticated.json);
    if (!envelope.ok) return requestError(400, envelope.error);
    const normalized = normalizeHermesEmployerCommand(envelope.command);
    if (!normalized.ok) return requestError(400, normalized.error);

    const execution = executionFromAuthenticated(
      authenticated.keyId,
      authenticated.idempotencyKey,
      authenticated.body,
    );
    const idempotent = await deps.getIdempotentApply?.(normalized.command, execution);
    if (idempotent) return safeJson({ ok: true, ...idempotent });
    const serviceDeps = deps.createEmployerServiceDeps(execution);
    const result = await applyHermesEmployer(envelope, serviceDeps);
    return result.ok ? safeJson(result) : requestError(result.status, result.error);
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "status" in error &&
      (error as { status?: unknown }).status === 409
    ) {
      return requestError(409, "Hermes request conflicted with current state");
    }
    return hermesAdminInternalErrorResponse();
  }
}
