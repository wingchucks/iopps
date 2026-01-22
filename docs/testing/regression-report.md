# IOPPS Employer Regression Report

**Generated:** 2026-01-21
**Branch:** master
**Commit:** 0550478

---

## 1. Regression Summary

| Severity | New Issues | Known Issues | Total |
|----------|------------|--------------|-------|
| P0 Critical | 1 | 0 | 1 |
| P1 Major | 2 | 0 | 2 |
| P2 Minor | 3 | 0 | 3 |
| P3 Enhancement | 2 | 0 | 2 |

**Ship Decision: NO** (see Section 8)

---

## 2. P0 Critical Issues

### P0-001: Admin Search Endpoint Has No Authentication

**Status:** NEW REGRESSION
**URL:** `/api/admin/search`
**File:** `web/app/api/admin/search/route.ts:17-20`

**Evidence:**
```typescript
// Verify auth
const authHeader = request.headers.get("Authorization");
if (!authHeader?.startsWith("Bearer ")) {
  // Allow unauthenticated access for now, but limit results
  // In production, you'd want to require auth
}
```

**Repro Steps:**
1. Open browser (not logged in)
2. Navigate to `/api/admin/search?q=test`
3. Observe: Returns search results including employer names, emails, user data

**Expected:** 401 Unauthorized
**Actual:** 200 OK with sensitive data

**Root Cause:** Auth check is commented out / intentionally bypassed
**Fix Required:** Add proper admin role check like other admin endpoints

---

## 3. P1 Major Issues

### P1-001: Approval Email Contains Deprecated /employer Link

**Status:** NEW REGRESSION
**File:** `web/app/api/emails/send-approval/route.ts:140, 171`

**Evidence:**
```typescript
<a href="https://iopps.ca/employer" ...>Go to Dashboard</a>
// and
Visit your dashboard: https://iopps.ca/employer
```

**Impact:** Users clicking email link get redirected (works but unprofessional)
**Expected:** Link should be `https://iopps.ca/organization`

---

### P1-002: Job Edit Page Uses Deprecated /employer Routes

**Status:** NEW REGRESSION
**File:** `web/app/organization/jobs/[jobId]/edit/page.tsx`

**Affected Lines:** 246, 263, 326, 346, 714

**Evidence:**
```typescript
router.push("/employer");  // Lines 246, 263
href="/employer"           // Lines 326, 346, 714
```

**Additional Files Affected:**
- `web/app/organization/jobs/[jobId]/applications/page.tsx:119`
- `web/app/organization/applications/page.tsx:330`

**Impact:** Relies on redirect; adds latency; shows deprecated URL in browser history
**Fix Required:** Replace all `/employer` with `/organization`

---

## 4. Known Issues Still Present

_None from baseline (baseline newly created)_

---

## 5. P2/P3 Friction & Improvements

### P2-001: Duplicate Navigation Components

**Status:** Technical Debt
**Files:**
- `components/MobileBottomNav.tsx` (root)
- `components/organization/dashboard/MobileBottomNav.tsx` (duplicate?)
- `components/ui/DashboardSidebar.tsx`
- `components/organization/dashboard/DashboardSidebar.tsx` (duplicate?)

**Risk:** Developers may use wrong component; changes to one don't reflect in other
**Recommendation:** Audit and consolidate to single source of truth

---

### P2-002: Field Naming Inconsistency (bannerUrl vs coverImageUrl)

**Status:** Technical Debt
**Files:** Multiple

**Evidence:**
- Onboarding uses `coverImageUrl` internally but saves as `bannerUrl`
- VendorCard uses `coverImageUrl`
- Employer profile uses `bannerUrl`

**Risk:** Field access errors; confusion in codebase
**Recommendation:** Standardize on one field name with migration

---

### P2-003: Public Employers Page Links to /employers/[id] Not /businesses/[slug]

**Status:** Inconsistency
**Files:**
- `web/app/organizations/page.tsx:235`
- `web/components/jobs/JobSidebar.tsx:240, 267`
- `web/components/jobs/JobHeader.tsx:31`
- `web/components/TrustedPartners.tsx:95`

**Evidence:** Links use `/employers/${id}` instead of canonical `/businesses/[slug]`
**Impact:** May work but inconsistent with new profile URL structure

---

### P3-001: Admin Notify Endpoint Publicly Accessible

**Status:** By Design (rate-limited)
**File:** `web/app/api/admin/notify/route.ts`

**Notes:** This endpoint sends notifications TO admins, not data TO users. Rate-limited at 10 req/min. Acceptable risk but should be documented.

