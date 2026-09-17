# IOPPS super-administrator policy

The only eligible super-administrator email is `nathan.arias@iopps.ca` (case-insensitive). Ordinary administrators remain a separate role; assigning `admin` does not confer super-administrator privileges on another email address.

## Server enforcement

- The owner is fixed in `src/lib/server/super-admin.ts`. The legacy `SUPER_ADMIN_EMAILS` environment variable is ignored and removed from the configuration example.
- Privileged requests require a valid, non-revoked Firebase ID token, an active account, the owner email and verified-email status in both the signed token and current Firebase Auth record, matching user IDs, and admin claims on both records.
- Profile email, profile role, and a role string such as `super_admin` cannot grant ownership privileges.
- User and employer dashboard capabilities use the same server-computed permission as the privileged APIs.
- User deletion, employer deletion (including the PATCH soft-delete action), subscription overrides, and the legacy account-repair endpoint require super-administrator access.
- The account-repair endpoint no longer accepts a cron secret. It repairs ordinary admin accounts only and cannot reset the owner's password or modify the owner account.
- Account protections look up the target's Firebase Auth identity. Editing a profile email cannot remove the owner's protection from role changes, suspension, deletion, or linked-organization cleanup. Organization deletion reports only Auth users it actually deleted.

## Verification

Verified on 2026-09-17: 23 focused tests passed; all five HTTP scenario groups passed; the production build and lint on changed code passed. The local build used `NEXT_TURBOPACK_EXPERIMENTAL_USE_SYSTEM_TLS_CERTS=1` for the existing Google Fonts fetch.

Focused tests cover the fixed owner, ignored environment overrides, mixed-case addresses, profile spoofing, signed claims, current claims, email changes, unverified identities, revoked sessions, disabled/suspended users, and failed identity lookups.

```sh
node --import ./scripts/test-typescript-loader.mjs --experimental-strip-types --test \
  tests/super-admin.test.ts tests/api-auth.test.ts tests/account-access.test.ts
```

The HTTP scenario uses a production build and Firebase emulators with disposable users and organizations. It refuses to run unless `IOPPS_TEST_EMULATORS=true` and `GCLOUD_PROJECT=demo-iopps-preview`. The owner email is used solely as a local emulator fixture; it does not create or change a live account or send email.

```sh
QA_BUILD_DIR="$PWD" IOPPS_TEST_EMULATORS=true GCLOUD_PROJECT=demo-iopps-preview \
  npx firebase-tools@14 emulators:exec --project demo-iopps-preview \
  --only auth,firestore,storage 'node scripts/qa-super-admin-http.mjs'
```

HTTP checks exercise dashboard capabilities, all privileged entry points, attempted owner account changes, ordinary moderation, stale verification/claims/email, account repair, and organization removal with owner-account preservation. No live authenticated operation is part of this test.

## Release scope

This change updates application API enforcement on the preview branch. It does not provision the real owner account, alter production Firebase identities, promote a production deployment, or deploy Firestore/Storage rules.

Before production release, verify the owner's existing Firebase Auth account is email-verified and has an admin claim. The database-permissions follow-up now includes tested Firestore rules that deny direct account/organization deletion and restrict profile mutations to personal fields. See `docs/database-permissions-verification.md` for the matching API changes, emulator results and coordinated release requirements. These checked-in rules have not been deployed to the live Firebase project.

Self-service deletion of an ordinary member's own account is separate from administrator deletion of other accounts. It requires a sign-in within five minutes, explicit confirmation and the authenticated UID. The owner identity and organization owner accounts are protected; deletion of an ordinary account leaves a server-owned access tombstone so old tokens cannot recreate the profile.
