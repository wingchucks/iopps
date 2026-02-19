# Employer Profile & Branding Flow Test Report

**Test Date:** 2026-01-22
**Tester:** Automated Testing Agent (Agent 3)
**Scope:** Profile editing experience, logo upload, description, contact info, social links, public profile rendering, save/autosave behavior, form validation

---

## Executive Summary

The Employer Profile & Branding Flow is **functional but has significant friction points** that could cause user drop-off. The core data persistence works correctly, but the system has accumulated complexity from two profile systems (EmployerProfile vs OrganizationProfile), three URL schemes, and two separate editing UIs.

**Overall Score: 6/10 - Functional but Frustrating**

---

## Confirmed Bugs

| # | Bug | URL/Location | Expected | Actual | Severity |
|---|-----|-------------|----------|--------|----------|
| 1 | **Cover image field name mismatch** | `/web/app/organization/onboarding/page.tsx:165` | Form uses `coverImageUrl`, API saves to `bannerUrl` | Field stored in Firestore as `bannerUrl`, but form pre-fills from `coverImageUrl` first. Pre-fill logic at line 165 tries `coverImageUrl` before `bannerUrl`, can cause loss of cover image when editing. | **P1 Major** |
| 2 | **`location` field generated inconsistently** | `/web/lib/firestore/organizations.ts:172` and `/web/app/api/organization/publish/route.ts:120-121` | Location should be consistent `{city}, {province}` | Creates duplicate location string - onboarding creates `city, province` but profile page shows `location` field directly from EmployerProfile. When user edits only city/province separately, location doesn't auto-update. | **P1 Major** |
| 3 | **Social links not saved via onboarding** | `/web/app/organization/onboarding/page.tsx` | Users should be able to save social links during onboarding | Onboarding wizard only saves `website` to `links.website`, but has no fields for `instagram`, `facebook`, `linkedin`, `twitter`, `tiktok`. These are only available in UnifiedProfileTab but not linked from onboarding. | **P2 Minor** |
| 4 | **Logo file size inconsistency** | `/web/app/organization/onboarding/page.tsx:622` vs `/web/lib/firebase/storage.ts:47` | Consistent max file size messaging | Onboarding shows "PNG, JPG up to 2MB" but actual validation allows 10MB. UnifiedProfileTab says 5MB. Three different stated limits. | **P2 Minor** |
| 5 | **Missing `contactPhone` and `contactEmail` save** | `/web/app/organization/onboarding/page.tsx` handlePublish function | Contact info should be saved | Onboarding wizard doesn't collect or save `contactPhone` or `contactEmail`. Only `website` is saved to `links`. User must use dashboard to add contact info. | **P2 Minor** |
| 6 | **`industry` field not collected in onboarding** | `/web/app/organization/onboarding/page.tsx` | Industry should be captured | Onboarding skips `industry` field entirely. Only available in UnifiedProfileTab's "Employer Settings" section. Public profile `/employers/[employerId]/page.tsx:353` displays industry badge but it's never set during onboarding. | **P2 Minor** |
| 7 | **Directory shows `directoryVisible: false` for new profiles** | `/web/app/api/organization/publish/route.ts:130,196` | Published profile should appear in directory | New profiles get `directoryVisible: false` because `isApproved` is always `false` for new employers. Even after publishing, profile won't appear in businesses directory until admin approves. No user feedback about this. | **P1 Major** |

---

## UX Friction Points

| # | Issue | Location | Impact |
|---|-------|----------|--------|
| 1 | **No autosave** | Onboarding wizard | User loses all progress if they navigate away accidentally. No draft auto-save except manual "Save as Draft" button. |
| 2 | **Confusing "Publish" vs "Save as Draft"** | `/web/app/organization/onboarding/page.tsx:900-909` | "Save as Draft" only appears on step 4 for unpublished profiles. Users may not realize they need to get to step 4 to save progress. |
| 3 | **Two editing paths with different fields** | Onboarding vs UnifiedProfileTab | Onboarding collects: name, type, location, logo, cover, description, website, modules. UnifiedProfileTab has: tagline, communityStory, nation, phone, email, social links, industry, vendor settings. Confusing which to use. |
| 4 | **Step 3 starts at step 3 for existing profiles** | `/web/app/organization/onboarding/page.tsx:171` | Comment says "Always start at step 3 to ensure re-publish generates slug" but this skips steps 1-2 on return visits, denying users a review workflow. |
| 5 | **No visual preview of public profile** | Onboarding wizard | Users can't see how their profile will look before publishing. Only summary card on step 4. |
| 6 | **HEIC upload error is user-hostile** | `/web/lib/firebase/storage.ts:97-101` | iPhone users get "HEIC/HEIF images are not supported" - suggests converting or screenshot, but no auto-conversion. Many users won't understand this. |
| 7 | **Success state shows "View Public Profile" for pending** | `/web/app/organization/onboarding/page.tsx:772-788` | For approved employers shows "View Public Profile", for pending shows dashboard link. But the link goes to `/businesses/${slug}` which will 404 or show permission error for pending profiles. |
| 8 | **Unclear approval process** | Step 4 success state | Message says "being reviewed by our team" but no indication of timeline, next steps, or how to track status. |

