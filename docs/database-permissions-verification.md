# Database permissions and hiring verification

Prepared on 2026-09-17 for the `codex/core-journeys-redesign` preview branch.

## Permission changes

- Raw member/user documents are self-only. Personal edits cannot change roles,
  organization links, account status or verification flags. Signed admin claims
  replace editable profile roles in Firestore admin checks.
- Direct job, post and application reads use protected or projected APIs instead.
  Public jobs/posts expose an explicit field allowlist; drafts stay hidden.
- Member discovery respects profile visibility, directory opt-out and field
  visibility, including page metadata. Private résumé links, salary preferences
  and internal roles are excluded. Full member search follows directory pages.
- Organization owners/admins receive only their organization's applicants.
  Candidate profile projections omit unrelated private files and salary data;
  the résumé submitted with an application remains available to its employer.
- Applicant status history excludes reviewer notes. Withdrawal and employer
  review are transactions, so simultaneous review cannot undo a withdrawal.
- Team membership changes use scoped server APIs. Removing a member strips org
  claims and revokes sessions; current database links take precedence over stale
  organization claims. Only the organization owner changes team roles.
- Conversations require participation, updates cannot replace participants, and
  message creation checks the sender's participation. Unread queries include the
  participant constraint. A new composite index supports those queries.
- Arbitrary client mail writes are denied. Message notifications derive a verified
  recipient from the existing message/conversation and use an idempotent queue ID.
- Organization artwork uploads cannot overwrite another UID's files; livestream
  promo uploads require signed admin claims. Résumés retain owner-only access.
- Direct account/organization deletion is denied, including for ordinary admins.
  Administrative deletion continues through the verified super-admin APIs. Ordinary
  members can close their own account through a recent-authentication server route;
  Nathan's Auth identity and organization owners are protected. An access tombstone
  blocks stale tokens and profile recreation. Shared applications/messages are retained.

Account closure first removes the profile and writes the access tombstone, then
deletes the Auth identity. An Auth cleanup failure returns a support-directed error
and leaves access blocked; it must not silently restore the account.

## Verification

- 19 isolated hiring HTTP groups; 5 super-admin, 16 business and 9 opportunity
  HTTP groups. Disposable accounts and data run only against `demo-iopps-preview`.
- 26 direct-client Firestore/Storage rule checks across privacy, applications,
  business review, opportunity publishing, payment and release regressions.
- 28 focused unit tests across member privacy, profile field protection,
  employer authorization, account access, API auth and super-admin identity.
- Production build and TypeScript pass. Changed-file ESLint has no errors;
  two existing `next/no-img-element` warnings remain in talent/team screens.
- Browser demo: 390px phone and 1280px desktop job review, simulated publication,
  shortlisting and reviewer notes. Province/treaty/CPIC/training details survive
  review. The public job board loads its filters and listing links.

These checks do not create live accounts, applications, job postings or email.
The HTTP journey is a backend integration test, not a fully authenticated
browser-to-emulator session or a physical Android device test.

Reproduce after building in the credential-free directory used by
`scripts/local-qa-server.mjs`:

```sh
QA_BUILD_DIR="$PWD" IOPPS_TEST_EMULATORS=true GCLOUD_PROJECT=demo-iopps-preview \
  npx firebase-tools@14 emulators:exec --project demo-iopps-preview \
  --only auth,firestore,storage \
  'node scripts/qa-hiring-journey-http.mjs && node scripts/qa-super-admin-http.mjs && node scripts/qa-business-journey-http.mjs && node scripts/qa-opportunity-journey-http.mjs'

IOPPS_TEST_EMULATORS=true GCLOUD_PROJECT=demo-iopps-preview \
  npx firebase-tools@14 emulators:exec --project demo-iopps-preview \
  --only auth,firestore,storage \
  'node --import ./scripts/test-typescript-loader.mjs --experimental-strip-types --test --test-concurrency=1 tests/privacy-rules-emulator.test.mjs tests/application-boundary-emulator.test.ts tests/application-emulator.test.mjs tests/business-review-rules-emulator.test.ts tests/opportunity-rules-emulator.test.ts tests/payment-rules-emulator.test.ts tests/publishing-rules-emulator.test.ts tests/release-rules-emulator.test.mjs'
```

## Coordinated release requirements

**The live Firebase rules and index have not been deployed. A Vercel preview
deployment alone does not activate these database protections.** The preview and
production app currently share the existing Firebase project; deploying stricter
rules before the compatible application can break older client reads and writes.

For production, deploy the added conversation index and allow it to become ready,
then coordinate promotion of the matching application and deployment of both
Firestore and Storage rules. Confirm Nathan's existing Auth identity is verified
and carries the required admin claim. No live identity provisioning is part of
this change. Include the existing business-review and opportunities release gates
and the separately audited migration of legacy drafts. Do not roll back the app
to incompatible direct-client access code while leaving these stricter rules active.

Storage changes cover ownership/admin upload boundaries; they are not evidence
of immediate revocation of every existing download URL or stale Storage token.
This work is a focused permissions/hiring review, not a complete audit of every
peripheral collection or third-party integration.
