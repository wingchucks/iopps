# Dead Internal Links Report

**Generated:** 2025-01-26
**Project:** IOPPS (Indigenous Opportunities & Partnerships Platform)
**Scope:** `web/` directory (Next.js App Router)

---

## Summary

| Metric | Count |
|--------|-------|
| Total internal routes scanned | 147+ |
| Dead links identified | 14 |
| **Dead links fixed** | **14** |
| Files modified | 13 |
| New redirects added | 5 |

### Resolution Status: ALL FIXED

---

## Dead Links Fixed

### Critical Priority

| # | Dead Route | Correct Route | File | Line | Status |
|---|------------|---------------|------|------|--------|
| 1 | `/signin` | `/login` | `web/app/organization/talent/pricing/page.tsx` | 28 | **Fixed** |

### High Priority

| # | Dead Route | Correct Route | File | Line | Status |
|---|------------|---------------|------|------|--------|
| 2 | `/notifications` | `/member/alerts` | `web/components/NotificationBell.tsx` | 309 | **Fixed** |
| 3 | `/organization/register` | `/register?role=employer` | `web/app/organization/jobs/new/page.tsx` | 614 | **Fixed** |
| 4 | `/organization/register` | `/register?role=employer` | `web/app/organization/products/new/page.tsx` | 76 | **Fixed** |
| 5 | `/organization/register` | `/register?role=employer` | `web/app/organization/services/new/page.tsx` | 87 | **Fixed** |
| 6 | `/organization/register` | `/register?role=employer` | `web/app/organization/shop/page.tsx` | 62 | **Fixed** |
| 7 | `/organization/register` | `/register?role=employer` | `web/app/organization/conferences/new/page.tsx` | 121 | **Fixed** |
| 8 | `/organization/post-job` | `/organization/jobs/new` | `web/app/organizations/[slug]/OrganizationProfileClient.tsx` | 247 | **Fixed** |

### Medium Priority

| # | Dead Route | Correct Route | File | Line | Status |
|---|------------|---------------|------|------|--------|
| 9 | `/streams` | `/live` | `web/components/pricing/LiveStreamingPanel.tsx` | 85 | **Fixed** |
| 10 | `/employer` | `/organization/dashboard` | `web/app/organization/jobs/[jobId]/edit/page.tsx` | 325, 345, 723 | **Fixed** |
| 11 | `/businesses` | `/organizations` | `web/app/organizations/[slug]/not-found.tsx` | 20 | **Fixed** |
| 12 | `/businesses` | `/organizations` | `web/app/organizations/[slug]/error.tsx` | 111 | **Fixed** |

### Low Priority (Updated to canonical routes to avoid redirect hops)

| # | Old Route | Canonical Route | File | Status |
|---|-----------|-----------------|------|--------|
| 13 | `/scholarships` | `/education/scholarships` | `web/app/member/dashboard/OverviewTab.tsx` | **Fixed** |
| 14 | `/powwows` | `/community` | `web/app/member/dashboard/OverviewTab.tsx` | **Fixed** |
| 15 | `/jobs` | `/careers` | `web/components/member/RecommendationsWidget.tsx` | **Fixed** |
| 16 | `/scholarships` | `/education/scholarships` | `web/components/member/RecommendationsWidget.tsx` | **Fixed** |

---

## Files Modified

1. `web/app/organization/talent/pricing/page.tsx`
2. `web/components/pricing/LiveStreamingPanel.tsx`
3. `web/components/NotificationBell.tsx`
4. `web/app/organization/jobs/new/page.tsx`
5. `web/app/organization/products/new/page.tsx`
6. `web/app/organization/services/new/page.tsx`
7. `web/app/organization/shop/page.tsx`
8. `web/app/organization/conferences/new/page.tsx`
9. `web/app/organizations/[slug]/OrganizationProfileClient.tsx`
10. `web/app/organization/jobs/[jobId]/edit/page.tsx`
11. `web/app/organizations/[slug]/not-found.tsx`
12. `web/app/organizations/[slug]/error.tsx`
13. `web/app/member/dashboard/OverviewTab.tsx`
14. `web/components/member/RecommendationsWidget.tsx`
15. `web/next.config.ts` (added redirects)

---

## Redirects Added to `next.config.ts`

The following redirects were added for backward compatibility (external links/bookmarks):

```typescript
// Sign in alias redirect
{
  source: "/signin",
  destination: "/login",
  permanent: true,
},
// Streams to Live redirect
{
  source: "/streams",
  destination: "/live",
  permanent: true,
},
// Notifications to Member Alerts redirect
{
  source: "/notifications",
  destination: "/member/alerts",
  permanent: true,
},
// Organization registration shortcut
{
  source: "/organization/register",
  destination: "/register",
  permanent: false,
},
// Organization post-job shortcut
{
  source: "/organization/post-job",
  destination: "/organization/jobs/new",
  permanent: true,
},
```

---

## Pre-existing Redirects (Already Handled)

These routes were already properly handled in `next.config.ts`:

| Source | Destination |
|--------|-------------|
| `/jobs/*` | `/careers/*` |
| `/scholarships/*` | `/education/scholarships/*` |
| `/businesses/*` | `/organizations/*` |
| `/powwows/*` | `/community/*` |
| `/employer/*` | `/organization/*` |
| `/jobs-training/*` | `/careers/*` |
| `/marketplace/*` | `/business/*` |
| `/vendor/*` | `/organization/shop/*` |

---

## Verification Commands

Run these commands to verify the fixes:

```bash
# Navigate to web directory
cd iopps/web

# 1. TypeScript type check
npx tsc --noEmit

# 2. ESLint check
npm run lint

# 3. Production build (most comprehensive)
npm run build
```

### Manual Smoke Test Checklist

- [ ] `/organization/talent/pricing` (logged out) - should redirect to `/login`
- [ ] `/pricing` page - "View past streams" link goes to `/live`
- [ ] Click notification bell - "View all" goes to `/member/alerts`
- [ ] `/organization/jobs/new` (logged out) - "Register" link works
- [ ] `/organizations/[any-slug]` - "Post a Job" link goes to `/organization/jobs/new`
- [ ] Edit a job and trigger error state - "Back to Dashboard" link works
- [ ] Member dashboard explore section - Scholarships and Pow Wows links work

---

## Route Architecture Summary

### Public Routes
```
/                       # Homepage
/careers                # Jobs listing
/careers/[jobId]        # Job detail
/careers/programs       # Training programs
/education              # Education hub
/education/scholarships # Scholarships
/education/schools      # Schools directory
/community              # Community/Pow Wows
/conferences            # Conferences
/organizations          # Business directory
/live                   # Live streaming
/login                  # Authentication
/register               # Registration
```

### Member Routes
```
/member/dashboard       # Member dashboard
/member/alerts          # Notifications/alerts
/member/profile         # Profile settings
```

### Organization Routes
```
/organization/dashboard # Org dashboard
/organization/jobs/new  # Post a job
/organization/hire/*    # Hiring module
/organization/educate/* # Education module
/organization/sell/*    # Marketplace module
```

---

## Notes

1. **All dead links have been fixed** - Both in source code and with redirect fallbacks
2. **No external URLs were modified**
3. **Dynamic routes properly handled** - Template literals like `/careers/${id}` work correctly
4. **Redirect strategy** - Added redirects for backward compatibility while fixing source code directly for performance
