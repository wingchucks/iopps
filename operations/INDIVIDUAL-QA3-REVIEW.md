# Individual QA3 local review package

Base: b1d27fb8fd7aff55c2437070ad237e99995d040f
Branch: fix/individual-qa3-20260921
Scope: local remediation implementation, tests and offline cleanup planning only.

## Verified evidence

The 32 implementation/test/script files matched the SHA-256 manifest from the completed isolated run at local final review. No implementation changes were made during packaging. `git diff --check` passed.

Completed run: Node 24 build, typecheck, lint and full suite exited 0; 1,008 passed, zero failed, four skipped. Separate Chrome desktop runs passed 12 QA3 checks and 25 regression checks. Demo Firebase fixture cleanup was read back. This is emulator acceptance, not production provider acceptance.

Evidence outside Git: `C:/Users/natha/Documents/Codex/2026-09-21/individual-qa3/` (commands.json, implementation-manifest.json, implementation-gates.md, browser results, screenshots and cleanup receipts). Raw provider/email evidence and private credentials are not part of this commit.

## Four skipped tests

These remain skipped in the full-suite run; the separate integration browser results must not be described as execution of these exact suites:

- Chrome source-access/detail CSS and metadata spacing.
- Jobs typing/interleaving/cancellation/URL/readability browser suite (`IOPPS_TEST_JOBS_BROWSER`).
- Organization-admin assignment desktop/mobile browser suite (`IOPPS_TEST_ASSIGNMENT_BROWSER`); outside individual remediation scope.
- Isolated notification/navigation accessibility browser suite (`IOPPS_QA_ACCESSIBILITY_BROWSER`).

The completed separate desktop runs exercise individual description/spacing, search hydration/typing, notification/navigation and application flows, but do not establish every skipped-suite assertion.

## Review observations and release gates

- App-generated reset links now target the app action handler. Existing Firebase-hosted emails are not retroactively repaired. Real Resend delivery and real mailbox/new-password login require separately authorized post-deployment verification. No global Firebase template change; recoverEmail is not newly implemented.
- Import identity is scoped by feed/employer/source/title/location/date. This prevents concurrent creation of the same identity, not cross-employer legacy deduplication. Changed provider metadata can produce a distinct identity; production rollout must review source behavior. Batch import now commits each item transactionally rather than making the entire request atomic; retries rely on identity reservations. A malformed later input can return an error after earlier items have committed. Do not describe this route as all-or-nothing.
- Offline cleanup planning is not a production mutation capability. Exact private backups, ownership/reference review, aliases, saved-link compatibility, suppression and audited transactional apply/readback remain necessary before retiring any duplicate.
- Source title repairs stay conservative. Current SIGA corrupted bytes do not match the existing narrowly approved repair. A separate exact mapping approval is required.
- QA runners retain machine-specific paths and use installed Chrome headlessly with a desktop viewport; they are local acceptance scripts, not a portable CI setup or manual desktop session.

## Authorization boundary

User approved final local review and local commit only. No push, PR creation, deployment, provider configuration change or live-data mutation is authorized by this step.
