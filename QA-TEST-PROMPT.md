# IOPPS Full Platform - QA Test Checklist

**Date:** _______________
**URL:** https://www.iopps.ca
**Tester:** _______________
**Browser / Device:** _______________

---

## Pre-Test Setup

1. **Clear browser cache** or use incognito mode
2. **Sign out and sign back in** to refresh auth token
3. Open browser DevTools → Console tab to monitor for errors throughout ALL tests
4. Prepare three test accounts:
   - **Community Member** account (role: `community`)
   - **Employer** account (role: `employer`, approved status)
   - **Admin** account (role: `admin`)
5. Keep a browser console open — note any `FirebaseError`, `TypeError`, or `500` responses

---

# PART 1: PUBLIC PAGES (No Auth Required)

---

## 1. Landing Page

### Test 1.1: Homepage Load
- [ ] Navigate to `/` (root URL)
- [ ] Page loads without console errors
- [ ] Hero section displays with heading "Where Indigenous talent meets opportunity"
- [ ] Trust badge visible: "Trusted by 50+ Indigenous organizations"
- [ ] Stats display: "105+ Jobs", "2,400+ Members", "50+ Organizations" (numbers may vary)
- [ ] "Find Opportunities" CTA button is clickable and navigates correctly
- [ ] "Post Opportunities" CTA button is clickable and navigates correctly

### Test 1.2: Landing Page Sections
- [ ] Features section renders with content
- [ ] Pillars section renders (Jobs, Education, Conferences, Community, Business)
- [ ] How It Works section renders
- [ ] Testimonial section renders
- [ ] Bottom CTA section renders with action buttons
- [ ] Footer renders with links (About, Contact, Privacy, Terms)

### Test 1.3: Footer Links
- [ ] "About" link → navigates to `/about`
- [ ] "Contact" link → navigates to `/contact`
- [ ] "Privacy" link → navigates to `/privacy`
- [ ] "Terms" link → navigates to `/terms`

**Result:** PASS / FAIL
**Notes:** _________________________________

---

## 2. Static Public Pages

### Test 2.1: About Page
- [ ] Navigate to `/about`
- [ ] Page loads with content, no errors
- [ ] Back navigation works

### Test 2.2: Contact Page
- [ ] Navigate to `/contact`
- [ ] Contact form renders with all fields
- [ ] Form validation works (submit empty form → shows errors)
- [ ] Form submission works (fill valid data → success message)

### Test 2.3: Privacy Policy
- [ ] Navigate to `/privacy`
- [ ] Full privacy policy text renders
- [ ] Page is scrollable, content is readable

### Test 2.4: Terms of Service
- [ ] Navigate to `/terms`
- [ ] Full terms text renders
- [ ] Page is scrollable, content is readable

### Test 2.5: Offline Page
- [ ] Navigate to `/offline`
- [ ] Offline fallback page renders

**Result:** PASS / FAIL
**Notes:** _________________________________

---

## 3. Pricing Page

### Test 3.1: Pricing Tabs
- [ ] Navigate to `/pricing`
- [ ] Page heading: "Choose the plan that fits your needs"
- [ ] **Employers** tab is selected by default — shows employer pricing tiers
- [ ] **Education** tab — switches to education pricing
- [ ] **Events** tab — switches to events pricing
- [ ] **Vendors** tab — switches to vendor/Shop Indigenous pricing
- [ ] **Live Streaming** tab — switches to streaming pricing

### Test 3.2: Pricing CTAs
- [ ] "Talk to IOPPS about pricing" → navigates to `/contact`
- [ ] "Create organization account" → navigates to `/register`
- [ ] Each pricing tier has a clear CTA button

**Result:** PASS / FAIL
**Notes:** _________________________________

---

## 4. For Employers Marketing Page

### Test 4.1: Employer Landing
- [ ] Navigate to `/for-employers`
- [ ] Page loads as standalone layout (no main site header)
- [ ] Hero section: "Hire Indigenous Talent"
- [ ] Stats display: "5K+ Professionals", "500+ Nations Represented", "98% Satisfaction Rate"
- [ ] Trusted By section shows partner logos (SIGA, SaskPower, Nutrien, etc.)
- [ ] "Why Employers Choose IOPPS" section shows 3 features (Targeted Reach, Cultural Fit, Easy Posting)
- [ ] "Get Started" CTA navigates to registration
- [ ] "Login" link navigates to `/login`

**Result:** PASS / FAIL
**Notes:** _________________________________

---

# PART 2: AUTHENTICATION & REGISTRATION

---

## 5. Registration Flows

### Test 5.1: Community Member Registration
- [ ] Navigate to `/register`
- [ ] Registration form renders (email, password, display name)
- [ ] **Validation:** Submit empty form → shows field errors
- [ ] **Validation:** Enter weak password → shows password strength error
- [ ] Fill valid info → select "Community Member" role
- [ ] Account creates successfully
- [ ] Redirects to `/welcome` page
- [ ] Welcome page shows 3 recommended next steps

### Test 5.2: Employer Registration
- [ ] Navigate to `/register?role=employer`
- [ ] Registration form renders
- [ ] Fill valid info → select "Employer" role
- [ ] Intent selection appears: Post Jobs / List Business / Post Events / Multiple
- [ ] Select an intent and complete registration
- [ ] Redirects to `/welcome` with employer-specific next steps
- [ ] "Post First Job" link visible → navigates to job creation
- [ ] "Complete Profile" link visible → navigates to org onboarding

### Test 5.3: Google OAuth Registration
- [ ] "Sign in with Google" button is visible on registration page
- [ ] Clicking opens Google OAuth popup/redirect
- [ ] After Google auth, user doc is created in Firestore
- [ ] Redirects to welcome page

**Result:** PASS / FAIL
**Notes:** _________________________________

---

## 6. Login & Password Reset

### Test 6.1: Email/Password Login
- [ ] Navigate to `/login`
- [ ] Login form renders (email + password fields)
- [ ] **Validation:** Submit empty form → shows errors
- [ ] **Validation:** Wrong password → shows error message
- [ ] Enter valid credentials → login succeeds
- [ ] Community member → redirects to `/discover`
- [ ] Admin/moderator → redirects to `/admin`
- [ ] No console errors on login

### Test 6.2: Google OAuth Login
- [ ] "Sign in with Google" button works
- [ ] OAuth flow completes and redirects correctly

