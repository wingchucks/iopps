# Employer Journey Audit - Skeptical Employer Perspective

## Executive Summary

This document audits the entire employer journey from registration to profile visibility, identifying UX gaps and providing recommendations for improvement.

---

## The Complete Employer Journey

### Step 1: Registration (`/register`)

**What the employer sees:**
- Two role cards: "Community Member" vs "Employer"
- Fields: Name, Email, Password, Confirm Password
- Google Sign-In option

**What happens behind the scenes:**
1. Firebase Auth user created
2. Employer profile created in Firestore with `status: "pending"`
3. Draft vendor profile auto-created for Shop Indigenous
4. Email verification sent
5. Admin notification sent

**Redirect after registration:**
- `/organization/dashboard?tab=shop` (Shop tab is pre-selected)

**Issues identified:**
- Why Shop tab first? New employer expects to set up their company, not vendor listing
- No explanation of what "Shop" means or why they're there
- Email verification is sent but not enforced

---

### Step 2: First Login Experience

**Where employers land after registration:**
- `/organization/dashboard?tab=shop`

**Where employers land after subsequent logins:**
- `/jobs` (same as community members!)

**Major UX Issue:**
Returning employers are dumped on the job board, not their dashboard. They must manually navigate to `/organization/dashboard`.

---

### Step 3: Dashboard Overview

**Available Tabs (8):**
1. Overview - KPIs and stats
2. Opportunities - Job/training management
3. Applications - View applicants
4. Messages - Communicate with candidates
5. Videos - Company videos
6. Shop - Vendor/marketplace listing
7. Billing & Payments - Subscription status
8. Profile & Settings - Company profile

**What a skeptical employer thinks:**
- "Where do I set up my company info?"
- "What do I need to complete to go live?"
- "How do I know my profile is visible?"

---

### Step 4: Profile Setup (`Profile & Settings` tab)

**Available fields:**
| Field | Type | Required? |
|-------|------|-----------|
| Organization Name | Text | Yes |
| Description | Textarea | No |
| Website | URL | No |
| Location | Text | No |
| Logo | Image upload | No |
| Banner | Image upload | No |
| Industry | Dropdown | No |
| Company Size | Dropdown | No |
| Founded Year | Number | No |
| Contact Email | Email | No |
| Contact Phone | Phone | No |
| Social Links | URLs | No |
| Company Intro Video | Video | No |
| Interview Videos | Multiple videos | No |

**What happens when you click "Save profile":**
- Profile is saved to Firestore
- Status remains "pending" until admin approves
- NO automatic publishing

**TRC #92 Compliance Status shown:**
- Pending (yellow) - "Your application is under review"
- Approved (green) - "Your organization has been verified" + "View Public Profile" link
- Rejected (red) - Shows rejection reason

---

### Step 5: What Happens After "Publishing" (Approval)

**There is NO "Publish" button.**

The flow is:
1. Employer saves profile
2. Admin manually reviews and approves
3. Status changes from "pending" to "approved"
4. Profile automatically appears in public directories

**Employer visibility after approval:**

| Location | URL | Description |
|----------|-----|-------------|
| Organization Directory | `/organizations` | Grid of all approved employers |
| Individual Profile | `/employers/{userId}` | Full public profile page |
| Individual Profile (alt) | `/organizations/{userId}` | Same content, different URL |
| Job Listings | Shows employer name/logo on each job | Links to profile |

---

## Critical UX Issues (Skeptical Employer Perspective)

### Issue #1: Login Redirect is Wrong
**Problem:** Employers login and land on `/jobs` instead of their dashboard.
**Impact:** Confusing. "Where's my dashboard? Did I log into the wrong account?"
**Fix:** Role-based redirect - employers go to `/organization/dashboard`

### Issue #2: No Onboarding Checklist
**Problem:** New employers don't know what to complete.
**Impact:** "What do I need to do to get started? Is my profile live yet?"
**Fix:** Add onboarding checklist with progress indicator

### Issue #3: Shop Tab is Default (Confusing)
**Problem:** New employers land on Shop tab, not profile setup.
**Impact:** "What is Shop? I want to post jobs, not sell products."
**Fix:** Send new employers to Overview or Profile tab with welcome message

