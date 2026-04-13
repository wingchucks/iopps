# Production Release Guardrails

This file defines the minimum rules for shipping `iopps.ca` without reintroducing old code.

## Canonical Production Source

- The canonical production branch is `release/production`.
- Production deploys must come from `release/production` only.
- `master` is not a production branch.
- If an emergency hotfix is deployed from another branch, that exact commit must be merged back into `release/production` immediately after the incident.

## Required Deployment Flow

1. Merge approved code into `release/production`.
2. GitHub Actions validates the Vercel release secrets, pulls preview env from Vercel, and creates a Vercel preview deployment.
3. The preview deployment must pass `npm run qa:production:smoke`.
4. Only after the preview smoke passes may the workflow pull production env, build production artifacts, and deploy production.
5. Vercel applies the project's configured production domains as part of the production deploy.
6. The workflow must then run `npm run qa:production:smoke` against `https://iopps.ca`.

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

- No direct pushes to `release/production`
- No force pushes to `release/production`
- Pull requests are required for `release/production`
- At least one review is required before merge
- Required status checks must pass before merge

## Required GitHub Secrets

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

If any of these are missing, the deploy workflow must fail before it tries to build or deploy anything.

## Known Good Recovery Points

- Current live production branch lineage: `codex/rollback-employer-job-fix`
- Canonical branch going forward: `release/production`
- Current live commit promoted on April 13, 2026: `fc563274`
- Current smoke command: `npm run qa:production:smoke`

## Incident Rule

If production is ever fixed manually through Vercel promotion or alias changes:

1. identify the exact git commit behind the working deployment
2. merge that commit into `release/production`
3. tag the commit
4. rerun the smoke test

Do not leave production running from a branch that `release/production` does not contain.
