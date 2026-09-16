# Business profile and discovery verification

Implemented on `codex/core-journeys-redesign` for preview review.

The shared organization editor now supports explicit optional business identity,
all 13 Canadian provinces and territories, broader territory choices, services,
community context and public contact details. The business demo uses this editor
with local state and a separate saved-profile preview. It never authenticates,
writes to Firebase, uploads images or publishes a business.

The directory supports shareable search, province, industry and identity filters.
NACCA and BDC links are independent official resources, not IOPPS partnerships.

## Verified API handoffs

`scripts/qa-business-journey-http.mjs` now passes sixteen checks (including the listing review cycle described in `business-listing-review-verification.md`) against a production
Next.js build and Firebase emulators using `demo-iopps-preview`:

1. Business-only signup reaches the shared organization dashboard.
2. Owner edits save identity, location and services without changing entitlements
   or another organization supplied in the request body.
3. After directory approval, public profile and directory return saved details but omit owner identifiers,
   billing metadata, internal notes and email templates.
4. Anonymous and unrelated accounts cannot edit the business.
5. Clearing identity preserves separate Nation and territory fields.
6. Explicitly hidden profiles disappear from both public endpoints and can return.
7. Retried signup preserves profile edits and existing credits.
8. The same business account can draft a job without another signup or publication.

Fourteen focused unit tests also passed. They cover explicit versus inferred
identity, clearing identity, malformed identity input, public response fields,
province name/code matching, normalization and visibility.

## Reproduce

Use a credential-free build directory, as enforced by the QA server helper.

```sh
node --import ./scripts/test-typescript-loader.mjs --experimental-strip-types --test tests/organization-profile.test.ts tests/public-organization.test.ts

QA_BUILD_DIR=/absolute/path/to/credential-free-build \
  npx firebase-tools@14 emulators:exec \
  --only auth,firestore,storage --project demo-iopps-preview \
  'node scripts/qa-business-journey-http.mjs'
```

## Boundaries

These checks exercise real API routes with isolated fictional identities. They do
not create or modify a live organization, test actual email inbox delivery, submit
funding applications, or establish funding partnerships. Demo photo uploads are
explicitly unavailable. Physical phone testing remains separate from responsive
preview frame checks.

Official resource links checked on 2026-09-16:

- https://nacca.ca/indigenous-financial-institutions/indigenous-financial-institutions-directory-map
- https://nacca.ca/about-nacca/indigenous-entrepreneurship-program
- https://www.bdc.ca/en/i-am/indigenous-entrepreneur
