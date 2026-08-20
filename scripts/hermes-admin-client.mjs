#!/usr/bin/env node

import { createHash, createPrivateKey, randomBytes, sign } from "node:crypto";
import { readFile } from "node:fs/promises";

const PROTOCOL = "iopps-hermes-admin-v1";
const MAX_BODY_BYTES = 32_768;

function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

async function readPrivateKey() {
  const keyPath = process.env.HERMES_ADMIN_PRIVATE_KEY_PATH?.trim();
  const keyEnv = process.env.HERMES_ADMIN_PRIVATE_KEY_PEM;
  if (Boolean(keyPath) === Boolean(keyEnv)) {
    throw new Error(
      "Set exactly one of HERMES_ADMIN_PRIVATE_KEY_PATH or HERMES_ADMIN_PRIVATE_KEY_PEM",
    );
  }
  const pem = keyPath ? await readFile(keyPath, "utf8") : keyEnv.replace(/\\n/g, "\n");
  const key = createPrivateKey(pem);
  if (key.asymmetricKeyType !== "ed25519") throw new Error("The private key must be Ed25519");
  return key;
}

function canonicalPath(url) {
  const query = new URLSearchParams(url.search);
  query.sort();
  const normalized = query.toString();
  return `${url.pathname}${normalized ? `?${normalized}` : ""}`;
}

function canonicalRequest({ method, url, timestamp, nonce, body, idempotencyKey }) {
  const bodyHash = createHash("sha256").update(body, "utf8").digest("hex");
  return [
    PROTOCOL,
    method,
    canonicalPath(url),
    timestamp,
    nonce,
    bodyHash,
    idempotencyKey,
  ].join("\n");
}

function endpointUrl(baseValue, operation) {
  const base = new URL(baseValue);
  const allowLocalHttp = process.env.HERMES_ADMIN_ALLOW_HTTP_LOCALHOST === "true";
  const localHost = base.hostname === "localhost" || base.hostname === "127.0.0.1";
  if (base.protocol !== "https:" && !(allowLocalHttp && localHost && base.protocol === "http:")) {
    throw new Error("HERMES_ADMIN_BASE_URL must use HTTPS (or explicitly allowed localhost HTTP)");
  }
  if (base.username || base.password || base.search || base.hash) {
    throw new Error("HERMES_ADMIN_BASE_URL must be an origin without credentials, query, or fragment");
  }
  const paths = {
    review: "/api/hermes/v1/employers/review",
    apply: "/api/hermes/v1/employers/apply",
    "convert-review": "/api/hermes/v1/users/convert-to-individual/review",
    "convert-apply": "/api/hermes/v1/users/convert-to-individual/apply",
  };
  return new URL(paths[operation], base);
}

async function main() {
  const operation = process.argv[2];
  const bodyPath = process.argv[3];
  const operations = new Set(["review", "apply", "convert-review", "convert-apply"]);
  if (!operations.has(operation) || !bodyPath) {
    throw new Error(
      "Usage: node scripts/hermes-admin-client.mjs <review|apply|convert-review|convert-apply> <json-body-path>",
    );
  }

  const baseUrl = requiredEnv("HERMES_ADMIN_BASE_URL");
  const keyId = requiredEnv("HERMES_ADMIN_KEY_ID");
  const idempotencyKey = requiredEnv("HERMES_ADMIN_IDEMPOTENCY_KEY");
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(keyId)) throw new Error("HERMES_ADMIN_KEY_ID is invalid");
  if (!/^[A-Za-z0-9._:-]{1,128}$/.test(idempotencyKey)) {
    throw new Error("HERMES_ADMIN_IDEMPOTENCY_KEY is invalid");
  }

  const parsedBody = JSON.parse(await readFile(bodyPath, "utf8"));
  const body = JSON.stringify(parsedBody);
  const bodyBytes = Buffer.byteLength(body, "utf8");
  if (bodyBytes > MAX_BODY_BYTES) throw new Error(`JSON body exceeds ${MAX_BODY_BYTES} bytes`);

  const url = endpointUrl(baseUrl, operation);
  const timestamp = String(Math.floor(Date.now() / 1000));
  const nonce = randomBytes(24).toString("base64url");
  const canonical = canonicalRequest({
    method: "POST",
    url,
    timestamp,
    nonce,
    body,
    idempotencyKey,
  });
  const privateKey = await readPrivateKey();
  const signature = sign(null, Buffer.from(canonical, "utf8"), privateKey).toString("base64url");

  const response = await fetch(url, {
    method: "POST",
    redirect: "error",
    headers: {
      "content-type": "application/json",
      "content-length": String(bodyBytes),
      "x-hermes-key-id": keyId,
      "x-hermes-timestamp": timestamp,
      "x-hermes-nonce": nonce,
      "x-hermes-signature": signature,
      "x-hermes-idempotency-key": idempotencyKey,
    },
    body,
  });
  const responseText = await response.text();
  process.stdout.write(`${response.status} ${response.statusText}\n${responseText}\n`);
  if (!response.ok) process.exitCode = 1;
}

main().catch((error) => {
  process.stderr.write(`Hermes client failed: ${error instanceof Error ? error.message : "Unknown error"}\n`);
  process.exitCode = 1;
});