### Test 6.3: Forgot Password
- [ ] Navigate to `/forgot-password`
- [ ] Enter registered email → success message
- [ ] Enter unregistered email → appropriate error/message
- [ ] "Back to Login" link works

### Test 6.4: Logout
- [ ] Click avatar → "Sign Out" option
- [ ] Logout clears session
- [ ] Redirects to login or landing page
- [ ] Protected pages now redirect to login

**Result:** PASS / FAIL
**Notes:** _________________________________

---

# PART 3: MAIN NAVIGATION

---

## 7. Desktop Navigation

### Test 7.1: Header Navigation Links
- [ ] **Feed** → navigates to `/discover`
- [ ] **Careers** → navigates to `/careers`
- [ ] **Directory** → navigates to `/organizations`
- [ ] **Education** → navigates to `/education`
- [ ] **Conferences** → navigates to `/conferences`
- [ ] **Connect** → navigates to `/community`
- [ ] **Live** → navigates to `/live`
- [ ] **Map** → navigates to `/map`
- [ ] **Pricing** → navigates to `/pricing`

### Test 7.2: Header Right Section (Logged In)
- [ ] Messages icon visible → navigates to `/member/messages` (community) or `/organization/inbox` (employer)
- [ ] Notification bell visible → shows unread count badge
- [ ] Click notification bell → dropdown shows recent notifications
- [ ] User avatar visible → click opens dropdown menu
- [ ] Dropdown: "My Profile" → `/member/{userId}`
- [ ] Dropdown: "Organization Dashboard" → `/organization` (employers only)
- [ ] Dropdown: "Admin Dashboard" → `/admin` (admins only)
- [ ] Dropdown: "Settings & Privacy" → `/member/settings`
- [ ] Dropdown: "Help" → `/contact`
- [ ] Dropdown: "Sign Out" → logs out

### Test 7.3: Header (Logged Out)
- [ ] "Sign In" button visible → navigates to `/login`
- [ ] "Get Started" or "Sign Up" button visible → navigates to `/register`
- [ ] Messages icon and notification bell are hidden
- [ ] Avatar dropdown is hidden

**Result:** PASS / FAIL
**Notes:** _________________________________

---

## 8. Mobile Navigation

### Test 8.1: Mobile Header
- [ ] Resize to mobile width (< 640px) or test on mobile device
- [ ] Hamburger menu icon appears
- [ ] Click hamburger → slide-out menu with all navigation links
- [ ] All nav links work and close the menu on navigation
- [ ] Logo is visible and links to home

### Test 8.2: Mobile Bottom Nav
- [ ] Bottom navigation bar appears on mobile
- [ ] **Live** tab → `/live`
- [ ] **Map** tab → `/map`
- [ ] **Profile** tab → `/member/{userId}` (logged in) or `/login` (logged out)
- [ ] Active tab is highlighted

**Result:** PASS / FAIL
**Notes:** _________________________________

---

# PART 4: DISCOVERY & SEARCH

---

## 9. Discover Feed

### Test 9.1: Feed Load
- [ ] Navigate to `/discover`
- [ ] Feed loads with opportunity cards (jobs, events, scholarships, etc.)
- [ ] Cards display: title, organization, type badge, location, date
- [ ] Scrolling loads more content (infinite scroll or "Load More" button)

### Test 9.2: Feed Filters
- [ ] Filter bar/tabs visible at top of feed
- [ ] Switching between content type tabs filters results correctly
- [ ] Filter state persists during scroll

### Test 9.3: Feed Card Interactions
- [ ] Click a card → navigates to detail page
- [ ] Save/bookmark button works on cards
- [ ] Share button works on cards

**Result:** PASS / FAIL
**Notes:** _________________________________

---

## 10. Global Search

### Test 10.1: Search Functionality
- [ ] Navigate to `/search`
- [ ] Search input renders with placeholder
- [ ] Type a query (e.g., "developer") → results appear
- [ ] Results show across types: Jobs, Scholarships, Events, Organizations
- [ ] Clicking a result → navigates to correct detail page
- [ ] Empty query or no results → shows empty state message

### Test 10.2: Search with Filters
- [ ] Category filters (Jobs, Scholarships, Events, Training, Businesses) work
- [ ] Location filter (provinces/territories) works
- [ ] Employment type filter works (for jobs)
- [ ] Salary range filter works (for jobs)
- [ ] Clearing filters resets results

### Test 10.3: Saved Searches
- [ ] Save a search → confirmation shown
- [ ] Saved searches appear in saved search list
- [ ] Click saved search → reloads that query
- [ ] Delete saved search → removes it

**Result:** PASS / FAIL
**Notes:** _________________________________

---

## 11. Map View

### Test 11.1: Map Page
- [ ] Navigate to `/map`
- [ ] Map renders with location markers
- [ ] Clicking a marker → shows opportunity details
- [ ] Map is zoomable and pannable
- [ ] Filter controls work to show/hide opportunity types

**Result:** PASS / FAIL
**Notes:** _________________________________

---

# PART 5: CAREERS PILLAR

---

## 12. Careers Hub

### Test 12.1: Careers Feed
- [ ] Navigate to `/careers`
- [ ] OpportunityFeed loads with job postings
- [ ] Sidebar shows quick links: "Browse All Jobs", "Training Programs", "My Applications", "Job Alerts"
- [ ] "Post a Job" CTA visible for employers
- [ ] Sidebar links navigate correctly

### Test 12.2: Job Detail Page
- [ ] Click a job card → navigates to `/careers/[jobId]`
- [ ] Job title, company name, location display correctly
- [ ] Job description renders (rich text/HTML)
- [ ] Salary range displays (if provided)
- [ ] Employment type badge (Full-time, Part-time, etc.)
- [ ] Location type (Remote, Onsite, Hybrid)
- [ ] "Apply" button is visible and clickable
- [ ] "Save" / bookmark button works
- [ ] "Share" buttons work (copy link, social)
- [ ] Related jobs section shows similar positions
- [ ] Back navigation returns to careers feed

### Test 12.3: Job Application Flow
- [ ] From job detail, click "Apply"
- [ ] Navigate to `/careers/[jobId]/apply`
- [ ] Application form renders (resume upload, cover letter, etc.)
- [ ] **Validation:** Submit incomplete form → shows errors
- [ ] Fill all required fields → submit
- [ ] Success page at `/careers/[jobId]/apply/success`
- [ ] Application appears in `/member/applications`

