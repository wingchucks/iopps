# Release verification follow-up

This work starts from exact UI candidate `e995fd9e03642cac96711fca182b7d543df85bed`,
which includes the import security remediation. It does not replace the original
reviewed `005b228d4b59dc9aba3b1c1b2850dcc745579324` or its historical provider evidence.
It is not production release approval.

## Dependency scope

- Root Next.js and its ESLint configuration move together from 16.1.6 to 16.3.5.
  React remains 19.2.4 and the root CI runtime remains Node 24.
- Compatible root and mobile lockfile updates retain their existing direct
  version ranges. Unused root `imapflow`, `mailparser`, `nodemailer`, `puppeteer`
  and `puppeteer-core` declarations are removed after a tracked-caller search.
  Browser verification continues to use Playwright.
- Three inspected Google SDK consumers (`gaxios@6.7.1`, `google-gax@4.6.1`, and
  `teeny-request@9.0.0`) receive scoped `uuid@11.1.1` overrides. They use the
  supported parameterless CommonJS `v4()` API. UUID 11 retains CommonJS support
  and patches the buffered v3/v5/v6 bounds issue. Consumer-relative regression
  tests verify both normal v4 output and short-buffer rejection. The observed
  consumers' v4 usage is not evidence that the buffered-write issue was exploited.
- Firebase Admin remains on its compatible 13.x range. Version 14 removes the
  namespace API still used by tracked operational scripts and drops Node 18/20.
  No global UUID override is applied to the separate Expo application.
- The root audit has its own required CI gate, including development packages.
  Mobile audit results remain separate: the compatible refresh removes its
  critical findings and updates ws to 7.5.13, but leaves Expo/Metro image-size,
  PostCSS, and UUID dependency findings. Native release approval requires their
  separate remediation and native build verification. `.vercelignore` excludes
  `mobile/`, `web/`, and `web-legacy/` from CLI uploads. Root source-import and
  dependency inspection found no use of those separate applications, and the root
  TypeScript build excludes their source trees. Exact hosted artifact scope still
  needs verification; CLI upload exclusions alone do not prove Git-deployment
  contents. This does not clear those applications' security findings.

## Runtime and verification

Role resolution is bound to the current Firebase user object and cancels stale
claims/Firestore work. Follow controls remount when viewer or target changes,
cancel stale lookups, retry lookup failures explicitly, and prevent duplicate or
unmounted mutation callbacks. These fix reproducible UI state errors; they are
not claims of a server authorization bypass.

Admin event modals now mount with fresh initial state, retain fields after failed
saves, and restore scrolling on close. Theme state uses the React external-store
contract, including SSR snapshots, cross-tab updates and denied-storage fallback.
Notification timestamps use a clock with interval cleanup.

The first hosted browser run at `79ec28095db0ea57824a62840717b09299a62c4a`
also exposed missing admin notifications: 23 admin pages use `react-hot-toast`,
but its renderer was absent. The authenticated admin layout now mounts one
themed renderer for those existing callers. Regression tests use the real toast
store and layout to verify escaped success/error announcements and continued
denial for signed-out/unauthorized sessions. Both announcement cases fail against
79ec and pass with the fix. Browser checks retain the visible-error and preserved
field assertions, and explicitly verify the simulated POST returns 503 and
submission becomes enabled again.

The older Playwright configuration no longer defaults to the production site or
loads dotenv credentials. It requires explicit loopback and demo-emulator settings
and rejects credential canaries. Existing browser tests must never be described as
safe production read-only probes: job hydration can write even for anonymous reads.
The unused standalone `qa-playwright.mjs` is retired: it hardcoded the production
origin, probed cron routes, and counted arbitrary API responses as passing. Use
the maintained demo-only release browser runner for release evidence.

`npm run lint:release` covers all root `src`, public runtime JavaScript, shared
packages, unit and end-to-end tests,
maintained `.mjs` QA scripts and root configuration with the existing ESLint rules
and severities. `npm run lint` remains the full repository audit; legacy,
prototype, operational CommonJS and separately configured mobile lint debt is
reported rather than suppressed. Mobile's own lint and typecheck remain required.

The demo-only dashboard runner covers both widths, canonical Events/Scholarships
routes, organization ownership filtering, private draft persistence, team role
denial, cancellation/removal, claim cleanup and reauthentication. It also checks
theme hydration/storage and modal cancel/reset/failure behavior. All accounts and
documents are fictional and cleaned up; outbound email credentials are absent.

## Gates that remain independent of local tests

Keep automatic Vercel deployment disabled on this release branch. Verify hosted
CI, CodeQL analysis and its separate security-results check at the final SHA.
A green changed-code check does not mean there are no open CodeQL alerts.

The exact deployed preview must have demonstrably isolated Firebase, Storage,
payment and email configuration before fixtures or provider checks are used.
Never infer isolation from a Preview label or a different public project ID when
server credentials can still be inherited. Do not probe production job GET
routes as read-only checks; hydration can write records.

Repeat affected image/Drive, Oracle/ADP, auth-return, Stripe and Storage provider
contracts on the new artifact. The old Stripe/Storage passes remain evidence for
005b228d only. Use `LAUNCH-RECOVERY.md` for the separately verified coordinated
cutover. No merge, production deployment, live payment or customer-data change is
part of this verification follow-up.
