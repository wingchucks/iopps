# IOPPS Platform — Full QA Test Plan

**Date:** February 8, 2026
**URL:** https://www.iopps.ca
**Scope:** Complete platform (190 routes, 100+ APIs)

---

# SESSION 1: PUBLIC PAGES & AUTH (Tests 1-8)

## Part 1: Public Pages

### Test 1: Landing & Static Pages
- [ ] `/` — Homepage loads, hero section renders
- [ ] `/about` — About page loads
- [ ] `/pricing` — Pricing page loads with plan cards
- [ ] `/privacy` — Privacy policy renders
- [ ] `/terms` — Terms of service renders
- [ ] `/contact` — Contact page loads with form
- [ ] `/for-employers` — Employer landing page loads

### Test 2: Public Navigation
- [ ] AppHeader renders with nav links
- [ ] Logo links to `/`
- [ ] Login/Signup buttons visible when unauthenticated
- [ ] Mobile hamburger menu exists

## Part 2: Auth Flows

### Test 3: Member Signup
- [ ] `/signup` — Signup page loads with role selection
- [ ] `/signup/member` — Member signup form renders
- [ ] Email/password fields + Google auth button present
- [ ] Form validation exists (required fields, email format)
- [ ] Successful signup redirects to onboarding/welcome

### Test 4: Organization Signup
- [ ] `/signup/organization` — Org signup form renders
- [ ] Organization name field present
- [ ] Successful signup redirects to org onboarding

### Test 5: Login
- [ ] `/login` — Login page loads
- [ ] Email/password fields + Google auth button
- [ ] "Forgot password" link goes to `/forgot-password`
- [ ] Successful login redirects based on role

### Test 6: Forgot Password
- [ ] `/forgot-password` — Form loads with email field
- [ ] Submit triggers password reset email API

### Test 7: Onboarding Flows
- [ ] `/onboarding/member` — Multi-step wizard exists
- [ ] `/onboarding/organization` — Org onboarding exists
- [ ] Steps have progress indicator
- [ ] Can complete wizard and reach welcome page

### Test 8: Welcome Pages
- [ ] `/welcome` — Welcome page loads
- [ ] `/welcome/member` — Member welcome with next steps
- [ ] `/welcome/organization` — Org welcome with next steps

---

# SESSION 2: CONTENT PILLARS (Tests 9-21)

## Part 4: Careers & Jobs

### Test 9: Careers Hub
- [ ] `/careers` — Careers hub page loads
- [ ] Job listing cards render
- [ ] Search/filter controls present
- [ ] Location, job type, remote filters exist

### Test 10: Job Detail & Apply
- [ ] `/careers/[jobId]` — Job detail page loads
- [ ] Shows title, employer, location, description
- [ ] "Apply" button present and links to apply page
- [ ] `/careers/[jobId]/apply` — Application form renders
- [ ] Success page exists at `/careers/[jobId]/apply/success`

### Test 11: Programs
- [ ] `/careers/programs` — Programs listing loads
- [ ] `/careers/programs/[id]` — Program detail page loads

## Part 5: Conferences

### Test 12: Conference Listing & Detail
- [ ] `/conferences` — Conference listing page loads
- [ ] Conference cards show title, date, location
- [ ] `/conferences/[conferenceId]` — Detail page loads
- [ ] Shows full conference info (agenda, speakers, venue)

## Part 6: Education & Scholarships

### Test 13: Education Hub
- [ ] `/education` — Education hub loads
- [ ] `/education/schools` — Schools listing
- [ ] `/education/programs` — Programs listing
- [ ] `/education/scholarships` — Scholarships listing
- [ ] `/education/events` — Education events listing

### Test 14: Scholarship Detail
- [ ] `/education/scholarships/[id]` — Detail page loads
- [ ] Shows eligibility, deadline, amount, how to apply

### Test 15: School Detail
- [ ] `/education/schools/[slug]` — School page loads
- [ ] `/education/schools/[slug]/inquiry` — Inquiry form loads

## Part 7: Business Directory & Vendors

### Test 16: Business Hub
- [ ] `/business` — Business hub loads
- [ ] `/business/directory` — Directory listing loads
- [ ] `/business/funding` — Funding page loads
- [ ] `/business/products` — Products listing loads
- [ ] `/business/services` — Services listing loads

## Part 8: Community & Pow Wows

### Test 17: Community Hub
- [ ] `/community` — Community hub loads
- [ ] `/community/[powwowId]` — Pow wow detail loads
- [ ] Shows location, dates, event schedule
- [ ] `/community/leaderboard` — Leaderboard page loads

## Part 9: Social Feed & Posts

### Test 18: Discover Feed
- [ ] `/discover` — Feed loads with post cards
- [ ] Posts show author, content, timestamp
- [ ] Like/comment/share actions present
- [ ] `/posts/[postId]` — Individual post page loads

## Part 10: Live Streams & Media

