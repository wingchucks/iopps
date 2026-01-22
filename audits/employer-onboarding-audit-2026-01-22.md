# Employer Onboarding & Access Control Audit Report

**Date:** 2026-01-22
**Auditor:** Agent 1 - Onboarding & Access Control Auditor
**Platform:** IOPPS.ca

## Executive Summary

The IOPPS employer onboarding flow is **functional but has significant UX friction** and some technical inconsistencies. The core approval logic works correctly (pending → approved workflow), but the user journey has dead ends, duplicate paths, and unclear communication about what employers can/cannot do during the pending state.

---

## Timeline Map: Employer Journey

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           EMPLOYER SIGNUP → APPROVAL FLOW                        │
└─────────────────────────────────────────────────────────────────────────────────┘

SIGNUP PHASE (5-10 mins)
┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐
│   /register      │   │  Select Intent   │   │ Account Created  │
│  Choose Employer │ → │  (post_jobs,     │ → │ status: "pending"│
│      Role        │   │   list_business, │   │ in Firestore     │
└──────────────────┘   │   post_events)   │   └────────┬─────────┘
                       └──────────────────┘            │
                                                       ▼
VERIFICATION PHASE                      ┌──────────────────────────────────┐
┌──────────────────────────────────────┤  Email Verification Sent         │
│   Success Page:                       │  "Check your inbox..."           │
│   "We've sent a verification email"   └──────────────────────────────────┘
└─────────────────────────────────────────────────────┐
                                                       │ User clicks email link
                                                       ▼
FIRST LOGIN                                ┌──────────────────────────────┐
                                           │  /login → redirects based    │
                                           │  on role to:                 │
                                           │  /organization/dashboard     │
                                           └─────────────┬────────────────┘
                                                         │
                                           ┌─────────────┴────────────────┐
                                           │ Dashboard Layout checks      │
                                           │ for employer profile         │
                                           └─────────────┬────────────────┘
                                                         │
                              ┌─────────────────────────┐│┌─────────────────────────┐
                              │  Profile EXISTS         │▼│  No Profile             │
                              │  → Load dashboard       │ │  → Redirect to /setup   │
                              └────────────┬────────────┘ └─────────────────────────┘
                                           │
PENDING STATE                              ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│ ORGANIZATION DASHBOARD (status: "pending")                                        │
├──────────────────────────────────────────────────────────────────────────────────┤
│ • Amber "Pending Approval" banner displayed at top                               │
│ • Full dashboard access (sidebar navigation works)                               │
│ • CAN: Create draft jobs, upload logo, edit profile, configure modules           │
│ • CANNOT: Jobs won't be published, profile not in directory                      │
└──────────────────────────────────────────────────────────────────────────────────┘
                                           │
ADMIN APPROVAL (external)                  │
┌──────────────────────────────────────┐   │
│ Admin Panel                          │   │
│ /admin/employers?status=pending      │   │
│                                      │───┤
│ Admin clicks "Approve"               │   │
│ → updateEmployerStatus()             │   │
│ → Send approval email                │   │
└──────────────────────────────────────┘   │
                                           ▼
APPROVED STATE
┌──────────────────────────────────────────────────────────────────────────────────┐
│ ORGANIZATION DASHBOARD (status: "approved")                                       │
├──────────────────────────────────────────────────────────────────────────────────┤
│ • No pending banner                                                              │
│ • Full publishing capabilities                                                   │
│ • Jobs appear in public listings                                                 │
│ • Profile visible in /businesses directory                                       │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## Questions Answered

### 1. Can an employer complete profile before admin approval?
**YES** - Employers have full profile editing access in pending state. They can:
- Complete all profile fields (`/organization/onboarding`)
- Upload logo and cover images
- Set organization type, location, description
- Configure enabled modules (hire, sell, educate, host, funding)

This is **correctly designed** - profile completion should precede approval so admins can review a complete profile.

### 2. Is the approval moment timed correctly (after profile completion)?
**PARTIALLY** - The flow allows it but doesn't enforce it:
- ✅ Admin can wait to approve until profile is complete
- ❌ No system check prevents approving incomplete profiles
- ❌ No visual indicator to admin showing profile completion %

