# Hiring workflow verification

The hiring journey was exercised through real HTTP requests against the production
Next.js build and isolated Firebase Auth, Firestore and Storage emulators. It does
not create accounts, jobs, applications or emails in the existing Firebase project.

## Fixes

- Organization signup retries preserve existing profile data, plans and credits.
  Atomic create preconditions also protect against concurrent signup requests.
- Employers can edit résumé, cover letter and reference requirements after saving
  a job. Leaving an external application URL or deadline empty now clears it.
- The employer inbox finds both current and historical organization-linked
  applications, deduplicating records and retaining ownership checks.
- `/demo/responsive` offers phone, tablet and desktop widths for the actual public
  pages and fictional employer demo. Like the employer demo, it is unavailable
  in Vercel production and excluded from search indexing.

## Automated results

All 12 HTTP journey checks passed:

1. Organization signup and one-account dashboard routing.
2. Signup retry preserves the existing organization and credits.
3. Draft remains private and retains location and optional hiring details.
4. Publishing exposes the job and those details through the public jobs endpoint.
5. Edited application document requirements persist.
6. External application links and deadlines can be cleared.
7. Required documents are enforced and the submitted résumé survives deletion of
   the applicant's original upload.
8. Employer receives the application, candidate profile and archived résumé.
9. Review stages and notes persist. Applicants see status without private notes,
   and submission retries do not duplicate or overwrite the application.
10. Historical applications with only an organization identifier remain visible.
11. A different account cannot read or update the candidate's application.
12. Closing removes the public listing and prevents new applications while
    preserving existing receipts.

Additional checks: 12 publishing/delivery emulator regression tests, 7 focused
auth/onboarding/receipt/validation tests, production build with TypeScript, and
ESLint on the changed application files all passed.

## Reproduce

Use a credential-free build directory as required by
`scripts/local-qa-server.mjs`. The emulator project must be `demo-iopps-preview`.

```sh
QA_BUILD_DIR=/absolute/path/to/credential-free-build \
  npx firebase-tools@14 emulators:exec \
  --only auth,firestore,storage --project demo-iopps-preview \
  'node scripts/qa-hiring-journey-http.mjs'

IOPPS_TEST_EMULATORS=true npx firebase-tools@14 emulators:exec \
  --only auth,firestore,storage --project demo-iopps-preview \
  'node --import ./scripts/test-typescript-loader.mjs --experimental-strip-types --test tests/publishing-api-emulator.test.ts tests/application-delivery-emulator.test.ts'
```

## Verification boundaries

These results verify backend handoffs with fictional identities, not a complete
browser-to-emulator session. Live employer signup/publishing, actual email inbox
delivery and physical phone testing are separate checks. The responsive viewer
can verify layout and demo interactions at narrow widths; it does not emulate a
phone's browser, touch keyboard or operating system. Production data and deployment
are outside this test workflow.
