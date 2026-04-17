# Branching Policy

This repo uses one permanent branch:

- `master`

Everything else is temporary.

## Plain-English Rule

If you are making a change to the website:

1. Start from `master`
2. Create a new temporary branch
3. Make the change there
4. Open a pull request back into `master`
5. Merge it
6. Delete the temporary branch when finished

## What Branches Mean

- `master`: the main copy of the website and the only permanent branch
- `codex/fix-something`: a temporary branch for one task or bug fix

## Production Rule

Production must come from `master`.

Do not use long-lived release branches for the web app.
Do not manually treat another branch as the "real" live branch.

## Naming Temporary Branches

Use short names like:

- `codex/fix-apply-button`
- `codex/update-homepage-copy`
- `codex/fix-job-search`

## Safe Default

If you are unsure which branch to use, use `master`.