### 3. Are required fields communicated early?
**NO - P1 ISSUE** - Required fields are unclear:
- Registration only requires: name, email, password, role, intent
- Profile "required" fields (for `isProfileComplete()` check): `organizationName`, `description`, `location`, `logoUrl`
- These requirements are only discovered when trying to publish in Step 4 of onboarding
- No upfront "here's what you'll need" messaging

### 4. Are there dead ends after signup?
**YES - P2 ISSUES FOUND:**

| Dead End | Location | Issue |
|----------|----------|-------|
| Setup page has no forward navigation | `/organization/setup/page.tsx:273` | Save button works but no "Continue to Dashboard" or progress to next step |
| Email verification success shows "sign in here" | `/register/page.tsx:424-426` | User leaves site, verifies, but no redirect back |
| Google signup skips onboarding | `/register/page.tsx:319` | Redirects directly to dashboard without guided onboarding |

---

## Confirmed Bugs

| ID | Severity | Location | Description | Repro Steps |
|----|----------|----------|-------------|-------------|
| **BUG-1** | P1 | `/organization/setup` vs `/organization/onboarding` | **Duplicate setup flows create confusion.** Dashboard layout redirects to `/organization/setup` (legacy form) when no profile exists, but the modern wizard is at `/organization/onboarding`. Both can create/update profiles but have different UIs and capabilities. | 1. Register as employer 2. Skip to dashboard 3. Notice redirect to /setup 4. Complete form 5. Try to find onboarding wizard - it's separate |
| **BUG-2** | P1 | `/web/app/api/emails/send-approval/route.ts:140` | **Approval email links to wrong URL.** Email says "Go to Dashboard" but links to `https://iopps.ca/employer` which is likely a 404. Should be `/organization/dashboard` or `/organization`. | 1. Get approved by admin 2. Click email link 3. 404 error |
| **BUG-3** | P2 | `/register/page.tsx:192` | **Inconsistent redirect on email verification failure.** If `sendEmailVerification` fails, code catches error and redirects directly to dashboard without verification. User might not realize their email isn't verified. | 1. Register 2. Email verification call fails (network issue) 3. User ends up at dashboard without verified email |
| **BUG-4** | P2 | `/organization/setup/page.tsx` | **Setup page has no forward navigation.** After saving profile, user sees success toast but no button to continue to dashboard or next steps. Must manually navigate away. | 1. Go to /organization/setup 2. Fill out form 3. Click Save 4. See "Profile saved!" 5. ... now what? |
| **BUG-5** | P3 | `firestore.rules:170-175` | **Draft job rule creates false sense of progress.** Unapproved employers can create jobs with `active: false`, but there's no UI indication that these jobs are drafts-only-until-approval. User might think job is "saved" not "blocked." | 1. Register employer 2. Create job 3. Job appears "created" but is draft 4. User doesn't realize it won't go live |

---

## UX Friction Points

| ID | Description | Impact | Evidence |
|----|-------------|--------|----------|
| **UX-1** | **Email verification breaks flow.** User must leave site, check email, click link, then manually return and login again. No magic link or redirect back to app. | High - Many users abandon at this step | `/register/page.tsx:419-426` - Success message just shows "sign in here" link |
| **UX-2** | **Pending approval banner is too subtle.** Yellow banner appears but doesn't clearly list what's blocked vs allowed. Users may try to publish, fail, and not understand why. | Medium - Confusion and frustration | `/components/organization/shell/OrganizationShell.tsx:176-189` - Generic message |
| **UX-3** | **No progress tracking for profile completion.** Dashboard shows "Next Steps" checklist but no connection to approval requirements. User doesn't know if profile is "good enough" for admin to approve. | Medium - Uncertainty | `/(dashboard)/page.tsx:474-495` - Actions list, but not tied to approval |
| **UX-4** | **Google signup skips onboarding wizard.** Email registration shows verification success page, but Google auth redirects directly to dashboard without guided profile setup. | Medium - Inconsistent experience | `/register/page.tsx:319` |
| **UX-5** | **No in-app notification when approved.** User only finds out via email. If they don't check email, they might not know they're approved. Dashboard doesn't highlight this state change. | Low - Might miss approval | No in-app notification system currently |

---

## Conflicts & Redundancies

