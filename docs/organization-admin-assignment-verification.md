# Organization administrator assignment verification

Scope: add super-admin-only review/apply UI for granting an existing user organization-scoped admin access to an exact existing organization. No platform role, owner, billing, subscription or job-publication changes. Separate explicit enable intent is required for disabled targets; enabling preserves nonpublic profile visibility with a reviewed minimal hidden setting when necessary.

Base: verified active production deployment dpl_5yro5qK5esheybK62k1ozDTtig5M, source 1f0e0f3d4c6b09f87b81dd80ff3c9c7bc99f70ad. Other dirty worktrees were not merged. Existing crons and release isolation are unchanged; git auto-deploy disabled for fix/batc-pete-admin.

Validation after final code fixes:
- Normal npm run build: exit 0, output/batc-assignment/orchestrator-build.txt. No font mocking. Existing local missing Firebase Admin static-read and middleware warnings remain.
- Full default suite: 432 passed, 0 failed, 57 skipped (489 total), output/batc-assignment/orchestrator-full-no-emulator.txt. Skips are not claimed as passed.
- Actual Firestore/Auth emulator adapter and unchanged rules plus desktop/mobile browser workflow: 2 tests passed, no skips/failures, output/batc-assignment/orchestrator-browser-emulator.txt. Synthetic demo projects only. Browser exercised exact review/confirmation, cancel/focus, visibility disclosure, apply/independent readback and errors. Expected permission-denied probes passed.
- TypeScript, scoped ESLint and git diff --check passed; scoped lint has existing admin detail image warnings, no errors.
- Independent re-review: docs/batc-access-independent-rereview.json and docs/batc-access-final-review.json: passed, no demonstrated security concerns/logic errors. 43 tests plus independent visibility/disabled/staleness probes.

Earlier independent review found disabled-state access and unintended publication transitions. Both were fixed test-first; earlier failed reviews are historical and not current unresolved findings.

Limits: Auth state cannot participate atomically in a Firestore transaction. Post-commit Auth drift is detected by readback and returns failure, but failure does not imply rollback; inspect rather than blindly retry. Existing ownership or conflicting affiliations reject and require separate reconciliation. This document verifies local code, not production account assignment. Actual production review/apply/readback must be separately verified.
