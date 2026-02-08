# IOPPS Admin Dashboard - QA Test Checklist

**Date:** January 21, 2026
**URL:** https://www.iopps.ca/admin
**Tester:** _______________

---

## Pre-Test Setup

1. **Clear browser cache** or use incognito mode
2. **Sign out and sign back in** to refresh auth token
3. Open browser DevTools → Console tab to monitor for errors

---

## A) Dashboard Metrics (BLOCKER - Previously Broken)

### Test 1: Platform Overview Cards
- [ ] Navigate to `/admin`
- [ ] **Active Jobs** card shows a number > 0
- [ ] **Member Profiles** card shows a number > 0
- [ ] **Employer Orgs** card shows a number > 0
- [ ] **Active Vendors** card shows a number > 0
- [ ] **Applications** card shows a number (can be 0)

### Test 2: Secondary Stats Row
- [ ] **Users (Auth)** shows a number > 0
- [ ] **Total Jobs** shows a number > 0
- [ ] **Total Vendors** shows a number > 0
- [ ] **Conferences** shows a number > 0

### Test 3: No Console Errors
- [ ] No "FirebaseError: Missing or insufficient permissions" errors
- [ ] No "Error fetching admin counts" errors

**Result:** ⬚ PASS / ⬚ FAIL
**Notes:** _________________________________

---

## B) Users Page (BLOCKER - Previously Broken)

### Test 4: Users List
- [ ] Navigate to `/admin/users`
- [ ] User list populates (not "0 users found")
- [ ] Users display with email, role, status
- [ ] Filter buttons show correct counts

**Result:** ⬚ PASS / ⬚ FAIL
**Notes:** _________________________________

---

## C) Global Search (Previously Broken - Now Fixed)

### Test 5: Search Functionality
- [ ] Click search bar or press `Cmd/Ctrl + K`
- [ ] Type "test" or a known employer name
- [ ] Results appear with correct categories (User, Employer, Job, etc.)
- [ ] Clicking a result navigates to correct page

**Result:** ⬚ PASS / ⬚ FAIL
**Notes:** _________________________________

---

## D) Conference Creation (Previously Broken - Now Fixed)

### Test 6: Create New Conference
- [ ] Click `+ Create` dropdown → `Conference`
- [ ] **Teal banner appears:** "New conference created!"
- [ ] Header shows "New Conference (Draft)" (not "Untitled Conference")
- [ ] URL contains `?new=true` parameter
- [ ] Dismiss banner with X button - banner disappears

### Test 7: Verify New Document Created
- [ ] Check `/organization/conferences` for the new draft
- [ ] Each "Create New" click creates a DIFFERENT conference (unique ID)

**Result:** ⬚ PASS / ⬚ FAIL
**Notes:** _________________________________

---

## E) Jobs Page - Clickable Rows (Previously Broken - Now Fixed)

### Test 8: Job Row Interactions
- [ ] Navigate to `/admin/jobs`
- [ ] Click on a **job title** → Opens edit page
- [ ] Click on **job row** (not buttons) → Opens edit page
- [ ] Click **View icon** (eye) → Opens public job page
- [ ] Click **Edit icon** (pencil) → Opens edit page
- [ ] Click **Deactivate/Activate** button → Toggles status (doesn't navigate)

### Test 9: Job Count Accuracy
- [ ] Note the counts: Total ___, Active ___, Inactive ___
- [ ] Verify: **Active + Inactive = Total**
- [ ] Compare with dashboard "Total Jobs" - should match

**Result:** ⬚ PASS / ⬚ FAIL
**Notes:** _________________________________

---

## F) Needs Attention Cards - Clickable (Previously Broken - Now Fixed)

### Test 10: Card Navigation
- [ ] **Pending Approvals** card → Click → Goes to `/admin/employers?status=pending`
- [ ] **Flagged Content** card → Click → Goes to `/admin/moderation`
- [ ] **Failed Imports** card → Click → Goes to `/admin/feeds`
- [ ] **Verification Queue** card → Click → Goes to `/admin/verification`

**Result:** ⬚ PASS / ⬚ FAIL
**Notes:** _________________________________

---

## G) Sidebar Navigation (Previously Broken - Now Fixed)

### Test 11: New Sidebar Items
- [ ] **Scholarships** appears in sidebar under CONTENT
- [ ] **Applications** appears in sidebar under PEOPLE
- [ ] Both links navigate to correct pages

### Test 12: Employers Default Filter
- [ ] Navigate to `/admin/employers`
- [ ] Default filter is "All" (not "Pending")

**Result:** ⬚ PASS / ⬚ FAIL
**Notes:** _________________________________

---

## H) Firebase Auth Claims Diagnostic (New Tool)

### Test 13: Claims Check Page
- [ ] Navigate to `/admin/check-claims`
- [ ] Page loads showing your UID and email
- [ ] **Admin Permission** shows **PASS** (green)
- [ ] "Refresh Claims" button works

**Result:** ⬚ PASS / ⬚ FAIL
**Notes:** _________________________________

---

## Summary

| Category | Tests | Pass | Fail |
|----------|-------|------|------|
| Dashboard Metrics | 1-3 | | |
| Users Page | 4 | | |
| Global Search | 5 | | |
| Conference Creation | 6-7 | | |
| Jobs Page | 8-9 | | |
| Needs Attention Cards | 10 | | |
| Sidebar Navigation | 11-12 | | |
| Claims Diagnostic | 13 | | |

**Overall Result:** ⬚ ALL PASS / ⬚ ISSUES FOUND

**Issues Found (if any):**
1. _________________________________
2. _________________________________
3. _________________________________

**Tested By:** _______________
**Date/Time:** _______________
