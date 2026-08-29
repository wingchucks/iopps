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
import {
  ACCOUNT_CONVERSION_CONFIRMATION,
  applyHermesAccountConversion,
  reviewHermesAccountConversion,
  type HermesAccountConversionServiceDeps,
} from "./hermes-account-conversion.ts";
import type { HermesAccountConversionIdempotentResult } from "./hermes-account-conversion-firestore.ts";
import {
  applyHermesJobApproval,
  JOB_APPROVAL_CONFIRMATION,
  reviewHermesJobApproval,
  type HermesJobApprovalProjection,
  type HermesJobApprovalServiceDeps,
} from "./hermes-job-approval.ts";
import {
  applyHermesEventHide,
  EVENT_HIDE_CONFIRMATION,
  reviewHermesEventHide,
  type HermesEventHideProjection,
  type HermesEventHideServiceDeps,
} from "./hermes-event-hide.ts";

export interface HermesAdminApiDeps extends HermesMachineAuthDeps {
  reviewSecret: string;
  createEmployerServiceDeps: (execution: HermesExecutionContext) => HermesEmployerServiceDeps;
  getIdempotentApply?: (
    command: HermesEmployerCommand,
    execution: HermesExecutionContext,
  ) => Promise<HermesIdempotentApplyResult | null>;
}

export interface HermesAccountConversionApiDeps extends HermesMachineAuthDeps {
  reviewSecret: string;
  createAccountConversionServiceDeps: (
    execution: HermesExecutionContext,
  ) => HermesAccountConversionServiceDeps;
  getIdempotentConversionApply: (
    execution: HermesExecutionContext,
  ) => Promise<HermesAccountConversionIdempotentResult | null>;
}

export interface HermesJobApprovalApiDeps extends HermesMachineAuthDeps {
  reviewSecret: string;
  createJobApprovalServiceDeps: (execution: HermesExecutionContext) => HermesJobApprovalServiceDeps;
  getIdempotentJobApply: (execution: HermesExecutionContext) => Promise<{
    status: "applied" | "verified_noop";
    committedAt?: string;
    verified: HermesJobApprovalProjection;
  } | null>;
}

