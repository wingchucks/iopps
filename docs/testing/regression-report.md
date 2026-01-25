# IOPPS Employer Regression Report

**Generated:** 2026-01-21
**Branch:** master
**Commit:** c8dbcee

---

## 1. Regression Summary

| Severity | New Issues | Fixed This Session | Remaining |
|----------|------------|-------------------|-----------|
| P0 Critical | 5 | 5 | 0 |
| P1 Major | 5 | 5 | 0 |
| P2 Minor | 4 | 1 | 3 |
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

### P0-002: Directory Shows Unavailable Profiles

**Status:** ✅ FIXED (commit c8dbcee)
**File:** `web/lib/firestore/directory.ts`

**Original Issue:**
- Directory index included profiles that weren't approved
- `upsertDirectoryEntry()` only checked `publicationStatus` and `directoryVisible`, not `status === "approved"`

**Fix Applied:**
- Added `isApproved = profile.status === "approved"` check
- Updated `upsertDirectoryEntry()` to require all visibility criteria
- Updated `rebuildDirectoryIndex()` with consistent logic
- Non-approved profiles are now removed from index

---

### P0-003: /business/* Routing Breaks Everything

**Status:** ✅ FIXED (commit c8dbcee)
**File:** `web/app/business/products/page.tsx`

**Original Issue:**
- Products page used `useSearchParams` without Suspense boundary
- Could cause hydration issues in Next.js App Router

**Fix Applied:**
- Added `Suspense` boundary wrapper component
- Created `ProductsPageSkeleton` loading fallback
- Split page into wrapper and content components

---

### P0-004: Category Browse Links Broken

**Status:** ✅ FIXED (commit c8dbcee)
**File:** `web/app/business/page.tsx`

**Original Issue:**
- Category links used title case values (`Jewelry`, `Art`, `Apparel`, `Food`)
- Products page filter expected lowercase values (`jewelry`, `art`, `clothing`, `food`)
- "Apparel" didn't match filter value "clothing"

**Fix Applied:**
- Added `value` property to category objects with correct lowercase values
- Links now use `cat.value` instead of `cat.label`
- Added URL parameter reading to products page

---

### P0-005: Multiple Broken Slugs Per Entity

**Status:** ✅ FIXED (commit c8dbcee)
**File:** `web/lib/firebase/shop.ts`

**Original Issue:**
- No uniqueness check when generating vendor slugs
- Could result in duplicate slugs across vendors

**Fix Applied:**
- Added `isVendorSlugAvailable()` function
- Added `generateUniqueSlug()` with random suffix
- `createVendor()` now checks availability before using slug
- `updateVendor()` regenerates slug when business name changes

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

### P1-003: Directory Filters Return Zero Results

**Status:** ✅ FIXED (commit c8dbcee)
**File:** `web/lib/firebase/shop.ts`

**Original Issue:**
- `getActiveVendors()` replaced entire query when adding filters
- Only the last filter was applied (category OR region, not both)

**Fix Applied:**
- Refactored to use constraint array pattern
- All filters are now additive
- Added client-side sorting (featured first, then alphabetically)

---

### P1-004: Slug Generated from User Name Instead of Business Name

**Status:** ✅ FIXED (commit c8dbcee)
**File:** `web/lib/firebase/shop.ts`

**Original Issue:**
- `createDraftVendorForEmployer()` used `displayName` (user's name) for slug
- Slug never updated when actual business name was set

**Fix Applied:**
- Draft vendors now use temporary placeholder slug (`business-{userId}-{random}`)
- `updateVendor()` regenerates slug when `businessName` changes
- Business name field left empty for user to fill in

---

### P1-005: Offerings Exist But Show as Empty (Broken Links)

**Status:** ✅ FIXED (commit c8dbcee)

**Original Issue:**
- VendorCard linked to `/shop/${slug}` (doesn't exist)
- ServiceCard linked to `/marketplace/services/${id}` (doesn't exist)
- Back links in vendor pages pointed to `/shop`

**Files Fixed:**
| File | Change |
|------|--------|
| `web/components/shop/VendorCard.tsx` | `/shop/` → `/business/` |
| `web/components/shop/ServiceCard.tsx` | `/marketplace/services/` → `/business/services/` |
| `web/app/business/[slug]/page.tsx` | `/shop` → `/business` |
| `web/app/business/[slug]/error.tsx` | `/shop` → `/business` |
| `web/app/business/[slug]/not-found.tsx` | `/shop` → `/business` |

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

### P2-004: Location String Has Extra Space

**Status:** ✅ FIXED (commit c8dbcee)
**File:** `web/lib/firestore/organizations.ts`

**Fix Applied:**
- Added `.trim()` to city and province values when constructing location string
- Applied in both `createOrganizationProfile()` and `updateOrganizationProfile()`

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
| `/shop` | DEPRECATED | ✅ All refs updated to `/business` |
| `/marketplace/services` | DEPRECATED | ✅ All refs updated to `/business/services` |

### Files Cleaned Up This Session

| File | Changes |
|------|---------|
| `web/app/api/emails/send-approval/route.ts` | 2 URLs fixed |
| `web/app/organization/jobs/[jobId]/edit/page.tsx` | 5 refs fixed |
| `web/app/organization/jobs/[jobId]/applications/page.tsx` | 1 ref fixed |
| `web/app/organization/applications/page.tsx` | 1 ref fixed |
| `web/components/shop/VendorCard.tsx` | 1 link fixed |
| `web/components/shop/ServiceCard.tsx` | 1 link fixed |
| `web/app/business/[slug]/page.tsx` | 1 link fixed |
| `web/app/business/[slug]/error.tsx` | 1 link fixed |
| `web/app/business/[slug]/not-found.tsx` | 1 link fixed |

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

### Directory Index Security
- Only approved, published, visible profiles indexed - ✅ PASS (FIXED)

---

## 8. Ship Decision

### **DECISION: YES - Clear to Ship**

**Blockers Resolved:**

| Issue | Status |
|-------|--------|
| P0-001: Admin search auth | ✅ Fixed (d96623c) |
| P0-002: Directory shows unavailable | ✅ Fixed (c8dbcee) |
| P0-003: /business/* routing | ✅ Fixed (c8dbcee) |
| P0-004: Category links broken | ✅ Fixed (c8dbcee) |
| P0-005: Broken slugs | ✅ Fixed (c8dbcee) |
| P1-001: Approval email URL | ✅ Fixed (d96623c) |
| P1-002: Job edit page URLs | ✅ Fixed (d96623c) |
| P1-003: Directory filters | ✅ Fixed (c8dbcee) |
| P1-004: Slug from user name | ✅ Fixed (c8dbcee) |
| P1-005: Broken offering links | ✅ Fixed (c8dbcee) |

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

### Business Pages (NEW)
- [ ] `/business` → Loads marketplace with tabs
- [ ] Category links → Navigate to `/business/products?category=X` correctly
- [ ] VendorCard click → Navigates to `/business/[slug]`
- [ ] ServiceCard click → Navigates to `/business/services/[id]`
- [ ] Back links → Return to `/business`
- [ ] Directory filters → Return results when matching data exists

### Directory Index (NEW)
- [ ] Only approved profiles appear in directory
- [ ] Pending/rejected profiles not visible
- [ ] Unpublished profiles not visible

---

_Report generated by Regression QA Agent_
_Last updated: 2026-01-21 after business pages fixes (commit c8dbcee)_
