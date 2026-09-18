# IOPPS Codebase Guide

Indigenous Opportunities & Partnerships Platform - A comprehensive web and mobile platform empowering Indigenous success across Canada through jobs, conferences, scholarships, pow wows, business directories, and live streams.

## Tech Stack

- **Web**: Next.js 16, React 19, TypeScript 5, Tailwind CSS 4
- **Mobile**: React Native 0.81, Expo 54
- **Database**: Firebase Firestore
- **Auth**: Firebase Authentication
- **Payments**: Stripe
- **Email**: Resend
- **Monitoring**: Sentry

## Project Structure

```
iopps/
├── src/app/                # Canonical Next.js pages and API routes
│   ├── admin/              # Admin dashboard
│   ├── org/                # Organization dashboard and onboarding
│   ├── profile/            # Member account
│   └── settings/           # Account settings
├── src/components/         # Shared and feature UI
├── src/lib/                # Services, authentication and data operations
├── public/                 # Web assets
├── mobile/                 # Separate React Native Expo application
├── operations/             # Release/recovery procedures
├── firestore.rules
├── storage.rules
└── firebase.json
```

`web/`, `web-legacy/`, `live14/`, and `live14deploy/` are excluded archival
copies. Do not build, edit, or deploy them as the website. See
`PRODUCTION_SOURCE_OF_TRUTH.md` and `operations/LAUNCH-RECOVERY.md`.

## Development Commands

### Web (from repository root)
```bash
npm run dev         # Start dev server (port 3000)
npm run build       # Production build
npm run lint        # ESLint check
npx tsc --noEmit    # TypeScript type check
node scripts/run-isolated-qa.mjs --emulators npx --yes firebase-tools@14.17.0 emulators:start --project demo-iopps-preview --config firebase.ci.json
```

### Mobile (from `/mobile` directory)
```bash
npm start           # Start Expo dev server
npm run android     # Run on Android
npm run ios         # Run on iOS
npm test            # Run Jest tests
npm run test:watch  # Tests in watch mode
npm run typecheck   # TypeScript check
```

## Testing

### Web
- Type checking: `npx tsc --noEmit` at repository root
- Linting: `npm run lint` at repository root
- CI runs lint, typecheck, and build on PRs

### Mobile
- Jest tests located in `/mobile/src/__tests__/`
- Run: `npm test` in `/mobile`
- Coverage: `npm run test:coverage`
- E2E tests with Detox in `/mobile/e2e/`

## Firebase Setup

### Emulators (Development)
```bash
# From root directory
node scripts/run-isolated-qa.mjs --emulators npx --yes firebase-tools@14.17.0 emulators:start --project demo-iopps-preview --config firebase.ci.json
```
- Auth: localhost:9099
- Firestore: localhost:8080
- Storage: localhost:9199
- UI: localhost:4000

Use `scripts/run-isolated-qa.mjs --emulators` for credential-minimized test processes. It refuses dotenv files and supplies demo-only Firebase settings. Do not copy production credentials into QA.

### Security Rules
- Firestore: `/firestore.rules` - Role-based access with helpers like `isSignedIn()`, `isAdmin()`, `isApprovedEmployer()`
- Storage: `/storage.rules`

## Key Patterns

### API Routes
Located in `/src/app/api/`. Common pattern:
1. Verify Firebase ID token from Authorization header
2. Check user role/permissions
3. Perform operation
4. Return JSON response

### User Roles
- `community` - Basic member
- `employer` - Organization/employer account
- `moderator` - Content moderation access
- `admin` - Full administrative access

### Path Aliases
- Web: `@/*` maps to `./src/*`
- Mobile: `@/*` maps to `./mobile/src/*`

## Environment Variables

Required (see `.env.example`):
- `NEXT_PUBLIC_FIREBASE_*` - Firebase client config
- `FIREBASE_*` - Firebase Admin SDK credentials
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- `NEXT_PUBLIC_SITE_URL`

Optional:
- `RESEND_API_KEY` - Email service
- `CRON_SECRET` - Cron job authentication
- `NEXT_PUBLIC_GA_MEASUREMENT_ID` - Analytics

## Common Tasks

### Adding a new API route
Create file in `/src/app/api/[route]/route.ts` with exported HTTP methods (GET, POST, etc.)

### Adding Firestore operations
Add functions to `/src/lib/firestore/[collection].ts`

### Modifying security rules
Edit `/firestore.rules` and verify with isolated demo emulators. Deploy only under the release procedure in `operations/LAUNCH-RECOVERY.md`.

## CI/CD

- **Web**: canonical target is `master`; release branches disable automatic Vercel deployments. Follow `operations/LAUNCH-RECOVERY.md` before any cutover.
- **Mobile**: EAS builds via GitHub Actions
- **CI**: Lint, typecheck, build on all PRs (see `.github/workflows/ci.yml`)

## Cron Jobs (Vercel)

Configured in root `vercel.json`:
- Feed sync, subscription checks, and job/event expiry (daily); exact schedules are in root `vercel.json`.

## Design System (Post-Migration)

### Theme System
- CSS variables in `:root` (light) + `[data-theme="dark"]` (dark). Toggle via `ThemeToggle.tsx`
- Color classes: `bg-background`, `bg-surface`, `text-foreground`, `text-accent`, `border-[var(--card-border)]`
- Admin panel uses a separate dark navy shell and teal accent via `[data-admin]`.

### UI Components
- Shared components: `Button`, `Card`, `Avatar`, `ThemeToggle`; admin components live in `src/components/ui/`.
- Use the existing shared button components and brand gradient variables; inspect the component props before adding a variant.
- Toggle switch: `h-7 w-12 rounded-full` with `h-5 w-5` knob, accent when on, border when off

### Page Wrapper Pattern
All member pages follow: `"use client"` + `ProtectedRoute` + `bg-background` + back link + title + component + `pb-24`

### Settings Pages
Located at `src/app/settings/{feature}/page.tsx` with corresponding components in `src/components/settings/`

## Agent Team Guidelines

When working as part of an agent team, follow these ownership boundaries to avoid file conflicts:

### Frontend Teammate
- Owns: `src/app/`, `src/components/`, `public/`
- Can read (not edit): `src/lib/`, `firestore.rules`

### Backend Teammate
- Owns: `src/lib/firestore/`, `src/app/api/`, `firestore.rules`, `storage.rules`
- Can read (not edit): `src/components/`, `src/app/` (non-API pages)

### QA / Review Teammate
- Read-only across all files
- Runs: `npm run build`, `npm run lint`, `npx tsc --noEmit` at repository root
- Reports issues to the team lead

### General Rules for All Teammates
- Never edit files outside your ownership boundary without coordinating via the task list
- Use the design system variables — no hardcoded colors (`#hex` values)
- Follow existing patterns: check a similar file before creating something new
- Firestore operations go in `src/lib/firestore/` — don't inline database calls in components
- All new pages need `ProtectedRoute` wrapper with appropriate role checks
- Production URL: `https://www.iopps.ca` — Firebase project: `iopps-c2224`
