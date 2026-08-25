# Hermes Admin API

The Hermes Admin API contains narrow, machine-signed two-step workflows for reviewing and applying one employer-account correction, converting one employer account back to an individual account, or approving one exact job draft. It does not expose a general Firestore write surface.

## Server configuration

The Ed25519 public verification key and key ID are committed in `src/lib/server/hermes-admin-public-key.ts`. The matching private key must remain on the authorized local Hermes machine and must never be copied into this repository or a server environment variable.

Review tokens use a 32-byte key derived with domain-separated HKDF-SHA-256. The input is `HERMES_ADMIN_REVIEW_SECRET` when set; otherwise the server uses the Firebase Admin private-key material already configured through `FIREBASE_PRIVATE_KEY` or `FIREBASE_SERVICE_ACCOUNT_BASE64`. The server fails closed when neither source is available or the selected input is shorter than 32 bytes.

## Signed request contract

All workflow endpoints accept only `POST` with an exact `Content-Type: application/json` header, a canonical decimal `Content-Length`, valid UTF-8 JSON, and a maximum body size of 32,768 bytes. Encoded or streamed request bodies are rejected.

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

## Approve one exact draft job

Job review accepts exactly this body at `POST /api/hermes/v1/jobs/approve/review`:

```json
{
  "jobId": "exact-firestore-document-id"
}
```

`jobId` is an exact document ID, not a title, slug search, query, or path. The server reads that ID from both canonical storage locations used by the organization editor: `jobs/{jobId}` and the legacy `posts/{jobId}` fallback. A legacy post must have `type: "job"`. Zero matches return not found; two matches are ambiguous and rejected. A target is eligible when it is a draft (`status: "draft"` and not active). An already public-active record may pass review only so apply can prove and record a `verified_noop`; closed, inconsistent, and non-job targets are rejected.

The review response contains only safe `title`, `organization`, `status`, `featuredIntent`, and `entitlementDecision` projections plus an opaque HMAC review token. It contains no job description, application configuration, contact details, employer plan, credit balance, signature, nonce, or request metadata. The token is bound to the exact document ID, collection, schema, Firestore update version, and desired publication state, including whether `postedAt` must be initialized. For a featured draft, it also binds the exact employer/version, plan and tier inputs, credit balance, and the versioned active-featured-job set used by the normal entitlement decision.

Apply re-reads that featured entitlement state inside the publication transaction and rejects any employer, credit, plan, or active-featured-job drift. It uses the same featured-slot and purchased-credit decision helpers as the employer job editor, consumes exactly one `featuredPostCredits` credit only when that flow would, and records `featuredCreditConsumed` and `featuredCreditConsumedAt` consistently. Successful apply verifies both the published job and, for featured approvals, the employer credit balance before returning.

After inspecting the projections, send exactly this body to `POST /api/hermes/v1/jobs/approve/apply`:

```json
{
  "reviewToken": "token-returned-by-review",
  "confirmation": "APPROVE IOPPS JOB"
}
```

Apply re-resolves both storage locations and rejects missing, ambiguous, schema-changed, ineligible, or version-stale state. One Firestore transaction rechecks the bound target and changes only `status`, `active`, `updatedAt`, and `postedAt`: `status` becomes `active`, `active` becomes `true`, `updatedAt` uses a Firestore server timestamp, and `postedAt` uses a Firestore server timestamp only when it was absent at review and remains absent. This matches the organization editor's publication behavior. Every unrelated field, including the job body, contact and application fields, original creation data, and an existing `postedAt`, is preserved.

The transaction writes deterministic `hermesAdminIdempotency` and sanitized `hermesAdminAudit` records containing only protocol/operation metadata, the machine key ID, request hash, exact target identity, changed field names, outcome, and timestamps. Neither record stores the request body, job body, contact details, signature, nonce, review token, private key, or review secret. After commit, the server rereads the exact target and verifies `status: "active"`, `active: true`, and the required `postedAt`. An already-correct target returns `verified_noop` only after that exact reread. Exact apply retries reuse the same body and idempotency key with a fresh nonce/signature; cached success is returned only after re-resolving uniqueness and rereading public-active state.

## Convert an employer account to an individual account

Conversion review accepts exactly this body at `POST /api/hermes/v1/users/convert-to-individual/review`:

```json
{
  "email": "exact-normalized-email@example.invalid"
}
```

The server requires exactly one `users.email` match, the existing `members` document with the same document ID, exactly one linked employer, and exactly one linked organization. Link resolution deduplicates direct IDs and the existing `uid`, `ownerId`, `employerId`, email, and organization-link adapter patterns. All linked complimentary subscriptions found through `employerId`, `orgId`, or `organizationId` are deduplicated. Every resolved document ID and Firestore update version is bound into the HMAC-authenticated opaque review token. The response contains only that token and sanitized current/desired projections; internal IDs are not returned in the projections.

After inspecting the projections, send exactly this envelope to `POST /api/hermes/v1/users/convert-to-individual/apply`:

```json
{
  "reviewToken": "token-returned-by-review",
  "confirmation": "CONVERT IOPPS ACCOUNT TO INDIVIDUAL"
}
```

Apply re-resolves the target and rejects a stale token. One Firestore transaction rechecks every bound version, changes only the conversion allowlist, and preserves unrelated profile, application, and subscription data. It sets `users.role` and `members.role` to `community`, clears the account organization links with `null`, soft-disables and hides the employer and organization, downgrades their plan/subscription access to `free`/`expired`, and expires linked active complimentary subscription records. The login account is never deleted or disabled.

After verified Firestore readback, Firebase Auth cleanup removes only the `role`, `employer`, `employerId`, and `orgId` custom claims, preserves unrelated claims, revokes refresh tokens, and verifies claim readback. If Auth cleanup fails after the transaction commits, retry the exact same apply body with the same idempotency key and a fresh nonce/signature. The retry verifies the committed Firestore state, finishes claim cleanup, and returns the original `applied` or `verified_noop` result without repeating target writes. Audit and idempotency records are sanitized and never store the email, request body, nonce, signature, review token, review secret, or private key.

## Local client template

Prepare JSON body files locally, then set the client inputs explicitly. Do not put private-key values in shell history; a protected path is preferred.

```powershell
$env:HERMES_ADMIN_BASE_URL = "https://your-explicit-host.example"
$env:HERMES_ADMIN_KEY_ID = "your-committed-key-id"
$env:HERMES_ADMIN_IDEMPOTENCY_KEY = "unique-review-or-apply-key"
$env:HERMES_ADMIN_PRIVATE_KEY_PATH = "C:\protected\path\hermes-ed25519-private.pem"
node scripts/hermes-admin-client.mjs review .\review-body.json
```

For employer apply, use `apply`. For account conversion, use `convert-review` and then `convert-apply`. For one job approval, use `job-review` and then `job-apply`. Each apply uses a new idempotency key and an apply-body file containing the inspected review token and exact confirmation phrase; exact retries reuse that apply idempotency key and body. The alternative `HERMES_ADMIN_PRIVATE_KEY_PEM` input exists for secured process injection; set exactly one private-key source. Plain HTTP is refused except for explicit localhost testing with `HERMES_ADMIN_ALLOW_HTTP_LOCALHOST=true`.
