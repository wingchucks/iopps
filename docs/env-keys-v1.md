# Environment Variable Keys - V1 Baseline

> Extracted from `web/.env.example` on 2026-02-14.
> Keys only -- no values are recorded here.

## Firebase Configuration (Client-side)
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

## Site Configuration
- `NEXT_PUBLIC_SITE_URL`

## Sentry Error Monitoring
- `NEXT_PUBLIC_SENTRY_DSN`
- `SENTRY_AUTH_TOKEN`

## Stripe Payments
- `STRIPE_SECRET_KEY`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_WEBHOOK_SECRET`

## Google AI
- `GOOGLE_AI_API_KEY`

## Email Service (Resend)
- `RESEND_API_KEY`

## Admin Configuration
- `ADMIN_EMAILS`

## Analytics (Optional)
- `NEXT_PUBLIC_GA_MEASUREMENT_ID`

## Cron Job Security
- `CRON_SECRET`

## Development / Emulators (from CLAUDE.md, not in .env.example)
- `NEXT_PUBLIC_USE_EMULATORS` -- set to `true` to use Firebase emulators

## Summary

| Category | Count | Prefix |
|----------|-------|--------|
| Firebase (public) | 6 | `NEXT_PUBLIC_FIREBASE_*` |
| Site config (public) | 1 | `NEXT_PUBLIC_SITE_URL` |
| Sentry | 2 | `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN` |
| Stripe | 3 | `STRIPE_*`, `NEXT_PUBLIC_STRIPE_*` |
| Google AI | 1 | `GOOGLE_AI_API_KEY` |
| Email | 1 | `RESEND_API_KEY` |
| Admin | 1 | `ADMIN_EMAILS` |
| Analytics (optional) | 1 | `NEXT_PUBLIC_GA_MEASUREMENT_ID` |
| Cron security | 1 | `CRON_SECRET` |
| **Total** | **17** | |
