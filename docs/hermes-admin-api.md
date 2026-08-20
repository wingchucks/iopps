# Hermes Admin API

The Hermes Admin API is a narrow, machine-signed two-step workflow for reviewing and applying one employer-account correction. It does not expose a general Firestore write surface.

## Server configuration

The Ed25519 public verification key and key ID are committed in `src/lib/server/hermes-admin-public-key.ts`. The matching private key must remain on the authorized local Hermes machine and must never be copied into this repository or a server environment variable.

Review tokens use a 32-byte key derived with domain-separated HKDF-SHA-256. The input is `HERMES_ADMIN_REVIEW_SECRET` when set; otherwise the server uses the Firebase Admin private-key material already configured through `FIREBASE_PRIVATE_KEY` or `FIREBASE_SERVICE_ACCOUNT_BASE64`. The server fails closed when neither source is available or the selected input is shorter than 32 bytes.

## Signed request contract

Both endpoints accept only `POST` with an exact `Content-Type: application/json` header, a canonical decimal `Content-Length`, valid UTF-8 JSON, and a maximum body size of 32,768 bytes. Encoded or streamed request bodies are rejected.

Required headers:

- `x-hermes-key-id`
- `x-hermes-timestamp` — Unix seconds, within five minutes of server time
- `x-hermes-nonce` — a new random base64url-safe value for every attempt
- `x-hermes-signature` — unpadded base64url Ed25519 signature
- `x-hermes-idempotency-key` — reuse this for an exact retry, but not for a different body

The UTF-8 string signed by the client is:

```text
iopps-hermes-admin-v1
POST
<path with sorted query parameters>
<timestamp>
<nonce>
<lowercase SHA-256 of the exact body bytes>
<idempotency key>
```

The server verifies the exact body before parsing it. A successfully authenticated nonce is persisted in `hermesAdminNonces`; configure Firestore TTL on its `expiresAt` field for storage cleanup. Reuse is rejected even if TTL deletion is delayed.

## Review then apply

Send the desired command directly to `POST /api/hermes/v1/employers/review`:

```json
{
  "email": "exact-normalized-email@example.invalid",
  "organizationName": "Correct Organization Name",
  "subscriptionStart": "2026-01-01",
  "subscriptionEnd": "2027-01-01"
}
```

The server requires exactly one `users.email` match and exactly one deduplicated `employers.email` or `employers.contactEmail` match. It also resolves at most one organization linked by `organizations.employerId` (including an organization whose document ID differs from the employer ID) and at most one existing subscription matching the bound `employerId`, the resolved `orgId`, or the legacy employer ID stored in `orgId`, together with `plan=tier2` and `billingCycle=annual`; matches are deduplicated and ambiguity is rejected. It returns current and desired safe projections plus an opaque review token bound to the exact user, employer, organization, and subscription document IDs, their Firestore update versions, and the normalized desired state.

After inspecting that response, send `POST /api/hermes/v1/employers/apply`:

```json
{
  "command": {
    "email": "exact-normalized-email@example.invalid",
    "organizationName": "Correct Organization Name",
    "subscriptionStart": "2026-01-01",
    "subscriptionEnd": "2027-01-01"
  },
  "reviewToken": "token-returned-by-review",
  "confirmation": "APPLY IOPPS EMPLOYER UPDATE"
}
```

Apply uses a Firestore transaction to recheck every bound version and then writes only the allowlisted role, organization identity, approved/verified state, and complimentary Premium/tier2 subscription fields. An existing unique tier2 annual subscription keeps its exact document ID; a deterministic subscription ID is used only when no matching subscription exists. The `hermesAdminIdempotency` document ID is deterministic. A sanitized record is written to `hermesAdminAudit`; it contains no signature, nonce, review token, request body, private key, or review secret. After the transaction, the server rereads the user, employer, organization, and subscription documents and verifies the employer and organization desired fields independently. An already-correct target is recorded and returned as `verified_noop` without target writes only when both documents independently match.

All responses use `Cache-Control: no-store` and omit internal exception details.

## Local client template

Prepare JSON body files locally, then set the client inputs explicitly. Do not put private-key values in shell history; a protected path is preferred.

```powershell
$env:HERMES_ADMIN_BASE_URL = "https://your-explicit-host.example"
$env:HERMES_ADMIN_KEY_ID = "your-committed-key-id"
$env:HERMES_ADMIN_IDEMPOTENCY_KEY = "unique-review-or-apply-key"
$env:HERMES_ADMIN_PRIVATE_KEY_PATH = "C:\protected\path\hermes-ed25519-private.pem"
node scripts/hermes-admin-client.mjs review .\review-body.json
```

For apply, use a new idempotency key and an apply-body file containing the inspected review token and exact confirmation phrase. The alternative `HERMES_ADMIN_PRIVATE_KEY_PEM` input exists for secured process injection; set exactly one private-key source. Plain HTTP is refused except for explicit localhost testing with `HERMES_ADMIN_ALLOW_HTTP_LOCALHOST=true`.