export interface HermesEventHideApiDeps extends HermesMachineAuthDeps {
  reviewSecret: string;
  createEventHideServiceDeps: (execution: HermesExecutionContext) => HermesEventHideServiceDeps;
  getIdempotentEventHideApply: (execution: HermesExecutionContext) => Promise<{
    status: "applied" | "verified_noop";
    committedAt?: string;
    verified: HermesEventHideProjection;
  } | null>;
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

export async function handleHermesAccountConversionReviewRequest(
  request: Request,
  deps: HermesAccountConversionApiDeps,
): Promise<Response> {
  const endpointError = validateEndpoint(request, "/api/hermes/v1/users/convert-to-individual/review");
  if (endpointError) return endpointError;
  try {
    const authenticated = await authenticateHermesJsonRequest(request, deps);
    if (!authenticated.ok) return requestError(authenticated.status, authenticated.error);
    const execution = executionFromAuthenticated(
      authenticated.keyId,
      authenticated.idempotencyKey,
      authenticated.body,
    );
    const result = await reviewHermesAccountConversion(
      authenticated.json,
      deps.createAccountConversionServiceDeps(execution),
    );
    return result.ok ? safeJson(result) : requestError(result.status, result.error);
  } catch {
    return hermesAdminInternalErrorResponse();
  }
}

function isConversionApplyEnvelope(value: unknown): value is { reviewToken: string; confirmation: string } {
  return isRecord(value) && Object.keys(value).length === 2 &&
    typeof value.reviewToken === "string" && value.confirmation === ACCOUNT_CONVERSION_CONFIRMATION;
}

export async function handleHermesAccountConversionApplyRequest(
  request: Request,
  deps: HermesAccountConversionApiDeps,
): Promise<Response> {
  const endpointError = validateEndpoint(request, "/api/hermes/v1/users/convert-to-individual/apply");
  if (endpointError) return endpointError;
  try {
    const authenticated = await authenticateHermesJsonRequest(request, deps);
    if (!authenticated.ok) return requestError(authenticated.status, authenticated.error);
    if (!isConversionApplyEnvelope(authenticated.json)) {
      return requestError(400, "Apply requires the review token and exact confirmation");
    }
    const execution = executionFromAuthenticated(
      authenticated.keyId,
      authenticated.idempotencyKey,
      authenticated.body,
    );
    const idempotent = await deps.getIdempotentConversionApply(execution);
    if (idempotent) {
      if (!idempotent.authCleanupComplete) {
        const serviceDeps = deps.createAccountConversionServiceDeps(execution);
        await serviceDeps.cleanupAuthClaims(idempotent.userId);
        await serviceDeps.markAuthCleanupComplete(idempotent);
      }
      return safeJson({
        ok: true,
        status: idempotent.status,
        ...(idempotent.committedAt ? { committedAt: idempotent.committedAt } : {}),
        verified: idempotent.verified,
      });
    }
    const result = await applyHermesAccountConversion(
      authenticated.json,
      deps.createAccountConversionServiceDeps(execution),
    );
    return result.ok ? safeJson(result) : requestError(result.status, result.error);
  } catch (error) {
    if (error && typeof error === "object" && "status" in error &&
        (error as { status?: unknown }).status === 409) {
      return requestError(409, "Hermes request conflicted with current state");
    }
    return hermesAdminInternalErrorResponse();
  }
}

export async function handleHermesJobApprovalReviewRequest(
  request: Request,
  deps: HermesJobApprovalApiDeps,
): Promise<Response> {
  const endpointError = validateEndpoint(request, "/api/hermes/v1/jobs/approve/review");
  if (endpointError) return endpointError;
  try {
    const authenticated = await authenticateHermesJsonRequest(request, deps);
    if (!authenticated.ok) return requestError(authenticated.status, authenticated.error);
    const execution = executionFromAuthenticated(
      authenticated.keyId,
      authenticated.idempotencyKey,
      authenticated.body,
    );
    const result = await reviewHermesJobApproval(
      authenticated.json,
      deps.createJobApprovalServiceDeps(execution),
    );
    return result.ok ? safeJson(result) : requestError(result.status, result.error);
  } catch {
    return hermesAdminInternalErrorResponse();
  }
}

function isJobApprovalApplyEnvelope(value: unknown): value is { reviewToken: string; confirmation: string } {
  return isRecord(value) && Object.keys(value).length === 2 &&
    typeof value.reviewToken === "string" && value.reviewToken.length > 0 &&
    value.confirmation === JOB_APPROVAL_CONFIRMATION;
}

export async function handleHermesJobApprovalApplyRequest(
  request: Request,
  deps: HermesJobApprovalApiDeps,
): Promise<Response> {
  const endpointError = validateEndpoint(request, "/api/hermes/v1/jobs/approve/apply");
  if (endpointError) return endpointError;
  try {
    const authenticated = await authenticateHermesJsonRequest(request, deps);
    if (!authenticated.ok) return requestError(authenticated.status, authenticated.error);
    if (!isJobApprovalApplyEnvelope(authenticated.json)) {
      return requestError(400, "Apply requires the review token and exact confirmation");
    }
    const execution = executionFromAuthenticated(
      authenticated.keyId,
      authenticated.idempotencyKey,
      authenticated.body,
    );
    const idempotent = await deps.getIdempotentJobApply(execution);
    if (idempotent) return safeJson({ ok: true, ...idempotent });
    const result = await applyHermesJobApproval(
      authenticated.json,
      deps.createJobApprovalServiceDeps(execution),
    );
    return result.ok ? safeJson(result) : requestError(result.status, result.error);
  } catch (error) {
    if (error && typeof error === "object" && "status" in error &&
        (error as { status?: unknown }).status === 409) {
      return requestError(409, "Hermes request conflicted with current state");
    }
    return hermesAdminInternalErrorResponse();
  }
}

export async function handleHermesEventHideReviewRequest(
  request: Request,
  deps: HermesEventHideApiDeps,
): Promise<Response> {
  const endpointError = validateEndpoint(request, "/api/hermes/v1/events/hide/review");
  if (endpointError) return endpointError;
  try {
    const authenticated = await authenticateHermesJsonRequest(request, deps);
    if (!authenticated.ok) return requestError(authenticated.status, authenticated.error);
    const execution = executionFromAuthenticated(authenticated.keyId, authenticated.idempotencyKey, authenticated.body);
    const result = await reviewHermesEventHide(authenticated.json, deps.createEventHideServiceDeps(execution));
    return result.ok ? safeJson(result) : requestError(result.status, result.error);
  } catch {
    return hermesAdminInternalErrorResponse();
  }
}

function isEventHideApplyEnvelope(value: unknown): value is { command: unknown; reviewToken: string; confirmation: string } {
  return isRecord(value) &&
    Object.keys(value).sort().join("\0") === ["command", "confirmation", "reviewToken"].join("\0") &&
    typeof value.reviewToken === "string" && value.reviewToken.length > 0 &&
    value.confirmation === EVENT_HIDE_CONFIRMATION;
}

export async function handleHermesEventHideApplyRequest(
  request: Request,
  deps: HermesEventHideApiDeps,
): Promise<Response> {
  const endpointError = validateEndpoint(request, "/api/hermes/v1/events/hide/apply");
  if (endpointError) return endpointError;
  try {
    const authenticated = await authenticateHermesJsonRequest(request, deps);
    if (!authenticated.ok) return requestError(authenticated.status, authenticated.error);
    if (!isEventHideApplyEnvelope(authenticated.json)) {
      return requestError(400, "Apply requires the exact command, review token, and confirmation");
    }
    const execution = executionFromAuthenticated(authenticated.keyId, authenticated.idempotencyKey, authenticated.body);
    const idempotent = await deps.getIdempotentEventHideApply(execution);
    if (idempotent) return safeJson({ ok: true, ...idempotent });
    const result = await applyHermesEventHide(authenticated.json, deps.createEventHideServiceDeps(execution));
    return result.ok ? safeJson(result) : requestError(result.status, result.error);
  } catch (error) {
    if (error && typeof error === "object" && "status" in error &&
        (error as { status?: unknown }).status === 409) {
      return requestError(409, "Hermes request conflicted with current state");
    }
    return hermesAdminInternalErrorResponse();
  }
}
