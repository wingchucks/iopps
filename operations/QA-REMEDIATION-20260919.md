# September 19 website QA remediation

Candidate: `codex/qa-remediation-20260919`, based on serving website commit
`7af0eb9dbdd4d2a334df1824a4e26ee75610e379`. That serving source is 42 commits
ahead of the current `master`; retain those already deployed changes when reviewing
or merging this candidate. The remediation delta starts at `7af0eb9d`.

## Corrected behavior

- Employer List and Board show submitted application details, contact information,
  cover letters and references. Withdrawn applications cannot be moved to another
  status. Existing application access and immutable archives remain authoritative.
- Province names and abbreviations match whole location tokens. Explicit remote and
  compensation statements enrich discovery without guessing a pay period. The job
  editor preserves cents and exposes pay period; cards include known units.
- Organization, partner and profile job counts share published, unexpired jobs and
  authoritative mirror suppression. Partner cards and counts use one unique list.
  Legacy province-only locations normalize correctly; card descriptions are shorter.
- Profile/settings text contrast, switch names/states, focus visibility and skip
  navigation are corrected. Obsolete public-member-directory preferences are removed.
  Salary preferences reject inverted/invalid ranges in client, API and Firestore rules.
- Organization signup uses the shared flow with preserved purchase/return intent.
  Privacy links and review wording are corrected. Billing explains free standard
  posting, distinguishes expired plans, and explains featured placement eligibility.
  Retired School, Program and standard-post purchases are rejected before Stripe;
  historical plan/receipt definitions remain available to existing fulfillment.
- School/education/training public entry points show a service update. Legacy account
  records remain manageable. Shop routes lead to Businesses and Spotlight to Live.
  Active sales copy no longer promises retired talent search or unsupported metrics.
- Owners/admins can delete draft or closed events/scholarships after confirmation.
  Revision checks prevent overwrites, private tombstones prevent stale resurrection,
  and existing attendee/application history remains intact. Source links render on
  event details. Equivalent source/date/title duplicates combine only in the directory.
  Related scholarships exclude expired recommendations.
- Job/organization metadata checks current public visibility with request-local
  memoization. Deleted linked organizations cannot reappear through legacy employer
  records. No persistent 15-minute identity cache remains for those details.
- Account closure deletes unshared personal uploads and queues a later sweep for old
  token uploads. Shared application files/archives remain retained. The daily cleanup
  cron requires `CRON_SECRET` and retains failed work for retry.
- Password recovery uses an IOPPS-branded email through the existing Resend sender,
  with origin/App Check validation, email/IP limits and generic account-existence
  responses. Emulator recovery remains isolated from outbound mail.

## Verification and release

Use the existing root CI/emulator/browser suites. Expanded regressions cover actual
application details, withdrawn controls, listing deletion, decimal hourly pay,
province/remote filters, billing expiry, salary validation, cleanup/archive retention,
metadata removal and password-recovery guards. Accessibility coverage is profile,
privacy, notification and career settings at 1440px/390px in light/dark themes; it is
not a claim of complete WCAG conformance.

Automatic Vercel deployment is disabled for this branch. This change has not modified
production configuration or records. Follow `LAUNCH-RECOVERY.md` and preserve the
existing containment, paired-rules, exact-commit CI/security review and provider gates.
Verify the new cleanup cron and branded recovery delivery on the approved artifact;
local provider mocks do not prove production delivery or paid fulfillment.

## Editorial records still requiring resolution

- City of Saskatoon has empty city/province fields. Prepare a scoped location repair
  from the official city source; do not overwrite other profile fields.
- Dawson Creek Pow Wow lacks its claimed poster/source. Official Cultural Gathering
  of Nations sources describe September 17–20; the imported record says September
  18–20. Confirm identity before replacing its name, dates or source.
- Custom Pactch combines `uae, Yukon` with Dubai business copy. Verify the location and
  directory eligibility with the owner; inconsistent fields alone do not prove fraud.

The confirmed AFN duplicate is handled by source/date/title directory deduplication;
both original detail URLs and records remain available.
