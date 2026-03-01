# IOPPS Full-Platform QA Testing Protocol

## For: Claude Chrome Agent
## Platform: https://iopps.ca
## Version: 3.0 — February 28, 2026
## Codebase Snapshot: Next.js 16 / React 19 / Tailwind 4 / Firebase

---

## Your Identity

You are the most meticulous QA engineer who has ever lived. You are testing IOPPS — the Indigenous Opportunities Platform & Professional Support — a professional networking and economic sovereignty platform built for Indigenous communities across Canada and the United States. This is not a generic SaaS product. This is digital infrastructure for Indigenous economic sovereignty, and every broken feature erodes trust with communities that have been failed by technology before.

**Your job:** Walk through every inch of this platform. Click everything. Try to break things. Upload files. Fill forms. Navigate on mobile. Test as different users. Document every crack, every friction point, every moment of confusion, and every moment of delight.

---

## Test Accounts

You have two canonical test accounts. Use ONLY these. Do not create new accounts.

### Community Member (Job Seeker)

| Field | Value |
|-------|-------|
| Email | `sarah.whitebear@test.iopps.ca` |
| Password | *(you will need the password from the user — ask before starting)* |
| Name | Sarah Whitebear |
| Nation | Cree (Nehiyaw) |
| Territory | Treaty 6 Territory |
| Role | Senior Education Consultant |

### Organization (Employer / Vendor)

| Field | Value |
|-------|-------|
| Email | `hello@northernlightsconsulting.ca` |
| Password | *(you will need the password from the user — ask before starting)* |
| Name | Northern Lights Indigenous Consulting |
| Nation | Metis (Michif) |
| Territory | Metis Nation-Saskatchewan Homeland |
| Subscription | Professional tier, active |

---

## How to Document Findings

For EVERY issue you find, capture:

1. **Screenshot** — Take one immediately when you encounter the issue
2. **URL** — What page were you on?
3. **Steps to reproduce** — Exactly what you clicked/typed
4. **Expected behavior** — What should have happened
5. **Actual behavior** — What actually happened
6. **Severity** — Critical / High / Medium / Low
7. **Affected user type** — Anonymous / Community Member / Organization / Admin / All

Keep a running mental tally. At the end, compile everything into the Final Report format in Phase 8.

---

## PHASE 0: Pre-Flight

Before touching anything, do the following:

1. **Ask the user for both test account passwords** — Do not proceed without them.
2. Navigate to `https://iopps.ca`
3. Take a screenshot of the homepage as your baseline
4. Resize the browser to **1440x900** (desktop baseline)
5. Note the current date and time for your report

---

## PHASE 1: Anonymous User Experience

Test everything a visitor sees BEFORE signing in. This is the first impression.

### 1.1 Homepage (`/`)

- [ ] Does the page load completely? (screenshot when loaded)
- [ ] Are ALL images loading? (check hero, logos, any illustrations)
- [ ] Is there a clear value proposition visible above the fold?
- [ ] Are the content pillars visible and accessible? (Jobs, Training, Shop Indigenous, Conferences, Scholarships/Grants, Pow Wows/Events)
- [ ] Do stats on the homepage show real numbers? (should be dynamic via `/api/stats/public`)
- [ ] Are partner/organization logos displaying in the partner strip?
- [ ] Do partner logos link somewhere? Where? Does the destination work?
- [ ] Is there a clear CTA for signup?
- [ ] Is there a land acknowledgment or territorial reference?
- [ ] Does the `HomepageCTA` component render properly?
- [ ] Does the `LiveStats` component show live member/job counts?

### 1.2 Navigation (NavBar + MobileMenu)

**Desktop Navigation (NavBar):**
Click EVERY item in the navigation bar. The current nav links should be:

- [ ] Home → `/feed` (or `/` if not logged in)
- [ ] Search → `/search`
- [ ] Partners → `/partners`
- [ ] Schools → `/schools`
- [ ] Stories → `/stories`
- [ ] Members → `/members`
- [ ] Training → `/training`
- [ ] Mentorship → `/mentorship`
- [ ] Shop → `/shop`
- [ ] Live → `/livestreams` (should have a pulse dot indicator)

For EACH link:
- [ ] Does it load a page?
- [ ] Does the URL update correctly?
- [ ] Is there actual content, or is it empty/broken/placeholder?
- [ ] Does the active state highlight correctly?
- [ ] Is the navigation consistent across all pages?

**Mobile Navigation (MobileMenu) at 375x812:**
The mobile menu has different links:
- [ ] Jobs → `/jobs`
- [ ] Events → `/events`
- [ ] Partners → `/partners`
- [ ] Schools → `/schools`
- [ ] Stories → `/stories`
- [ ] Shop → `/shop`
- [ ] Pricing → `/pricing`
- [ ] Sign In / Join Free links

### 1.3 Jobs Page — `/jobs` and `/jobs/[slug]`

- [ ] Does the jobs listing page load?
- [ ] Are there actual job listings showing? (should pull from both `jobs` and `posts` collections — 111+ real jobs)
- [ ] Does the search bar work? Try searching "education" and "health"
- [ ] Do category/filter dropdowns work? Try each filter
- [ ] Click into a specific job listing — does the detail page load?
- [ ] On the job detail page, is all information displaying? (title, employer, location, salary, description, requirements, benefits)
- [ ] Is there an "Apply" button? What happens when an anonymous user clicks it? (should redirect to `/login?redirect=...`)
- [ ] Is there a "Save Job" button visible?
- [ ] Can you see the employer's profile from the job listing?
- [ ] Try the back button — does navigation work correctly?
- [ ] Does the view count increment? (via `/api/jobs/[id]/view`)
- [ ] Are featured/pinned jobs showing at the top?

### 1.4 Training Page — `/training` and `/training/[slug]`

- [ ] Does the training page load?
- [ ] Are there training programs listed? (should be 188 docs in `training_programs`)
- [ ] Do filters work?
- [ ] Can you view individual training details?
- [ ] Does the detail page show all relevant info?

### 1.5 Programs Page — `/programs` and `/programs/[slug]`

- [ ] Does the programs page load?
- [ ] Is there content? (pulls from `training_programs` via `/api/programs`)
- [ ] Can you view individual program details?

### 1.6 Shop Indigenous — `/shop` and `/shop/[slug]`

- [ ] Does the marketplace page load?
- [ ] Are there products and/or services listed? (from `shop_vendors` + `shop_listings`)
- [ ] Do category filters work?
- [ ] Can you view individual product/service detail pages?
- [ ] Do vendor profiles load from product listings?
- [ ] Is the distinction between products and services clear?

### 1.7 Events — `/events` and `/events/[slug]`

- [ ] Does the events page load?
- [ ] Are there actual events listed? (from `events` collection)
- [ ] Do event detail pages work?
- [ ] Is date/time/location information displaying correctly?
- [ ] Are Pow Wow events included/indicated?

### 1.8 Scholarships — `/scholarships` and `/scholarships/[slug]`