### Test 12.4: Quick Apply
- [ ] On a Quick Apply-enabled job, "Quick Apply" button is visible
- [ ] Clicking submits application with saved profile data
- [ ] Confirmation shown after quick apply

**Result:** PASS / FAIL
**Notes:** _________________________________

---

## 13. Training Programs

### Test 13.1: Programs Listing
- [ ] Navigate to `/careers/programs`
- [ ] Program cards load with title, provider, duration, location
- [ ] Filter/sort options work
- [ ] "Load More" or pagination works

### Test 13.2: Program Detail
- [ ] Click a program → navigates to `/careers/programs/[id]`
- [ ] Full program details render (description, dates, cost, provider)
- [ ] Registration/enrollment CTA works
- [ ] Save/bookmark button works

**Result:** PASS / FAIL
**Notes:** _________________________________

---

# PART 6: EDUCATION PILLAR

---

## 14. Education Hub

### Test 14.1: Education Feed
- [ ] Navigate to `/education`
- [ ] Feed loads with scholarships and training programs
- [ ] Sidebar quick links: "Browse Schools", "Find Scholarships", "Training Programs"
- [ ] "List Your School" CTA visible for employers
- [ ] All sidebar links navigate correctly

### Test 14.2: Scholarships Listing
- [ ] Navigate to `/education/scholarships`
- [ ] Scholarship cards load with title, award amount, deadline
- [ ] **Filter by Award Type:** Scholarship, Grant, Bursary
- [ ] **Filter by Education Level:** High School, Post-secondary, Graduate, Community
- [ ] **Filter by Deadline:** This Month, Next 3 Months, This Year
- [ ] Filters update results immediately
- [ ] "Load More" button works

### Test 14.3: Scholarship Detail
- [ ] Click a scholarship → navigates to `/education/scholarships/[id]`
- [ ] Full details render: description, eligibility, deadline, amount, how to apply
- [ ] Application link/CTA works
- [ ] Save/bookmark button works

### Test 14.4: Schools Listing
- [ ] Navigate to `/education/schools`
- [ ] School cards load with name, location, programs offered
- [ ] Click a school → `/education/schools/[id]` renders detail page

### Test 14.5: Education Events
- [ ] Navigate to `/education/events`
- [ ] Event cards load
- [ ] Click an event → `/education/events/[id]` renders detail page
- [ ] RSVP / register button works

**Result:** PASS / FAIL
**Notes:** _________________________________

---

# PART 7: CONFERENCES

---

## 15. Conferences

### Test 15.1: Conference Listing
- [ ] Navigate to `/conferences`
- [ ] Conference cards load with title, date, location, image
- [ ] Cards are clickable

### Test 15.2: Conference Detail
- [ ] Click a conference → `/conferences/[id]`
- [ ] Full details: title, description, date/time, location, speakers/schedule
- [ ] Pricing/ticket tiers display (if applicable)
- [ ] "Register" / "Buy Tickets" CTA works
- [ ] Save/bookmark button works
- [ ] Share buttons work

**Result:** PASS / FAIL
**Notes:** _________________________________

---

# PART 8: COMMUNITY & EVENTS

---

## 16. Community Hub

### Test 16.1: Community Feed
- [ ] Navigate to `/community`
- [ ] Subtitle: "Pow Wows & Events"
- [ ] Feed loads with events and pow wow cards
- [ ] Sidebar links: "Pow Wows", "Conferences", "Nations Map", "Host an Event"
- [ ] All sidebar links navigate correctly

### Test 16.2: Community Events
- [ ] Navigate to `/community/events`
- [ ] Event cards load with title, date, location
- [ ] Click event → detail page renders

### Test 16.3: Community Leaderboard
- [ ] Navigate to `/community/leaderboard`
- [ ] Leaderboard renders with member rankings
- [ ] Engagement metrics display (points, badges, streaks)

**Result:** PASS / FAIL
**Notes:** _________________________________

---

# PART 9: DIRECTORIES

---

## 17. Organizations Directory

### Test 17.1: Directory Listing
- [ ] Navigate to `/organizations`
- [ ] Subtitle: "Discover organizations committed to Indigenous employment..."
- [ ] Organization cards load with logo, name, industry, location, company size
- [ ] "Approved" badge visible on verified organizations

### Test 17.2: Directory Filters
- [ ] **Industry filter** — select an industry → results filter
- [ ] **Location filter** — select a province → results filter
- [ ] **Company size filter** — select a size → results filter
- [ ] Clear filters → shows all results
- [ ] Sort options work (relevance, newest, most active)

### Test 17.3: Organization Profile
- [ ] Click an organization → `/organizations/[slug]`
- [ ] Profile renders: banner, logo, name, description, social links
- [ ] "About" / company story section displays
- [ ] Active jobs listed (if any)
- [ ] Team members displayed (if public)
- [ ] Contact information visible
- [ ] TRC alignment statement visible (if provided)

**Result:** PASS / FAIL
**Notes:** _________________________________

---

## 18. Members Directory

### Test 18.1: Members Listing
- [ ] Navigate to `/members`
- [ ] Title: "Community Directory"
- [ ] Member cards load with avatar, name, affiliation, location, skills
- [ ] Grid/List view toggle works

### Test 18.2: Members Filters
- [ ] **Search** by name, skills, or affiliation
- [ ] **Location filter** (Canadian provinces)
- [ ] **Skills filter** (Project Management, Leadership, Healthcare, etc.)
- [ ] **Availability toggle** works
- [ ] Filters update results

### Test 18.3: Member Profile (Public View)
- [ ] Click a member → `/member/[userId]`
- [ ] Profile renders: avatar, name, headline, bio, skills, experience
- [ ] "Connect" button works (sends connection request)
- [ ] "Message" button works (opens message dialog)
- [ ] Endorsements section visible
- [ ] Privacy-restricted fields are hidden appropriately

**Result:** PASS / FAIL
**Notes:** _________________________________

---

# PART 10: BUSINESS / SHOP INDIGENOUS

---

## 19. Business Directory