---

## Conflicts / Redundancies

| # | Conflict | Files Involved | Description |
|---|----------|---------------|-------------|
| 1 | **Two profile systems: EmployerProfile vs OrganizationProfile** | `types.ts:168-218` vs `types.ts:2572-2606` | OrganizationProfile extends EmployerProfile but adds slug, orgType, publicationStatus, directoryVisible. Some pages use EmployerProfile, some use OrganizationProfile. Creates confusion about which type to use. |
| 2 | **Two public profile routes** | `/employers/[employerId]/page.tsx` vs `/businesses/[slug]/page.tsx` | Both routes exist. `/employers/[id]` redirects to `/businesses/[slug]` if slug exists. But `/business/[slug]/page.tsx` is a completely different vendor/shop page (not employer profile). Three URL patterns: `/employers/`, `/businesses/`, `/business/`. |
| 3 | **Duplicate slug generation** | `/web/lib/firestore/organizations.ts:37-53` vs `/web/app/api/organization/publish/route.ts:9-23` | Same slug generation logic duplicated in two places. Could drift. |
| 4 | **Two profile editing UIs** | Onboarding wizard vs UnifiedProfileTab | Both can edit the same underlying EmployerProfile. Onboarding uses `/api/organization/publish`, UnifiedProfileTab uses `upsertEmployerProfile()` directly. Different save mechanisms. |
| 5 | **`bannerUrl` vs `coverImageUrl` naming** | Throughout codebase | EmployerProfile uses `bannerUrl`, Vendor uses `coverImageUrl`, form state uses `coverImageUrl`. Confusing naming. |
| 6 | **Legacy vs ExtendedSocialLinks** | `types.ts:161-166` vs `types.ts:2556-2566` | SocialLinks has 4 fields (linkedin, twitter, facebook, instagram). ExtendedSocialLinks has 10 fields. Both are used in different places. |
| 7 | **`status` vs `publicationStatus`** | EmployerProfile vs OrganizationProfile | `status` is admin approval ("pending"/"approved"/"rejected"). `publicationStatus` is user publication state ("DRAFT"/"PUBLISHED"/"PENDING_APPROVAL"). Both control visibility differently. |

---

## Improvement Suggestions

### Quick (< 1 day)

1. **Fix logo file size messaging** - Standardize to one consistent message (10MB actual limit)
2. **Add form dirty state warning** - Prevent accidental navigation with unsaved changes
3. **Add preview link for pending profiles** - Allow owners to preview even if not public
4. **Fix cover image field name** - Use `bannerUrl` consistently everywhere

### Medium (1-3 days)

5. **Add social links to onboarding** - Add step 2.5 or expand step 2 to include Instagram, Facebook, LinkedIn, etc.
6. **Unified edit experience** - Single page to edit all profile fields, not split between onboarding and dashboard
7. **Auto-convert HEIC images** - Use client-side conversion library for iPhone users
8. **Better approval status tracking** - Show approval queue position, expected time, or at minimum "We'll email you"

### Structural (1+ week)

9. **Consolidate EmployerProfile and OrganizationProfile** - Single unified data model
10. **Deprecate `/employers/[id]` route** - All public profiles should use `/businesses/[slug]`
11. **Autosave with debounce** - Save draft automatically every 30 seconds of inactivity
12. **Profile preview modal** - Show exactly how public profile will appear before publish

---

## Source of Truth Diagnosis

### Canonical Data Model: `employers` Firestore Collection

- **Document ID**: Usually `userId`, but can differ (code handles both lookup strategies)
- **Key Fields**:
  - `organizationName`: Display name
  - `logoUrl`: Profile image
  - `bannerUrl`: Cover/banner image (NOT `coverImageUrl`)
  - `description`: About text
  - `location`: Computed string "{city}, {province}"
  - `province`, `city`: Separate location fields (OrganizationProfile only)
  - `slug`: URL-friendly identifier (OrganizationProfile only)
  - `status`: Admin approval state (`pending`|`approved`|`rejected`|`deleted`)
  - `publicationStatus`: User publication state (`DRAFT`|`PUBLISHED`|`PENDING_APPROVAL`)
  - `directoryVisible`: Boolean for directory listing
  - `enabledModules`: Array of capabilities (`hire`|`sell`|`educate`|`host`|`funding`)

