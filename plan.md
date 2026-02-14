# IOPPS Website Rebuild Plan (web-v2)

Full rebuild of the IOPPS web application from scratch. Same Firebase project, same data, same URLs — completely new codebase with cleaner architecture, fresh design, and a leaner feature set.

---

## Guiding Principles

1. **Same Firebase project** (`iopps-c2224`) — all user accounts, Firestore data, and Storage files stay untouched
2. **Same URLs** — every public-facing route stays the same so bookmarks, Google rankings, and Stripe webhooks keep working
3. **Build lean** — launch with core features only, add the rest incrementally
4. **Reference, don't copy** — use the old codebase as a reference for business logic, but write everything fresh
5. **Same env vars** — same API keys, same Stripe config, same Resend/Sentry keys

---

## Step 1: Scaffold the new project

Create `web-v2/` alongside the existing `web/` directory. Initialize a fresh Next.js 16 project with:

- Next.js 16 + React 19 + TypeScript 5
- Tailwind CSS 4 (CSS-first config)
- Path alias `@/*` mapping to `./web-v2/*`
- Same `.env` variables (copy from existing `.env.example`)
- ESLint + strict TypeScript config
- Sentry error monitoring (same DSN)

**New directory structure:**
```
web-v2/
├── app/
│   ├── layout.tsx              # Root layout (clean)
│   ├── page.tsx                # Landing page
│   ├── (auth)/                 # Auth routes group
│   ├── (public)/               # Public pages group
│   ├── (member)/               # Member routes group
│   ├── (organization)/         # Org dashboard group
│   ├── (admin)/                # Admin panel group
│   └── api/                    # API routes
├── components/
│   ├── ui/                     # Design system primitives
│   ├── layout/                 # Header, footer, nav, shells
│   └── [feature]/              # Feature-specific components
├── lib/
│   ├── firebase.ts             # Client Firebase init
│   ├── firebase-admin.ts       # Server Firebase Admin init
│   ├── stripe.ts               # Stripe config
│   ├── auth.ts                 # Auth utilities
│   ├── firestore/              # Firestore data layer (lean)
│   └── utils.ts                # Shared utilities
├── public/                     # Static assets
├── package.json
├── tsconfig.json
├── postcss.config.mjs
└── next.config.ts
```

