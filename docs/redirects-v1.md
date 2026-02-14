# Redirect Rules - V1 Baseline

> Extracted from `web/next.config.ts` on 2026-02-14.
> These redirects are configured in the Next.js `redirects()` function.

## Permanent Redirects (301)

These indicate the old URL is permanently replaced. Search engines will update their indexes.

| Source | Destination | Notes |
|--------|-------------|-------|
| `/employer/:path*` | `/organization/:path*` | Employer to Organization rebrand |
| `/vendor/:path*` | `/organization/shop/:path*` | Vendor to Organization/Shop rebrand |
| `/jobs-training` | `/careers` | Jobs-training section renamed to Careers |
| `/jobs-training/:path*` | `/careers/:path*` | Jobs-training sub-routes to Careers |
| `/jobs` | `/careers` | Old jobs URL to Careers |
| `/jobs/:path*` | `/careers/:path*` | Old jobs sub-routes to Careers |
| `/scholarships` | `/education/scholarships` | Scholarships moved under Education |
| `/scholarships/:path*` | `/education/scholarships/:path*` | Scholarships sub-routes |
| `/marketplace` | `/business` | Marketplace renamed to Business |
| `/marketplace/:path*` | `/business/:path*` | Marketplace sub-routes |
| `/shop` | `/business` | Shop renamed to Business |
| `/shop/:path*` | `/business/:path*` | Shop sub-routes |
| `/businesses` | `/organizations` | Businesses renamed to Organizations |
| `/businesses/:slug*` | `/organizations/:slug*` | Businesses sub-routes |
| `/powwows` | `/community` | Powwows moved to Community |
| `/powwows/:path*` | `/community/:path*` | Powwows sub-routes |
| `/signin` | `/login` | Sign-in alias |
| `/streams` | `/live` | Streams renamed to Live |
| `/notifications` | `/member/alerts` | Notifications moved to Member Alerts |
| `/organization/post-job` | `/organization/jobs/new` | Post-job shortcut |

## Temporary Redirects (302)

These indicate the redirect may change in the future. Search engines keep the old URL indexed.

| Source | Destination | Notes |
|--------|-------------|-------|
| `/hub` | `/discover` | Hub to Discover (backwards compat) |
| `/admin/members` | `/admin/users` | Admin route consolidation |
| `/organization` | `/organization/dashboard` | Org root to dashboard (BUG-016) |
| `/events` | `/community` | Events to Community (BUG-007) |
| `/messages` | `/member/messages` | Messages to Member Messages (BUG-013) |
| `/organization/register` | `/register` | Org registration shortcut |
| `/organization/manage/profile` | `/organization/profile` | Org sub-route alias (QA fix) |
| `/organization/manage/team` | `/organization/team` | Org sub-route alias (QA fix) |
| `/organization/manage/billing` | `/organization/billing` | Org sub-route alias (QA fix) |
| `/organization/manage/settings` | `/organization/settings` | Org sub-route alias (QA fix) |
| `/organization/hire/talent-pool` | `/organization/hire/talent` | Talent pool URL alias |
| `/organization/host/conferences/new` | `/organization/conferences/new` | Conference creation alias |
| `/organization/vendor/products` | `/organization/sell/offerings` | Vendor products alias |
| `/organization/vendor/orders` | `/organization/sell/inquiries` | Vendor orders alias |
| `/organization/vendor/store-settings` | `/organization/shop/setup` | Vendor store settings alias |
| `/organization/training/programs/new` | `/organization/training/new` | Training program creation alias |
| `/organization/training/programs` | `/organization/training` | Training programs list alias |

## Summary

- **Total redirects**: 37
- **Permanent (301)**: 20
- **Temporary (302)**: 17

## Security Headers (also in next.config.ts)

The config also sets the following security headers on all routes (`/:path*`):
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- `Cross-Origin-Opener-Policy: same-origin-allow-popups`
- `Content-Security-Policy` (full CSP with allowlists for Google APIs, Firebase, Stripe, Sentry, GA)

Static assets (`svg|jpg|jpeg|png|webp|avif|gif`) get `Cache-Control: public, max-age=31536000, immutable`.
