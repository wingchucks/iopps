# Website completion verification

Branch `fix/website-completion-20260927`, from `master` at `7629f815`.
Vercel automatic deployment is disabled for this branch in `vercel.json`.

## What changed

- **One login, two workspaces.** Creating an organization from a personal account
  (`/org/upgrade`) no longer replaces the person. Signup and upgrade keep the
  member/user display name and sign-in email. They refuse to move someone out of
  another organization's team, never overwrite an existing organization record,
  and start the new business listing in directory review (as organization signup
  already did). Upgrade validates the website link and stores location as city/province.
- **Personal profile stays reachable.** `/profile` no longer redirects organization
  owners and team members to the organization editor. The account menu, mobile drawer
  and desktop rail show "My Profile" plus the organization dashboard (or "Create an
  Organization"). A banner on organization dashboard pages states "Acting as
  <organization>", with a link back to the personal profile. Settings shows personal
  settings (career, privacy) alongside organization settings. Personal Applications
  and Saved pages link back to the personal profile. The workspace follows the page;
  no stored selection is ever used for authorization.
- **Organization profile links.** Saving a website, logo, banner, social or gallery
  link that is not a complete `http(s)://` address is refused with a clear message.
- **University/program posting retired.** `/api/programs`, `/api/schools` and
  `/api/schools/[slug]` return 410. The public pages already redirected. School
  dashboards show past program records read-only. A stale school signup draft now
  restarts at the role choice. Historical records are untouched.

## Verification

`scripts/qa-website-completion-browser.mjs` drives the production build in Chrome
against the demo emulators (45 checks). It covers individual signup,
verification, setup, sign-out/in and recovery; profile persistence; résumé
type/size limits, upload, replacement and removal; applying with the selected
résumé and a cover letter, including repeated clicks; submitted documents surviving
later résumé changes; privacy of applications and résumés; creating an organization
from the same login; workspace clarity on desktop and phone; business profile
edits, logo replacement, link validation, review, approval, directory and details
pages, and hide/show; the job lifecycle (draft, preview, refused unpaid publish,
publish with a fixture credit, public search/details, edit, apply, employer review,
close); events and scholarships (draft, publish, details, edit, close);
logged-out/individual/cross-organization/team-removal permissions, including direct
Firestore writes; retired program routes; IOPPS Live; and 390px layouts. It removes
every record, file and account it creates and verifies that nothing remains.

```sh
node scripts/run-isolated-qa.mjs --emulators node node_modules/next/dist/bin/next build
node scripts/run-isolated-qa.mjs --emulators node scripts/qa-website-completion-browser.mjs
```

Evidence (screenshots, `results.json`, `cleanup.json`) is written to
`test-results/website-completion/`.

## Boundaries

- Stripe was excluded. Publishing a job used a posting credit set directly in the
  emulator; checkout, payment and webhooks were not exercised. The unpaid publish
  attempt was confirmed to be refused (HTTP 402).
- Only fictional emulator identities were used. No production account, business,
  listing or email was read for testing or changed.
- No live broadcast was available. IOPPS Live was checked for layout and offline
  state locally; replay players were checked read-only on the public site.

## Local preview

With the emulators running:

```sh
node scripts/run-isolated-qa.mjs --emulators node scripts/start-website-preview.mjs
```

This seeds fictional demo records and serves the build at `http://127.0.0.1:3100`.
Demo sign-ins are listed at the top of that script.