---

### P3-002: Hardcoded Ratings in Business Cards

**Status:** Enhancement
**Files:**
- `web/app/business/page.tsx` - Shows hardcoded "⭐ 4.9" and "⭐ 4.8"

**Recommendation:** Remove or implement actual ratings system

---

## 6. Route/Navigation Drift Report

### Deprecated Routes Still Referenced

| Route | Status | Files Using It |
|-------|--------|----------------|
| `/employer` | REDIRECTS (next.config.ts) | 8 files still reference directly |
| `/employers/[id]` | ACTIVE but inconsistent | 5 files use instead of `/businesses/[slug]` |
| `/setup` | NOT FOUND (no redirect) | Not referenced |

### Redirect Configuration (Verified)
```typescript
// next.config.ts:80-83
source: "/employer/:path*",
destination: "/organization/:path*",
permanent: true
```

### Files Requiring /employer Cleanup

1. `web/app/api/emails/send-approval/route.ts` (2 occurrences)
2. `web/app/organization/jobs/[jobId]/edit/page.tsx` (5 occurrences)
3. `web/app/organization/jobs/[jobId]/applications/page.tsx` (1 occurrence)
4. `web/app/organization/applications/page.tsx` (1 occurrence)

---

## 7. Security Gate Checks

### Admin Endpoint Auth Status

| Endpoint | Auth Check | Status |
|----------|-----------|--------|
| `/api/admin/search` | **NONE** | **FAIL - P0** |
| `/api/admin/notify` | Rate-limit only | WARN |
| `/api/admin/check-claims` | Token verified | PASS |
| `/api/admin/employers/update` | Admin role check | PASS |
| `/api/admin/employers/diagnose` | Admin role check | PASS |
| `/api/admin/delete-employer` | Admin role check | PASS |
| `/api/admin/delete-user` | Admin role check | PASS |
| `/api/admin/impersonate` | Admin/Mod check | PASS |
| `/api/admin/employer-products` | Admin/Mod check | PASS |

### Firestore Rules
- Employer read requires `status == 'approved'` or owner - PASS
- Employer write requires owner or admin - PASS

### Storage Rules
- Not audited in this scan

---

## 8. Ship Decision

### **DECISION: NO - Do Not Ship**

**Blockers:**

1. **P0-001**: Admin search endpoint exposes sensitive user/employer data without authentication. Any user can query the database.

2. **P1-001 + P1-002**: While redirects work, production emails should not contain deprecated URLs. Creates poor impression.

3. **Code hygiene**: 8+ files still reference `/employer` instead of `/organization`.

### Minimum Required Before Ship:

- [ ] Fix `/api/admin/search` to require admin auth
- [ ] Update approval email to use `/organization` URL
- [ ] Find-and-replace `/employer` references in organization pages

### Recommended (Not Blocking):

- [ ] Consolidate duplicate nav components
- [ ] Standardize coverImageUrl/bannerUrl field naming
- [ ] Update job links to use `/businesses/[slug]` pattern

---

## 9. Manual Test Checklist

Use this for click-through verification after fixes:

### Employer Login Flow
- [ ] Login as employer → lands on `/organization` (not redirect)
- [ ] Mobile (375px): Bottom nav visible and functional
- [ ] Pending banner shows if not approved

### Job Post Flow
- [ ] Create new job → Save Draft works
- [ ] Publish job → Appears in public listings
- [ ] Edit published job → Changes persist
- [ ] Duplicate job → All fields copy correctly
- [ ] Delete job → Removed from all views

### Onboarding
- [ ] New employer → `/organization/onboarding` loads
- [ ] All steps save without error
- [ ] Cover image uploads and persists (test on Safari mobile)
- [ ] Completion triggers admin notification

### Profile & Visibility
- [ ] Published profile visible at `/businesses/[slug]`
- [ ] Unpublished profile shows "Profile Not Available"
- [ ] Story editor modal works from public profile

### Pricing
- [ ] `/pricing` accessible from dashboard
- [ ] `/pricing` accessible from public nav
- [ ] Mobile: Pricing card layout correct

### Events/Conferences
- [ ] Create event → saves correctly
- [ ] Publish event → appears in public listings

### Admin Gates (as non-admin employer)
- [ ] `/api/admin/search?q=test` → 401 (CURRENTLY FAILS)
- [ ] `/admin/*` pages → Redirect or 403
- [ ] Cannot delete other employers' content

---

_Report generated by Regression QA Agent_
