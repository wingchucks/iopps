import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("Hermes local client template requires explicit secure inputs and signs the canonical request", () => {
  const source = readFileSync(new URL("../scripts/hermes-admin-client.mjs", import.meta.url), "utf8");
  for (const required of [
    "HERMES_ADMIN_BASE_URL",
    "HERMES_ADMIN_KEY_ID",
    "HERMES_ADMIN_IDEMPOTENCY_KEY",
    "HERMES_ADMIN_PRIVATE_KEY_PATH",
    "HERMES_ADMIN_PRIVATE_KEY_PEM",
    "iopps-hermes-admin-v1",
    "x-hermes-signature",
    "content-length",
    "createPrivateKey",
    "ed25519",
  ]) {
    assert.ok(source.includes(required), required);
  }
  assert.doesNotMatch(source, /https:\/\/(www\.)?iopps\.ca/i);
  assert.doesNotMatch(source, /BEGIN (RSA |EC )?PRIVATE KEY/);
});

test("Hermes deployment docs describe secret derivation and the two-step API", () => {
  const env = readFileSync(new URL("../.env.example", import.meta.url), "utf8");
  assert.match(env, /HERMES_ADMIN_REVIEW_SECRET/);
  const docs = readFileSync(new URL("../docs/hermes-admin-api.md", import.meta.url), "utf8");
  assert.match(docs, /\/api\/hermes\/v1\/employers\/review/);
  assert.match(docs, /\/api\/hermes\/v1\/employers\/apply/);
  assert.match(docs, /HKDF/);
  assert.match(docs, /APPLY IOPPS EMPLOYER UPDATE/);
  assert.match(docs, /hermesAdminNonces/);
  assert.match(docs, /hermesAdminIdempotency/);
});
