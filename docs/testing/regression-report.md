# IOPPS Employer Regression Report

**Generated:** 2026-01-21
**Branch:** master
**Commit:** d96623c

---

## 1. Regression Summary

| Severity | New Issues | Fixed This Session | Remaining |
|----------|------------|-------------------|-----------|
| P0 Critical | 1 | 1 | 0 |
| P1 Major | 2 | 2 | 0 |
| P2 Minor | 3 | 0 | 3 |
| P3 Enhancement | 2 | 0 | 2 |

**Ship Decision: YES - All blockers resolved**

---

## 2. P0 Critical Issues

### P0-001: Admin Search Endpoint Has No Authentication

**Status:** ✅ FIXED (commit d96623c)
**URL:** `/api/admin/search`
**File:** `web/app/api/admin/search/route.ts`

**Original Issue:**
```typescript
// Verify auth
const authHeader = request.headers.get("Authorization");
if (!authHeader?.startsWith("Bearer ")) {
  // Allow unauthenticated access for now, but limit results
  // In production, you'd want to require auth
}
```

**Fix Applied:**
- Added Firebase Auth token verification
- Added admin/moderator role check from users collection
- Returns 401 for missing/invalid token
- Returns 403 for non-admin users

---

## 3. P1 Major Issues

### P1-001: Approval Email Contains Deprecated /employer Link

**Status:** ✅ FIXED (commit d96623c)
**File:** `web/app/api/emails/send-approval/route.ts`

**Fix Applied:**
- HTML link: `https://iopps.ca/employer` → `https://iopps.ca/organization`
- Plain text link: `https://iopps.ca/employer` → `https://iopps.ca/organization`

---

### P1-002: Job Edit Page Uses Deprecated /employer Routes

**Status:** ✅ FIXED (commit d96623c)

**Files Fixed:**
| File | Occurrences Fixed |
|------|-------------------|
| `web/app/organization/jobs/[jobId]/edit/page.tsx` | 5 |
| `web/app/organization/jobs/[jobId]/applications/page.tsx` | 1 |
| `web/app/organization/applications/page.tsx` | 1 |

**Fix Applied:**
- All `router.push("/employer")` → `router.push("/organization")`
- All `href="/employer"` → `href="/organization"`

---

## 4. Known Issues Still Present

_None from baseline_

---

## 5. P2/P3 Friction & Improvements (Not Blocking)

### P2-001: Duplicate Navigation Components

**Status:** Technical Debt - Deferred
**Files:**
- `components/MobileBottomNav.tsx` (root)
- `components/organization/dashboard/MobileBottomNav.tsx`
- `components/ui/DashboardSidebar.tsx`
- `components/organization/dashboard/DashboardSidebar.tsx`

**Recommendation:** Audit and consolidate to single source of truth

---

### P2-002: Field Naming Inconsistency (bannerUrl vs coverImageUrl)

**Status:** Technical Debt - Deferred

**Evidence:**
- Onboarding uses `coverImageUrl` internally but saves as `bannerUrl`
- VendorCard uses `coverImageUrl`
- Employer profile uses `bannerUrl`

**Recommendation:** Standardize on one field name with migration

---

### P2-003: Public Employers Page Links to /employers/[id] Not /businesses/[slug]

**Status:** Inconsistency - Deferred
**Files:**
- `web/app/organizations/page.tsx:235`
- `web/components/jobs/JobSidebar.tsx:240, 267`
- `web/components/jobs/JobHeader.tsx:31`
- `web/components/TrustedPartners.tsx:95`

**Recommendation:** Update to use canonical `/businesses/[slug]` pattern

---

### P3-001: Admin Notify Endpoint Publicly Accessible

**Status:** By Design (rate-limited) - Acceptable

---

### P3-002: Hardcoded Ratings in Business Cards

**Status:** Enhancement - Deferred
**Recommendation:** Remove or implement actual ratings system

---

## 6. Route/Navigation Drift Report

### Deprecated Routes Status

| Route | Status | Action Taken |
|-------|--------|--------------|
| `/employer` | REDIRECTS via next.config.ts | ✅ All internal refs fixed |
| `/employers/[id]` | ACTIVE but inconsistent | Deferred (still works) |

### Files Cleaned Up This Session

| File | Changes |
|------|---------|
| `web/app/api/emails/send-approval/route.ts` | 2 URLs fixed |
| `web/app/organization/jobs/[jobId]/edit/page.tsx` | 5 refs fixed |
| `web/app/organization/jobs/[jobId]/applications/page.tsx` | 1 ref fixed |
| `web/app/organization/applications/page.tsx` | 1 ref fixed |

---

## 7. Security Gate Checks

### Admin Endpoint Auth Status

| Endpoint | Auth Check | Status |
|----------|-----------|--------|
| `/api/admin/search` | Admin/Mod role check | ✅ **PASS (FIXED)** |
| `/api/admin/notify` | Rate-limit only | WARN (acceptable) |
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

---

## 8. Ship Decision

### **DECISION: YES - Clear to Ship**

**Blockers Resolved:**

| Issue | Status |
|-------|--------|
| P0-001: Admin search auth | ✅ Fixed |
| P1-001: Approval email URL | ✅ Fixed |
| P1-002: Job edit page URLs | ✅ Fixed |

**Remaining Items (Non-Blocking):**

- P2 items are technical debt, not user-facing issues
- P3 items are enhancements for future sprints

---

## 9. Manual Test Checklist

Use this for click-through verification:

### Employer Login Flow
- [ ] Login as employer → lands on `/organization` (not redirect)
- [ ] Mobile (375px): Bottom nav visible and functional
- [ ] Pending banner shows if not approved

### Job Post Flow
- [ ] Create new job → Save Draft works
- [ ] Publish job → Appears in public listings
- [ ] Edit published job → Returns to `/organization` ✅
- [ ] Duplicate job → All fields copy correctly
- [ ] Delete job → Returns to `/organization` ✅

### Onboarding
- [ ] New employer → `/organization/onboarding` loads
- [ ] All steps save without error
- [ ] Cover image uploads and persists

### Profile & Visibility
- [ ] Published profile visible at `/businesses/[slug]`
- [ ] Unpublished profile shows "Profile Not Available"

### Admin Gates (as non-admin employer)
- [ ] `/api/admin/search?q=test` → 401 Unauthorized ✅
- [ ] `/admin/*` pages → Redirect or 403

---

_Report generated by Regression QA Agent_
_Last updated: 2026-01-21 after security fixes (commit d96623c)_
