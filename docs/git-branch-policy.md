# IOPPS Git Branch Policy

## Purpose

Keep `master` stable, keep rollback snapshots untouched, and keep in-progress work isolated on `codex/...` branches.

## Branch Roles

- `master`
  - Stable branch.
  - Should reflect the approved live-ready state.
  - Return here when a task is complete.

- `codex/<task-name>`
  - Working branches for fixes, features, and experiments.
  - All active development should happen here.
  - Examples:
    - `codex/fix-login-spinner`
    - `codex/admin-dashboard-refresh`
    - `codex/live-site-2026-03-21`

- `codex/rollback-<date>-<label>` plus matching tags
  - Recovery-only snapshots.
  - Never use these as day-to-day working branches.
  - Current recovery snapshot:
    - tag: `rollback-live-2026-03-22-master-baseline`
  - Recovery instructions live in `docs/production-truth-and-recovery.md`.

## Working Rules

- Start new work from `master`.
- Immediately create a `codex/...` branch before editing files.
- If you notice active changes on a rollback branch, create a new `codex/...` branch right away and move the work there before doing anything else.
- Commit or stash before switching branches.
- Do not keep unfinished work on `master`.
- Do not keep unfinished work on any rollback branch.

## Deployment Rules

- Treat `master` as the stable branch tied to approved production state.
- `master` should match the current approved production truth, not just a locally stable branch.
- Merge a task branch back into `master` only after the change is tested and confirmed good.
- If production needs recovery, redeploy from the rollback tag or rollback branch, not from an arbitrary work branch.

## Simple Workflow

```bash
git checkout master
git pull
git checkout -b codex/<short-task-name>
```

Work on the task branch, test it, then merge back into `master` when it is ready.

## Defaults For This Repo

- Main stable branch: `master`
- Working branch prefix: `codex/`
- Canonical rollback tag: `rollback-live-2026-03-22-master-baseline`
- Rollback snapshots remain recovery-only artifacts
