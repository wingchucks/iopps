# Production Source of Truth

As of 2026-04-17, the canonical production web app for `iopps.ca` is:

- repo root
- Next.js app under `src/`
- Vercel project: `wingchucks-projects/iopps`
- Vercel root directory: `.`
- GitHub production branch: `master`
- Vercel production branch: `master`

## Rules

Do not deploy production from:

- `web/`
- `web-legacy/`
- `live14/`
- `live14deploy/`

Those folders are legacy or alternate app copies and are not the production source of truth.

Do not use a long-lived release branch for the website.

For normal website work:

1. branch from `master`
2. open a PR back into `master`
3. merge to `master`
4. let production deploy from `master`

## Repo guardrails already added

- GitHub Actions production deploy now builds and deploys the repo root app from `master`.
- `.vercelignore` excludes old app folders from root-project deploy uploads.
- `BRANCHING_POLICY.md` documents the one-permanent-branch workflow.

## Manual lock-down steps still required

1. In GitHub, protect `master`.
   - Require pull requests before merging.
   - Restrict direct pushes.
   - Block force pushes.

2. In Vercel project `iopps`, keep:
   - Root Directory = `.`
   - Production branch = `master`
   - Do not manually promote production from another branch unless this document is intentionally being changed

3. In Vercel, delete or disconnect any separate legacy projects that point at:
   - `web`
   - `live14`
   - `live14deploy`

4. Create a fallback git tag after the current production state is committed:
   - example: `prod-stable-2026-03-20`

## Safe production deploy command

Run from:

- `C:\Users\natha\OneDrive\Documents\iopps`

Command:

```powershell
vercel deploy --prod -y
```