### Test 19.1: Business Hub
- [ ] Navigate to `/business`
- [ ] Subtitle: "Shop Indigenous"
- [ ] Category filter cards visible: Arts & Crafts, Jewelry, Apparel, Food & Beverage, Professional, Health & Wellness, Media & Creative, Trades
- [ ] "List Your Business" CTA visible

### Test 19.2: Category Filtering
- [ ] Click "Arts & Crafts" → `/business/directory?category=art` — filtered results
- [ ] Click "Jewelry" → `/business/directory?category=jewelry` — filtered results
- [ ] Each category shows relevant vendor cards
- [ ] Vendor cards show: name, image, category, description

### Test 19.3: Vendor Detail
- [ ] Click a vendor → detail page renders
- [ ] Products/services listed
- [ ] "Inquiry" form works (VendorInquiryForm)
- [ ] "Follow" button works
- [ ] Reviews section visible

**Result:** PASS / FAIL
**Notes:** _________________________________

---

# PART 11: LIVE STREAMS

---

## 20. Live Streams

### Test 20.1: Live Listing
- [ ] Navigate to `/live`
- [ ] Live stream cards display (or "No live streams" empty state)
- [ ] Cards show: title, organization, status (live/upcoming/past)

### Test 20.2: Stream Detail
- [ ] Click a stream → `/live/[id]`
- [ ] Video player or YouTube embed renders
- [ ] Stream details display (title, description, organization)

**Result:** PASS / FAIL
**Notes:** _________________________________

---

# PART 12: SOCIAL / POSTS

---

## 21. Social Feed

### Test 21.1: Posts Feed
- [ ] Navigate to `/posts` or find social feed in Radar (`/radar`)
- [ ] Posts load with author avatar, name, content, timestamp
- [ ] Like button works → count increments
- [ ] Comment button → opens comment thread
- [ ] Reactions work (Love, Honor, Fire)
- [ ] Save post button works
- [ ] Share post button works

### Test 21.2: Create Post
- [ ] Create post FAB (floating action button) is visible
- [ ] Click → post creation form appears
- [ ] Enter text content → submit
- [ ] Post appears in feed
- [ ] Post visible on profile

### Test 21.3: Post Detail
- [ ] Click a post → `/posts/[postId]`
- [ ] Full post content renders
- [ ] Comments section loads
- [ ] Add a comment → appears in thread
- [ ] Delete own comment works

**Result:** PASS / FAIL
**Notes:** _________________________________

---

# PART 13: MEMBER DASHBOARD (Log in as Community Member)

---

## 22. Member Profile

### Test 22.1: View Own Profile
- [ ] Navigate to `/member/{userId}` (own profile)
- [ ] Profile renders with: avatar, name, headline, bio, skills, experience
- [ ] Profile completeness score displays
- [ ] Tabs work: Applications, Training, Analytics

### Test 22.2: Edit Profile
- [ ] Navigate to `/member/profile`
- [ ] All fields are editable: name, headline, bio, skills, experience, education
- [ ] Upload profile photo → preview shows
- [ ] Save changes → success toast
- [ ] Navigate back to profile → changes reflected

### Test 22.3: Profile Completeness
- [ ] Incomplete fields show suggestions to improve score
- [ ] Completing a field → score increases

**Result:** PASS / FAIL
**Notes:** _________________________________

---

## 23. Member Applications & Alerts

### Test 23.1: Applications Tracker
- [ ] Navigate to `/member/applications`
- [ ] Applied jobs display with status (Submitted, Reviewed, Interview, etc.)
- [ ] Click an application → shows details
- [ ] Empty state shows if no applications

### Test 23.2: Job Alerts
- [ ] Navigate to `/member/alerts`
- [ ] Existing alerts display with criteria and frequency
- [ ] "Create Alert" button → CreateJobAlertModal opens
- [ ] Set filter criteria (keywords, location, category)
- [ ] Set frequency (Instant, Daily, Weekly)
- [ ] Save alert → appears in list
- [ ] Edit alert → changes save
- [ ] Delete alert → removed from list

**Result:** PASS / FAIL
**Notes:** _________________________________

---

## 24. Member Messaging

### Test 24.1: Messages
- [ ] Navigate to `/member/messages`
- [ ] Conversation list loads (or empty state)
- [ ] Click a conversation → message thread opens
- [ ] Send a message → appears in thread
- [ ] Receive indicator (read receipts) works
- [ ] "New Message" button → NewMessageDialog opens
- [ ] Select recipient → send message → new conversation created

**Result:** PASS / FAIL
**Notes:** _________________________________

---

## 25. Member Settings & Preferences

### Test 25.1: Settings Page
- [ ] Navigate to `/member/settings`
- [ ] Privacy settings section renders
- [ ] Notification preferences section renders
- [ ] Save changes → success toast

### Test 25.2: Email Preferences
- [ ] Navigate to `/member/email-preferences`
- [ ] Toggle options for: job alerts, scholarship alerts, weekly digest, conference alerts
- [ ] Save changes → success toast
- [ ] Preferences persist on page reload

### Test 25.3: Saved Items
- [ ] Navigate to `/saved`
- [ ] Saved jobs, scholarships, programs display
- [ ] Click a saved item → navigates to detail page
- [ ] "Remove" / unsave button works

### Test 25.4: Endorsements
- [ ] Navigate to `/member/endorsements`
- [ ] Endorsements received display (or empty state with request CTA)
- [ ] Request endorsement flow works

### Test 25.5: Data Export
- [ ] Navigate to `/account`
- [ ] "Export My Data" option available (GDPR compliance)
- [ ] Trigger export → download link or confirmation

**Result:** PASS / FAIL
**Notes:** _________________________________

---

## 26. Notifications

### Test 26.1: Notification Bell
- [ ] Notification bell in header shows unread count
- [ ] Click bell → dropdown shows recent notifications
- [ ] Click a notification → navigates to relevant page
- [ ] "Mark all as read" clears unread count

**Result:** PASS / FAIL
**Notes:** _________________________________

---

# PART 14: EMPLOYER DASHBOARD (Log in as Employer)

---

## 27. Organization Overview

### Test 27.1: Dashboard Access
- [ ] Log in as employer
- [ ] Avatar dropdown → "Organization Dashboard" link visible
- [ ] Navigate to `/organization`
- [ ] Dashboard overview loads (or redirects to `/discover`)

