# Production Release Guardrails

This file defines the minimum rules for shipping `iopps.ca` without reintroducing old code.

## Canonical Production Source

- The canonical production branch is `master`.
- Production deploys must come from `master` only.
- If an emergency hotfix is deployed from another branch, that exact commit must be merged back into `master` immediately after the incident.

## Required Deployment Flow

1. Merge approved code into `master`.
2. GitHub Actions builds the app and creates a Vercel preview deployment.
3. The preview deployment must pass `npm run qa:production:smoke`.
4. Only after the preview smoke passes may the workflow promote that preview to production.
5. The workflow must then run `npm run qa:production:smoke` against `https://iopps.ca`.

If either smoke step fails, the release is not considered good.

## Production Smoke Coverage

The smoke script is [`scripts/qa-production-smoke.mjs`](../scripts/qa-production-smoke.mjs).

It currently verifies:

- employer QA login reaches `/org/dashboard`
- `/org/dashboard/jobs` shows `QA - Standard Job`
- the `Edit` link opens `/org/dashboard/jobs/qa-standard-job-northern-lights/edit`
- the edit form loads saved values
- `/jobs` search for `Westland` shows a visible location
- the public `Senior Insurance Advisor` page shows `Rimbey, AB`
- `Apply Now` goes to Dayforce

## Branch Rules

- No direct pushes to `master`
- No force pushes to `master`
- Pull requests are required for `master`
- At least one review is required before merge
- Required status checks must pass before merge

## Known Good Recovery Points

- Current live production branch: `codex/rollback-employer-job-fix`
- Current live commit promoted on April 13, 2026: `fc563274`
- Current smoke command: `npm run qa:production:smoke`

## Incident Rule

If production is ever fixed manually through Vercel promotion or alias changes:

1. identify the exact git commit behind the working deployment
2. merge that commit into `master`
3. tag the commit
4. rerun the smoke test

Do not leave production running from a branch that `master` does not contain.
