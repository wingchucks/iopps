# Job flow reliability implementation — September 8, 2026

## Source of truth
Implementation starts from origin/master `71853a27`, not the older `618d2b87` checkout used for initial static audit. Current master includes #214–219 with imported-feed expiry, redesigned routes, saved application snapshots, and pay-period-aware discovery. Do not reimplement or report these as missing.

## Architecture inspected
- Root Next.js `src/` is production; `web/` is a different legacy application.
- Jobs are mirrored across `jobs` and legacy `posts`, normalized through public-job merge and stable route slugs.
- Imported-feed sync has complete-enumeration safeguards; removed jobs must not be inferred from incomplete feed fetches.
- Existing expiry supports closing dates with Saskatchewan date-only boundaries; read-time fallback and description-only deadlines need coverage.
- Job cards, detail and applicant flow historically resolved application destinations differently.
- Application storage/notifications already have snapshot and delivery helpers; reuse them, do not replace with client-only success claims.
- Organization profiles have completion gates, verification, entitlement and approval contracts. Preserve these while aligning signup and draft messaging.
- Existing Google Analytics collects page navigation; funnel tracking must exclude search terms and applicant content and distinguish external handoffs from actual submissions.

## Work and acceptance areas
1. Freshness: conservative explicit deadlines, read-time visibility, consistent cron mirrors, expired scholarship intake display, read-only audit queue.
2. Applications: shared safe destination resolution, real validation and required documents, closed-job rejection, idempotent persistence, durable receipt.
3. Authentication/employers: safe return and plan intent preservation, consistent password checks, explicit Indigenous identity choice, truthful draft/published state.
4. Discovery: homepage employer variety without source recheck freshness inflation; cautious explicit salary enrichment without annualization or guessing employment type.
5. Analytics: existing tracker only, allowlisted nonpersonal fields; external clicks are not completed applications.

## Verification baseline
Local non-emulator suite on starting branch: 319 tests, 309 pass, 10 fail. Evidence saved outside repository at `C:/Users/natha/AppData/Local/hermes/reports/iopps-implementation-20260908/baseline-tests.log`. Several tests assert pre-redesign markup; api-auth.test.ts has a Node ESM next/server import issue, and a dated trial fixture has expired. Report regressions against baseline; do not restore obsolete UI to satisfy stale text assertions.

Default Playwright configuration targets production and has mutation-capable setup. Do not run it for this task. Use an independent local-only configuration and demo Firebase emulators for authenticated submission tests. Never use Edge.

## Deliberate boundaries
No real applicant submissions, test emails, purchases, raw production database writes, or speculative job deletions. Broken external URLs and potentially extended roles require review rather than automatic closure. Do not silently roll recurring scholarships into a fabricated next round. Deployment requires reviewed code, build/CI results and exact live readback.