### Test 27.2: Onboarding Checklist
- [ ] Navigate to `/organization/onboarding`
- [ ] Checklist renders with steps (Complete Profile, Post First Job, etc.)
- [ ] Completed steps show checkmarks
- [ ] Clicking a step → navigates to relevant page

### Test 27.3: Organization Profile Edit
- [ ] Navigate to `/organization/profile`
- [ ] All fields editable: name, industry, size, description, website, logo, banner
- [ ] Upload logo → preview shows
- [ ] Upload banner image → preview shows
- [ ] Add social links (LinkedIn, Twitter, etc.)
- [ ] Add TRC alignment statement
- [ ] Save → success toast, changes reflected on public profile

**Result:** PASS / FAIL
**Notes:** _________________________________

---

## 28. Job Management

### Test 28.1: Jobs List
- [ ] Navigate to `/organization/jobs`
- [ ] Job postings list with: title, status (Active/Inactive/Draft), posted date, views, applications count
- [ ] Filter by status works
- [ ] Sort options work

### Test 28.2: Create New Job (Full Wizard)
- [ ] Navigate to `/organization/jobs/new`
- [ ] **Job Title** — text input works
- [ ] **Description** — Rich text editor (RichTextEditor) works, formatting applies
- [ ] **Salary Range** — SalaryRangeInput min/max fields work
- [ ] **Location Type** — LocationTypeSelector (Onsite/Remote/Hybrid) works
- [ ] **Location/Address** — text input works
- [ ] **Category/Industry** — CategorySelect dropdown works
- [ ] **Employment Type** — dropdown works (Full-time, Part-time, Contract, etc.)
- [ ] **Experience Level** — dropdown works
- [ ] **Application Method** — ApplicationMethodSelector (Email/URL/Quick Apply) works
- [ ] **Tags/Skills** — multi-select works
- [ ] **Poster Image** — PosterUploader works, AI analysis triggers
- [ ] **Scheduled Publish** — ScheduledPublishInput date picker works
- [ ] **Preview** — JobPreviewModal shows job as it will appear
- [ ] **Save as Draft** → job saved with draft status
- [ ] **Publish** → triggers Stripe checkout (or uses credits)

### Test 28.3: Edit Job
- [ ] Navigate to `/organization/jobs/[id]/edit`
- [ ] All fields pre-populated with existing data
- [ ] Edit a field → save → changes reflected
- [ ] Deactivate/reactivate toggle works

### Test 28.4: View Applications
- [ ] Navigate to `/organization/jobs/[id]/applications`
- [ ] Applicant list renders with: name, date, status
- [ ] Click applicant → view application details
- [ ] Update application status (Reviewed, Interview, Rejected, etc.)
- [ ] Schedule interview → ScheduleInterviewModal opens

### Test 28.5: Import Jobs
- [ ] Navigate to `/organization/jobs/import`
- [ ] CSV upload or job scraping interface renders
- [ ] Upload a sample CSV → field detection works
- [ ] Import preview shows mapped fields

**Result:** PASS / FAIL
**Notes:** _________________________________

---

## 29. Training Programs (Employer)

### Test 29.1: Training List
- [ ] Navigate to `/organization/training`
- [ ] Programs list renders

### Test 29.2: Create Training Program
- [ ] Navigate to `/organization/training/new`
- [ ] Form renders: title, description, category, duration, dates, location, price
- [ ] Fill all fields → publish
- [ ] Success page at `/organization/training/success`
- [ ] Program appears in `/organization/training`

### Test 29.3: Edit Training
- [ ] Navigate to `/organization/training/[id]/edit`
- [ ] Fields pre-populated → edit and save

**Result:** PASS / FAIL
**Notes:** _________________________________

---

## 30. Conferences (Employer)

### Test 30.1: Conference List
- [ ] Navigate to `/organization/conferences`
- [ ] Conference list renders

### Test 30.2: Create Conference
- [ ] Navigate to `/organization/conferences/new`
- [ ] Conference builder form renders
- [ ] Fill details: title, date, location, description, pricing tiers
- [ ] ConferencePricingSelector works (add/remove tiers)
- [ ] Save/publish → conference created

### Test 30.3: Edit Conference
- [ ] Navigate to `/organization/conferences/[id]/edit`
- [ ] Pre-populated → edit and save

**Result:** PASS / FAIL
**Notes:** _________________________________

---

## 31. Pow Wows (Employer)

### Test 31.1: Pow Wow Management
- [ ] Navigate to `/organization/powwows`
- [ ] Pow wow list renders (or empty state)
- [ ] Navigate to `/organization/powwows/new`
- [ ] Creation form: name, date, location, description, image
- [ ] Fill and submit → pow wow created
- [ ] Appears in list and on public `/community` page

**Result:** PASS / FAIL
**Notes:** _________________________________

---

## 32. Funding & Grants (Employer)

### Test 32.1: Funding Management
- [ ] Navigate to `/organization/funding`
- [ ] Funding opportunities list renders
- [ ] Navigate to `/organization/funding/new`
- [ ] Creation form renders → fill and submit
- [ ] Edit: `/organization/funding/[id]/edit` → pre-populated, save works

**Result:** PASS / FAIL
**Notes:** _________________________________

---

## 33. Services (Employer)

### Test 33.1: Services Management
- [ ] Navigate to `/organization/services`
- [ ] Services list renders
- [ ] Navigate to `/organization/services/new`
- [ ] Creation form → fill and submit
- [ ] Service appears in list

**Result:** PASS / FAIL
**Notes:** _________________________________

---

## 34. Shop Indigenous (Employer/Vendor)

### Test 34.1: Shop Setup
- [ ] Navigate to `/organization/shop/setup`
- [ ] Setup wizard renders → complete steps
- [ ] Vendor profile created

### Test 34.2: Shop Dashboard
- [ ] Navigate to `/organization/shop/dashboard`
- [ ] Analytics display (views, inquiries, follows)
- [ ] Product/service listings visible
- [ ] "Add Listing" option works

**Result:** PASS / FAIL
**Notes:** _________________________________

---

## 35. Team Management (Employer)

### Test 35.1: Team Page
- [ ] Team management section accessible from organization dashboard
- [ ] Current team members listed with roles (Admin, Editor, Viewer)

