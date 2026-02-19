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
├── web/                    # Next.js web application
│   ├── app/                # App Router pages and API routes
│   │   ├── api/            # 40+ API endpoints
│   │   ├── admin/          # Admin panel
│   │   ├── organization/   # Employer routes
│   │   ├── member/         # Member profile routes
│   │   └── ...
│   ├── components/         # React components by feature
│   ├── lib/                # Utilities and services
│   │   ├── firebase/       # Firebase client modules
│   │   ├── firestore/      # Firestore data operations
│   │   └── ...
│   └── public/             # Static assets
├── mobile/                 # React Native Expo app
│   ├── src/
│   │   ├── screens/        # Mobile screens
│   │   ├── components/     # Mobile UI components
│   │   ├── services/       # Business logic
│   │   └── __tests__/      # Jest tests
│   └── e2e/                # Detox E2E tests
├── firestore.rules         # Firestore security rules
├── storage.rules           # Cloud Storage rules
└── firebase.json           # Firebase emulator config
```

## Development Commands

### Web (from `/web` directory)
```bash
npm run dev         # Start dev server (port 3000)
npm run build       # Production build
npm run lint        # ESLint check
npx tsc --noEmit    # TypeScript type check
npm run emulators   # Start Firebase emulators
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
- Type checking: `npx tsc --noEmit` in `/web`
- Linting: `npm run lint` in `/web`
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
firebase emulators:start
```
- Auth: localhost:9099
- Firestore: localhost:8080
- Storage: localhost:9199
- UI: localhost:4000

Set `NEXT_PUBLIC_USE_EMULATORS=true` in `.env.local` to use emulators.

### Security Rules
- Firestore: `/firestore.rules` - Role-based access with helpers like `isSignedIn()`, `isAdmin()`, `isApprovedEmployer()`
- Storage: `/storage.rules`

## Key Patterns

### API Routes
Located in `/web/app/api/`. Common pattern:
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
- Web: `@/*` maps to `./web/*`
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
Create file in `/web/app/api/[route]/route.ts` with exported HTTP methods (GET, POST, etc.)

### Adding Firestore operations
Add functions to `/web/lib/firestore/[collection].ts`

### Modifying security rules
Edit `/firestore.rules`, deploy with `firebase deploy --only firestore:rules`

## CI/CD

- **Web**: Vercel deployment on push to main
- **Mobile**: EAS builds via GitHub Actions
- **CI**: Lint, typecheck, build on all PRs (see `.github/workflows/ci.yml`)

## Cron Jobs (Vercel)

Configured in `/web/vercel.json`:
- Job alert emails (instant/daily/weekly)
- Job expiration checks (daily)
- RSS feed syncing (hourly/daily/weekly)

## Design System (Post-Migration)

### Theme System
- CSS variables in `:root` (light) + `[data-theme="dark"]` (dark). Toggle via `ThemeToggle.tsx`
- Color classes: `bg-background`, `bg-surface`, `text-foreground`, `text-accent`, `border-[var(--card-border)]`
- Admin panel uses amber accent: `[data-admin]` attribute overrides `--accent` to `#D97706`

### UI Components
- Custom components: `Tag`, `Av`, `StatBox`, `EBtn`, `Progress`, `ProgressBar`, `ThemeToggle`
- Button variants: `primary`, `secondary`, `outline`, `ghost`, `danger`, `navy`, `amber`
- Toggle switch: `h-7 w-12 rounded-full` with `h-5 w-5` knob, accent when on, border when off

### Page Wrapper Pattern
All member pages follow: `"use client"` + `ProtectedRoute` + `bg-background` + back link + title + component + `pb-24`

### Settings Pages
Located at `web/app/member/settings/{feature}/page.tsx` with corresponding components in `web/components/settings/`

## Agent Team Guidelines

When working as part of an agent team, follow these ownership boundaries to avoid file conflicts:

### Frontend Teammate
- Owns: `web/app/`, `web/components/`, `web/public/`
- Can read (not edit): `web/lib/`, `firestore.rules`

### Backend Teammate
- Owns: `web/lib/firestore/`, `web/app/api/`, `firestore.rules`, `storage.rules`
- Can read (not edit): `web/components/`, `web/app/` (non-API pages)

### QA / Review Teammate
- Read-only across all files
- Runs: `npm run build`, `npm run lint`, `npx tsc --noEmit` in `/web`
- Reports issues to the team lead

### General Rules for All Teammates
- Never edit files outside your ownership boundary without coordinating via the task list
- Use the design system variables — no hardcoded colors (`#hex` values)
- Follow existing patterns: check a similar file before creating something new
- Firestore operations go in `web/lib/firestore/` — don't inline database calls in components
- All new pages need `ProtectedRoute` wrapper with appropriate role checks
- Production URL: `https://www.iopps.ca` — Firebase project: `iopps-c2224`
