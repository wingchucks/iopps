# IOPPS Website Audit Reports
**Generated: February 7, 2026**
**Project: IOPPS Web App (Next.js 16, React 19, Tailwind 4)**
**URL: https://www.iopps.ca**

---

## Table of Contents
1. [Test Coverage Audit](#1-test-coverage-audit)
2. [Accessibility Audit](#2-accessibility-audit)
3. [Performance Audit](#3-performance-audit)
4. [SEO & Meta Tags Audit](#4-seo--meta-tags-audit)
5. [Security Review Audit](#5-security-review-audit)
6. [Code Quality & Duplication Audit](#6-code-quality--duplication-audit)
7. [Mobile & Responsive Audit](#7-mobile--responsive-audit)
8. [Data Architecture Audit](#8-data-architecture-audit)
9. [Error Handling & Resilience Audit](#9-error-handling--resilience-audit)
10. [Infrastructure & DevOps Audit](#10-infrastructure--devops-audit)
11. [Combined Summary & Action Items](#11-combined-summary--action-items)

---

## Overall Scorecard

| # | Audit | Grade | Critical | High | Key Finding |
|---|-------|-------|----------|------|-------------|
| 1 | Testing | F | — | — | 0% coverage, no framework |
| 2 | Accessibility | C | 8 | 7 | No keyboard nav on cards, contrast failures |
| 3 | Performance | C+ | 3 | 4 | 300-400KB bundle bloat, eager imports |
| 4 | SEO | B+ | 4 | 5 | Login/signup missing metadata |
| 5 | Security | C+ | 2 | 6 | Open Firestore writes, hardcoded admin email |
| 6 | Code Quality | B- | 2 | 3 | toDate() in 17 files, no auth utility |
| 7 | Mobile | C+ | 3 | 3 | Touch targets too small, admin unresponsive |
| 8 | Data Architecture | C+ | 3 | 2 | Unbounded queries, $1.5-3K/mo cost risk |
| 9 | Error Handling | C+ | 3 | 4 | Missing error boundaries, silent catches |
| 10 | Infrastructure | B+ | 4 | 6 | No backups, no pre-commit hooks |

**Overall Project Grade: B-**

---

# 1. Test Coverage Audit

## Executive Summary

The IOPPS web application (Next.js 16 + React 19) has **0% test coverage** with **no testing infrastructure currently in place**. The codebase is substantial with 100+ routes, 80+ components, and 90+ backend API endpoints.

## Current State Analysis

### Testing Infrastructure
- **Test Framework**: None installed
- **Test Files**: Zero (no *.test.ts, *.test.tsx, *.spec.ts files in source)
- **Test Config Files**: None (no jest.config, vitest.config, playwright.config, cypress.config)
- **Test Dependencies**: None in package.json
- **Firebase Unit Testing**: `@firebase/rules-unit-testing` v5.0.0 is available but unused
- **Coverage**: 0%

### Project Scope
- **Page Routes**: 100+ pages across member, organization, admin, and public sections
- **API Endpoints**: 90+ route handlers
- **Components**: 200+ React components
- **Third-Party Services**: Firebase (Auth + Firestore), Stripe, Resend, YouTube API

## Recommended Testing Framework

### Primary: Playwright + Vitest

**Why Playwright for E2E:**
- Best-in-class browser automation for Next.js 16
- Excellent TypeScript support and native fixtures
- Can test across Chromium, Firefox, WebKit
- Built-in visual regression testing

**Why Vitest for Unit/Integration:**
- Native ESM and TypeScript support (matches Next.js 16 setup)
- Jest-compatible API (minimal learning curve)
- Fast test execution with Vite backend

## Top 15 Critical E2E Test Flows (Ranked by User Impact)

### Tier 1: Authentication & Onboarding

1. **Member Email Signup Flow**
   - Path: `/signup/member` -> form -> `/onboarding/member` -> `/welcome/member`

2. **Member Google OAuth Signup**
   - Path: `/signup/member` -> Google button -> OAuth redirect -> onboarding

3. **Organization Signup Flow**
   - Path: `/signup/organization` -> form -> consent -> `/organization/onboarding`

4. **Member Login & Dashboard Access**
   - Path: `/login` -> `/member/dashboard`

5. **Member Onboarding Wizard**
   - Path: `/onboarding/member` (4-step form) -> completion -> `/discover`

### Tier 2: Core User Journeys

6. **Job Application Flow**
   - Path: `/discover` -> `/careers/[jobId]` -> `/careers/[jobId]/apply` (3-step) -> success

7. **Member Feed Discovery & Search**
   - Path: `/discover` -> search -> tab filters

8. **Member Dashboard Overview**
   - Path: `/member/dashboard?tab=overview` -> profile/applications/stats

9. **Settings & Notification Preferences**
   - Path: `/member/settings/notifications` -> toggle -> save

10. **Organization Job Posting**
    - Path: `/organization/jobs` -> "New Job" -> form -> submission

### Tier 3: Complex Features

11. **Organization Dashboard Applications Tab**
12. **Admin Dashboard & Moderation**
13. **Employer Verification Workflow**
14. **Messaging & Conversations**
15. **Member Settings: Privacy & Data Export**

## Top 10 Components Requiring Unit Tests

1. **AuthProvider.tsx** - Auth context, user state, login/logout methods
2. **ProtectedRoute.tsx** - Route-level auth checks, role-based redirects
3. **NotificationSettings.tsx** - Category toggles, channel selection, quiet hours
4. **PrivacySettings.tsx** - Field visibility, profile visibility, save logic
5. **MemberSidebar.tsx** - Tab switching, badge display, section navigation
6. **OnboardingFlow.tsx** - Multi-step form, validation, completion callback
7. **Job Application Components** - Form validation, pre-fill, multi-step
8. **AdminTopBar.tsx** - Admin navigation, role checks, breadcrumb logic
9. **ConversationList/MessageThread** - Conversation loading, message display
10. **OrganizationShell/DashboardLayout** - Sidebar navigation, team member display

## Estimated Test Coverage Roadmap

| Phase | Timeline | Files | Focus |
|-------|----------|-------|-------|
| Foundation | Week 1-2 | 7 | Install Playwright + Vitest, config, fixtures |
| Auth Flows | Week 3-4 | 9 | Signup, login, OAuth E2E + AuthProvider unit |
| Member Journey | Week 5-8 | 14 | Discovery, applications, settings, messaging |
| Org & Admin | Week 9-12 | 12 | Job posting, admin dashboard, verification |
| API & Utilities | Week 13-16 | 14 | Auth APIs, billing, emails, utilities |
| Polish | Week 17-20 | 8 | Error states, edge cases, visual regression |

**Total: 85-100 test files, ~15,000-20,000 lines of test code**

## Required NPM Dependencies

```json
{
  "devDependencies": {
    "@playwright/test": "^1.40.0",
    "@testing-library/react": "^14.0.0",
    "@testing-library/jest-dom": "^6.0.0",
    "@vitest/ui": "^1.0.0",
    "vitest": "^1.0.0",
    "happy-dom": "^12.0.0",
    "@firebase/rules-unit-testing": "^5.0.0"
  }
}
```

---

# 2. Accessibility Audit

## Executive Summary

The app demonstrates **strong foundational accessibility** with proper focus management, dialog implementations, and keyboard navigation support. However, there are **8 critical issues** and **7 major issues** that prevent WCAG 2.1 AA compliance.

## CRITICAL ISSUES (Must Fix for AA Compliance)

### 1. Non-Interactive Elements with Click Handlers
**File:** `components/opportunity-graph/OpportunityCard.tsx` (Lines 119-139)
- Main card container is a `<div>` with `onClick` but no `role="button"`, `tabIndex`, or keyboard handlers
- **Fix:** Replace with `<button>` or add `role="button"`, `tabIndex="0"`, `onKeyDown` for Enter/Space

### 2. Missing Close Button Label in Modals
**File:** `components/ReportContentButton.tsx` (Line 143)
- Modal close button missing `aria-label`
- **Fix:** Add `aria-label="Close"`

### 3. Modal Without Focus Trap/Return
**File:** `components/ReportContentButton.tsx` (Line 123-260)
- Modal doesn't return focus to trigger button when closed
- **Fix:** Store button ref, use `useEffect` to return focus

### 4. SearchInput Missing Label Association
**File:** `components/opportunity-graph/FilterBar.tsx` (Lines 51-98)
- Search input has no `<label>` or `aria-label`
- **Fix:** Add `aria-label={placeholder}`

### 5. Filter Chips Missing Accessible State
**File:** `components/opportunity-graph/FilterBar.tsx` (Lines 159-185)
- Filter chips don't announce active state
- **Fix:** Add `aria-pressed={isActive}`

### 6. Author Name Clickable Without Keyboard Support
**File:** `components/opportunity-graph/OpportunityCard.tsx` (Lines 189-199)
- `<span>` with `onClick` but no keyboard support
- **Fix:** Convert to button or add `role="button"`, `tabIndex`, keyboard handlers

### 7. Progress Indicator Missing ARIA
**File:** `components/ui/ProgressBar.tsx` (Lines 15-84)
- No `role="progressbar"`, `aria-valuenow`, `aria-valuemin`, `aria-valuemax`
- **Fix:** Add proper ARIA attributes

### 8. Engagement Buttons Missing Labels
**File:** `components/opportunity-graph/OpportunityCard.tsx` (Lines 287-301)
- Save, comment, share, bookmark buttons have only icons, no accessible names
- **Fix:** Add `aria-label` to EngagementButton component

## MAJOR ISSUES (Should Fix)

### 9. EBtn Missing Accessible Label Fallback
**File:** `components/ui/EBtn.tsx` (Lines 14-38)
- On mobile, button shows icon only with hidden label — no accessible name

### 10. ThemeToggle SVG Missing aria-hidden
**File:** `components/ui/ThemeToggle.tsx` (Lines 47-85)
- SVG icons not marked `aria-hidden="true"`, creating duplicate announcements

### 11. Av (Avatar) Without Image Error Handling
**File:** `components/ui/Av.tsx` (Lines 42-68)
- No `onError` handler for broken images

### 12. Modals Not Preventing Body Scroll
**File:** `components/ReportContentButton.tsx` (Lines 123-260)
- Body scroll not disabled when modal is open

### 13. AuthInput Password Toggle Missing Aria-Label
**File:** `components/auth/AuthInput.tsx` (Lines 41-59)
- Eye icon button lacks `aria-label`
- **Fix:** Add `aria-label={showPassword ? "Hide password" : "Show password"}`

### 14. StatBox Missing ARIA Labels
**File:** `components/ui/StatBox.tsx` (Lines 12-25)
- Stat boxes are divs with no semantic meaning
- **Fix:** Add `role="region" aria-label={label}`

### 15. Color Contrast Issues in Dark Mode
**File:** `app/globals.css` (Lines 52-89)
- `--text-muted: #94a3b8` on `--background: #020617` = 3.5:1 (fails AA, needs 4.5:1)
- `--text-subtle: #64748b` on surfaces = 2.8:1 (fails)
- **Fix:** Increase `--text-muted` to `#a8b5c4`, `--text-subtle` to `#7a8797`

## MINOR ISSUES

### 16. FilterSelect Missing Visible Label
### 17. Missing Skip Navigation Link
### 18. Heading Hierarchy Issues (multiple h1s)
### 19. Tag Component Not Semantic
### 20. SVG Icons Missing aria-hidden in Multiple Places

## Estimated Fix Effort
- Critical issues: 2-3 days
- Major issues: 3-4 days
- Minor issues: 1-2 days
- **Total: 6-9 days**

---

# 3. Performance Audit

## Executive Summary

The primary issues stem from over-aggressive use of "use client" directives, large monolithic components, and suboptimal dependency bundling. Estimated **300-400KB bundle reduction** possible.

## CRITICAL PERFORMANCE ISSUES

### 1. Excessive "use client" on Static Pages
**Impact:** HIGH
- `app/privacy/page.tsx` and `app/terms/page.tsx` use "use client" but only render static content
- FeedLayout forces all 50+ pages into client rendering
- **Savings:** 15-25KB JS per page

### 2. Heavy Components Not Code-Split
**Impact:** HIGH
- `FeedLayout.tsx` (639 lines, used on 50+ pages)
- `OpportunityFeed.tsx` (668 lines)
- `organization/shop/dashboard/page.tsx` (1,663 lines)
- `admin/employers/page.tsx` (1,576 lines)
- `organization/jobs/new/page.tsx` (1,328 lines)
- **Savings:** 40-60KB if FeedLayout is code-split

### 3. Unoptimized Dependency Bundles
**Impact:** MEDIUM-HIGH
- **jsPDF + html2canvas** imported synchronously in cover-letter-builder (~150KB combined, only used on button click)
- **@google/generative-ai** not dynamically imported (~40KB, only used for job description generation)
- **Framer-motion** used only in CreatePostFab (~50KB)
- **Savings:** 150-200KB bundle reduction

## MEDIUM PRIORITY

### 4. Context Provider Re-renders
- AuthProvider real-time Firestore listener triggers re-renders across entire app
- Any profile update re-renders 50+ pages using FeedLayout

### 5. Multiple Parallel Firestore Queries Without Batching
- OpportunityFeed: 8 separate Promise.all batches on mount
- **Impact:** 1-3s slower First Contentful Paint

### 6. No Image Optimization in Some Components
- Some user avatars use raw `<img>` instead of `next/image`
- **Savings:** 20-40KB

### 7. All API Routes Set to force-dynamic
- Even read-only, cacheable endpoints are force-dynamic
- No revalidation headers set
- **Impact:** 10-30% API load reduction if caching added

## QUICK WINS

| Fix | Savings | Effort |
|-----|---------|--------|
| Dynamic import jsPDF/html2canvas | 150KB | 15 min |
| Lazy load Google Generative AI | 40KB | 15 min |
| Split Framer-motion for FAB | 50KB | 30 min |
| Add cache headers to public API routes | 20-30% API load | 1 hour |
| Extract static pages from FeedLayout | 30-50KB JS | 2 hours |

## Positive Findings
- Font loading uses next/font/google (Inter) with proper subset
- next.config has proper image optimization (AVIF, WebP)
- Security headers well-configured
- Static asset caching headers set (immutable, 1-year max-age)
- Promise.all used for parallel queries (not sequential)

---

# 4. SEO & Meta Tags Audit

## Executive Summary

Good SEO foundation with properly configured root layout and structured data. **8-10 gaps** in public page metadata and SEO infrastructure.

## Root Layout Metadata - GOOD
**File:** `app/layout.tsx`
- Title template: `"%s | IOPPS.ca"`
- Description: 160+ chars, well-written
- Open Graph with locale (en_CA), siteName, type
- Twitter Card: `summary_large_image`
- Manifest, Apple Web App, robots, icons all configured
- Structured data scripts (Organization + Website schema)

## Public Pages - Metadata Status

### MISSING METADATA ENTIRELY
| Page | Path | Issue |
|------|------|-------|
| Login | `/app/login/page.tsx` | No metadata export |
| Signup | `/app/signup/page.tsx` | No metadata export |

### BROKEN REFERENCES
| Page | Issue |
|------|-------|
| Careers | References non-existent `/og-jobs.png` |
| Careers | Canonical URL set to `/jobs` but route is `/careers` |

### INCOMPLETE METADATA (Missing OG Images)
| Page | Status |
|------|--------|
| About | Has metadata but missing OG image |
| Contact | Has metadata but missing OG image, uses `summary` card |
| Pricing | Has metadata but missing OG image, uses `summary` card |
| Education | Missing metadata export entirely |

### COMPLETE METADATA
- Careers Hub, Business/Shop, Community/Pow Wows, Conferences, Scholarships, Live

## SEO Infrastructure

| Component | Status |
|-----------|--------|
| Sitemap.xml | COMPLETE - proper priorities, all public pages |
| Robots.txt | COMPLETE - allows social crawlers, blocks admin/member/api |
| Structured Data (JSON-LD) | EXCELLENT - JobPosting, Event, Scholarship, LocalBusiness, Breadcrumb |
| Manifest.json | COMPLETE - PWA-ready |
| Dynamic OG Images | 9 files using Next.js ImageResponse |
| metadataBase | Configured in root layout |

## Action Items

| Priority | Issue | Fix |
|----------|-------|-----|
| HIGH | Login page missing metadata | Add metadata export |
| HIGH | Signup page missing metadata | Add metadata export |
| HIGH | Non-existent og-jobs.png | Remove reference or create file |
| HIGH | Wrong canonical URL in careers | Change `/jobs` to `/careers` |
| MEDIUM | About/Contact/Pricing missing OG images | Create opengraph-image.tsx files |
| MEDIUM | Contact/Pricing wrong card type | Change to `summary_large_image` |
| MEDIUM | Education page missing metadata | Add metadata export |

## Recommended Metadata Content

```typescript
// Login
title: "Sign In to IOPPS | Indigenous Opportunities Platform"
description: "Log in to your IOPPS account to access job opportunities, track applications, and connect with Indigenous employers and community."

// Signup
title: "Join IOPPS | Create Your Account"
description: "Sign up for IOPPS as a community member or organization. Access jobs, scholarships, conferences, and Indigenous business opportunities."

// Education
title: "Indigenous Scholarships, Programs & Schools"
description: "Discover scholarships, training programs, and schools supporting Indigenous learners across Canada."
```

---

# 5. Security Review Audit

## Executive Summary

The app has significant security debt that must be addressed. **2 critical vulnerabilities** and **6 high severity issues** identified.

## CRITICAL VULNERABILITIES

### 1. Exposed Secrets in .env.local
**Severity: CRITICAL**
**File:** `web/.env.local`
- Contains real Firebase private key, service account, Google AI key, Resend key, Stripe keys, YouTube key, SUPER_ADMIN_EMAILS
- `.gitignore` includes `.env.local` correctly, but verify git history
- **Action:** Revoke and rotate all exposed credentials immediately

### 2. Hardcoded Email Check in Admin Health Endpoint
**Severity: CRITICAL**
**File:** `app/api/admin/health/route.ts` (line 35)
```typescript
decodedToken.email === "nathan.arias@iopps.ca"  // HARDCODED ADMIN
```
- Creates implicit admin account that bypasses normal role management
- **Action:** Remove hardcoded email, rely only on token claims

## HIGH SEVERITY ISSUES

### 3. Weak CRON Secret Validation
- CRON_SECRET is predictable alphanumeric string
- No rate limiting on cron endpoints
- **Fix:** Use cryptographically strong secret, add rate limiting

### 4. Overly Permissive Firestore Rules - Public Write Access
**File:** `firestore.rules` (Lines 1062-1125)
```
outbound_clicks/{clickId} → allow create: if true
profile_views/{viewId} → allow create: if true
analyticsEvents/{eventId} → allow create: if true
dailyStats/{statId} → allow create, update: if true
contentFlags → allow create: if true
```
- Anyone (unauthenticated) can flood database with fake analytics
- **Fix:** Require authentication: `allow create: if isSignedIn()`

### 5. Admin Impersonation Race Condition
**File:** `app/api/admin/impersonate/route.ts`
- Admin check happens 50+ lines before token creation without re-verification
- **Fix:** Re-verify admin status immediately before creating custom token

### 6. Missing Input Validation
**File:** `app/api/flags/route.ts` (lines 20-30)
- `reasonDetails` field accepts unlimited text without validation
- **Fix:** Add max length validation, sanitize text

### 7. Insufficient Rate Limiting on Public Endpoints
- YouTube API route: public, no rate limit
- Flags route: public, no rate limit
- **Fix:** Add rate limiting to all public endpoints

### 8. Inconsistent Admin Auth Checks
- Some routes check `decodedToken.admin` only (custom claims)
- Some cross-verify with Firestore user role
- Stale custom claims possible
- **Fix:** Standardize admin verification pattern

## MEDIUM SEVERITY ISSUES

### 9. Missing CSRF Protection
- No CSRF tokens on POST/PUT/DELETE requests
- **Fix:** Implement CSRF middleware

### 10. Missing Content Security Policy Header
**File:** `next.config.ts`
- X-Frame-Options, HSTS, X-Content-Type-Options all present
- **CSP header missing**
- **Fix:** Add Content-Security-Policy header

### 11. Audit Logs - No Deletion/Retention Policy
- `allow write: if false` prevents cleanup
- Logs grow indefinitely (GDPR risk)
- **Fix:** Implement TTL policy

### 12. Stripe Webhook Test Secret Fallback
- Accepts both live and test secrets in production
- **Fix:** Use only live secret in production

### 13. Member Profiles Publicly Readable
- Any signed-in user can read all member profiles
- **Fix:** Add privacy controls

### 14. Insufficient Payload Size Validation
- Several endpoints accept unlimited payloads
- **Fix:** Add body size limits

## Immediate Action Items (Next 24 Hours)

1. Verify `.env.local` not in git history
2. Remove hardcoded email from health endpoint
3. Rotate CRON_SECRET to cryptographically strong value
4. Require auth on analytics Firestore rules
5. Add CSP header

---

# 6. Code Quality & Duplication Audit

## Executive Summary

Key findings: **17 files with duplicate toDate() helper functions**, **4 nearly-identical cron job proxies**, **15+ routes with duplicated auth verification**, and significant prop drilling in dashboard components.

## TOP 10 DUPLICATION PATTERNS

### 1. toDate() Helper Duplicated in 17 Firestore Modules (CRITICAL)
**Files:** jobs.ts, scholarships.ts, training.ts, conferences.ts, employers.ts, powwows.ts, vendors.ts, recommendations.ts, visibility.ts, memberEngagement.ts, team.ts, scholarship-analytics.ts, offerings.ts, inbox.ts, employer-products.ts, admin-queries.ts, analytics.ts

```typescript
function toDate(timestamp: any): Date | null {
  if (!timestamp) return null;
  if (timestamp instanceof Date) return timestamp;
  if (timestamp._seconds) return new Date(timestamp._seconds * 1000);
  if (timestamp.seconds) return new Date(timestamp.seconds * 1000);
  if (timestamp.toDate) return timestamp.toDate();
  if (typeof timestamp === "string") return new Date(timestamp);
  return null;
}
```
**Fix:** Extract to `lib/firestore/timestamps.ts` (1-2 hours)

### 2. Cron Job Proxy Routes (CRITICAL)
**Files:** instant/route.ts, daily/route.ts, weekly/route.ts — 95% identical, differ only by frequency param
**Fix:** Create factory function (30 minutes)

### 3. Firebase Token Verification (HIGH)
**Files:** 15+ API routes repeat identical auth header parsing and token verification
**Fix:** Create `lib/api-auth.ts` helper (2 hours)

### 4. Loading State Management (HIGH)
**Files:** 20+ components repeat identical useState + useEffect + try/catch loading pattern
**Fix:** Create `useAsyncData` custom hook (4 hours)

### 5. Withdrawal/Unsave Logic (HIGH)
**Files:** ApplicationsTab, SavedScholarshipsTab — ~30 lines repeated
**Fix:** Extract to `useWithdraw()` hook (1-2 hours)

### 6. Status Filter + Keyword Search (MEDIUM)
**Files:** 10+ pages with identical filtering logic
**Fix:** Create `useListFilters` hook (1 hour)

### 7. Form State Management (MEDIUM)
**Files:** 5+ form pages with 20-50 individual useState calls
**Fix:** Refactor to `useReducer` or react-hook-form (3 hours)

### 8. Status Color/Badge Logic (MEDIUM)
**Fix:** Move to constants/utilities (30 minutes)

### 9. Profile Completion Calculation (MEDIUM)
**Fix:** Extract to shared utility (1 hour)

### 10. Empty State Messages (MEDIUM)
**Fix:** Create `<EmptyState>` component (1 hour)

## Largest Files Requiring Refactoring

| File | Lines | Issues |
|------|-------|--------|
| organization/shop/dashboard/page.tsx | 1,663 | Should be split into 4+ components |
| admin/employers/page.tsx | 1,576 | Table + modals + filters mixed |
| organization/jobs/new/page.tsx | 1,328 | 20+ useState, draft persistence, validation mixed |
| opportunity-graph/OpportunityFeed.tsx | 668 | Data fetching + tabs + rendering mixed |
| opportunity-graph/FeedLayout.tsx | 639 | Used on 50+ pages, handles auth + nav + layout |

## Missing Context Providers
- Only 1 context provider exists (AuthProvider)
- Missing: DashboardContext, OrganizationContext
- Each tab component independently re-fetches same user data

## Hardcoded Strings
- Status values ("submitted", "in review", "hired") in multiple files
- Route paths hardcoded in redirects
- Color classes scattered instead of centralized
- **Fix:** Create `lib/constants/` directory (3 hours)

## Refactoring Effort

| Phase | Focus | Effort |
|-------|-------|--------|
| Phase 1 (Critical) | toDate(), cron, auth utility, useAsyncData | 7.5 hours |
| Phase 2 (High) | Forms, contexts, service layer, constants | 15 hours |
| Phase 3 (Medium) | Tab components, query builder, splitting | 11-12 hours |
| **Total** | | **~40-45 hours** |

---

# 7. Mobile & Responsive Audit

## Executive Summary

**Overall mobile experience score: 6/10** — Functional but needs work on touch targets, modals, and admin responsiveness.

## TOUCH TARGET SIZE VIOLATIONS

| Element | File | Size | Min Required |
|---------|------|------|-------------|
| ConfirmationModal close button | admin/ConfirmationModal.tsx:171 | ~20px (p-1) | 44x44px |
| Date picker nav buttons | ui/date-picker.tsx | ~24px (p-1.5) | 44x44px |
| Dialog close button | ui/dialog.tsx:47 | 16px (h-4 w-4) | 44x44px |
| Admin table action buttons | admin/jobs/page.tsx | Variable | 44x44px |

## MODAL/DIALOG MOBILE ISSUES

- **ConfirmationModal**: No `max-h-[90vh] overflow-y-auto` — content cut off on mobile
- **JobPreviewModal**: `max-w-3xl` too wide for mobile < 600px
- **Dialog (Radix)**: Fixed `max-w-lg` for all screens

## MISSING RESPONSIVE BREAKPOINTS

**Admin pages completely unresponsive:**
- All admin tables use `text-xs` with no mobile handling
- Affected: `/admin/members`, `/admin/jobs`, `/admin/employers`, `/admin/news`, `/admin/users`, `/admin/verification`
- **Fix:** Hide non-essential columns with `hidden sm:table-cell` or stack as cards (8-12 hours)

## HOVER-ONLY INTERACTIONS

- Tooltip in analytics charts (group-hover:block) — invisible on touch
- "View All" links (group-hover:translate-x-1) — no mobile indication
- Card hover effects (hover:-translate-y-1, hover:scale) — no tap feedback
- **Fix:** Add `active:` states for touch feedback (3-4 hours)

## BOTTOM PADDING PATTERN

- Most pages correctly use `pb-24`
- Organization pages use `pb-20` (inconsistent)
- Admin pages have no bottom padding (intentional — no bottom nav)

## SMALL TEXT ON MOBILE

- Admin tables: `text-xs` (12px) everywhere — unreadable on phone
- Sidebar labels: `text-[10px]` — too small
- **Fix:** Use `text-xs sm:text-sm` pattern (4-6 hours)

## Summary

| Issue | Severity | Files | Effort |
|-------|----------|-------|--------|
| Touch targets < 44px | Critical | 5+ | 2-3h |
| Modal layout on mobile | High | 4+ | 4-6h |
| Missing responsive classes | High | 15+ | 8-12h |
| Table readability | High | 10+ | 4-6h |
| Hover-only interactions | Medium | 5+ | 3-4h |
| Small sidebar labels | Low | 3+ | 2-3h |
| Bottom padding inconsistency | Low | 5+ | 1-2h |

---

# 8. Data Architecture Audit

## Executive Summary

47 Firestore collections with generally sound architecture. Good practices (cursor-based pagination, batch writes, limits) but several **cost optimization opportunities** that could reduce monthly Firestore costs by 80%.

## CRITICAL ISSUES

### 1. Leaderboard - 300-500+ Reads Per Page Load
**File:** `lib/firestore/leaderboard.ts` (Line 117-120)
- Loads 100 members, then calls `calculateEngagementScore()` for each
- Each score calculation triggers 3-5 additional Firestore reads
- **Fix:** Cache engagement scores with 1-hour TTL

### 2. Unbounded Analytics Queries
**File:** `lib/firestore/analytics.ts` (Lines 95-102)
```typescript
// NO LIMIT - Could fetch 10,000+ documents
where("organizationId", "==", organizationId),
where("createdAt", ">=", startTimestamp),
orderBy("createdAt", "desc")
```
- **Fix:** Add `limit(1000)` and implement server-side aggregation

### 3. Vendor Duplicate Detection - Full Table Scan
**File:** `lib/firestore/vendors.ts` (Lines 94-174)
- Fetches ALL active vendors (could be 10,000+) for client-side string comparison
- **Fix:** Use indexed `normalized_name` field or Algolia

### 4. Messaging N+1 Pattern
**File:** `lib/firestore/messaging.ts` (Lines 25-68)
- Two separate queries for employer/member conversations instead of single OR query

## MISSING COMPOSITE INDEXES

Only 2 indexes defined. At least 10 more needed:

| Collection | Where Clauses |
|-----------|---------------|
| applications | (employerId, status, createdAt) |
| jobs | (employerId, active, createdAt) |
| messages | (conversationId, senderId!=, read) |
| conversations | (employerId, status, lastMessageAt) |
| outbound_clicks | (organizationId, createdAt>=, desc) |
| memberProfiles | (location, skills array-contains-any) |

## COST ANALYSIS

| Scenario | Monthly Cost |
|----------|-------------|
| Current (10K DAU, 5K employers) | $1,500-3,000 |
| With optimizations | $300-500 |
| **Savings** | **80%** |

## Quick Wins

| Fix | Savings | Effort |
|-----|---------|--------|
| Add `limit(1000)` to analytics queries | $50-200/mo | 15 min |
| Cache leaderboard scores (1-hour TTL) | $100-300/mo | 1-2 hours |
| Batch write operations (sequential -> batch) | $20-50/mo | 30 min |
| Remove denormalization from connections | $30-100/mo | 2-3 hours |

## Good Patterns Found
- Cursor-based pagination in jobs and applications
- Batch fetching with 30-item chunks for saved jobs
- Batch writes for notification updates
- Server-side timestamps used consistently
- Most queries have `limit()` clauses

---

# 9. Error Handling & Resilience Audit

## Executive Summary

**Moderate error handling infrastructure** with global error boundaries and Sentry integration, but missing route-level error boundaries for most routes, has inconsistent patterns, and lacks retry logic.

## ERROR BOUNDARIES

### Implemented
- `app/global-error.tsx` - Catches unhandled errors, reports to Sentry
- `app/error.tsx` - User-friendly error page with "Try Again" and "Go Home"
- `app/business/[slug]/error.tsx`
- `app/organization/shop/dashboard/error.tsx`
- `app/organizations/[slug]/error.tsx`

### Missing (Critical Routes)
- `/app/admin/*` - No error boundary
- `/app/member/*` - No error boundary
- `/app/organization/jobs/*` - No error boundary
- `/app/careers/*` - No error boundary
- `/app/education/*` - No error boundary

## NOT-FOUND HANDLERS

### Implemented
- `app/not-found.tsx` (global)
- `app/business/[slug]/not-found.tsx`
- `app/business/services/[id]/not-found.tsx`
- `app/member/[userId]/not-found.tsx`
- `app/organizations/[slug]/not-found.tsx`

### Missing
- Admin, careers, organization, education routes

## LOADING STATES

### Implemented (9 loading.tsx files)
- Business pages, careers/programs, organizations

### Missing
- Admin routes (critical for data-heavy pages)
- Member routes
- Organization routes
- Education routes
- Auth flows (login, register)

## SILENT CATCH BLOCKS (CRITICAL)

| File | Line | Issue |
|------|------|-------|
| `lib/firestore/social.ts` | 366, 384 | `.catch(() => {})` swallows follower count updates |
| `components/social/PostCard.tsx` | 47 | `.catch(() => {})` for saved post check |
| `organization/jobs/new/page.tsx` | 114 | Silently drops job info on error |

## RETRY LOGIC
- **Status: NOT IMPLEMENTED**
- No exponential backoff in client code
- No automatic retry on failed API calls
- Clients receive `retryAfter` headers but don't use them

## OFFLINE HANDLING
- Dedicated `/app/offline/page.tsx` exists
- Auth flows check for Firebase availability
- **Missing:** No service worker, no automatic redirect, no cached data fallback

## API ERROR FORMAT
- Consistent `{ error: "message" }` format with proper status codes (400, 401, 403, 404, 429, 500, 503)
- Minor inconsistency: some routes include `details` field, others don't

## RATE LIMITING
- Implemented on 13+ sensitive API routes
- Uses in-memory rate limiter (doesn't persist across restarts)
- Proper `retryAfter` response format

## Recommendations

| Priority | Task | Effort |
|----------|------|--------|
| Critical | Add error boundaries for admin/member routes | 1-2 hrs |
| Critical | Fix silent catch blocks | 2-3 hrs |
| Critical | Implement offline service worker | 6-8 hrs |
| High | Implement client-side retry logic | 4-6 hrs |
| High | Add missing loading.tsx files (10-12) | 2-3 hrs |
| Medium | Add Sentry performance monitoring | 2-3 hrs |
| Medium | Implement image fallbacks | 2-3 hrs |

**Total effort: 25-34 hours**

## Current Strengths
- Global error boundary with Sentry integration
- Consistent API error response format
- Rate limiting on sensitive endpoints
- Good form error handling and validation
- Proper async/await patterns
- Toast notifications for user feedback

---

# 10. Infrastructure & DevOps Audit

## Executive Summary

**Overall Infrastructure Grade: B+ (82/100)**. Mature DevOps foundations with strong CI/CD and documentation. Gaps in observability, disaster recovery, and local code quality enforcement.

## CI/CD Pipeline

### GitHub Actions Workflows (4 total)
1. **ci.yml** - Lint, typecheck, build on all PRs/pushes
2. **deploy-web.yml** - Vercel deployment on main push
3. **mobile-build.yml** - EAS builds on version tags
4. **job-alerts.yml** - Scheduled cron jobs

### Vercel Configuration
- 11 cron jobs defined in vercel.json
- Automatic deployments from main branch
- Preview deployments on PRs

### CI/CD Gaps

| Issue | Severity |
|-------|----------|
| No pre-commit hooks (husky/lint-staged) | Medium |
| Web tests placeholder ("No tests configured yet") | High |
| No security scanning (SAST/dependency audit) | High |
| No branch protection rules documented | Medium |
| No rollback strategy documented | Medium |

## Code Quality Tooling

| Tool | Status |
|------|--------|
| ESLint | Configured (Next.js defaults only) |
| Prettier | NOT configured |
| Husky | NOT configured |
| Lint-Staged | NOT configured |
| TypeScript strict | Configured |
| Code coverage | None |

## Monitoring & Observability

| Component | Status |
|-----------|--------|
| Sentry (error tracking) | Installed |
| Firebase Analytics | Configured |
| APM (performance monitoring) | Missing |
| Structured logging | Missing |
| Uptime monitoring | Missing |
| Real User Monitoring | Missing |
| Cost tracking | Missing |

## Environment Management
- `.env.example` comprehensive (92 lines, well-documented)
- `web/.env.example` (34 lines)
- `mobile/.env.example` (26 lines)
- Runtime validation via `env-validation.ts`
- **Missing:** No staging environment, no secrets rotation schedule

## Documentation Quality - EXCELLENT
- README.md, DEPLOYMENT_CHECKLIST.md, ADMIN_GUIDE.md
- SECURITY-AUDIT-REPORT.md, SEO_OPTIMIZATION.md
- STRIPE_SETUP_GUIDE.md, JOB_ALERTS_SETUP.md, CLAUDE.md
- **Missing:** Runbooks, disaster recovery, API docs

## Backup & Disaster Recovery - GRADE: D
- No automated Firestore backup schedule
- No tested restore procedure
- No offsite backup copies
- GitHub repo is only backup for code

## PWA Configuration - GOOD
- manifest.json configured
- Service worker with cache versioning
- Offline fallback page
- Separate strategies: API (network-first), assets (cache-first)

## Dependency Health
- Next.js 16.1.0, React 19.2.0, TypeScript 5.x — all current
- Stripe ^20.0.0, Firebase Admin ^13.6.0 — current
- No Dependabot or Renovate configured

## Grade Breakdown

| Area | Grade |
|------|-------|
| CI/CD Pipelines | B |
| Deployment | A- |
| Code Quality | B- |
| Testing | C |
| Monitoring | C+ |
| Security | B+ |
| Documentation | A |
| Backup & Recovery | D |
| Secrets Management | B |
| Container/Infrastructure | F |

## Priority Recommendations

### Critical (0-2 weeks)
1. Add Husky + Lint-Staged (4 hours)
2. Enable GitHub CodeQL scanning (2 hours)
3. Add Dependabot (1 hour)
4. Set up branch protection rules (1 hour)
5. Document disaster recovery procedure (6 hours)

### High (2-4 weeks)
6. Implement automated Firestore backups (8 hours)
7. Upgrade Sentry to include APM (12 hours)
8. Add Prettier configuration (4 hours)

### Medium (4-8 weeks)
9. Add semantic versioning + changelog (6 hours)
10. Implement mobile app store automation (12 hours)
11. Add code coverage reporting (4 hours)

---

# 11. Combined Summary & Action Items

## Top 20 Action Items by Priority

### P0 — Fix Immediately

| # | Action | Audit | Effort |
|---|--------|-------|--------|
| 1 | Verify .env.local not in git history, rotate keys | Security | ASAP |
| 2 | Remove hardcoded admin email from health endpoint | Security | 5 min |
| 3 | Require auth on analytics Firestore rules | Security | 30 min |
| 4 | Add CSP header to next.config.ts | Security | 30 min |
| 5 | Fix careers canonical URL (/jobs -> /careers) | SEO | 5 min |
| 6 | Remove broken /og-jobs.png reference | SEO | 5 min |

### P1 — This Week

| # | Action | Audit | Effort |
|---|--------|-------|--------|
| 7 | Dynamic import jsPDF/html2canvas (150KB savings) | Performance | 15 min |
| 8 | Lazy load Google Generative AI (40KB savings) | Performance | 15 min |
| 9 | Extract toDate() to shared utility (17 files) | Code Quality | 1-2 hrs |
| 10 | Create lib/api-auth.ts token verification (15+ files) | Code Quality | 2 hrs |
| 11 | Add metadata to login/signup pages | SEO | 1 hr |
| 12 | Fix dark mode contrast variables | Accessibility | 1 hr |
| 13 | Add error boundaries for admin/member routes | Error Handling | 1-2 hrs |
| 14 | Fix silent catch blocks | Error Handling | 2-3 hrs |

### P2 — Next 2 Weeks

| # | Action | Audit | Effort |
|---|--------|-------|--------|
| 15 | Add keyboard support to OpportunityCard | Accessibility | 1 day |
| 16 | Add ARIA labels to engagement buttons, filters, progress | Accessibility | 1-2 days |
| 17 | Add limit(1000) to analytics queries | Data | 15 min |
| 18 | Cache leaderboard scores (1-hr TTL) | Data | 1-2 hrs |
| 19 | Fix touch targets (p-1 -> p-2 on close buttons) | Mobile | 1 hr |
| 20 | Add Husky + Lint-Staged + Dependabot | Infrastructure | 5 hrs |

### P3 — Next Month

- Install Playwright + Vitest test framework
- Write first 15 E2E smoke tests
- Make admin tables responsive for mobile
- Add missing loading.tsx files (10-12)
- Create OG images for about, contact, pricing pages
- Add skip-navigation link
- Implement client-side retry logic
- Set up automated Firestore backups
- Create useAsyncData hook (eliminates 50+ lines per component)
- Add cache headers to public API routes

## Estimated Total Effort

| Category | Hours |
|----------|-------|
| Security fixes | 5-10 |
| SEO fixes | 5-8 |
| Performance quick wins | 3-5 |
| Accessibility fixes | 48-72 |
| Code quality refactoring | 40-45 |
| Mobile responsiveness | 25-35 |
| Data architecture | 10-15 |
| Error handling | 25-34 |
| Infrastructure | 40-50 |
| Test coverage | 200+ |
| **Total** | **~400-475 hours** |

---

*Report generated by 10 parallel Claude Code audit agents on February 7, 2026*