### Test 35.2: Invite Team Member
- [ ] Click "Invite" → form with email + role selection
- [ ] Send invitation → confirmation shown
- [ ] Invitation appears in pending list
- [ ] Invited user receives email / can accept invitation

### Test 35.3: Manage Team
- [ ] Change a team member's role → saves
- [ ] Remove a team member → confirmation dialog → member removed

**Result:** PASS / FAIL
**Notes:** _________________________________

---

## 36. Talent Pool (Employer)

### Test 36.1: Talent Search
- [ ] Navigate to `/organization/talent`
- [ ] If subscribed: talent search renders with member cards (TalentCard)
- [ ] Search by skills, location, availability
- [ ] Click a talent card → view member profile
- [ ] If not subscribed: TalentPoolPaywall renders with upgrade CTA

**Result:** PASS / FAIL
**Notes:** _________________________________

---

## 37. Subscription & Billing (Employer)

### Test 37.1: Subscription Page
- [ ] Navigate to `/organization/subscription`
- [ ] Current plan displays (or "No active subscription")
- [ ] Tier options visible: Tier 1 (Growth) $1,250/yr, Tier 2 (Unlimited) $2,500/yr
- [ ] "Subscribe" / "Upgrade" CTA → initiates Stripe checkout

### Test 37.2: Billing Portal
- [ ] "Manage Billing" link → opens Stripe billing portal
- [ ] Can view payment history, update payment method

**Result:** PASS / FAIL
**Notes:** _________________________________

---

# PART 15: PAYMENT & STRIPE FLOWS

---

## 38. Stripe Checkout Flows

### Test 38.1: Job Posting Purchase
- [ ] From job creation, click "Publish"
- [ ] Stripe checkout page opens (standard $125 or featured $300)
- [ ] Use Stripe test card (4242 4242 4242 4242)
- [ ] Payment succeeds → redirects to success page
- [ ] Job status changes to active
- [ ] Job credits updated in employer profile

### Test 38.2: Subscription Purchase
- [ ] From `/organization/subscription`, click subscribe
- [ ] Stripe checkout for recurring subscription
- [ ] Payment succeeds → subscription active
- [ ] Job credits granted per plan

### Test 38.3: Conference Ticket Purchase
- [ ] From conference detail, click "Register" / "Buy Tickets"
- [ ] Stripe checkout for conference ticket
- [ ] Payment succeeds → registration confirmed

### Test 38.4: Vendor Subscription
- [ ] From Shop Indigenous setup, subscribe
- [ ] Stripe checkout completes
- [ ] Vendor listing becomes active

### Test 38.5: Talent Pool Access
- [ ] From talent pool paywall, click purchase
- [ ] Stripe checkout completes
- [ ] Talent search unlocked for access period

**Result:** PASS / FAIL
**Notes:** _________________________________

---

# PART 16: ADMIN PANEL (Log in as Admin)

---

## 39. Admin Dashboard

### Test 39.1: Platform Overview Cards
- [ ] Navigate to `/admin`
- [ ] **Active Jobs** card shows a number > 0
- [ ] **Member Profiles** card shows a number > 0
- [ ] **Employer Orgs** card shows a number > 0
- [ ] **Active Vendors** card shows a number > 0
- [ ] **Applications** card shows a number (can be 0)

### Test 39.2: Secondary Stats Row
- [ ] **Users (Auth)** shows a number > 0
- [ ] **Total Jobs** shows a number > 0
- [ ] **Total Vendors** shows a number > 0
- [ ] **Conferences** shows a number > 0

### Test 39.3: Activity Feed
- [ ] Recent activity items display (employer approvals, job posts, signups)
- [ ] Activity items have timestamps

### Test 39.4: Needs Attention Cards
- [ ] **Pending Approvals** card → Click → Goes to `/admin/employers?status=pending`
- [ ] **Flagged Content** card → Click → Goes to `/admin/moderation`
- [ ] **Failed Imports** card → Click → Goes to `/admin/feeds`
- [ ] **Verification Queue** card → Click → Goes to `/admin/verification`

### Test 39.5: System Health
- [ ] System health panel displays status indicators
- [ ] Refresh button updates data
- [ ] No console errors

**Result:** PASS / FAIL
**Notes:** _________________________________

---

## 40. Admin - Content Management

