# CLAUDE.md — Rules for AI Agents

## CRITICAL RULES — READ BEFORE DOING ANYTHING

1. **NEVER push directly to master.** Always create a branch and open a PR.
2. **NEVER run `vercel deploy`.** Vercel auto-deploys from GitHub.
3. **NEVER run seed scripts** (`scripts/seed*.mjs`) against production Firebase.
4. **NEVER run scripts from other directories** (iopps-ARCHIVED, iopps-repo, etc.)
5. **ONLY modify files in `src/`** — that's where the app lives.

## Architecture

```
C:\Users\natha\iopps-fresh (THIS directory)
  → git push (via PR only, branch protection enforced)
  → GitHub wingchucks/iopps (master)
    → Vercel auto-deploys to iopps.ca
```

## Data Collections

- **`jobs`** — Authoritative for job listings (111 real jobs from SIGA, STC, Westland)
- **`posts`** — Legacy catch-all. Events, scholarships, stories. Do NOT add jobs here.
- **`scholarships`** — Dedicated scholarships collection (17 docs)
- **`training_programs`** — Training programs (188 docs)
- **`events`** / **`conferences`** — Event data
- **`organizations`** — Org profiles (202 docs)
- **`users`** — User accounts (756 docs)

## What NOT to Do

- Don't create files in `web/` — that directory doesn't exist here
- Don't use `app/` (without `src/`) — the app is at `src/app/`
- Don't install shadcn/ui — we use custom components
- Don't add fake/seeded data to production collections
- Don't merge Dependabot PRs — they carry old repo structure

## Working Directory

This is the ONLY directory for IOPPS development. Other directories exist but are archived:
- `iopps-ARCHIVED-DO-NOT-USE` — old monorepo, DO NOT USE
- `iopps-repo-ARCHIVED` — old branch, DO NOT USE
- `iopps-web` — separate repo, different project