| Area | Conflict | Files Involved |
|------|----------|----------------|
| **Setup Pages** | Two overlapping setup experiences exist: `/organization/setup` (legacy single form) and `/organization/onboarding` (modern 4-step wizard). Both can create/update employer profiles but have different fields and UX. | `setup/page.tsx`, `onboarding/page.tsx` |
| **Profile Fields** | Setup page collects: name, website, location, description, logo. Onboarding collects: name, **orgType**, province, city, logo, **cover**, description, website, **enabledModules**. Different field sets create incomplete profiles. | Same files |
| **Redirect Logic** | Dashboard layout redirects missing profiles to `/organization/setup`, but dashboard "Next Steps" links to `/organization/onboarding` for "Add your logo" and "Complete profile." | `(dashboard)/layout.tsx:42-44`, `(dashboard)/page.tsx:481-494` |

---

## Improvement Suggestions

### Quick Wins (< 1 day each)

| Priority | Suggestion | Impact |
|----------|------------|--------|
| 1 | **Fix approval email URL** - Change `https://iopps.ca/employer` to `https://iopps.ca/organization/dashboard` | Critical - users can't access dashboard from email |
| 2 | **Add "Continue to Dashboard" button** on `/organization/setup` page after save | High - removes dead end |
| 3 | **Improve pending banner copy** - Add "You can: create jobs, complete profile, configure modules" and "Jobs will go live once approved" | High - reduces confusion |

### Medium Effort (1-3 days)

| Priority | Suggestion | Impact |
|----------|------------|--------|
| 1 | **Deprecate `/organization/setup`** - Redirect to `/organization/onboarding` and remove legacy form | High - single coherent flow |
| 2 | **Add profile completion indicator** to dashboard - Show "Profile 60% complete" with link to finish remaining fields | Medium - guides users |
| 3 | **Add redirect parameter to verification email** - After verifying, redirect back to `/organization/dashboard` automatically | Medium - fewer drop-offs |

### Structural Changes (1+ week)

| Priority | Suggestion | Impact |
|----------|------------|--------|
| 1 | **Enforce profile completion before approval** - Add `canApprove()` helper that checks required fields, show warning to admin | High - better quality profiles |
| 2 | **Add in-app notification bell** - When approved, show notification badge and "Congratulations!" modal on next login | Medium - better engagement |
| 3 | **Implement status state machine visualization** - Show users a progress tracker: Registered → Profile Complete → Under Review → Approved | Medium - transparency |

---

## "Would I Use This Again?" Verdict

**Rating: 6/10 - Functional but Frustrating**

The core approval workflow is sound - the role-based access control in Firestore rules is well-designed, the pending state correctly restricts publishing while allowing profile setup, and admins have the tools to approve/reject.

However, the **onboarding experience creates unnecessary friction**:
- Two competing setup paths confuse users
- Email verification breaks the flow
- Dead ends after signup/setup
- Unclear communication about what pending employers can do
- Broken link in approval email

**For a new employer**, the journey would feel disjointed. They'd register, get a success message, have to check email, log in separately, potentially land on a different setup page than expected, save their profile with no clear next step, and wonder when/if they'll be approved.

**Fix the quick wins first** (email link, dead ends, banner copy), then consolidate to a single onboarding path. The underlying permission system is solid - the UX layer just needs polish to match.

---

## Key Files Referenced

- `/web/app/register/page.tsx` - Registration flow
- `/web/app/login/page.tsx` - Login and redirect logic
- `/web/app/organization/setup/page.tsx` - Legacy setup form
- `/web/app/organization/onboarding/page.tsx` - Modern onboarding wizard
- `/web/app/organization/(dashboard)/layout.tsx` - Dashboard wrapper with auth/redirect
- `/web/app/organization/(dashboard)/page.tsx` - Dashboard home
- `/web/components/organization/shell/OrganizationShell.tsx` - Dashboard shell with pending banner
- `/web/components/organization/shell/NavigationSidebar.tsx` - Navigation sidebar
- `/web/lib/firestore/employers.ts` - Employer CRUD operations
- `/web/app/api/organization/publish/route.ts` - Profile publish API
- `/web/app/api/emails/send-approval/route.ts` - Approval email
- `/firestore.rules` - Security rules and role gating
