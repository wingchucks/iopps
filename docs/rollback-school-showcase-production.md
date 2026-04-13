# Rollback Reference: School Showcase Production Snapshot

This branch preserves the source snapshot that matches the working "10 schools" production state restored on April 12, 2026.

## Authoritative production rollback target

- Deployment ID: `dpl_3Tpdf4hVPFMUs5WFZ7565ArPVjwn`
- Deployment URL: `https://iopps-7x9mc93x6-wingchucks-projects.vercel.app`
- Production domain: `https://iopps.ca`

## Fast rollback command

```powershell
vercel rollback https://iopps-7x9mc93x6-wingchucks-projects.vercel.app --yes
```

## Why this exists

- The original working deployment was created from a dirty local worktree, not a clean git commit.
- This branch reconstructs the public school-showcase source snapshot into a clean git history so there is a stable rollback reference in both git and Vercel.

## What was verified live

- `/schools` showed the school showcase banner and seeded national previews.
- Employer sign-in with the documented test account reached `/org/dashboard`.

## Verification note

- `next build` in this rollback worktree compiles with the copied snapshot, but the full build still hits a Next.js prerender invariant during static generation in this repo. Treat the Vercel deployment above as the final production fallback if the local build path is noisy.
