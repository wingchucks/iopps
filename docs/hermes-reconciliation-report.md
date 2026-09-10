# Signed billing/publishing reconciliation report (local implementation)

## Contract
`POST /api/hermes/v1/reports/billing-publishing`

Canonical body (exact bytes): `{"report":"billing-publishing-v1"}`.
Use the existing signed client operation `reconciliation-report` with a JSON body file and existing signed-client environment configuration. Do not put private keys on command lines or in the repository.

This endpoint is **not deployed or approved for production use**. No historical production records have been audited by this implementation task.

## Authority and bounds
- Same Ed25519 machine-signature and durable nonce protocol as existing Hermes administration. The signature binds the canonical method/path/query, timestamp, nonce, raw-body hash and idempotency header. Public keys remain server-configured; no caller key or arbitrary collection/ID/filter/cursor/URL accepted.
- Only POST on the exact path, no query string. Exact content type, content length and UTF-8 body required. Body bounded to 128 bytes while reading, with a 3-second read deadline. Encodings, BOM, noncanonical JSON, duplicate/escaped keys and unknown fields rejected.
- At most one report attempt per authorized key per 60 seconds. Failed scans consume this budget too.
- Six fixed collections: subscriptions, employers, organizations, jobs, posts, stripeWebhookEvents. Fixed projections exclude names, email, descriptions, card/customer/provider objects and URLs. Retained projected records have a combined 2 MiB serialized-byte cap; an individual fetched page is additionally bounded by page size and Firestore document limits.
- Read-only Firestore transaction provides consistent cross-collection pagination, ordered by document ID; page size at most 200, at most 6 pages per collection, at most 1000 records per collection. An extra record detects overflow. Any overflow, bad ordering, duplicate document ID, invalid snapshot or backend failure returns a generic 503 **without partial aggregates**.
- No date filter: this intentionally scans retained records, including legacy records with missing dates, rather than silently omitting them. This is a bounded current snapshot of historical evidence, not an immutable history. Larger databases require a separately reviewed coverage design; callers cannot increase limits.

## Read-only means
No billing, employer, organization, job, post or webhook-event document is modified. Authentication writes only replay metadata in `hermesAdminNonces`; rate limiting writes only a hashed-key budget in `hermesReconciliationRateLimits`. These security metadata writes are necessary and are not record corrections. Nonce TTL remains the existing deployment concern; budgets reuse one document per signing key.

## Output
Aggregate counts only, `providerVerified: false`, coverage `complete-six-collection-projected-snapshot`, inventory and potential-issue counters, and explicit limitations. Responses are no-store/nosniff; no raw IDs, emails, tokens or provider errors returned. There is no monetary aggregate across records/currencies.

Potential issues include duplicate receipt-session groups, malformed receipt amount/tax/total fields or internal total mismatch, invalid employer credit fields, incomplete webhook evidence, completed webhook without a receipt, unresolved receipt/employer links, organization plan mirror differences, unresolved featured-listing owners and marked-active featured listings beyond current recorded plan/consumed-credit coverage.

Counters can overlap. They are review candidates, **not fraud findings**. Complimentary/unlinked receipts and legacy IDs are inventoried rather than automatically classified as unpaid. Current remaining credits are not compared to historic purchases; consumption, grants, deletions, historical plan changes and refunds prevent that inference. Consumed flags are not proof of payment. Expiry and actual public visibility are not inferred from active markers. Canonical job IDs suppress exact-ID legacy mirrors; same slugs alone are not merged.

## Tests and remaining gates
Tests exercise real Ed25519 signatures, nonce replay, rate limits, privacy, money-field integrity, legacy/complimentary records, plan/credit logic, projected pagination/caps, actual route invocation with emulator database and ephemeral fixture public keys, unchanged business-record readback and the real CLI through loopback HTTP.

Deployment approval, deployed-key/policy validation, actual historical report execution and any corrective operations are separate steps. Provider-ledger reconciliation is also separate; this API does not contact Stripe.