### Test 19: Live Streams
- [ ] `/live` — Live streams listing loads
- [ ] `/live/[id]` — Individual stream page loads
- [ ] YouTube integration present (video embed or link)

## Part 11: Search, Radar & Map

### Test 20: Search
- [ ] `/search` — Search page loads
- [ ] Search input with results area
- [ ] Category filters (jobs, employers, etc.)

### Test 21: Radar & Map
- [ ] `/radar` — Radar page loads
- [ ] `/map` — Map page loads with opportunity markers

---

# SESSION 3: DASHBOARDS & STRIPE (Tests 22-38)

## Part 12: Member Dashboard

### Test 22: Member Dashboard Home
- [ ] `/member/dashboard` — Dashboard loads
- [ ] Shows stats/overview cards
- [ ] ProtectedRoute wraps page (redirects if not member)

### Test 23: Member Profile
- [ ] `/member/profile` — Profile editor loads
- [ ] Can view/edit name, bio, skills, experience
- [ ] `/member/[userId]` — Public profile page loads

### Test 24: Member Applications
- [ ] `/member/applications` — Applications list loads
- [ ] Shows application status (applied, reviewed, etc.)

### Test 25: Member Settings
- [ ] `/member/settings` — Settings page loads
- [ ] `/member/settings/privacy` — Privacy settings load
- [ ] `/member/settings/notifications` — Notification prefs load
- [ ] `/member/settings/data-export` — Data export page loads

### Test 26: Member Tools
- [ ] `/member/alerts` — Job alerts page loads
- [ ] `/member/messages` — Messages page loads
- [ ] `/member/endorsements` — Endorsements page loads
- [ ] `/member/tools/cover-letter-builder` — AI tool loads
- [ ] `/saved` — Saved items page loads
- [ ] `/passport` — Passport page loads

## Part 13: Employer/Organization Dashboard

### Test 27: Org Dashboard Home
- [ ] `/organization` — Dashboard loads (redirects to feed or dashboard)
- [ ] ProtectedRoute wraps page (employer role required)

### Test 28: Org Hiring Module
- [ ] `/organization/(dashboard)/hire/jobs` — Job listings load
- [ ] `/organization/(dashboard)/hire/jobs/new` — New job form loads
- [ ] `/organization/(dashboard)/hire/applications` — Applications load
- [ ] `/organization/(dashboard)/hire/talent` — Talent pool loads

### Test 29: Org Conference & Event Management
- [ ] `/organization/conferences` — Conference list loads
- [ ] `/organization/conferences/new` — Creates new draft (auto-redirect)
- [ ] `/organization/conferences/[id]/edit` — Edit page with builder tabs
- [ ] `/organization/powwows` — Pow wow list loads

### Test 30: Org Education Module
- [ ] `/organization/education` — Education management loads
- [ ] `/organization/scholarships` — Scholarship list loads
- [ ] `/organization/scholarships/new` — New scholarship form loads

### Test 31: Org Jobs Management (Legacy)
- [ ] `/organization/jobs` — Jobs list loads
- [ ] `/organization/jobs/new` — New job form loads
- [ ] `/organization/jobs/[jobId]/edit` — Job edit page loads
- [ ] `/organization/jobs/[jobId]/applications` — Job applications load

### Test 32: Org Settings & Team
- [ ] `/organization/(dashboard)/settings` — Settings page loads
- [ ] `/organization/(dashboard)/team` — Team members page loads
- [ ] `/organization/(dashboard)/billing` — Billing page loads
- [ ] `/organization/(dashboard)/analytics` — Analytics page loads
- [ ] `/organization/(dashboard)/inbox` — Inbox loads

### Test 33: Org Shop & Vendor
- [ ] `/organization/shop` — Shop management loads
- [ ] `/organization/services` — Services management loads
- [ ] `/organization/products/new` — New product form loads

## Part 14: Stripe Payment Flows

### Test 34: Stripe Checkout APIs
- [ ] `/api/stripe/checkout` — Route exists with POST handler
- [ ] `/api/stripe/checkout-subscription` — Subscription checkout exists
- [ ] `/api/stripe/checkout-conference` — Conference checkout exists
- [ ] `/api/stripe/checkout-vendor` — Vendor checkout exists
- [ ] `/api/stripe/checkout-training` — Training checkout exists
- [ ] `/api/stripe/checkout-talent-pool` — Talent pool checkout exists

### Test 35: Stripe Webhook
- [ ] `/api/stripe/webhook` — POST handler exists
- [ ] Verifies Stripe signature
- [ ] Handles checkout.session.completed event
- [ ] Handles subscription events

### Test 36: Billing Portal
- [ ] `/api/billing/portal` — Creates Stripe billing portal session
- [ ] `/api/billing/payments` — Payment history endpoint exists

