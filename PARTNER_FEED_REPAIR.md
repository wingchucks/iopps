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
- Targeted ESLint passed; source TypeScript passed before Next generated route checks. Webpack compiled successfully. Generated route validation fails on existing unsupported named exports in admin/employers/[orgId], admin/employers/[orgId]/subscription, admin/users/[userId], and partners API routes. These four files are unchanged from the base commit. The full build is not passing and deployment is blocked until these existing route errors are repaired.

## Release boundary and remaining work
Original instruction keeps the live website unchanged. Review this isolated repair before deploying. After deployment, run and inspect the authenticated manual sync, verify new/updated counts and database identities, then inspect the next scheduled run. Database writes have not been exercised against production. Reconcile old listings separately using verified closure evidence, including the separate Agile source. This patch does not migrate preview accounts or content, replace the live UI, or promise that every website flow is fully verified.
