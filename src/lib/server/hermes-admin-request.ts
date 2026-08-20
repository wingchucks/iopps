import { hkdfSync } from "node:crypto";

import {
  authenticateHermesMachineRequest,
  type HermesMachineAuthDeps,
  type HermesMachineAuthResult,
} from "./hermes-machine-auth.ts";

const REVIEW_HKDF_SALT = Buffer.from("iopps-hermes-admin-review-hkdf-v1", "utf8");
const REVIEW_HKDF_INFO = "iopps-hermes-admin/review-token/v1";

type HermesJsonAuthResult =
  | (Extract<HermesMachineAuthResult, { ok: true }> & { body: string; json: unknown })
  | Extract<HermesMachineAuthResult, { ok: false }>;

function requestHeaders(request: Request): Record<string, string | undefined> {
  return {
    "x-hermes-key-id": request.headers.get("x-hermes-key-id") ?? undefined,
    "x-hermes-timestamp": request.headers.get("x-hermes-timestamp") ?? undefined,
    "x-hermes-nonce": request.headers.get("x-hermes-nonce") ?? undefined,
    "x-hermes-signature": request.headers.get("x-hermes-signature") ?? undefined,
    "x-hermes-idempotency-key": request.headers.get("x-hermes-idempotency-key") ?? undefined,
  };
}

export async function authenticateHermesJsonRequest(
  request: Request,
  deps: HermesMachineAuthDeps,
): Promise<HermesJsonAuthResult> {
  const maxBodyBytes = deps.maxBodyBytes ?? 32_768;
  if (request.headers.get("content-type") !== "application/json") {
    return { ok: false, status: 400, error: "Content-Type must be application/json" };
  }
  if (request.headers.has("transfer-encoding") || request.headers.has("content-encoding")) {
    return { ok: false, status: 400, error: "Encoded or streamed request bodies are not supported" };
  }

  const declaredLength = request.headers.get("content-length") ?? "";
  if (!/^(0|[1-9][0-9]*)$/.test(declaredLength)) {
    return { ok: false, status: 400, error: "A canonical Content-Length header is required" };
  }
  const declaredBytes = Number(declaredLength);
  if (!Number.isSafeInteger(declaredBytes)) {
    return { ok: false, status: 400, error: "Invalid Content-Length header" };
  }
  if (declaredBytes > maxBodyBytes) {
    return { ok: false, status: 413, error: "Request body too large" };
  }

  let bytes: Uint8Array;
  try {
    bytes = new Uint8Array(await request.arrayBuffer());
  } catch {
    return { ok: false, status: 400, error: "Unable to read request body" };
  }
  if (bytes.byteLength !== declaredBytes) {
    return { ok: false, status: 400, error: "Content-Length does not match request body" };
  }

  let body: string;
  let json: unknown;
  try {
    if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
      throw new TypeError("UTF-8 BOM is not canonical");
    }
    body = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    if (!Buffer.from(body, "utf8").equals(Buffer.from(bytes))) {
      throw new TypeError("Request body is not canonical UTF-8");
    }
    json = JSON.parse(body) as unknown;
  } catch {
    return { ok: false, status: 400, error: "Request body must be valid UTF-8 JSON" };
  }

  const auth = await authenticateHermesMachineRequest(
    {
      method: request.method,
      url: request.url,
      body,
      headers: requestHeaders(request),
    },
    deps,
  );
  return auth.ok ? { ...auth, body, json } : auth;
}

type HermesSecretEnv = Record<string, string | undefined>;

function stripWrappingQuotes(value: string): string {
  return value.startsWith('"') && value.endsWith('"') ? value.slice(1, -1) : value;
}

function firebasePrivateKeyFromBase64(value: string | undefined): string {
  if (!value) return "";
  try {
    const decoded = Buffer.from(stripWrappingQuotes(value), "base64").toString("utf8");
    const parsed = JSON.parse(decoded) as Record<string, unknown>;
    const key = parsed.privateKey ?? parsed.private_key;
    return typeof key === "string" ? key : "";
  } catch {
    return "";
  }
}

export function deriveHermesAdminReviewSecret(env: HermesSecretEnv = process.env): string {
  const explicit = env.HERMES_ADMIN_REVIEW_SECRET;
  const firebasePrivateKey =
    env.FIREBASE_PRIVATE_KEY || firebasePrivateKeyFromBase64(env.FIREBASE_SERVICE_ACCOUNT_BASE64);
  const source = explicit || firebasePrivateKey;
  if (!source) {
    throw new Error("Hermes review secret material is unavailable");
  }

  const normalized = stripWrappingQuotes(source).replace(/\\n/g, "\n");
  if (Buffer.byteLength(normalized, "utf8") < 32) {
    throw new Error("Hermes review secret material must be at least 32 bytes");
  }
  const sourceDomain = explicit ? "explicit" : "firebase-private-key";
  const derived = hkdfSync(
    "sha256",
    Buffer.from(normalized, "utf8"),
    REVIEW_HKDF_SALT,
    Buffer.from(`${REVIEW_HKDF_INFO}/${sourceDomain}`, "utf8"),
    32,
  );
  return Buffer.from(derived).toString("base64url");
}
