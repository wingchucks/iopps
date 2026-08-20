import { createHash, createPublicKey, timingSafeEqual, verify } from "node:crypto";

export const HERMES_MACHINE_PROTOCOL = "iopps-hermes-admin-v1";

export interface HermesCanonicalRequestInput {
  method: string;
  url: string;
  timestamp: string;
  nonce: string;
  body: string;
  idempotencyKey?: string;
}

export function hashHermesBody(body: string): string {
  return createHash("sha256").update(body, "utf8").digest("hex");
}

export function normalizeHermesRequestPath(urlValue: string): string {
  const url = new URL(urlValue);
  const query = new URLSearchParams(url.search);
  query.sort();
  const normalizedQuery = query.toString();
  return `${url.pathname}${normalizedQuery ? `?${normalizedQuery}` : ""}`;
}

export function buildHermesCanonicalRequest(input: HermesCanonicalRequestInput): string {
  return [
    HERMES_MACHINE_PROTOCOL,
    input.method.trim().toUpperCase(),
    normalizeHermesRequestPath(input.url),
    input.timestamp.trim(),
    input.nonce.trim(),
    hashHermesBody(input.body),
    input.idempotencyKey?.trim() ?? "",
  ].join("\n");
}

function decodeBase64UrlExact(value: string): Buffer | null {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) return null;
  try {
    const decoded = Buffer.from(value, "base64url");
    if (decoded.length === 0) return null;
    const normalizedInput = value.replace(/=+$/g, "");
    const normalizedOutput = decoded.toString("base64url");
    if (normalizedInput.length !== normalizedOutput.length) return null;
    const inputBytes = Buffer.from(normalizedInput, "ascii");
    const outputBytes = Buffer.from(normalizedOutput, "ascii");
    if (!timingSafeEqual(inputBytes, outputBytes)) return null;
    return decoded;
  } catch {
    return null;
  }
}

export function verifyHermesMachineSignature(input: {
  canonicalRequest: string;
  signature: string;
  publicKeyPem: string;
}): boolean {
  try {
    const signature = decodeBase64UrlExact(input.signature);
    if (!signature || signature.length !== 64) return false;
    const publicKey = createPublicKey(input.publicKeyPem);
    if (publicKey.asymmetricKeyType !== "ed25519") return false;
    return verify(null, Buffer.from(input.canonicalRequest, "utf8"), publicKey, signature);
  } catch {
    return false;
  }
}

export interface HermesMachineRequestInput {
  method: string;
  url: string;
  body: string;
  headers: Record<string, string | undefined>;
}

export interface HermesMachineAuthDeps {
  now?: () => number;
  publicKeys: Record<string, string>;
  consumeNonce: (input: {
    keyId: string;
    nonceHash: string;
    expiresAt: Date;
  }) => Promise<boolean>;
  maxClockSkewSeconds?: number;
  maxBodyBytes?: number;
}

export type HermesMachineAuthResult =
  | {
      ok: true;
      keyId: string;
      timestampSeconds: number;
      nonceHash: string;
      idempotencyKey: string;
      canonicalRequest: string;
    }
  | { ok: false; status: number; error: string };

function machineHeader(headers: Record<string, string | undefined>, name: string): string {
  return headers[name] ?? headers[name.toLowerCase()] ?? "";
}

export async function authenticateHermesMachineRequest(
  request: HermesMachineRequestInput,
  deps: HermesMachineAuthDeps,
): Promise<HermesMachineAuthResult> {
  const maxBodyBytes = deps.maxBodyBytes ?? 32_768;
  if (Buffer.byteLength(request.body, "utf8") > maxBodyBytes) {
    return { ok: false, status: 413, error: "Request body too large" };
  }

  const keyId = machineHeader(request.headers, "x-hermes-key-id");
  const timestamp = machineHeader(request.headers, "x-hermes-timestamp");
  const nonce = machineHeader(request.headers, "x-hermes-nonce");
  const signature = machineHeader(request.headers, "x-hermes-signature");
  const idempotencyKey = machineHeader(request.headers, "x-hermes-idempotency-key");

  if (!keyId || !timestamp || !nonce || !signature) {
    return { ok: false, status: 401, error: "Missing machine authentication headers" };
  }
  if (
    !/^[A-Za-z0-9_-]{1,64}$/.test(keyId) ||
    !/^[A-Za-z0-9_-]{16,128}$/.test(nonce) ||
    !/^[A-Za-z0-9_-]{86}$/.test(signature)
  ) {
    return { ok: false, status: 401, error: "Invalid machine authentication headers" };
  }
  if (request.method.toUpperCase() !== "GET" && !/^[A-Za-z0-9._:-]{1,128}$/.test(idempotencyKey)) {
    return { ok: false, status: 400, error: "A valid idempotency key is required" };
  }

  if (!/^(0|[1-9][0-9]{0,11})$/.test(timestamp)) {
    return { ok: false, status: 401, error: "Invalid request timestamp" };
  }
  const timestampSeconds = Number(timestamp);
  if (!Number.isSafeInteger(timestampSeconds)) {
    return { ok: false, status: 401, error: "Invalid request timestamp" };
  }
  const nowSeconds = Math.floor((deps.now?.() ?? Date.now()) / 1000);
  const maxClockSkewSeconds = deps.maxClockSkewSeconds ?? 300;
  if (Math.abs(nowSeconds - timestampSeconds) > maxClockSkewSeconds) {
    return { ok: false, status: 401, error: "Request timestamp is outside the allowed window" };
  }

  const publicKeyPem = deps.publicKeys[keyId];
  if (!publicKeyPem) {
    return { ok: false, status: 401, error: "Unknown machine key" };
  }

  const canonicalRequest = buildHermesCanonicalRequest({
    method: request.method,
    url: request.url,
    timestamp,
    nonce,
    body: request.body,
    idempotencyKey,
  });
  if (!verifyHermesMachineSignature({ canonicalRequest, signature, publicKeyPem })) {
    return { ok: false, status: 401, error: "Invalid machine signature" };
  }

  const nonceHash = createHash("sha256")
    .update(`${keyId}\0${nonce}`, "utf8")
    .digest("hex");
  const consumed = await deps.consumeNonce({
    keyId,
    nonceHash,
    expiresAt: new Date((timestampSeconds + maxClockSkewSeconds * 2) * 1000),
  });
  if (!consumed) {
    return { ok: false, status: 409, error: "Replay detected" };
  }

  return {
    ok: true,
    keyId,
    timestampSeconds,
    nonceHash,
    idempotencyKey,
    canonicalRequest,
  };
}