### Which Page is Canonical?

| Page | Purpose | Reads From | Writes To |
|------|---------|------------|-----------|
| `/organization/onboarding` | Initial setup & republish | `employers` | `/api/organization/publish` → `employers` + `directory_index` |
| `/organization/profile` | Status display only | `employers` | None (links to onboarding) |
| `/organization/dashboard` (UnifiedProfileTab) | Full editing | `employers` + `vendors` | `upsertEmployerProfile()` + `updateVendor()` |
| `/businesses/[slug]` | Public display (new) | `employers` via `getPublicOrganizationBySlug()` | None |
| `/employers/[employerId]` | Public display (legacy) | `employers` via direct doc read | Redirects to `/businesses/[slug]` |

### Broken Flows

1. **New user onboarding** → publishes to `employers` → appears in `/businesses` directory ONLY after admin approval → but no feedback to user
2. **Existing user edit** → onboarding skips to step 3 → may not review step 1-2 changes
3. **Dashboard edit** → saves to both `employers` and `vendors` → but vendor data not shown on `/businesses/[slug]` page

---

## Data Persistence Verification

**Do changes persist after refresh/log out?**

✅ **YES** - All Firestore operations use `serverTimestamp()` and proper document update patterns:
- `onboarding/page.tsx:351-368` sends data to `/api/organization/publish`
- `/api/organization/publish/route.ts:115-135` updates Firestore with `FieldValue.serverTimestamp()`
- `getEmployerProfile()` fetches fresh data on page load

**Are there silent failures?**

⚠️ **PARTIALLY** - Error handling exists but could be improved:
- Logo/cover upload errors are caught and shown to user (lines 203-210, 225-232)
- Publish errors show generic "Failed to publish" message (line 407)
- No retry mechanism for failed uploads

**Does public profile show same data as dashboard preview?**

⚠️ **MOSTLY** - But with caveats:
- Banner images include cache-busting via `bannerUpdatedAt` timestamp
- Some fields (tagline, communityStory, nation) only exist in vendor data, not shown on `/businesses/[slug]`
- Social links display differs between OrganizationProfileClient (uses `org.links.*`) and legacy employer page (uses `employer.socialLinks.*`)

---

## "Would I use this again?" Verdict

**Score: 6/10 - Functional but Frustrating**

The core flow works: I can create an organization profile, upload a logo and cover image, write a description, and publish. The data persists correctly after refresh/logout.

**What works well:**
- Clean, modern UI with good visual feedback
- Multi-step wizard is logically organized
- Upload progress indicators
- Error handling for invalid file types (especially HEIC)
- Slug generation is automatic and unique

**What would make me hesitate to return:**
1. The disconnect between onboarding and dashboard editing is confusing. I'd complete onboarding, then discover there are 10+ fields I can only edit from a different page.
2. No visibility into approval status is frustrating. I publish, get told "under review", and then... nothing. No timeline, no email confirmation, no way to check status.
3. The split between `/employers/`, `/businesses/`, and `/business/` routes is confusing when sharing links.
4. Having to understand the difference between "status" (admin approval) and "publicationStatus" (my choice to publish) to understand why my profile isn't visible.

**Bottom line:** The system is technically sound but has accumulated feature debt. Two profile systems (Employer vs Organization), three URL schemes, two editing UIs, and complex visibility logic create cognitive load. A consolidation pass would significantly improve the experience.

---

## Files Analyzed

- `/web/app/organization/onboarding/page.tsx` - Main profile editing wizard
- `/web/app/organization/profile/page.tsx` - Profile status page
- `/web/app/organization/dashboard/UnifiedProfileTab.tsx` - Dashboard profile editing
- `/web/app/employers/[employerId]/page.tsx` - Legacy public profile (redirects to slug)
- `/web/app/businesses/[slug]/page.tsx` - New public profile entry point
- `/web/app/businesses/[slug]/OrganizationProfileClient.tsx` - New public profile UI
- `/web/app/businesses/page.tsx` - Directory listing
- `/web/app/business/[slug]/page.tsx` - Vendor/shop profile (different system)
- `/web/app/api/organization/publish/route.ts` - Publish API
- `/web/lib/firebase/storage.ts` - Image upload utilities
- `/web/lib/firestore/employers.ts` - Employer CRUD operations
- `/web/lib/firestore/organizations.ts` - Organization CRUD operations
- `/web/lib/types.ts` - Type definitions
