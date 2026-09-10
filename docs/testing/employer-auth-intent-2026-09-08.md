# Employer/auth intent and save-confirmation implementation

Baseline: `71853a27`, branch `codex/job-flow-reliability-20260908`.

## Architecture understood

The active application is root `src/`, not `web/` or `web-legacy/`. Login already validates local `redirect` and resolves admin claims before member documents; `ProtectedRoute` already carries pathname/search through login and verification. Those baseline fixes were retained, not reimplemented.

Two signup contracts coexist. `/signup` runs the unified community/business/school wizard and submits complete organizations. `/org/signup` creates the account and preliminary organization, then `/org/onboarding` saves progress and calls the completion API. Schools are exempt from business readiness; businesses still require logo, story/tagline, and public contact. A visual merge was avoided: shared navigation/password helpers bridge the existing contracts without altering organization payloads or backend readiness checks.

The job creation POST returns a job ID but no persisted status. Its authenticated detail GET returns the saved record. Confirmation now reads that record rather than treating the requested status as a publication receipt.

## Changes

- Draft saved / Submitted for review / Published confirmations follow read-back `draft` / `pending` / `active`+`active:true`. Unknown, contradictory, or failed read-back produces neutral Job saved messaging and does not invite a duplicate write. Removed unconditional feed visibility and candidate-notification promises.
- Shared `authIntentHref` carries a validated local redirect and allowlisted plan. `postSignupDestination` routes plan intent to the existing checkout review page; it never writes billing state or entitlements.
- Login signup links and incomplete-profile redirects retain intent. Verification uses the shared safe redirect validator and retains its destination if signed out.
- Both signup routes and organization onboarding preserve intent; existing employers visiting org signup go through login's readiness resolution before checkout. Unified verification links retain organization/school resume context and signed-in users can continue without creating another account.
- Public paid pricing CTAs carry their exact selected plan. School signup no longer defaults to tier3 or silently starts checkout; explicit selection is required and navigates to checkout review.
- Both signup forms share the same eight-character password validation. Neither preselects Indigenous identity, even from the entrepreneur marketing entry point.

## Verification

Observed failing tests before implementation for persisted draft confirmation, publication/review state, auth handoff helper absence, missing page wiring/reverse login links, password policy absence, Indigenous/paid defaults, and existing-employer readiness routing; reran after each slice.

Final focused command:

`node --experimental-strip-types --test tests/auth-redirect.test.ts tests/signup-intent-policy.test.ts tests/job-save-confirmation.test.ts tests/organization-onboarding-client.test.ts tests/organization-profile.test.ts tests/signup-accessibility.test.ts tests/signup-mobile-layout.test.ts tests/auth-verification-email.test.ts tests/pricing.test.ts`

Result: **30 passed, 0 failed**. `npx tsc --noEmit --pretty false`: exit 0. Focused ESLint: exit 0, two existing warnings (login effect dependency and onboarding img). `git diff --check`: exit 0. Node emits existing MODULE_TYPELESS_PACKAGE_JSON warnings.

Broader run including `indigenous-entrepreneur-signup.test.ts`: **34 passed, 1 failed**, the obsolete homepage CTA assertion expecting `/signup?intent=indigenous-business` on the redesigned homepage. Homepage was not changed. The signup test's old Indigenous-preselection expectation was updated to the newly authorized neutral default; its other assertions pass.

## Limits / follow-up boundaries

- No browser-driven auth/account creation, verification email, live job write, Stripe checkout, emulator or production end-to-end flow was executed. Helper tests exercise real navigation/status logic with controlled read responses; UI wiring tests are source assertions, not rendered interaction coverage.
- The current creation API does not itself create pending-review jobs; the pending confirmation supports a persisted pending record but does not add moderation policy.
- `OrgRoute` independently drops pathname/intent on its bare login and onboarding redirects. It was outside the explicit owned-file list and was left unchanged. Existing-community `/org/upgrade` flow also does not consume the new intent helpers.
- Existing `/org/checkout` still has a tier1 fallback for a missing/unknown plan, and Stripe checkout success/cancel routes do not carry a job return path. No changes to checkout page/API were made in this slice. The new signup path always supplies an allowlisted explicit plan.
- Source inspection of `/api/stripe/checkout` found no token/ownership validation in that route. This is a pre-existing billing API concern, not repaired or exercised here; do not describe the billing backend as newly verified secure.
- Unified wizard fields remain in-memory; navigation/resume intent survives verification, but unsaved form/file state is not a durable draft.

No commit, push, deployment, production account creation, checkout, email, secrets access, or edits to other agents' listing/detail/application/freshness/rules/homepage files were performed.
