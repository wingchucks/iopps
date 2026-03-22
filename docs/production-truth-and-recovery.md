# IOPPS Production Truth And Recovery

## Canonical Truth

- Canonical stable branch: `master`
- Canonical rollback tag: `rollback-live-2026-03-22-master-baseline`
- Production site: `https://iopps.ca`

`master` must always match the approved live-ready website state. If a change is not ready to represent production truth, it does not belong on `master`.

## Frozen Runtime Rules

The current production baseline includes these business-profile rules:

- Businesses must have a logo.
- Businesses must have a description or tagline.
- Businesses must have a public contact method: `contactEmail`, `phone`, or `website`.
- Incomplete businesses are not public.
- Incomplete businesses are redirected back to onboarding on sign-in.
- Schools keep their own visibility rules and are not forced through the business-profile gate.

These behaviors are part of the production contract and should be preserved in any recovery.

## Release Process

1. Finish and test the work on a `codex/...` branch.
2. Run:
   - `node --test --experimental-strip-types tests\organization-profile.test.ts tests\admin-employers.test.ts tests\school-visibility.test.ts tests\pricing.test.ts tests\profile-media.test.ts`
   - `npm run build`
3. Confirm temp artifacts are not part of the release:
   - `.vercel-env-fix/`
   - `firebase-emulators*.log`
   - `next-dev*.log`
4. Merge the approved branch into `master`.
5. Cut a new immutable rollback tag from the exact `master` release commit.
6. Deploy production from that exact checked-out release state.

## Production Recovery

To restore the current canonical baseline:

```bash
git checkout rollback-live-2026-03-22-master-baseline
vercel --prod -y
```

If you need to inspect or patch before redeploying, branch from the tag instead of editing the tag state directly:

```bash
git checkout -b codex/recover-from-rollback-live-2026-03-22 rollback-live-2026-03-22-master-baseline
```

## Post-Recovery Smoke Checks

After any rollback or redeploy, verify:

1. `master` and `rollback-live-2026-03-22-master-baseline` resolve to the same intended release commit.
2. The public business API excludes incomplete businesses:
   - `GET https://iopps.ca/api/organizations`
3. An incomplete business direct page is hidden:
   - `GET https://iopps.ca/api/org/<slug>` returns `404`
4. Incomplete employer sign-in redirects to:
   - `/org/onboarding?reason=incomplete-profile&required=...`
5. A completed business still appears in:
   - `/businesses`
   - `/org/[slug]`
6. School visibility behavior still works independently of the business gate.