### Test 37: Subscription Flow
- [ ] `/organization/subscription` — Subscription page loads
- [ ] `/organization/subscribe` — Subscribe page with plan selection
- [ ] `/organization/subscription/success` — Success page exists

### Test 38: Free Posting Grants
- [ ] Grant system exists in Firestore functions
- [ ] `/api/employer/use-credit` — Credit usage endpoint exists

---

# SESSION 4: ADMIN PANEL & CROSS-CUTTING (Tests 39-52)

## Part 16: Admin Dashboard

### Test 39: Admin Dashboard Metrics
- [ ] `/admin` — Dashboard loads with KPI cards
- [ ] Active Jobs, Member Profiles, Employer Orgs, Active Vendors, Applications cards
- [ ] Secondary stats: Users, Total Jobs, Total Vendors, Conferences
- [ ] Needs Attention cards are clickable with correct links
- [ ] Manual refresh button works

### Test 40: Admin Global Search
- [ ] Search bar with Cmd/Ctrl+K shortcut
- [ ] Fetch includes Bearer auth token
- [ ] Results show typed categories
- [ ] Clicking navigates correctly

### Test 41: Admin Users Management
- [ ] `/admin/users` — User list loads
- [ ] Filter buttons with counts (All, Community, Employers, Moderators)
- [ ] Role change dropdown works
- [ ] Enable/disable toggle exists

### Test 42: Admin Employers Management
- [ ] `/admin/employers` — Employer list loads, defaults to "All" filter
- [ ] `?status=pending` query param auto-applies filter
- [ ] Approve/reject actions exist
- [ ] `/admin/employers/[id]/edit` — Edit page loads

### Test 43: Admin Jobs Management
- [ ] `/admin/jobs` — Jobs list with clickable rows
- [ ] Eye icon → public page, Pencil → edit page
- [ ] Deactivate/Activate toggle
- [ ] Active + Inactive = Total count
- [ ] `/admin/jobs/[jobId]/edit` — Edit page loads

## Part 17: Admin Content Management

### Test 44: Admin Content Pages
- [ ] `/admin/conferences` — Conference list loads
- [ ] `/admin/scholarships` — Scholarships list loads
- [ ] `/admin/vendors` — Vendors list loads
- [ ] `/admin/powwows` — Pow wows list loads
- [ ] `/admin/content` — Content management loads
- [ ] `/admin/news` — News management loads

### Test 45: Admin Feeds & Moderation
- [ ] `/admin/feeds` — RSS feed management loads
- [ ] `/admin/moderation` — Moderation page loads
- [ ] `/admin/verification` — Verification queue loads
- [ ] `/admin/videos` — Video management loads

### Test 46: Admin Sidebar Navigation
- [ ] Scholarships in CONTENT section
- [ ] Applications in PEOPLE section
- [ ] All sidebar links navigate correctly

## Part 18: Admin Tools

### Test 47: Claims Diagnostic
- [ ] `/admin/check-claims` — Page loads with UID/email
- [ ] Admin Permission PASS/FAIL indicator
- [ ] Refresh Claims button

### Test 48: Admin Analytics & Settings
- [ ] `/admin/analytics` — Analytics page loads
- [ ] `/admin/settings` — Settings page loads
- [ ] `/admin/emails` — Email management loads

## Part 19: Error Handling & Edge Cases

### Test 49: Protected Routes
- [ ] `/member/*` routes redirect unauthenticated users
- [ ] `/organization/*` routes require employer role
- [ ] `/admin/*` routes require admin/moderator role
- [ ] ProtectedRoute component exists and is used

### Test 50: 404 & Error Pages
- [ ] `not-found.tsx` or `error.tsx` exists in app root
- [ ] Invalid routes show appropriate error state
- [ ] API routes return proper error status codes (401, 403, 404)

## Part 20: API Health

### Test 51: Core API Routes
- [ ] `/api/admin/search` — Route exists with auth check
- [ ] `/api/admin/health` — Health check endpoint exists
- [ ] `/api/stats` — Stats endpoint exists
- [ ] `/api/settings` — Settings endpoint exists
- [ ] `/api/flags` — Feature flags endpoint exists

### Test 52: Cron Jobs
- [ ] `/api/cron/expire-jobs` — Job expiry cron exists
- [ ] `/api/cron/sync-feeds` — Feed sync cron exists
- [ ] `/api/cron/expire-scholarships` — Scholarship expiry exists
- [ ] `/api/cron/publish-scheduled-jobs` — Scheduled publish exists
- [ ] All crons verify CRON_SECRET auth

---

## Summary Table

| Session | Parts | Tests | Scope |
|---------|-------|-------|-------|
| 1 | 1-3 | 1-8 | Public pages & auth |
| 2 | 4-11 | 9-21 | Content pillars |
| 3 | 12-14 | 22-38 | Dashboards & Stripe |
| 4 | 16-21 | 39-52 | Admin & cross-cutting |

**Total: 52 tests across 190 routes**
