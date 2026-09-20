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
  editor preserves cents and exposes pay period; cards include known units. Rapid
  filter changes preserve the latest URL state instead of restoring stale filters.
- Organization, partner and profile job counts share published, unexpired jobs and
  authoritative mirror suppression. Partner cards and counts use one unique list.
  Legacy province-only locations normalize correctly; card descriptions are shorter.
  Counts select visible organizations before reading jobs. Small groups use indexed
  identities; larger directories share one active-job query to avoid query fanout.
  Public job lists, homepage and routing read active candidates plus only canonical
  shadows needed to suppress stale posts, instead of the complete job history.
  Organization job cards use the API's exact destination, including its ID suffix,
  so shared display slugs cannot send a visitor to another organization's job.
- Profile/settings text contrast, switch names/states, focus visibility and skip
  navigation are corrected. Obsolete public-member-directory preferences are removed.
  Salary preferences reject inverted/invalid ranges in client, API and Firestore rules.
- Organization signup uses the shared flow with preserved purchase/return intent.
  Retries restore either missing organization/employer mirror transactionally from
  stored data without resetting the existing profile, entitlements or membership.
  Employer-only repairs map stored organizationName/companyName aliases into the
  canonical name field. A source without any organization name returns an explicit
  setup error instead of creating a blank canonical profile.
  Privacy links and review wording are corrected. Billing explains free standard
  posting, distinguishes expired plans, and explains featured placement eligibility.
  Retired School, Program and standard-post purchases are rejected before Stripe;
  historical plan/receipt definitions remain available to existing fulfillment.
- School/education/training public entry points show a service update. Legacy account
  records remain manageable. Shop routes lead to Businesses and Spotlight to Live.
  Active sales copy no longer promises retired talent search or unsupported metrics.
  Organization profiles omit training records while the service is paused, including
  local previews, so active-looking cards cannot link to retired detail routes.
  Public opportunity cards and location panels use readable colors in both themes;
  panel buttons expose their selected state and signup links avoid nested buttons.
  Date-only event cards retain the listed calendar day in Canadian time zones.
- Extra shared-video lookups use a Firestore transaction budget of ten calls per
  minute and 500 per day per channel. Verified missing/private/foreign videos are
  cached for five minutes; verified video data and provider failures for one minute.
  Current feed videos need no extra reservation, and unavailable shared lookups do
  not fail the ordinary feed. Cache and limit records remain server-only under the
  existing default-deny rules; no provider configuration or quota was changed.
- Owners/admins can delete draft or closed events/scholarships after confirmation.
  Revision checks prevent overwrites, private tombstones prevent stale resurrection,
  and existing attendee/application history remains intact. Source links render on
  event details. Equivalent source/date/title duplicates combine only in the directory.
  Related scholarships exclude expired recommendations.
  Management resolves both canonical and legacy owner IDs; a moved canonical listing
  prevents a stale private copy from restoring the former owner's access.
- Feed/story requests resolve only matching opportunity IDs and slugs. Story detail
  requests avoid full post/opportunity scans while retaining uncached publication checks.
  Event/scholarship details also use scoped lookups. Directories query published
  records and reuse one-minute indexes for legacy IDs and organization names; all
  listing content, visibility and organization entitlements are read fresh. Newly
  imported status-less listings/name aliases may take up to a minute to appear.
- Job/organization metadata checks current public visibility with request-local
  memoization. Deleted linked organizations cannot reappear through legacy employer
  records. No persistent 15-minute identity cache remains for those details.
- Account closure deletes unshared personal uploads and queues a later sweep for old
  token uploads. Current and legacy application references preserve shared files.
  Both organization link fields and stored owner identifiers block owner self-deletion.
  The daily cleanup cron requires `CRON_SECRET` and retains failed work for retry.
- Password recovery uses an IOPPS-branded email through the existing Resend sender,
  with origin/App Check validation, email/IP limits and generic account-existence
  responses. Emulator recovery remains isolated from outbound mail.
- Administrator-assignment reviews derive a separate signing key from configured
  Firebase Admin credentials when the optional dedicated key is absent. Explicit
  keys remain compatible; invalid/missing key material fails closed. Super-admin
  authorization, reviewed state binding and exact confirmation remain required.

## Verification and release

Use the existing root CI/emulator/browser suites. Expanded regressions cover actual
application details, withdrawn controls, listing deletion, decimal hourly pay,
province/remote filters, billing expiry, salary validation, cleanup/archive retention,
metadata removal and password-recovery guards. Accessibility coverage is profile,
privacy, notification and career settings at 1440px/390px in light/dark themes; it is
not a claim of complete WCAG conformance.

Automatic Vercel deployment is disabled for this branch. Live domain promotion and
rules publication remain separate release steps. Follow `LAUNCH-RECOVERY.md` and preserve the
existing containment, paired-rules, exact-commit CI/security review and provider gates.
Verify the new cleanup cron and branded recovery delivery on the approved artifact;
local provider mocks do not prove production delivery or paid fulfillment.

Assigned organization administrators now load onboarding through the authenticated
dashboard context instead of assuming their account UID is the organization ID.
Failed loads show a retry action without redirecting to signup. The existing
browser suite checks resume/save at both widths, including that no UID-keyed
organization is created and an unrelated organization remains unchanged.

The independent PR review also flagged mobile direct reads of jobs, applications
and scholarships, profile/push fields outside the existing write allowlist, and
the native signup client's incompatible `user` role.
These restrictions already exist in serving commit `7af0eb9d` and the read-back
production rules; this candidate changes only salary validation. Mobile API migration
remains a separate follow-up outside this website
release. Preserve the existing privacy restrictions rather than reopening client
reads. Review the remediation delta from the serving commit, not only older master.

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
