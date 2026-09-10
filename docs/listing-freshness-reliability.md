# Listing freshness reliability

## Current-source findings

Baseline inspected: `71853a27`, branch `codex/job-flow-reliability-20260908`.

- `jobs` imports use `active=true`; employer `posts` use `type=job,status=active`. Public merge already suppresses explicit inactive/hidden records and deduplicates imported/post identities. It previously did not evaluate dates.
- The current expiry cron already checks both collections, queries both active/status representations, batches at 400, retains documents, and checks `expiresAt`. The older audit's claim that expiresAt was absent is obsolete. The remaining defect was `closingDate || deadline || expiresAt` masking an earlier expiry, plus no description cutoff or mirror repair.
- Feed reconciliation already restricts removal to complete employer/source-scoped enumerations; empty sources require confirmation. Those guards remain intact. Source lifecycle now evaluates retained expiry and explicit description dates before reopening.
- `src/lib/listing-freshness.ts` is dependency-free/browser-safe; `job-expiration.ts` re-exports its functions. Pass full records to `isPublicJobRecordVisible` or `isJobRecordExpired`, not a status-only projection.

## Policy

Explicit valid `closingDate`, `deadline`, `applicationDeadline`, and `expiresAt` are independent cutoffs. Calendar dates (ISO or full English month, with year) remain valid through their America/Regina calendar day. ISO timestamps require an offset/Z. Impossible/ambiguous dates remain unknown.

Description inference requires an application/closing/apply-by label, or a standalone sentence/paragraph `Deadline`, immediately followed by a full date. Structured application fields override prose; employment terms, project/term deadlines, yearless dates, conflicting dates and open-until-filled do not automatically expire.

The public job list and detail recheck expiry; detail checks before hydration and again after hydration. Job list/detail responses are `no-store` to avoid stale eligibility. **Tradeoff:** this raises read traffic relative to previous CDN caching; a future data-only cache must still run eligibility after retrieving cached records. Existing detail hydration writes have NOT been removed, so the audit never calls detail routes.

Cron expiration sets both `active=false,status=expired`; contradictory hidden-status/active flags become inactive without erasing the archival status. Explicit active=false wins over status=active. No documents/applications are deleted. Scholarship API and directory/detail display closed intake while retaining recurring programs and provider links.

## Read-only audit

Node 22.18+ (native TypeScript) or Node 25:

```bash
node --import ./scripts/test-typescript-loader.mjs scripts/audit-listing-freshness.mjs --live --output artifacts/listing-freshness.json --link-origin https://scoinc.mb.ca
node --import ./scripts/test-typescript-loader.mjs scripts/audit-listing-freshness.mjs --input inventory.json --output artifacts/listing-freshness.json
```

Input is `{jobs: [...], scholarships: [...]}` or a jobs array. `--live` and `--input` are mutually exclusive. Live GETs are hardcoded to `https://iopps.ca/api/jobs` and `/api/scholarships`; count mismatch, duplicate/missing IDs, HTTP failures or malformed payloads fail the command. No secrets required. Without `--link-origin`, there are no employer probes. Each approved origin permits sequential HEAD-only probes with a 10s timeout, no credentials/redirects, and no `/api` paths. Approve public employer origins only. Redirects, 403, timeouts and broken links become review items, never automatic deletion. Reachability is not proof an opening is current.

## Tests

```bash
node --import ./scripts/test-typescript-loader.mjs --test tests/listing-freshness.test.ts tests/listing-freshness-routes.test.ts tests/listing-freshness-audit.test.mjs tests/scholarship-freshness-ui.test.ts tests/job-expiration.test.ts tests/feed-source.test.ts tests/public-job-counts.test.ts tests/job-discovery.test.ts
npx tsc --noEmit
git diff --check
```

Observed RED before each feature slice: prose deadline visible; expiresAt masked; structured extension overridden by prose; impossible calendar date expired; source expiry ignored; cron missing expiry/mirror update; detail returned 200; scholarship missing intake flag; UI missing closed-intake label; audit/helper/CLI/live support missing; hydrated expired detail returned 200; project deadline incorrectly treated as an application cutoff. Then GREEN: 48 focused tests, zero failures; typecheck and diff check passed. Node's existing MODULE_TYPELESS_PACKAGE_JSON warnings remain. UI assertions verify wiring/labels, not visual/browser rendering.

## Follow-up boundaries

The routing helper `server/public-job-routing.ts` selects only status/slug/recency fields, not deadline/description fields. Detail still rejects an expired resolved record, but colliding slugs may resolve differently after list expiry filtering. Coordinating owner should update routing candidate projection/merge for identical list/detail slug maps. Application entry points, homepage and other UI paths are separately owned. No deployment, production mutation, expiry cron call, commit or push occurred.