**Files to create:**
- `web-v2/package.json` — fresh dependencies (only what's needed)
- `web-v2/tsconfig.json` — strict TypeScript config
- `web-v2/next.config.ts` — image optimization, security headers, same redirects
- `web-v2/postcss.config.mjs` — Tailwind v4
- `web-v2/app/layout.tsx` — clean root layout
- `web-v2/lib/firebase.ts` — client Firebase init (same config as current)
- `web-v2/lib/firebase-admin.ts` — server Firebase Admin init (same config)
- `web-v2/lib/stripe.ts` — Stripe product config (same prices/products)
- `web-v2/lib/auth.ts` — token verification helpers

---

## Step 2: Core infrastructure

Set up the foundational pieces that every feature depends on.

**Auth system:**
- `AuthProvider` context (connects to existing Firebase Auth — same users just work)
- `ProtectedRoute` wrapper component with role checking
- Login page (`/login`) — email/password + Google sign-in
- Register pages (`/signup/member`, `/signup/organization`)
- `verifyAuthToken()` and `verifyAdminToken()` server helpers for API routes

**Design system:**
- CSS variables for theming (light + dark mode via `data-theme`)
- Base UI components: Button, Input, Select, Modal, Tag, Avatar, Card, Skeleton, EmptyState
- Layout components: SiteHeader, SiteFooter, MobileBottomNav, PageShell
- Toast notifications (react-hot-toast)

**Firestore data layer:**
- `lib/firestore/members.ts` — read/write member profiles (same `users` collection)
- `lib/firestore/jobs.ts` — CRUD for jobs (same `jobs` collection)
- `lib/firestore/organizations.ts` — org operations (same `employers` / `v2_organizations` collections)
- Additional collection files added as features are built

**Shared API patterns:**
- Auth middleware pattern for API routes
- Cron secret verification for scheduled jobs
- Standard JSON response helpers

---

## Step 3: Core features — Member experience

Build the member-facing features that make up the core value prop.

**Landing / Home page** (`/`)
- Hero section, value props, stats, CTA

**Careers hub** (`/careers`)
- Job listings with filters (location, category, type)
- Job detail page (`/careers/[jobId]`)
- Job application flow (`/careers/[jobId]/apply`)
- Job alerts API (`/api/emails/send-job-alerts/*`)

**Education hub** (`/education`)
- Scholarships listing (`/education/scholarships`)
- Scholarship detail (`/education/scholarships/[id]`)
- Schools directory (`/education/schools`)
- Programs listing (`/education/programs`)

**Community hub** (`/community`)
- Pow wow listings and detail pages
- Conference listings (`/conferences`, `/conferences/[id]`)

**Member profile & dashboard:**
- `/member/dashboard` — overview of applications, saved items
- `/member/profile` — edit profile (reads/writes same `users` collection)
- `/member/applications` — track job applications
- `/member/settings` — notification preferences, privacy, data export
- `/saved` — saved jobs, scholarships, events

**Public pages:**
- `/about`, `/contact`, `/terms`, `/privacy`
- `/pricing`, `/for-employers`
- `/search` — unified search
- `/discover` — discovery feed

---

## Step 4: Core features — Organization dashboard

Build the employer/organization management experience.

**Organization dashboard** (`/organization/...`)
- Dashboard home with analytics overview
- Job management: create, edit, list, import (`/organization/hire/jobs/*`)
- Application tracking (`/organization/hire/applications/*`)
- Scholarship management (`/organization/scholarships/*`)
- Conference management (`/organization/conferences/*`)
- Event/powwow management (`/organization/events/*`)
- Organization profile & settings
- Team management (`/organization/team`)
- Billing & subscription (`/organization/billing`)

**Stripe integration:**
- Checkout flows: single job, featured job, subscription tiers
- Webhook handler (`/api/stripe/webhook`) — same endpoint URL
- Billing portal (`/api/billing/portal`)
- Credit system for job postings

---

## Step 5: Admin panel

Build the admin dashboard for platform management.

**Admin routes** (`/admin/...`)
- Dashboard with platform stats (`/api/admin/counts`, `/api/stats`)
- User management (`/admin/users`)
- Employer management (`/admin/employers`)
- Job moderation (`/admin/jobs`)
- Scholarship management (`/admin/scholarships`)
- Conference management (`/admin/conferences`)
- Content moderation (`/admin/moderation`)
- Verification workflows (`/admin/verification`)

---

## Step 6: Cron jobs & email system

Recreate the scheduled tasks and email infrastructure.

**Cron endpoints** (same URLs, same `vercel.json` schedule):
- `/api/cron/expire-jobs` — daily job expiration
- `/api/cron/expire-events` — daily event expiration
- `/api/cron/expire-scholarships` — daily scholarship expiration
- `/api/cron/publish-scheduled-jobs` — every 15 min
- `/api/cron/sync-feeds` — RSS feed syncing
- `/api/cron/expire-directory-visibility` — daily

**Email endpoints** (Resend integration):
- Job alerts (instant/daily/weekly)
- Conference, powwow, training, vendor alerts
- Weekly digest
- Unsubscribe flow with HMAC tokens

**`web-v2/vercel.json`** — same cron schedule as current

---

## Step 7: Secondary features (add incrementally)

These can be added after the core is live:

- Business directory & vendor shop (`/business/*`)
- Live streams (`/live/*`)
- Messaging system
- Social features (follows, endorsements, leaderboard)
- Map view (`/map`)
- AI tools (job description generator, poster analyzer)
- News/RSS feed display (`/news`)
- Training programs
- Talent pool search
- Notification center
- Network/radar features
- Passport system

---

## Step 8: Swap deployment

When web-v2 is ready for production:

1. Deploy `web-v2` to Vercel on a staging URL (e.g., `v2.iopps.ca`)
2. Test against production Firebase data — all existing data should show up
3. Verify Stripe webhooks work at the new deployment
4. Verify cron jobs fire correctly
5. Repoint `iopps.ca` domain from old Vercel project → new Vercel project
6. Update Stripe webhook URL if needed (or keep same domain, it just works)
7. Monitor for 48 hours
8. Archive old `web/` directory (or delete it)

---

## Step 9: Mobile rebuild (after web is stable)

Create `mobile-v2/` with fresh React Native + Expo:
- Same Firebase project connection
- Matches new design system from web-v2
- Core screens: jobs, education, community, profile
- Push notifications via Firebase Cloud Messaging

---

## What This Plan Produces

| Before | After |
|--------|-------|
| 208 pages, many unused/redundant | ~60 focused pages at launch |
| 110 API routes, many are admin/fix scripts | ~40 clean API routes |
| 229 components, inconsistent patterns | ~80 components with consistent design system |
| Legacy + V2 route duplication | Single clean route structure |
| 53 Firestore service files | ~20 service files (same collections, cleaner code) |
| Accumulated tech debt | Fresh, maintainable codebase |

**Zero data loss. Zero downtime. Same URLs. Better everything else.**