- [ ] Does the scholarships page load?
- [ ] Is there content? (17 docs in dedicated `scholarships` collection)
- [ ] Can you filter/search?
- [ ] Do detail pages load correctly?
- [ ] Are deadlines and amounts displayed?

### 1.9 Organizations — `/organizations` (was `/partners` in old nav)

**This was broken in last QA round — test very carefully.**

- [ ] Does the Organizations directory page load? (NOT the `/partners` page — that's the partners showcase)
- [ ] Are organizations actually displaying? (not blank/loading forever)
- [ ] Does search work?
- [ ] Do filters work?
- [ ] Click into an individual organization — does the public profile load? (`/org/[slug]`)
- [ ] Does the profile show: name, nation/territory, verification badge, description, logo/avatar?
- [ ] Can you see their job listings from their profile?
- [ ] Try navigating to a specific org via URL: `/org/northern-lights-indigenous-consulting`

### 1.10 Partners Page — `/partners`

- [ ] Does the partners showcase page load? (this is the curated partner list, separate from org directory)
- [ ] Are partner logos and names displaying?
- [ ] Do links to partner profiles/sites work?

### 1.11 Schools Page — `/schools` and `/schools/[slug]`

- [ ] Does the schools listing page load?
- [ ] Are schools displayed? (organizations where `type=school` and `onboardingComplete=true`)
- [ ] Can you view individual school profiles?
- [ ] Does the detail page show school-specific info? (institution type, student body, accreditation, campus count)

### 1.12 Stories Page — `/stories` and `/stories/[slug]`

- [ ] Does the stories listing page load?
- [ ] Are success stories displaying?
- [ ] Can you read individual story detail pages?
- [ ] Do stories show: title, person name, nation, photo?

### 1.13 Members Directory — `/members`

- [ ] Does the members directory load?
- [ ] Are members displaying with pagination?
- [ ] Does search work? (name, community)
- [ ] Do filters work?
- [ ] Click into a member profile — does `/members/[uid]` load?

### 1.14 Livestreams — `/livestreams`

- [ ] Does the livestreams page load?
- [ ] Is there content? (pulls from YouTube via `/api/livestreams/youtube`)
- [ ] Does the YouTube player embed work?
- [ ] Is there a live pulse indicator for active streams?

### 1.15 Education Page — `/education`

- [ ] Does the education hub load?
- [ ] Is there content or a proper "coming soon" state?

### 1.16 Learning Page — `/learning`

- [ ] Does the learning hub load? (note: this is a protected route)
- [ ] If redirected to login, is that expected for anonymous users?

### 1.17 Spotlight Page — `/spotlight`

- [ ] Does the spotlight page load?
- [ ] Is there content?

### 1.18 About Page — `/about`

- [ ] Does the about page load?
- [ ] Is content complete and culturally appropriate?

### 1.19 For Employers Page — `/for-employers`

- [ ] Does the employer marketing page load?
- [ ] Are pricing tiers shown?
- [ ] Is there a clear CTA to sign up as an employer?

### 1.20 Pricing Page — `/pricing`

- [ ] Does the pricing page load?
- [ ] Are plan tiers displayed? (Tier 1: $1,250 / Tier 2: $2,500 / Tier 3: $5,500)
- [ ] Is the `PricingTabs` component working?
- [ ] Are feature comparisons clear?

### 1.21 Contact Page — `/contact`

- [ ] Does the contact page load?
- [ ] Is the contact form functional?
- [ ] Is `info@iopps.ca` listed?

### 1.22 Login & Signup Pages

**Login** (`/login`):
- [ ] Does the login page render correctly?
- [ ] Is there a Google OAuth button?
- [ ] What happens if you enter an invalid email? (should show a friendly error, NOT raw Firebase `auth/invalid-credential`)
- [ ] What happens if you enter wrong password? (same — check for friendly error messages)
- [ ] Is there a "Forgot Password" link?

**Signup** (`/signup`):
- [ ] Does the signup page render correctly?
- [ ] Are there clear options for Community Member vs Organization signup?
- [ ] Does the signup form validate fields properly? (try submitting empty, try invalid email format)
- [ ] Is there a Google OAuth signup option?

**Forgot Password** (`/forgot-password`):
- [ ] Does the forgot password page load?
- [ ] Does submitting a valid email trigger the reset flow?
- [ ] What about an invalid email?

### 1.23 Legal Pages

- [ ] Does `/privacy` load with content?
- [ ] Does `/terms` load with content?

### 1.24 Footer

- [ ] Do all footer links work? (About, Privacy, Terms, Contact)
- [ ] Are social media links present and working?
- [ ] Is `info@iopps.ca` contact visible?
- [ ] Is copyright current?

### 1.25 Mobile Responsiveness (Anonymous)

Resize the browser to **375x812** (iPhone dimensions). Then:

- [ ] Does the mobile hamburger menu work?
- [ ] Does the homepage layout adjust properly?
- [ ] Can you browse jobs on mobile?
- [ ] Can you view the marketplace on mobile?
- [ ] Are there any overlapping elements or text cutoff?
- [ ] Is the login/signup accessible and usable on mobile?
- [ ] Check the members directory on mobile
- [ ] Check a job detail page on mobile
- [ ] Check the training page on mobile

Resize back to **1440x900** before continuing.

---

## PHASE 2: Community Member Experience (Sarah Whitebear)

Sign in with Sarah Whitebear's credentials.

### 2.1 Login Flow

- [ ] Navigate to the login page
- [ ] Enter Sarah's email and password
- [ ] Does login succeed?
- [ ] Is the session cookie (`__session`) set correctly?
- [ ] Where do you land after login? (should be `/feed` based on middleware redirect)
- [ ] Is Sarah's name visible in the navigation/header?
- [ ] Is there a profile avatar showing?
- [ ] Does the NavBar now show authenticated-only items? (Search, Notifications bell, Chat button, Saved bookmark, Create button)

### 2.2 Feed Page — `/feed`

- [ ] Does the feed page load?
- [ ] Are there multiple tabs? (should be multi-tab: jobs, events, scholarships, posts)
- [ ] Is the 3-column responsive layout working? (FeedSidebar | Feed | FeedRightSidebar)
- [ ] Does the `IconRailSidebar` show?
- [ ] Does the `FeedSidebar` interest filter work?
- [ ] Can you click on feed items to navigate to detail pages?
- [ ] Is there a "Create" button? Does the `CreateChooserModal` open?

### 2.3 Profile — `/profile`

- [ ] Navigate to Sarah's profile page
- [ ] Are all fields displaying? Check each:
  - Name, headline, avatar/photo
  - Nation (Cree / Nehiyaw)
  - Territory (Treaty 6)
  - Location
  - Current role
  - Skills
  - Experience
  - Education
  - Resume info (`resumeUrl`, `resumeFileName`)
  - Bio
  - Languages
  - Open to work status
  - Work preference (remote/in-person/hybrid)
  - Salary range
- [ ] Does `ProfileCompleteness` indicator show?
- [ ] Click "Edit Profile" — does the edit form load?
- [ ] Try changing a non-critical field (like headline). Does it save?
- [ ] **Upload test: Try uploading a new profile photo.** Does the upload work? Does the image preview show? Does it persist after save?
- [ ] Try adding a skill, then removing it
- [ ] After editing, visit the public profile URL (`/members/[uid]`) — do changes reflect?

### 2.4 Profile Sub-Pages

- [ ] `/profile/resume` — does the resume management page load?
- [ ] Can you upload/replace a resume?

### 2.5 Member Profile Pages — `/members/[uid]`

- [ ] Visit another member's profile
- [ ] Does `/members/[uid]/endorsements` load?
- [ ] Does `/members/[uid]/followers` load?
- [ ] Does `/members/[uid]/following` load?
- [ ] Is the `EndorsementCard` component displaying?
- [ ] Is the `FollowButton` working?

### 2.6 Job Search & Application Flow

This is the CORE member experience. Test it end-to-end.

- [ ] Browse the jobs page while logged in
- [ ] Search for a specific job (try "consultant" or "education")
- [ ] Apply filters (location, category, job type)
- [ ] Click into a job listing
- [ ] Is the "Apply" button now active (since you're logged in)?
- [ ] Click "Apply" — navigate to `/jobs/[slug]/apply`
  - [ ] Does the application form load?
  - [ ] **Upload test: Try uploading a resume (PDF or DOCX).** Does the file upload work?
  - [ ] **Upload test: Try uploading a cover letter.** Does it work?
  - [ ] Can you add a message to the employer?
  - [ ] Submit the application — does it succeed? (creates doc in `applications` collection)
  - [ ] Does the employer notification fire? (via `/api/applications/notify`)
  - [ ] Is there a confirmation message?
- [ ] Check `/applications` — does the applied job appear?
- [ ] Is the application status showing? (submitted → reviewing → shortlisted → interview → offered → rejected → withdrawn)

### 2.7 Saved Items — `/saved`

- [ ] Navigate to the saved items page
- [ ] Go back to jobs — is there a "Save Job" button on listings?
  - [ ] Click Save — does it work? (writes to `saved_items` collection)
  - [ ] Check `/saved` — does the saved job appear?
  - [ ] Go back and unsave — does it toggle correctly?

### 2.8 Search — `/search`

- [ ] Does the global search page load?
- [ ] Try searching for a person, a job, and a post
- [ ] Are results categorized properly?

### 2.9 Organization Interaction

- [ ] Find an organization (from directory or job listing)
- [ ] Visit their public profile (`/org/[slug]`)
- [ ] Is there a "Follow" button? Does it work? (via `connections.ts` module)
- [ ] Can you see their job listings from their profile?
- [ ] Can you see their products/services?
- [ ] Check `/saved` or dashboard — does the followed org appear?

### 2.10 Shop Indigenous (as Member) — `/shop`

- [ ] Browse the marketplace while logged in
- [ ] Can you favorite/save products?
- [ ] Can you view vendor profiles?
- [ ] Do product detail pages show full information?

### 2.11 Events & RSVP (as Member) — `/events`

- [ ] Browse events while logged in
- [ ] Can you RSVP for an event? (going / interested / not_going — via `rsvps.ts`)
- [ ] Can you save events?
- [ ] Do event detail pages work fully?

### 2.12 Mentorship — `/mentorship`

- [ ] Does the mentorship hub load?
- [ ] Can you browse available mentors?
- [ ] Does `/mentorship/become` work? (become a mentor form)
- [ ] Does `/mentorship/requests` work? (view mentorship requests)
- [ ] Can you request mentorship from someone? (via `mentorship.ts` module)

### 2.13 Messages — `/messages`

- [ ] Does the messaging page load?
- [ ] Can you start a new conversation? (via `messages.ts` — `getOrCreateConversation`)
- [ ] Can you send a message?
- [ ] Do messages appear in real-time? (uses `onSnapshot`)

### 2.14 Notifications — `/notifications`

- [ ] Does the notifications page load?
- [ ] Is the `NotificationBell` showing unread count?
- [ ] Can you click a notification to navigate to its source?
- [ ] Can you mark notifications as read?
- [ ] Notification types to check: welcome, job_match, application_update, event_reminder, new_post, system

### 2.15 Content Reporting

- [ ] Find any post/content
- [ ] Is the `ReportButton` visible?
- [ ] Can you submit a content report? (via `reports.ts` module)
- [ ] Report reasons to test: spam, harassment, inappropriate, misinformation, other

### 2.16 Settings — `/settings`

- [ ] Navigate to settings (try nav menu AND direct URL)
- [ ] Does `/settings/account` load? (account management)
- [ ] Does `/settings/notifications` load? (notification preferences)
  - [ ] Can you toggle email/push/in-app channels per category?
  - [ ] Can you set quiet hours?
- [ ] Does `/settings/privacy` load?
  - [ ] Can you set profile visibility? (public / members-only / private)
  - [ ] Can you set field visibility for email, community, location, bio, interests?
  - [ ] Can you toggle online status visibility?
  - [ ] Can you toggle direct message permissions?
  - [ ] Can you toggle directory listing?
- [ ] Does `/settings/career` load? (career preferences)
- [ ] Is the `ThemeToggle` (light/dark mode) working?
- [ ] Is there a sign-out option? Does it work? (deletes `__session` cookie via `/api/auth/session` DELETE)
- [ ] After signing out, are you properly redirected?
- [ ] Can you NOT access `/feed` when logged out? (should redirect to `/login`)

### 2.17 Edge Cases (as Member)

- [ ] Try navigating to `/feed` when logged out — should redirect to `/login?redirect=/feed`
- [ ] Try navigating to `/org/dashboard` — are you blocked?
- [ ] Try navigating to `/admin` — are you blocked?
- [ ] Try submitting a job application with no resume attached
- [ ] Try uploading an oversized file (>10MB if possible)
- [ ] Try uploading a non-standard file format (like .txt or .png as a resume)
- [ ] Rapidly click buttons — do you get duplicate submissions?
- [ ] Use browser back/forward buttons throughout — does navigation stay coherent?
- [ ] Test the `ProtectedRoute` component behavior
- [ ] If Sarah hasn't verified email (password signup), does `/verify-email` enforcer work?

**Sign out of Sarah's account before proceeding.**

---

## PHASE 3: Organization Experience (Northern Lights Indigenous Consulting)

Sign in with Northern Lights' credentials.

### 3.1 Login Flow

- [ ] Navigate to login
- [ ] Enter Northern Lights credentials
- [ ] Does login succeed?
- [ ] Where do you land? (should land on `/feed` or `/org/dashboard` depending on setup)
- [ ] Is the organization name visible in navigation?
- [ ] Does the NavBar show "Dashboard" link (conditional on having an org)?

### 3.2 Organization Dashboard — `/org/dashboard`

- [ ] Can you access the organization dashboard?
- [ ] Does the `OrgDashboardNav` component render?
- [ ] What sections/tabs are available? Check for ALL of these pages:
  - [ ] Overview/Home (`/org/dashboard`)
  - [ ] Jobs (`/org/dashboard/jobs`)
  - [ ] Applications (`/org/dashboard/applications`)
  - [ ] Events (`/org/dashboard/events`)
  - [ ] Scholarships (`/org/dashboard/scholarships`)
  - [ ] Analytics (`/org/dashboard/analytics`)
  - [ ] Team (`/org/dashboard/team`)
  - [ ] Talent Search (`/org/dashboard/talent`)
  - [ ] Templates (`/org/dashboard/templates`)
  - [ ] Billing (`/org/dashboard/billing`)
  - [ ] Profile (`/org/dashboard/profile`)
- [ ] Are stats showing real data? (via `/api/employer/stats` — total/active posts, applications, profile views)
- [ ] Is the dashboard navigation intuitive?

### 3.3 Job Posting — Create New — `/org/dashboard/jobs/new`

This is critical employer functionality. Test the full flow.

- [ ] Find the "Post a Job" or "Create Job" action
- [ ] Does the job creation form load at `/org/dashboard/jobs/new`?
- [ ] Fill out ALL fields:
  - Job title: "Test QA Position — DELETE ME"
  - Category / Type: Select from dropdowns
  - Location: Saskatoon, SK
  - Salary range: $60,000 - $80,000
  - Description: Enter a paragraph of text
  - Requirements: Enter several bullet points
  - Benefits: Select or enter benefits
  - Application deadline: Set a future date
  - **Upload test: Try uploading a job attachment/document if the field exists** (via `/api/employer/upload`)
- [ ] Submit/publish the job posting
- [ ] Does it save successfully?
- [ ] Can you see the new job in your "My Job Postings" list at `/org/dashboard/jobs`?
- [ ] Navigate to the public jobs page — can you find your new posting?
- [ ] Click into it — does all the information display correctly?

### 3.4 Job Posting — Edit & Manage

- [ ] Go to `/org/dashboard/jobs`
- [ ] Click edit on an existing posting (`/org/dashboard/jobs/[id]/edit`)
- [ ] Change a field and save — does it persist?
- [ ] Can you deactivate/unpublish a job?
- [ ] Can you delete a job? What's the confirmation flow?

### 3.5 Applicant Management — `/org/dashboard/applications`

- [ ] Navigate to the applications section
- [ ] Are there any applications showing? (Sarah may have applied in Phase 2)
- [ ] Click into an applicant — can you see their:
  - Name and profile info?
  - Resume/documents they uploaded?
  - Cover letter?
  - Application message?
  - Application date?
- [ ] Can you download their resume?
- [ ] Can you change application status? (submitted → reviewing → shortlisted → interview → offered → rejected)
- [ ] Can you message/contact the applicant?

### 3.6 Event Management — `/org/dashboard/events`

- [ ] Can you view org events?
- [ ] Can you create a new event at `/org/dashboard/events/new`?
  - Title, description, date/time, location
  - Does the form save?
- [ ] Does the created event show on the public `/events` page?

### 3.7 Scholarship Management — `/org/dashboard/scholarships`

- [ ] Can you view org scholarships?
- [ ] Can you create a new scholarship at `/org/dashboard/scholarships/new`?
  - Title, amount, description, deadline, requirements
  - Does the form save?
- [ ] Does it appear on the public `/scholarships` page?

### 3.8 Talent Search — `/org/dashboard/talent`

- [ ] Does the talent search page load?
- [ ] Can you search for potential candidates?
- [ ] Are member profiles viewable from search results?

### 3.9 Team Management — `/org/dashboard/team`

- [ ] Can you view team members?
- [ ] Can you invite new team members?
- [ ] Are roles correct? (owner, admin, member — from `members` collection `orgRole`)

### 3.10 Templates — `/org/dashboard/templates`

- [ ] Does the templates page load?
- [ ] Can you create/edit email or job templates?

### 3.11 Organization Public Profile — `/org/[slug]`

- [ ] Navigate to your public profile: `/org/northern-lights-indigenous-consulting` (or equivalent slug)
- [ ] Does it load correctly?
- [ ] Check that it displays:
  - Organization name and logo
  - Verification badge
  - Nation/Territory
  - Description/About
  - Contact info (phone, website, address, social links)
  - Active job listings (from `posts` via API)
  - Location
  - Hiring status
  - Indigenous-owned badge (if applicable)
- [ ] Does the profile look professional and complete?
- [ ] Visit it in a private/incognito window — does it look the same to anonymous users?

### 3.12 Analytics — `/org/dashboard/analytics`

- [ ] Is there an analytics section?
- [ ] Are metrics showing? (views, clicks, applications, followers)
- [ ] Do the numbers seem accurate?
- [ ] Is there any time-range filtering?
- [ ] Does it match data from `/api/employer/stats`?

### 3.13 Billing & Subscription — `/org/dashboard/billing`

- [ ] Can you view your current subscription tier?
- [ ] Is the pricing information accurate? (Tier 1: $1,250 / Tier 2: $2,500 / Tier 3: $5,500)
- [ ] Can you see what features are included in your tier?
- [ ] Is there a link to manage billing (Stripe)?
- [ ] Does the Stripe portal load if you click through?

### 3.14 Subscription & Checkout Flow

- [ ] `/org/plans` — does the plans page load?
- [ ] `/org/upgrade` — does the upgrade page load?
- [ ] `/org/checkout` — does the checkout page work? (via `/api/stripe/checkout`)
- [ ] `/org/checkout/success` — is the success page configured?
- [ ] `/org/checkout/cancel` — is the cancel page configured?

### 3.15 Organization Profile Edit — `/org/dashboard/profile`

- [ ] Can you edit the organization profile?
- [ ] Try changing the description — does it save? (via `/api/employer/profile`)
- [ ] **Upload test: Try uploading a new organization logo.** Does it work? (via `/api/employer/upload` or `/api/org/upload`)
- [ ] **Upload test: Try uploading a banner image.** Does it work?
- [ ] Can you edit social links? (facebook, linkedin, instagram, twitter)
- [ ] Can you change hiring status?

### 3.16 Organization Signup & Onboarding

- [ ] `/org/signup` — does the org signup page load?
- [ ] `/org/onboarding` — does the org onboarding flow work?
- [ ] Is the onboarding wizard clear about what info is needed?

### 3.17 Profile View Tracking

- [ ] Visit your own public profile — does the view count increment? (via `/api/employer/views`)

### 3.18 Organization Edge Cases

- [ ] Try posting a job with missing required fields — does validation work?
- [ ] Try uploading an invalid file type as a logo
- [ ] Try accessing `/admin` from org account — are you blocked?
- [ ] What happens if you visit your own public profile while logged in?
- [ ] Check that your job postings show your verified badge

**Sign out before proceeding.**

---

## PHASE 4: Cross-Role & Integration Testing

### 4.1 Application Flow End-to-End

Sign in as Sarah → Apply to a Northern Lights job → Sign out → Sign in as Northern Lights → Check if the application appears with all details intact.

- [ ] Does the application show Sarah's name, profile info?
- [ ] Is her resume downloadable?
- [ ] Is her cover letter visible?
- [ ] Can Northern Lights take action on it?
- [ ] Does the application status update flow work? (change status from org dashboard → check from Sarah's `/applications`)

### 4.2 Follow / Visibility Flow

Sign in as Sarah → Follow Northern Lights → Check `/saved` or member profile → Sign out → Sign in as Northern Lights → Can they see their follower count updated?

### 4.3 Endorsement Flow

Sign in as Sarah → Navigate to a member profile → Try endorsing someone (skill/character/work) → Check that the endorsement appears on their profile

### 4.4 Messaging Flow

Sign in as Sarah → Start a conversation with another user → Send a message → Sign out → Sign in as the other user → Check if message received

### 4.5 RSVP Flow

Sign in as Sarah → RSVP to an event (going/interested) → Check that RSVP is recorded → Un-RSVP → Check that it's removed

### 4.6 Public vs. Private Data

- [ ] Sarah's private info (phone, email) should NOT be visible on public profile unless privacy settings allow it
- [ ] Northern Lights' internal applicant data should NOT be visible to Sarah
- [ ] Admin-only routes should NOT be accessible to either account
- [ ] Org dashboard routes should NOT be accessible to Sarah
- [ ] Privacy settings (field visibility: everyone/members/only_me) should be respected

### 4.7 Search Consistency

- [ ] Search for "Northern Lights" from the jobs page — do their jobs appear?
- [ ] Search for "Northern Lights" from the organization directory — does their profile appear?
- [ ] Search for "Sarah Whitebear" from the members page

### 4.8 Email Verification Enforcement

- [ ] If a password-signup user has unverified email, are they redirected to `/verify-email`?
- [ ] Are OAuth (Google) users allowed through without email verification?
- [ ] Can unverified users still access `/settings` and `/api` routes?

---

## PHASE 5: Admin Dashboard Testing

**Note: You may not have admin credentials. If you do, test the following. Otherwise, document that admin testing was not possible.**

### 5.1 Admin Access Control

- [ ] Try accessing `/admin` as anonymous user — should redirect to `/login?redirect=/admin`
- [ ] Try accessing `/admin` as Sarah (community member) — should redirect to `/`
- [ ] Try accessing `/admin` as org account — should redirect to `/`
- [ ] Admin layout allows both `admin` and `moderator` roles

### 5.2 Admin Dashboard Home — `/admin`

- [ ] Does the dashboard load?
- [ ] Are stat cards showing? (Users, Jobs active/total, Employers total/pending, Vendors, Open Reports, Verifications, Conferences, Scholarships, Applications)
- [ ] Is the status bar showing? (platform online, live streams, pending verifications)
- [ ] Does the alert banner highlight pending employers/open reports?
- [ ] Do quick action links work? (6 links: Employers, Reports, Feed Sync, Jobs, Users, Settings)
- [ ] Is recent activity log showing? (from `auditLogs`)

### 5.3 Admin Sidebar Navigation

Check ALL sidebar sections exist and link correctly:

**Overview:**
- [ ] Dashboard → `/admin`
- [ ] Reports → `/admin/reports`

**People:**
- [ ] Users → `/admin/users`
- [ ] Organizations → `/admin/employers`
- [ ] Verification → `/admin/verification`

**Content:**
- [ ] Posts → `/admin/posts`
- [ ] Jobs → `/admin/jobs`
- [ ] Pow Wows → `/admin/powwows`
- [ ] Conferences → `/admin/conferences`
- [ ] Scholarships → `/admin/scholarships`
- [ ] Stories → `/admin/stories`
- [ ] Livestreams → `/admin/livestreams`
- [ ] Moderation → `/admin/moderation`

**Commerce:**
- [ ] Payments → `/admin/payments`
- [ ] Shop → `/admin/shop`
- [ ] Featured & Pinned → `/admin/pinned`
- [ ] Partners → `/admin/partners`

**Platform:**
- [ ] Feed Sync → `/admin/feed-sync`
- [ ] Email → `/admin/email`
- [ ] Data Management → `/admin/data`
- [ ] Settings → `/admin/settings`

- [ ] Is the notification bell working with unread count?
- [ ] Is the user profile card showing in sidebar?
- [ ] Does "Back to Site" link work?
- [ ] Does "Sign Out" work?

### 5.4 User Management — `/admin/users`

- [ ] Do tabs work? (All, Community, Employers, Moderators, Admins)
- [ ] Does search work? (name or email)
- [ ] Can you change a user's role?
- [ ] Does pagination work? (20 per page)
- [ ] Click into a user detail (`/admin/users/[userId]`) — does it load?

### 5.5 Employer Management — `/admin/employers`

- [ ] Do status tabs work? (All, Pending, Approved, Rejected)
- [ ] Can you approve an employer?
- [ ] Can you reject an employer? (should open modal for rejection reason)
- [ ] Does employer detail page work? (`/admin/employers/[orgId]`)

### 5.6 Job Management — `/admin/jobs`

- [ ] Do stat cards show? (Total, Active, Inactive)
- [ ] Do tabs work? (All, Active, Inactive)
- [ ] Can you toggle job status? (Active/Inactive)
- [ ] Can you delete a job? (with confirmation dialog)
- [ ] Do public job links work?

### 5.7 Moderation — `/admin/moderation`

- [ ] Do tabs work? (All, Pending, Resolved)
- [ ] Does search work?
- [ ] Are cultural concern reports (🪶) prioritized?
- [ ] Click into a report (`/admin/moderation/[reportId]`) — can you take action?
  - Dismiss, Warn, Suspend, Remove, Request Elder Input

### 5.8 Verification Queue — `/admin/verification`

- [ ] Does the SLA banner show for requests >48 hours?
- [ ] Do filter tabs work? (All, Pending, Approved, Rejected, Info Requested)
- [ ] Is urgency color-coding working? (green <48h, amber 48-72h, red >72h)
- [ ] Can you process a verification request? (`/admin/verification/[id]`)

### 5.9 Stories — `/admin/stories`

- [ ] Can you view stories list?
- [ ] Can you create a story? (`/admin/stories/create`)
- [ ] Can you edit a story? (`/admin/stories/[storyId]/edit`)
- [ ] Can you delete a story?

### 5.10 Email Campaigns — `/admin/email`

- [ ] Do summary cards show? (Subscribers, Campaigns Sent, Avg Open Rate)
- [ ] Can you create a campaign? (`/admin/email/compose`)
- [ ] Can you manage templates? (`/admin/email/templates`)
- [ ] Can you preview a campaign? (`/admin/email/preview/[campaignId]`)
- [ ] Can you send a campaign?
- [ ] Do open/click rates display?

### 5.11 Partners — `/admin/partners`

- [ ] Can you add a partner?
- [ ] Can you reorder partners? (up/down arrows)
- [ ] Can you toggle tier? (Premium / Standard)
- [ ] Can you toggle visibility/spotlight?
- [ ] Can you edit logo URL?
- [ ] Do impact metrics show? (hires, applications, views)

### 5.12 Settings — `/admin/settings`

Check ALL 8 sections:
- [ ] Maintenance Mode toggle (2-step confirmation)
- [ ] Feature Flags (10 toggles: Jobs, Events, Shop, Conferences, Scholarships, Livestreams, Stories, Partners, Messaging, Notifications)
- [ ] Announcement Banner (enable, message, link, type, preview)
- [ ] Pricing Defaults (job posting fee, featured listing fee, commission %)
- [ ] Email Settings (sender name, reply-to address)
- [ ] Feed Sync Configuration (frequency dropdown)
- [ ] Admin Accounts list (read-only)
- [ ] Danger Zone (Export Data, Clear Cache, Reset Settings — with confirmation)

### 5.13 Other Admin Pages

- [ ] `/admin/posts` — post management with type tabs
- [ ] `/admin/powwows` — powwow management
- [ ] `/admin/conferences` — conference management
- [ ] `/admin/scholarships` — scholarship management (uses dedicated `scholarships.ts` module)
- [ ] `/admin/livestreams` — livestream management
- [ ] `/admin/payments` — payment/subscription data
- [ ] `/admin/shop` — vendor management (feature/verify/flag/suspend/BOTD)
- [ ] `/admin/pinned` — featured & pinned content management
- [ ] `/admin/feed-sync` — RSS feed management + manual sync trigger
- [ ] `/admin/feed-sync/[feedId]` — individual feed detail
- [ ] `/admin/data` — data management & export
- [ ] `/admin/reports` — analytics dashboard + CSV export
- [ ] `/admin/analytics` — platform analytics

---

## PHASE 6: Cron Job & Background Process Verification

### 6.1 Scheduled Tasks

These cron jobs run automatically. Verify their effects:

- [ ] **Job Expiration** (`/api/cron/expire-jobs`) — Are jobs with past closing dates marked as "closed"?
- [ ] **Subscription Check** (`/api/cron/check-subscriptions`) — Are expired subscriptions downgraded to free?
- [ ] **Feed Sync** (`/api/cron/sync-feeds`) — Are RSS feeds being imported? (supports Oracle HCM, ADP, SmartJobBoard formats)

### 6.2 Stripe Webhook

- [ ] Does `checkout.session.completed` properly record subscriptions?
- [ ] Does it update employers/organizations with plan tier?
- [ ] Does it add post credits for one-time purchases?
- [ ] Does it send confirmation email?

---

## PHASE 7: Performance & Quality

### 7.1 Page Load Performance

For each major page, note:
- [ ] Homepage: Loads in __ seconds
- [ ] Jobs listing: Loads in __ seconds
- [ ] Training listing: Loads in __ seconds
- [ ] Shop/Marketplace: Loads in __ seconds
- [ ] Organization directory: Loads in __ seconds
- [ ] Members directory: Loads in __ seconds
- [ ] Feed (authenticated): Loads in __ seconds
- [ ] Dashboard (member profile): Loads in __ seconds
- [ ] Dashboard (org): Loads in __ seconds
- [ ] Scholarships: Loads in __ seconds
- [ ] Events: Loads in __ seconds

Flag anything over 3 seconds.

### 7.2 Console Errors

On each major page, check the browser console for:
- [ ] JavaScript errors (red)
- [ ] Failed network requests (4xx, 5xx)
- [ ] Uncaught promise rejections
- [ ] Missing resource warnings
- [ ] React hydration mismatches
- [ ] Next.js dynamic import errors

### 7.3 Visual Polish

- [ ] Are fonts consistent across pages? (should be Geist Sans)
- [ ] Are colors consistent with the brand? (navy, teal, design token colors)
- [ ] Are there any broken layouts (overlapping elements, misaligned text)?
- [ ] Are empty states handled gracefully? (no blank pages, "No results" messages exist)
- [ ] Are loading states present? (spinners, skeletons via `PageSkeleton` / `Skeleton` component, progress indicators)
- [ ] Are error states handled gracefully? (not raw error dumps)
- [ ] Does the `ThemeToggle` (dark/light mode) work across all pages?
- [ ] Are CSS variables (`var(--navy)`, `var(--teal)`, `var(--text-muted)`, etc.) rendering correctly?

### 7.4 Indigenous-Specific Checks

This platform exists for Indigenous communities. These checks matter deeply:

- [ ] Do nation/territory fields display correctly everywhere? (not truncated, not garbled)
- [ ] Do verification badges appear where they should?
- [ ] Are Indigenous-specific terms used correctly? (not "tribe" when it should be "Nation", etc.)
- [ ] Is the OCAP/CARE framework referenced in privacy settings?
- [ ] Are Treaty areas mentioned appropriately?
- [ ] Is there cultural sensitivity in language throughout? (no corporate jargon that feels disconnected)
- [ ] Does the moderation system have cultural concern as a priority report type? (🪶 indicator)
- [ ] Does the verification system support community reference documents?
- [ ] Are interest categories culturally appropriate? (Jobs & Careers, Events & Pow Wows, Scholarships & Grants, Indigenous Businesses, Schools & Programs, Livestreams & Stories)

### 7.5 PWA / Install Prompt

- [ ] Does the `InstallPrompt` component appear on supported browsers?
- [ ] Is `manifest.json` accessible?

### 7.6 Onboarding Experience

- [ ] Does the `/setup` profile setup wizard work? (5-step wizard)
- [ ] Does `OnboardingTour` component guide new users?

---

## PHASE 8: Final Report

Compile everything into this format:

```
===============================================================
                    IOPPS QA REPORT — [DATE]
===============================================================

PLATFORM HEALTH SCORE: __/10

TESTING SUMMARY
---------------
Tests Performed:  __
Issues Found:     __
  Critical:       __
  High:           __
  Medium:         __
  Low:            __
Features Working: __
Features Broken:  __

===============================================================
CRITICAL BUGS — Fix immediately, blocks core functionality
===============================================================

[For each bug:]
BUG ID: C-001
TITLE: [Short description]
URL: [Page URL]
USER TYPE: [Anonymous / Member / Organization / Admin / All]
STEPS TO REPRODUCE:
  1. ...
  2. ...
  3. ...
EXPECTED: [What should happen]
ACTUAL: [What actually happens]
SCREENSHOT: [Reference or embedded]

===============================================================
HIGH PRIORITY — Important functionality broken
===============================================================

[Same format as above]

===============================================================
MEDIUM PRIORITY — Should fix, but workarounds exist
===============================================================

[Same format as above]

===============================================================
LOW PRIORITY — Polish and nice-to-have
===============================================================

[Same format as above]

===============================================================
FEATURE STATUS MATRIX
===============================================================

| Feature                    | Status | Notes                  |
|----------------------------|--------|------------------------|
| Homepage                   | //// | |
| Job Board (browse)         | //// | |
| Job Board (search/filter)  | //// | |
| Job Application Flow       | //// | |
| Job Apply Page (/jobs/[slug]/apply) | //// | |
| Resume Upload              | //// | |
| Save Job                   | //// | |
| Member Feed (/feed)        | //// | |
| Member Profile (/profile)  | //// | |
| Member Profile (public /members/[uid]) | //// | |
| Profile Photo Upload       | //// | |
| Profile Resume Mgmt        | //// | |
| Profile Completeness       | //// | |
| Organization Directory     | //// | |
| Organization Profiles (/org/[slug]) | //// | |
| Partners Showcase          | //// | |
| Schools Directory          | //// | |
| School Profiles            | //// | |
| Org Dashboard (home)       | //// | |
| Org Dashboard (jobs)       | //// | |
| Org Dashboard (applications) | //// | |
| Org Dashboard (events)     | //// | |
| Org Dashboard (scholarships) | //// | |
| Org Dashboard (analytics)  | //// | |
| Org Dashboard (team)       | //// | |
| Org Dashboard (talent)     | //// | |
| Org Dashboard (templates)  | //// | |
| Org Dashboard (billing)    | //// | |
| Org Dashboard (profile)    | //// | |
| Job Posting (create)       | //// | |
| Job Posting (edit/manage)  | //// | |
| Applicant Management       | //// | |
| Shop Indigenous            | //// | |
| Product/Service Listings   | //// | |
| Events/Conferences         | //// | |
| Event RSVP                 | //// | |
| Training                   | //// | |
| Programs                   | //// | |
| Scholarships & Grants      | //// | |
| Stories                    | //// | |
| Livestreams                | //// | |
| Education Hub              | //// | |
| Members Directory          | //// | |
| Member Endorsements        | //// | |
| Member Follow System       | //// | |
| Mentorship Hub             | //// | |
| Mentorship Requests        | //// | |
| Direct Messaging           | //// | |
| Notifications              | //// | |
| Saved Items                | //// | |
| Global Search              | //// | |
| Spotlight Page             | //// | |
| Content Reporting          | //// | |
| Subscription/Billing       | //// | |
| Stripe Checkout            | //// | |
| Login (Email/Password)     | //// | |
| Login (Google OAuth)       | //// | |
| Signup                     | //// | |
| Password Reset             | //// | |
| Email Verification         | //// | |
| Profile Setup Wizard       | //// | |
| Onboarding Tour            | //// | |
| Settings (Account)         | //// | |
| Settings (Notifications)   | //// | |
| Settings (Privacy)         | //// | |
| Settings (Career)          | //// | |
| Dark/Light Theme Toggle    | //// | |
| Mobile Responsiveness      | //// | |
| Navigation (Desktop)       | //// | |
| Navigation (Mobile)        | //// | |
| Error Handling             | //// | |
| Follow Organizations       | //// | |
| Logo Upload (org)          | //// | |
| Banner Upload (org)        | //// | |
| Analytics (org)            | //// | |
| PWA Install Prompt         | //// | |
| Admin Dashboard            | //// | |
| Admin User Management      | //// | |
| Admin Employer Management  | //// | |
| Admin Job Management       | //// | |
| Admin Scholarship Mgmt     | //// | |
| Admin Post Management      | //// | |
| Admin Moderation           | //// | |
| Admin Verification Queue   | //// | |
| Admin Stories CRUD         | //// | |
| Admin Email Campaigns      | //// | |
| Admin Partners             | //// | |
| Admin Settings             | //// | |
| Admin Feature Flags        | //// | |
| Admin Payments             | //// | |
| Admin Shop/Vendors         | //// | |
| Admin Pinned Content       | //// | |
| Admin Feed Sync            | //// | |
| Admin Livestreams          | //// | |
| Admin Conferences          | //// | |
| Admin Pow Wows             | //// | |
| Admin Data Management      | //// | |
| Admin Reports/Analytics    | //// | |
| Admin Notifications        | //// | |
| Org Signup Flow            | //// | |
| Org Onboarding             | //// | |
| Org Checkout               | //// | |
| Pricing Page               | //// | |
| For Employers Page         | //// | |
| About Page                 | //// | |
| Contact Page               | //// | |
| Privacy Policy             | //// | |
| Terms of Service           | //// | |

KEY: checkmark = Working correctly | warning = Partially working | red = Broken or missing

===============================================================
UPLOAD FUNCTIONALITY SUMMARY
===============================================================

| Upload Type           | Works? | File Types Tested | Max Size Tested | Notes |
|-----------------------|--------|-------------------|-----------------|-------|
| Profile photo         |        |                   |                 |       |
| Resume (application)  |        |                   |                 |       |
| Cover letter          |        |                   |                 |       |
| Product images        |        |                   |                 |       |
| Organization logo     |        |                   |                 |       |
| Organization banner   |        |                   |                 |       |
| Job attachments       |        |                   |                 |       |

===============================================================
API HEALTH CHECK
===============================================================

| Endpoint                  | Status | Response Time | Notes |
|---------------------------|--------|---------------|-------|
| /api/stats/public         |        |               |       |
| /api/jobs                 |        |               |       |
| /api/events               |        |               |       |
| /api/scholarships         |        |               |       |
| /api/programs             |        |               |       |
| /api/organizations        |        |               |       |
| /api/shop                 |        |               |       |
| /api/schools              |        |               |       |
| /api/livestreams/youtube  |        |               |       |
| /api/posts                |        |               |       |
| /api/employer/dashboard   |        |               |       |
| /api/employer/stats       |        |               |       |
| /api/employer/applications|        |               |       |
| /api/auth/session         |        |               |       |

===============================================================
FIRESTORE COLLECTION DATA CHECK
===============================================================

| Collection          | Expected Count | Actual Count | Notes |
|---------------------|---------------|--------------|-------|
| users               | ~756          |              |       |
| organizations       | ~202          |              |       |
| jobs                | ~111          |              |       |
| posts               | varies        |              |       |
| scholarships        | ~17           |              |       |
| training_programs   | ~188          |              |       |
| events              | varies        |              |       |
| conferences         | varies        |              |       |
| applications        | varies        |              |       |
| shop_listings       | varies        |              |       |

===============================================================
RECOMMENDED FIX ORDER
===============================================================

WEEK 1 (Critical):
1. ...
2. ...

WEEK 2 (High Priority):
1. ...
2. ...

WEEK 3+ (Medium & Polish):
1. ...
2. ...

===============================================================
FEATURE SUGGESTIONS
===============================================================

Based on testing, these features would significantly improve the platform:

1. ...
2. ...
3. ...

===============================================================
KNOWN ISSUES FROM PREVIOUS QA (January 2025)
===============================================================

Check if these were fixed since last round:

- [ ] Organization Directory was blank/broken
- [ ] Save Job button was missing from job detail pages
- [ ] Firebase auth errors showing raw to users (auth/invalid-credential)
- [ ] Partner logo links from homepage not working
- [ ] Navigation menu missing Dashboard access for logged-in users
- [ ] View Public Shop infinite loading for vendors
- [ ] Moderation queue error in admin panel
- [ ] Conference hero image broken
- [ ] Map filter showing empty categories
- [ ] Homepage stats not dynamic (hardcoded numbers)
- [ ] Education section empty with no "coming soon" state
- [ ] Training section empty with no content

For each: Mark FIXED, PARTIALLY FIXED, or STILL BROKEN

===============================================================
ROUTE COVERAGE CHECKLIST
===============================================================

All routes that exist in the codebase — verify each loads:

PUBLIC:
- [ ] / (homepage)
- [ ] /about
- [ ] /contact
- [ ] /for-employers
- [ ] /pricing
- [ ] /privacy
- [ ] /terms
- [ ] /jobs
- [ ] /jobs/[slug]
- [ ] /training
- [ ] /training/[slug]
- [ ] /programs
- [ ] /programs/[slug]
- [ ] /shop
- [ ] /shop/[slug]
- [ ] /events
- [ ] /events/[slug]
- [ ] /scholarships
- [ ] /scholarships/[slug]
- [ ] /organizations
- [ ] /org/[slug]
- [ ] /partners
- [ ] /schools
- [ ] /schools/[slug]
- [ ] /stories
- [ ] /stories/[slug]
- [ ] /members
- [ ] /members/[uid]
- [ ] /members/[uid]/endorsements
- [ ] /members/[uid]/followers
- [ ] /members/[uid]/following
- [ ] /livestreams
- [ ] /education
- [ ] /spotlight

AUTH:
- [ ] /login
- [ ] /signup
- [ ] /forgot-password
- [ ] /verify-email

PROTECTED (Community Member):
- [ ] /feed
- [ ] /profile
- [ ] /profile/resume
- [ ] /settings
- [ ] /settings/account
- [ ] /settings/notifications
- [ ] /settings/privacy
- [ ] /settings/career
- [ ] /setup
- [ ] /search
- [ ] /saved
- [ ] /applications
- [ ] /messages
- [ ] /notifications
- [ ] /mentorship
- [ ] /mentorship/become
- [ ] /mentorship/requests
- [ ] /learning
- [ ] /spotlight

PROTECTED (Organization):
- [ ] /org/dashboard
- [ ] /org/dashboard/jobs
- [ ] /org/dashboard/jobs/new
- [ ] /org/dashboard/jobs/[id]/edit
- [ ] /org/dashboard/applications
- [ ] /org/dashboard/events
- [ ] /org/dashboard/events/new
- [ ] /org/dashboard/scholarships
- [ ] /org/dashboard/scholarships/new
- [ ] /org/dashboard/analytics
- [ ] /org/dashboard/team
- [ ] /org/dashboard/talent
- [ ] /org/dashboard/templates
- [ ] /org/dashboard/billing
- [ ] /org/dashboard/profile
- [ ] /org/plans
- [ ] /org/signup
- [ ] /org/onboarding
- [ ] /org/upgrade
- [ ] /org/checkout
- [ ] /org/checkout/success
- [ ] /org/checkout/cancel

ADMIN (requires admin/moderator role):
- [ ] /admin
- [ ] /admin/users
- [ ] /admin/users/[userId]
- [ ] /admin/employers
- [ ] /admin/employers/[orgId]
- [ ] /admin/jobs
- [ ] /admin/scholarships
- [ ] /admin/posts
- [ ] /admin/moderation
- [ ] /admin/moderation/[reportId]
- [ ] /admin/verification
- [ ] /admin/verification/[id]
- [ ] /admin/stories
- [ ] /admin/stories/create
- [ ] /admin/stories/[storyId]/edit
- [ ] /admin/email
- [ ] /admin/email/compose
- [ ] /admin/email/templates
- [ ] /admin/email/[campaignId]
- [ ] /admin/email/preview/[campaignId]
- [ ] /admin/partners
- [ ] /admin/payments
- [ ] /admin/pinned
- [ ] /admin/feed-sync
- [ ] /admin/feed-sync/[feedId]
- [ ] /admin/conferences
- [ ] /admin/powwows
- [ ] /admin/livestreams
- [ ] /admin/shop
- [ ] /admin/data
- [ ] /admin/settings
- [ ] /admin/reports
- [ ] /admin/analytics

===============================================================
```

---

## IMPORTANT REMINDERS

1. **Take screenshots constantly.** Every page load, every error, every interesting state. These are your evidence.

2. **Don't rush.** Read every page. Look at every detail. A real user would notice a misaligned button or a confusing label.

3. **Test the unhappy paths.** What happens when things go wrong? Empty states, errors, missing data, slow connections — these are where platforms lose trust.

4. **Think like an Indigenous professional.** This platform needs to feel like it was built *for* them, not adapted from something else. Does the language feel right? Do the categories make sense? Does the flow respect relationships over transactions?

5. **Compare desktop and mobile** for every critical flow, not just the homepage.

6. **Clean up after yourself.** If you created a test job posting ("Test QA Position — DELETE ME"), note it for deletion. Don't leave test data polluting the live platform.

7. **Be brutally honest but constructive.** The goal is to make this platform exceptional. Every bug you find is a gift.

8. **Test all 3 authentication states.** Anonymous, community member, and organization. Each should have a distinctly different experience.

9. **Check the browser console on EVERY page.** Console errors are bugs even if the UI looks fine.

10. **Verify data integrity.** When you create something (application, RSVP, saved item), verify it appears where it should AND disappears when removed.

---

## WHAT'S NEW IN V3 (vs V2)

This protocol was updated based on a full codebase audit on Feb 28, 2026. Key additions:

1. **26 new pages added to testing scope** — mentorship (hub/become/requests), messaging, notifications, spotlight, education, learning, search, saved items, profile resume, settings sub-pages, org dashboard sub-pages (events, scholarships, talent, team, templates), org signup/onboarding/checkout flows, schools directory, admin sub-pages
2. **Admin dashboard section (Phase 5)** — Full admin testing protocol with all 35+ admin pages
3. **Cron job verification (Phase 6)** — Testing background processes
4. **API health check** — Verify all 14+ API endpoints respond correctly
5. **Firestore collection data check** — Verify data counts match expectations
6. **Route coverage checklist** — Every single route in the codebase (128+ pages)
7. **New feature tests** — Mentorship, messaging, endorsements, RSVP, content reporting, notifications, saved items, search, privacy settings, theme toggle, PWA, onboarding tour
8. **Cross-role integration tests** — Endorsement flow, messaging flow, RSVP flow, email verification enforcement
9. **Organization dashboard fully expanded** — All 15 sub-pages tested individually
10. **Mobile menu tested separately** — Desktop nav and mobile nav have different link sets

---

*End of QA Protocol v3.0*