### Issue #4: No "Publish" Action (Admin-Controlled)
**Problem:** Employers can't control when their profile goes live.
**Impact:** "I saved my profile, but is it visible? How do I know?"
**Fix:** Clear messaging about approval process with status indicator

### Issue #5: No Profile Preview
**Problem:** Employers can't see what their public profile looks like.
**Impact:** "What will people see when they view my company?"
**Fix:** Add "Preview Public Profile" button before approval

### Issue #6: Two Profile URLs (Confusing)
**Problem:** `/employers/{id}` and `/organizations/{id}` both exist.
**Impact:** Inconsistent linking, SEO issues.
**Fix:** Consolidate to one URL pattern

### Issue #7: No Clear Approval Timeline
**Problem:** "Your application is under review" with no timeframe.
**Impact:** "How long will this take? Should I follow up?"
**Fix:** Add expected timeline or status updates

### Issue #8: Email Verification Not Enforced
**Problem:** Employers can access dashboard without verifying email.
**Impact:** Account recovery issues if email is wrong.
**Fix:** Show persistent banner to verify email

---

## Where Employer Profiles Appear (After Approval)

### 1. Organization Directory (`/organizations`)
- Public page listing all approved employers
- Shows: logo, banner, name, description, industry, size, location
- Search and filter by industry
- Links to individual profiles

### 2. Individual Profile Page (`/employers/{userId}`)
Shows full profile including:
- Hero banner with logo
- Organization name and industry badge
- Description
- Location, website (linked)
- Social media links
- Company size, founded year
- Contact email and phone
- Company intro video
- Interview videos
- Active job listings from this employer

### 3. Job Listings
Each job post shows:
- Employer logo
- Employer name (linked to profile)
- "Posted by {Organization Name}"

---

## Recommended Improvements

### Quick Wins (1-2 days)

1. **Fix login redirect** (`/web/app/login/page.tsx`)
   - Check user role after login
   - Redirect employers to `/organization/dashboard`
   - Redirect community to `/jobs`

2. **Change default tab for new employers**
   - From: `/organization/dashboard?tab=shop`
   - To: `/organization/dashboard?tab=overview` or `?tab=profile`

3. **Add "View Public Profile" link** (even before approval)
   - Show preview of what profile will look like
   - Gray out or watermark until approved

### Medium Effort (1 week)

4. **Add onboarding checklist**
   - Show progress: "3 of 5 steps complete"
   - Steps: Verify email, Add logo, Complete profile, Add first job, etc.

5. **Add approval status messaging**
   - Clear explanation of review process
   - Expected timeline
   - What happens next

6. **Consolidate profile URLs**
   - Pick one: `/employers/{id}` OR `/organizations/{id}`
   - Redirect the other

### Larger Improvements (2+ weeks)

7. **Welcome wizard for new employers**
   - Step-by-step setup flow
   - Profile basics → Logo/banner → First job post

8. **Admin notification system**
   - Email employers when approved/rejected
   - In-app notifications

9. **Profile completeness score**
   - Show percentage complete
   - Encourage filling optional fields

---

## File References

| Feature | File Path |
|---------|-----------|
| Registration | `/web/app/register/page.tsx` |
| Login | `/web/app/login/page.tsx` |
| Dashboard | `/web/app/organization/dashboard/page.tsx` |
| Profile Tab | `/web/app/organization/dashboard/ProfileTab.tsx` |
| Public Profile | `/web/app/employers/[employerId]/page.tsx` |
| Org Directory | `/web/app/organizations/page.tsx` |
| Org Detail | `/web/app/organizations/[id]/page.tsx` |

---

## Summary

From a skeptical employer's perspective, the current flow has these pain points:

1. **"I logged in and can't find my dashboard"** - Wrong redirect
2. **"What am I supposed to do first?"** - No onboarding guidance
3. **"Is my profile live?"** - Unclear approval process
4. **"Where can people see my company?"** - Not obvious until approved

The core functionality exists and works, but the user experience needs polish to guide employers through setup and clearly communicate their profile's visibility status.
