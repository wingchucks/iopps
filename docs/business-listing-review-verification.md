# Business listing review

Implemented on `codex/core-journeys-redesign`, 2026-09-16. Preview only.

## Behavior

- New business accounts receive a separate directory draft. Email confirmation
  and account approval do not approve the public listing. Hiring tools continue
  to work from the same organization account.
- The owner saves their profile and submits it from the status card. Required
  information is name, logo, description, city/province and a public contact
  method. Indigenous identity, Nation and territory remain optional.
- `/admin/business-reviews` provides a paginated queue, saved profile details,
  approval, requested changes and rejection. Negative decisions require feedback.
  The owner sees that feedback in their dashboard, including after signing in
  again. Refresh status retrieves the latest decision.
- Every review transition records a private audit entry and an activity entry.
  New submissions add an admin notification. No review emails are sent.
- Only the current submitted version can be approved. Profile edits invalidate
  approval and return the listing to draft; no-op saves preserve approval. A
  stale revision or review status returns 409 instead of overwriting a decision.
- Approval checks listing quality; it does not grant a verification badge, certify
  Indigenous ownership, or create a paid partnership.
- Public profiles, directory, partner listings and organization sitemap entries
  honor review visibility. Public APIs omit feedback and account-only fields.
- Existing profiles without review metadata retain existing visibility. Their
  next public content edit enters review. There is no bulk migration or automatic
  removal of existing businesses.

## Interactive preview

`/demo/business-review` uses the same status and review components with a fictional
business stored only in component state. It offers owner, admin and public views,
including submit, feedback, correction, resubmit, approval and rejection. It never
writes to Firebase. `/demo/responsive` includes this page at phone, tablet and
desktop widths. Demo routes are unavailable on Vercel production deployments.

## Verification

- Production Next.js build passed.
- Focused lint: no errors; two existing warnings in the older dashboard/onboarding
  code (unused legacy editor and a pre-existing image element).
- 19 unit tests passed: profile normalization, identity, provinces, public fields,
  partner selection, and directory review visibility/revision behavior.
- 16 real HTTP workflow checks passed against a separate credential-free Next.js
  server with Auth/Firestore emulators (`demo-iopps-preview`). These cover signup,
  hidden drafts, incomplete submissions, owner/admin authorization, feedback,
  stale decisions, public approval, no-op edits, revocation, preserved account
  moderation, idempotent signup/submission and job drafts from a business account.
- 9 emulator rules tests passed, covering direct-write bypasses, draft/feedback
  privacy, billing protection, private email templates and organization management.

Run the HTTP and rules checks with the checked-out rules and a credential-free
build directory:

```sh
node --import ./scripts/test-typescript-loader.mjs --experimental-strip-types --test \
  tests/business-listing-review.test.ts tests/organization-profile.test.ts \
  tests/public-organization.test.ts tests/api-partners-route.test.ts

QA_BUILD_DIR=/absolute/path/to/credential-free-build \
IOPPS_TEST_EMULATORS=true GCLOUD_PROJECT=demo-iopps-preview \
npx firebase-tools@14 emulators:exec --project demo-iopps-preview \
  --only auth,firestore,storage \
  'node scripts/qa-business-journey-http.mjs && node --import ./scripts/test-typescript-loader.mjs --experimental-strip-types --test tests/business-review-rules-emulator.test.ts tests/payment-rules-emulator.test.ts tests/release-rules-emulator.test.mjs'
```

## Launch dependency

The checked-in Firestore rules are part of this feature: they prevent direct
client creation/public edits from bypassing review and restrict raw organization
and employer documents to the organization and admins. Public pages use sanitized
API reads instead. Private email-template updates still work.

**These rules have not been deployed to the live Firebase project.** Vercel
preview uses the live backend, so all write tests use isolated emulators and the
interactive demo. Deploy the compatible application and these rules together
before treating listing moderation as enforced for live users. A Vercel deploy
alone does not activate the rules. No production deployment, live listing
moderation, real account creation, or real email delivery was performed here.