### Test 40.1: Jobs Management
- [ ] Navigate to `/admin/jobs`
- [ ] Job list loads with title, employer, status, date
- [ ] Click job title → opens edit page
- [ ] Click View (eye) icon → opens public job page
- [ ] Click Edit (pencil) icon → opens edit page
- [ ] Deactivate/Activate toggle works (doesn't navigate)
- [ ] Job counts: Active + Inactive = Total

### Test 40.2: Employer Management
- [ ] Navigate to `/admin/employers`
- [ ] Default filter is "All"
- [ ] Filter by: Pending, Approved, Rejected
- [ ] Click employer → edit page
- [ ] Approve a pending employer → status changes
- [ ] View employer products/subscriptions

### Test 40.3: Scholarship Management
- [ ] Navigate to `/admin/scholarships`
- [ ] Scholarship list loads
- [ ] Create / edit / manage scholarships

### Test 40.4: Conference Management
- [ ] Navigate to `/admin/conferences`
- [ ] Conference list loads
- [ ] Edit conference → `/admin/conferences/[id]/edit`
- [ ] Toggle visibility works

### Test 40.5: Pow Wow Management
- [ ] Navigate to `/admin/powwows`
- [ ] Pow wow list loads
- [ ] Edit pow wow works

### Test 40.6: Vendor Management
- [ ] Navigate to `/admin/vendors`
- [ ] Vendor list loads
- [ ] Manage featured rotation
- [ ] Verify/unverify vendor

### Test 40.7: News Management
- [ ] Navigate to `/admin/news`
- [ ] Create / edit / publish news articles

### Test 40.8: Video Management
- [ ] Navigate to `/admin/videos`
- [ ] Video list loads, manage video content

### Test 40.9: Feed Management
- [ ] Navigate to `/admin/feeds`
- [ ] RSS feed sources listed
- [ ] Edit feed → save changes
- [ ] Sync status visible
- [ ] CSV field detection works

**Result:** PASS / FAIL
**Notes:** _________________________________

---

## 41. Admin - User & Member Management

### Test 41.1: Users Page
- [ ] Navigate to `/admin/users`
- [ ] User list populates (not "0 users found")
- [ ] Users display: email, role, status
- [ ] Filter buttons show correct counts
- [ ] Search by email works

### Test 41.2: Members Page
- [ ] Navigate to `/admin/members`
- [ ] Member list loads
- [ ] Search and filter work
- [ ] Click member → view details

### Test 41.3: Applications
- [ ] Navigate to `/admin/applications`
- [ ] All applications across employers display
- [ ] Filter by status, employer, member

**Result:** PASS / FAIL
**Notes:** _________________________________

---

## 42. Admin - Moderation & Verification

### Test 42.1: Content Moderation
- [ ] Navigate to `/admin/content`
- [ ] Flagged content items display (or empty state)
- [ ] Actions: approve, remove, ignore

### Test 42.2: Moderation Queue
- [ ] Navigate to `/admin/moderation`
- [ ] Pending moderation items display
- [ ] Process an item (approve/reject)

### Test 42.3: Verification Requests
- [ ] Navigate to `/admin/verification`
- [ ] Indigenous verification requests display
- [ ] Review documentation → approve or reject

**Result:** PASS / FAIL
**Notes:** _________________________________

---

## 43. Admin - Tools & Utilities

### Test 43.1: Global Search
- [ ] Click search bar or press `Cmd/Ctrl + K`
- [ ] Type query → results appear with categories (User, Employer, Job)
- [ ] Click result → navigates to correct page

### Test 43.2: Claims Check
- [ ] Navigate to `/admin/check-claims`
- [ ] Page shows UID and email
- [ ] **Admin Permission** shows **PASS** (green)
- [ ] "Refresh Claims" button works

### Test 43.3: Email Management
- [ ] Navigate to `/admin/emails`
- [ ] Email logs display
- [ ] Trigger email campaign works

### Test 43.4: Analytics
- [ ] Navigate to `/admin/analytics`
- [ ] Charts and metrics render
- [ ] Data appears current

### Test 43.5: Settings
- [ ] Navigate to `/admin/settings`
- [ ] Platform configuration options display
- [ ] Save settings → success toast

### Test 43.6: Sidebar Navigation
- [ ] **Scholarships** appears in sidebar under CONTENT
- [ ] **Applications** appears in sidebar under PEOPLE
- [ ] All sidebar links navigate to correct pages
- [ ] All admin pages are reachable from sidebar

**Result:** PASS / FAIL
**Notes:** _________________________________

---

# PART 17: EMAIL & NOTIFICATIONS

---

## 44. Email System

### Test 44.1: Email Unsubscribe
- [ ] Navigate to `/unsubscribe` (with valid token)
- [ ] Unsubscribe confirmation page renders
- [ ] Confirm unsubscribe → success message

### Test 44.2: Email Preferences (via Member Settings)
- [ ] All email toggle categories present
- [ ] Changes persist after save and reload

### Test 44.3: Job Alert Emails (if testable)
- [ ] Verify instant alerts fire for matching new jobs
- [ ] Verify daily digest email contains recent jobs
- [ ] Verify weekly digest format

**Result:** PASS / FAIL
**Notes:** _________________________________

---

# PART 18: RESPONSIVE DESIGN

---

## 45. Mobile Responsiveness (375px width)

### Test 45.1: Key Pages at Mobile Width
- [ ] Landing page — no horizontal overflow, hero readable, CTAs tappable
- [ ] Careers feed — single column layout, cards full width
- [ ] Job detail — all content readable, apply button accessible
- [ ] Organization directory — single column grid
- [ ] Member directory — single column, filters in drawer
- [ ] Education/Scholarships — filters collapse into drawer
- [ ] Admin dashboard — horizontal scroll on tables, all data accessible
- [ ] Pricing page — tiers stack vertically

### Test 45.2: Touch Targets
- [ ] All buttons/links have minimum 44x44px touch area
- [ ] No overlapping interactive elements
- [ ] Form inputs are large enough to tap

### Test 45.3: Navigation at Mobile
- [ ] Hamburger menu opens/closes correctly
- [ ] Bottom nav doesn't overlap content
- [ ] No content hidden behind fixed elements

**Result:** PASS / FAIL
**Notes:** _________________________________

---

## 46. Tablet Responsiveness (768px width)

### Test 46.1: Key Pages at Tablet Width
- [ ] Feed shows 2-column card grid
- [ ] Directory shows 2-column grid
- [ ] Admin tables readable without excessive scroll
- [ ] Sidebar navigation collapses or adapts

**Result:** PASS / FAIL
**Notes:** _________________________________

---

## 47. Desktop (1280px+ width)

### Test 47.1: Key Pages at Desktop Width
- [ ] Feed shows sidebar + main content (2-column layout)
- [ ] Directory shows 3+ column grid
- [ ] Admin dashboard fully visible without scroll
- [ ] Header shows all 9 navigation links in pill bar
- [ ] No wasted whitespace or broken layouts

**Result:** PASS / FAIL
**Notes:** _________________________________

---

# PART 19: ACCESSIBILITY

---

## 48. Keyboard Navigation

### Test 48.1: Core Flows by Keyboard Only
- [ ] Tab through landing page — focus indicators visible on all interactive elements
- [ ] Tab through login form — can submit with Enter
- [ ] Tab through job listing → Enter opens detail → Tab to Apply
- [ ] Tab through search → type query → Tab to results → Enter selects
- [ ] Escape closes modals and dropdowns

**Result:** PASS / FAIL
**Notes:** _________________________________

---

## 49. Screen Reader & Semantic HTML

### Test 49.1: Basics
- [ ] All pages have a single `<h1>` heading
- [ ] Heading hierarchy is logical (h1 → h2 → h3, no skips)
- [ ] All images have `alt` text
- [ ] Form inputs have associated `<label>` elements
- [ ] ARIA labels on icon-only buttons (search, close, menu)
- [ ] Status messages have appropriate ARIA live regions

**Result:** PASS / FAIL
**Notes:** _________________________________

---

## 50. Theme & Color

### Test 50.1: Dark Mode / System Theme
- [ ] Set system to dark mode → site adapts (background, text colors)
- [ ] Set system to light mode → site adapts
- [ ] No unreadable text in either mode
- [ ] All interactive elements visible in both modes

**Result:** PASS / FAIL
**Notes:** _________________________________

---

# PART 20: ERROR HANDLING & EDGE CASES

---

## 51. Error States

### Test 51.1: 404 Pages
- [ ] Navigate to `/this-page-does-not-exist`
- [ ] Custom 404 page renders (not blank or raw error)
- [ ] Navigation still works from 404 page

### Test 51.2: Auth Guards
- [ ] Log out → navigate to `/member/dashboard` → redirected to `/login`
- [ ] Log out → navigate to `/organization/jobs` → redirected to `/login`
- [ ] Log out → navigate to `/admin` → redirected to `/login`
- [ ] Community member → navigate to `/admin` → access denied or redirect

### Test 51.3: Empty States
- [ ] New account with no applications → `/member/applications` shows empty state with CTA
- [ ] New employer with no jobs → `/organization/jobs` shows empty state with "Post First Job"
- [ ] Search with no results → shows "No results found" message
- [ ] Messages with no conversations → shows empty state

### Test 51.4: Expired/Invalid Content
- [ ] Navigate to `/careers/invalid-job-id` → graceful error (not crash)
- [ ] Navigate to `/education/scholarships/invalid-id` → graceful error
- [ ] Navigate to `/organizations/invalid-slug` → graceful error

### Test 51.5: Console Error Check
- [ ] Review browser console across all tested pages
- [ ] No unhandled `TypeError` or `ReferenceError`
- [ ] No `FirebaseError: Missing or insufficient permissions`
- [ ] No `500 Internal Server Error` responses
- [ ] No CORS errors
- [ ] No hydration mismatch warnings

**Result:** PASS / FAIL
**Notes:** _________________________________

---

# PART 21: PERFORMANCE

---

## 52. Page Load Performance

### Test 52.1: Core Page Load Times
- [ ] Landing page loads in < 3 seconds
- [ ] Careers feed loads in < 3 seconds
- [ ] Job detail page loads in < 2 seconds
- [ ] Organization directory loads in < 3 seconds
- [ ] Admin dashboard loads in < 3 seconds

### Test 52.2: Image Loading
- [ ] Images lazy-load below the fold (check Network tab)
- [ ] No broken image links (no 404s for images)
- [ ] Images use Next.js `<Image>` component (proper sizing, WebP)

### Test 52.3: Layout Stability
- [ ] No visible layout shifts as page loads (CLS)
- [ ] Text doesn't jump when fonts load
- [ ] Images don't cause content to shift (have reserved dimensions)

**Result:** PASS / FAIL
**Notes:** _________________________________

---

# SUMMARY

| # | Section | Tests | Pass | Fail | Notes |
|---|---------|-------|------|------|-------|
| 1 | Landing Page | 1.1-1.3 | | | |
| 2 | Static Public Pages | 2.1-2.5 | | | |
| 3 | Pricing Page | 3.1-3.2 | | | |
| 4 | For Employers Page | 4.1 | | | |
| 5 | Registration Flows | 5.1-5.3 | | | |
| 6 | Login & Password Reset | 6.1-6.4 | | | |
| 7 | Desktop Navigation | 7.1-7.3 | | | |
| 8 | Mobile Navigation | 8.1-8.2 | | | |
| 9 | Discover Feed | 9.1-9.3 | | | |
| 10 | Global Search | 10.1-10.3 | | | |
| 11 | Map View | 11.1 | | | |
| 12 | Careers Hub | 12.1-12.4 | | | |
| 13 | Training Programs | 13.1-13.2 | | | |
| 14 | Education Hub | 14.1-14.5 | | | |
| 15 | Conferences | 15.1-15.2 | | | |
| 16 | Community Hub | 16.1-16.3 | | | |
| 17 | Organizations Directory | 17.1-17.3 | | | |
| 18 | Members Directory | 18.1-18.3 | | | |
| 19 | Business / Shop Indigenous | 19.1-19.3 | | | |
| 20 | Live Streams | 20.1-20.2 | | | |
| 21 | Social / Posts | 21.1-21.3 | | | |
| 22 | Member Profile | 22.1-22.3 | | | |
| 23 | Member Applications & Alerts | 23.1-23.2 | | | |
| 24 | Member Messaging | 24.1 | | | |
| 25 | Member Settings | 25.1-25.5 | | | |
| 26 | Notifications | 26.1 | | | |
| 27 | Organization Overview | 27.1-27.3 | | | |
| 28 | Job Management | 28.1-28.5 | | | |
| 29 | Training Programs (Employer) | 29.1-29.3 | | | |
| 30 | Conferences (Employer) | 30.1-30.3 | | | |
| 31 | Pow Wows (Employer) | 31.1 | | | |
| 32 | Funding & Grants | 32.1 | | | |
| 33 | Services (Employer) | 33.1 | | | |
| 34 | Shop Indigenous (Employer) | 34.1-34.2 | | | |
| 35 | Team Management | 35.1-35.3 | | | |
| 36 | Talent Pool | 36.1 | | | |
| 37 | Subscription & Billing | 37.1-37.2 | | | |
| 38 | Stripe Checkout Flows | 38.1-38.5 | | | |
| 39 | Admin Dashboard | 39.1-39.5 | | | |
| 40 | Admin Content Management | 40.1-40.9 | | | |
| 41 | Admin User Management | 41.1-41.3 | | | |
| 42 | Admin Moderation | 42.1-42.3 | | | |
| 43 | Admin Tools & Utilities | 43.1-43.6 | | | |
| 44 | Email System | 44.1-44.3 | | | |
| 45 | Mobile Responsiveness | 45.1-45.3 | | | |
| 46 | Tablet Responsiveness | 46.1 | | | |
| 47 | Desktop Responsiveness | 47.1 | | | |
| 48 | Keyboard Navigation | 48.1 | | | |
| 49 | Screen Reader & Semantic HTML | 49.1 | | | |
| 50 | Theme & Color | 50.1 | | | |
| 51 | Error Handling | 51.1-51.5 | | | |
| 52 | Performance | 52.1-52.3 | | | |

---

**Overall Result:** PASS / FAIL

**Critical Issues Found:**
1. _________________________________
2. _________________________________
3. _________________________________

**Non-Critical Issues Found:**
1. _________________________________
2. _________________________________
3. _________________________________

**Tested By:** _______________
**Date/Time:** _______________
**Environment:** Production / Staging / Local
**Browser:** _______________
**Device:** _______________
