# Partner feed repair

Prepared in an isolated checkout; no production deployment, feed trigger, or database mutation performed.

## Changes
- Shared source reader used by scheduled and manual sync.
- Westland Dayforce: public CSRF session, all search pages, metadata and employer/board validation, canonical job detail links.
- SIGA Oracle: paginate the nested requisition list instead of relying on the outer REST limit.
- Reject unsupported feeds, unexpected webpages, incomplete/repeated results and source errors instead of reporting an empty success.
- Match legacy Dayforce application URLs within the employer. Attach matching records to the configured feed; keep their existing application links.
- Record item failures and update counts; report partial failures as unsuccessful. Normalize publication dates and manual-sync active status.

## Evidence (September 7, 2026, Saskatchewan time)
- Read-only live source retrieval: Westland 127 unique jobs; SIGA 27 unique jobs. Old SIGA response exposed only the first 25.
- Sample detail links returned HTTP 200 and contained their job titles for both sources.
- Read-only comparison: 58 stored Westland jobs, only one matching the current 127 source jobs. Three stored listings point to a separate Agile board. Absence is not used to delete or expire these records.
- 13 regression tests pass, covering CSRF cookie replacement, pagination, incomplete/repeated/malformed responses, HTTP failures, employer/board-safe legacy URL matching, XML publication dates, and unsupported sources.
- The initial build exposed four pre-existing route-export errors. Those are repaired in the follow-up below.

## Release boundary and remaining work
Original instruction keeps the live website unchanged. Review this isolated repair before deploying. After deployment, run and inspect the authenticated manual sync, verify new/updated counts and database identities, then inspect the next scheduled run. Database writes have not been exercised against production. Reconcile old listings separately using verified closure evidence, including the separate Agile source. This patch does not migrate preview accounts or content, replace the live UI, or promise that every website flow is fully verified.

## Follow-up: build repair and listing reconciliation

Moved the existing pure helpers out of the four Next.js route modules into server-library files; route authentication and handler behavior remain the same. Updated the existing tests to import those helpers directly.

Validation: all 20 feed and affected-route regression tests pass. Run with `node --import ./scripts/test-typescript-loader.mjs --test tests/admin-employer-route.test.ts tests/admin-user-route.test.ts tests/admin-employer-subscription-route.test.ts tests/api-partners-route.test.ts tests/feed-source.test.ts`. Targeted ESLint passed. The build now passes compilation and generated route type validation; an initial page-data check lacked Firebase public configuration, so the full build was rerun with only the existing public configuration, without service-account credentials.

Read-only reconciliation found:
- SIGA: all 27 current source jobs already represented; 253 active stored records absent from the complete current source.
- Westland main board: 127 current source jobs, one matched stored record; 126 new records to import, 54 active old records absent.
- Separate Agile board: six current jobs; none of the three stored Agile listings remain in those current results. This board is not silently added to the Westland main feed.

The selected-record audit is retained in `output/partner-reconciliation.json` in this checkout (local artifact, not committed). Absence is a cleanup candidate, not proof of an individually confirmed closed position. No jobs were deleted or expired. The redesign remains private, and no live backend changes have been deployed.

Final build result: `next build --webpack` completed successfully, including type validation, all 139 static pages, and build traces. Public Firebase configuration was supplied to the build process only. Expected missing-admin-credential warnings appeared for data reads; authenticated production runtime and database writes are not validated by this build.
