# IOPPS Redesign Master Plan
## From Dashboards to Profile-First (Facebook/LinkedIn Style)

---

## The Vision

Kill every "dashboard." Users don't manage their life from an admin panel - they live on their profile and interact with a social feed. Just like Facebook and LinkedIn:

- **Your profile IS your control center** - click to edit your photo, bio, experience, resume
- **Organizations are Pages** - like a Facebook Page, the org manages everything from their public-facing profile
- **The feed is home** - scroll, discover, post, share, apply
- **No more hidden admin tabs** - everything is visible, social, and front-facing

---

## Current State (What We're Replacing)

### Member Dashboard (`/member/dashboard`) - 5,332 lines across 12 tabs
| Tab | Lines | What It Does |
|-----|-------|-------------|
| ProfileTab | 1,607 | Full profile editor (photo, bio, experience, education, portfolio, resume, skills, privacy) |
| SettingsTab | 488 | Email preferences, notifications, data export, account deletion |
| ApplicationsTab | 483 | Job applications list with status tracking |
| MessagesTab | 435 | Direct messaging inbox |
| AnalyticsTab | 427 | Profile views, who viewed you, engagement stats |
| TrainingTab | 346 | Training programs enrolled/completed |
| JobAlertsTab | 337 | Saved job search alerts |
| OverviewTab | 301 | Dashboard home with stats cards |
| SavedScholarshipsTab | 245 | Saved scholarships list |
| SavedItemsTab | 221 | Saved jobs list |
| MemberProfileView | 179 | Read-only profile preview |
| page.tsx | 263 | Tab router + data fetching |

### Public Profile (`/member/[userId]`) - 413 lines
- Read-only view of member profile
- "Edit Profile" button links BACK to dashboard
- No inline editing capability
- Has: avatar, bio, experience, education, portfolio, skills, badges

### Organization Dashboard (`/organization/(dashboard)/`) - 27,621 lines across 80+ pages
| Area | Pages | Lines | What It Does |
|------|-------|-------|-------------|
| Dashboard home | 1 | 710 | KPIs, activity feed, quick actions |
| Analytics | 1 | 462 | Charts, engagement metrics |
| Billing | 1 | 466 | Payment history, subscription management |
| Settings | 1 | 471 | Organization settings |
| Team | 1 | 388 | Team member management |
| Inbox | 1 | ~300 | Unified inbox |
| Hire module | 6 | ~2,000 | Jobs list, post job, applications, interviews, talent pool |
| Educate module | 4 | ~1,500 | School profile, programs, scholarships, inquiries |
| Sell module | 4 | ~1,200 | Vendor profile, offerings, inquiries |
| Host module | 2 | ~800 | Events, conferences |
| Funding module | 1 | ~400 | Grant opportunities |
| Legacy org pages | 60+ | ~18,000 | Jobs CRUD, training CRUD, events CRUD, scholarships CRUD, etc. |

### Organization Public Profile (`/organizations/[slug]`) - ~2,200 lines
- Already has tabs (overview, jobs, programs, offerings, events, funding)
- Already has `canEdit` flag and some inline editing (intro video)
- Already uses FeedLayout
- **This is our best starting point** - it's 70% of the way there

---

## The Transformation: 8 Phases

---

### PHASE 1: Member Profile Becomes the Hub
**Goal:** `/member/[userId]` becomes the single place members view AND edit their profile
**Effort:** Large | **Risk:** Medium | **Dependencies:** None

#### What Changes:
1. **Merge PublicProfileView + ProfileTab** into a unified `MemberProfile` component
   - When `isOwnProfile = true`: show pencil icons on each section
   - Clicking pencil opens an inline editor or modal for that section
   - Same beautiful public view, but owner can edit in-place

2. **Profile Sections (all inline-editable for owner):**
   - **Header:** Banner image, avatar (click to upload), name, tagline, location, affiliation, availability badge
   - **About:** Bio text (click to edit, auto-save)
   - **Experience:** Timeline cards with + button and edit/delete per item (reuse ExperienceModal from ProfileTab)
   - **Education:** Same pattern as experience (reuse EducationModal)
   - **Skills:** Tag chips with + button (reuse skill input from ProfileTab)
   - **Portfolio:** Grid cards with + button (reuse PortfolioModal)
   - **Resume:** Upload/replace/download button
   - **Endorsements:** Read-only display

3. **Profile Tabs (below the fold):**
   - **Activity** - Posts, shares, comments (from social.ts)
   - **Applications** - Job application tracker (from ApplicationsTab, 483 lines)
   - **Saved** - Saved jobs + scholarships (from SavedItemsTab + SavedScholarshipsTab, 466 lines)
   - **Alerts** - Job search alerts (from JobAlertsTab, 337 lines)

4. **Profile Action Bar (for own profile):**
   - "Share Profile" button
   - "Preview as Visitor" toggle
   - Settings gear icon (opens settings drawer/modal)

#### New Components to Create:
- `InlineEditField` - Click-to-edit text field with save/cancel
- `InlineEditTextArea` - Click-to-edit textarea
- `ImageUploader` - Click avatar/banner to upload
- `SectionEditWrapper` - Wraps any section with pencil icon + edit mode toggle
- `ProfileTabBar` - Tab navigation for profile sub-sections
- `ActivityFeed` - User's activity timeline
- `SettingsDrawer` - Slide-out panel for settings (replaces SettingsTab)

#### Files to Modify:
- `web/app/member/[userId]/PublicProfileView.tsx` - REWRITE as `MemberProfile.tsx`
- `web/app/member/[userId]/page.tsx` - Keep server component, pass `isOwner` flag

#### Files to Extract From:
- `web/app/member/dashboard/ProfileTab.tsx` (1,607 lines) - Extract modals, upload logic, form state
- `web/app/member/dashboard/ApplicationsTab.tsx` (483 lines) - Move to profile tab
- `web/app/member/dashboard/SavedItemsTab.tsx` (221 lines) - Move to profile tab
- `web/app/member/dashboard/SavedScholarshipsTab.tsx` (245 lines) - Move to profile tab
- `web/app/member/dashboard/JobAlertsTab.tsx` (337 lines) - Move to profile tab

#### Files to Eventually Retire:
- `web/app/member/dashboard/page.tsx` (redirect to profile)
- `web/app/member/dashboard/OverviewTab.tsx`
- `web/app/member/dashboard/MemberProfileView.tsx`
- `web/components/member/dashboard/MemberDashboardLayout.tsx`
- `web/components/member/dashboard/MemberSidebar.tsx`
- `web/components/member/dashboard/MemberMobileNav.tsx`

---

### PHASE 2: Organization Profile Becomes the Page
**Goal:** `/organizations/[slug]` becomes where orgs manage everything (like a Facebook Page)
**Effort:** Large | **Risk:** Medium | **Dependencies:** Phase 1 patterns

#### What Changes:
1. **Enhance OrganizationProfileClient** (already 70% there):
   - Add inline editing for all sections (company name, description, logo, banner, contact info)
   - Add "Manage" mode toggle (like Facebook Page's "Switch to Professional Mode")
   - When in manage mode, show admin-only tabs: Applications, Analytics, Billing, Team, Settings

2. **Organization Tabs (public + admin):**

   **Public Tabs (visible to everyone):**
   - **Overview** - About, team, social links, intro video (EXISTING)
   - **Jobs** - Active job postings with "Post Job" button for admins (EXISTING, enhance)
   - **Programs** - Training programs (EXISTING)
   - **Scholarships** - Available scholarships
   - **Events** - Upcoming events + conferences
   - **Shop** - Products & services (EXISTING as "Offerings")
   - **Funding** - Grant opportunities (EXISTING)

   **Admin Tabs (visible to owner/team only):**
   - **Applications** - Incoming job applications inbox
   - **Analytics** - Views, engagement, applicant stats
   - **Billing** - Subscription, payments, credits
   - **Team** - Team member management
   - **Settings** - Organization settings

3. **Inline Content Creation:**
   - "Post a Job" button directly on Jobs tab (opens modal or slide-out form)
   - "Add Event" button on Events tab
   - "Add Scholarship" button on Scholarships tab
   - "Add Product" button on Shop tab
   - Edit/delete buttons on each content card (for admins)

#### Files to Modify:
- `web/app/organizations/[slug]/OrganizationProfileClient.tsx` - Add admin tabs + inline editing
- `web/app/organizations/[slug]/page.tsx` - Keep server component

#### Files to Extract From:
- `web/app/organization/(dashboard)/page.tsx` (710 lines) - Overview stats → profile analytics tab
- `web/app/organization/(dashboard)/analytics/page.tsx` (462 lines) - → Analytics tab
- `web/app/organization/(dashboard)/billing/page.tsx` (466 lines) - → Billing tab
- `web/app/organization/(dashboard)/team/page.tsx` (388 lines) - → Team tab
- `web/app/organization/(dashboard)/settings/page.tsx` (471 lines) - → Settings drawer
- `web/app/organization/(dashboard)/hire/applications/page.tsx` - → Applications tab
- `web/app/organization/(dashboard)/inbox/page.tsx` - → Messages integration

#### Files to Eventually Retire:
- `web/app/organization/(dashboard)/page.tsx`
- `web/app/organization/(dashboard)/layout.tsx`
- `web/components/organization/OrganizationShell.tsx`
- All pages under `web/app/organization/(dashboard)/`

---

### PHASE 3: Navigation Overhaul
**Goal:** Remove all dashboard links, make navigation social-platform-style
**Effort:** Medium | **Risk:** Low | **Dependencies:** Phases 1-2

#### New Navigation Structure:

**Top Bar (Desktop):**
```
[IOPPS Logo]  [Search Bar........................]  [Home] [Network] [Jobs] [Education] [Events]  [Messages] [Notifications] [Avatar▼]
```

**Avatar Dropdown:**
```
[Your Name]
[Your tagline]
─────────────
View Profile
Settings & Privacy
Billing (if org)
─────────────
Help
Sign Out
```

**Mobile Bottom Nav:**
```
[Home]  [Search]  [+Post]  [Messages]  [Profile]
```

#### What Changes:
1. **Update `navigation.ts`** - Replace all `/member/dashboard` and `/organization/dashboard` URLs
2. **Update `FeedLayout.tsx`** - New top nav, remove dashboard links from left sidebar
3. **Add notification bell** with real-time badge count
4. **Add global search** in top bar (existing `/search` page, but exposed in nav)
5. **Profile avatar in nav** links to your profile, not a dashboard
6. **"+" button on mobile** opens post creation modal

#### Files to Modify:
- `web/lib/constants/navigation.ts` - Complete rewrite of nav items
- `web/components/opportunity-graph/FeedLayout.tsx` - New top bar, updated mobile nav
- `web/components/auth/AuthProvider.tsx` - May need user profile context for nav avatar

---

### PHASE 4: Messaging & Notifications
**Goal:** LinkedIn-style messaging accessible from anywhere, real-time notifications
**Effort:** Medium | **Risk:** Low | **Dependencies:** Phase 3

#### What Changes:
1. **Global Message Drawer** - Click messages icon in nav → slide-out panel with conversations
   - Don't navigate to a separate page
   - Keep context while messaging (like LinkedIn)
   - Reuse existing `MessagesTab` logic but in a drawer component

2. **Notification Center** - Click bell icon → dropdown with notifications
   - Job application status updates
   - New messages
   - Connection requests
   - Mentions/comments
   - Job matches

3. **Real-time Updates** - Use Firestore onSnapshot for:
   - Unread message count in nav badge
   - Unread notification count in nav badge
   - New messages in open conversations

#### New Components:
- `MessageDrawer` - Global slide-out messaging panel
- `NotificationDropdown` - Notification bell dropdown
- `NotificationItem` - Individual notification card
- `UnreadBadge` - Real-time count badge

#### Files to Extract From:
- `web/app/member/dashboard/MessagesTab.tsx` (435 lines) - Messaging logic
- `web/components/messaging/*` (6 files) - Existing messaging components

---

### PHASE 5: Social Feed Enhancement
**Goal:** Make the feed the heart of the platform (like Facebook News Feed)
**Effort:** Medium | **Risk:** Low | **Dependencies:** Phases 1-3

#### What Changes:
1. **Post Creation from Anywhere:**
   - "What's on your mind?" input at top of feed (like Facebook)
   - Post types: Text, Job share, Event share, Achievement, Article
   - Attach images

2. **Rich Feed Cards:**
   - Job posting shared → shows job card preview with "Apply" button
   - Event shared → shows event card with "RSVP" button
   - Achievement → celebration card (got a job, completed training, etc.)
   - Article → link preview card

3. **Feed Algorithms:**
   - Show content from connections first
   - Show content matching user's interests (skills, location)
   - Mix in sponsored/featured content

4. **Engagement:**
   - Like, Comment, Share on all feed items
   - Comment threads (already exists in social components)
   - Share to profile activity

#### Files to Modify:
- `web/components/opportunity-graph/OpportunityFeed.tsx` - Add post creation
- `web/components/social/*` (10 files) - Enhance engagement components

---

### PHASE 6: Content Creation Modals
**Goal:** Replace full-page forms with modals/drawers for creating content
**Effort:** Large | **Risk:** Medium | **Dependencies:** Phase 2

#### What Changes:
Instead of navigating to `/organization/jobs/new` (a full page), clicking "Post a Job" opens a modal/drawer right on the org profile. Same for events, scholarships, etc.

1. **Job Posting Modal** - Multi-step form (extract from `/organization/jobs/new/page.tsx`, 1,328 lines)
2. **Event Creation Modal** - (extract from `/organization/events/new/page.tsx`, 449 lines)
3. **Scholarship Modal** - (extract from `/organization/scholarships/new/page.tsx`, 505 lines)
4. **Product Modal** - (extract from `/organization/products/new/page.tsx`, 427 lines)
5. **Training Modal** - (extract from `/organization/training/new/page.tsx`, 933 lines)

#### Pattern:
Each form becomes a `SlideOutPanel` or `FullScreenModal` component that:
- Overlays the current page (don't navigate away)
- Has a multi-step wizard inside
- Saves to Firestore using existing functions
- Closes and refreshes the list on success

#### New Components:
- `SlideOutPanel` - Full-height side panel (like Gmail compose)
- `CreateJobPanel` - Job posting form in panel
- `CreateEventPanel` - Event form in panel
- `CreateScholarshipPanel` - Scholarship form in panel
- `CreateProductPanel` - Product form in panel

#### Files to Extract From:
- `web/app/organization/jobs/new/page.tsx` (1,328 lines)
- `web/app/organization/events/new/page.tsx` (449 lines)
- `web/app/organization/scholarships/new/page.tsx` (505 lines)
- `web/app/organization/products/new/page.tsx` (427 lines)
- `web/app/organization/training/new/page.tsx` (933 lines)
- `web/app/organization/funding/new/page.tsx` (585 lines)

---

### PHASE 7: Cleanup & Redirects
**Goal:** Remove old dashboard pages, add redirects for bookmarks/links
**Effort:** Small | **Risk:** Low | **Dependencies:** Phases 1-6

#### What Changes:
1. **Add redirects:**
   - `/member/dashboard` → `/member/[userId]` (user's own profile)
   - `/member/dashboard?tab=profile` → `/member/[userId]`
   - `/member/dashboard?tab=applications` → `/member/[userId]?tab=applications`
   - `/member/dashboard?tab=messages` → open message drawer
   - `/organization/dashboard` → `/organizations/[slug]`
   - All `/organization/(dashboard)/*` → corresponding tab on org profile

2. **Delete old files** (after redirects are confirmed working):
   - All member dashboard tab files (12 files, 5,332 lines)
   - Member dashboard components (3 files)
   - Organization dashboard pages (24 files)
   - Organization dashboard components (OrganizationShell, etc.)

3. **Update all internal links** across the codebase:
   - `grep -r "/member/dashboard" --include="*.tsx"` → update all references
   - `grep -r "/organization/dashboard" --include="*.tsx"` → update all references
   - `grep -r "/organization/(dashboard)" --include="*.tsx"` → update all references

---

### PHASE 8: Polish & Mobile
**Goal:** Make everything beautiful and mobile-perfect
**Effort:** Medium | **Risk:** Low | **Dependencies:** All phases

#### What Changes:
1. **Mobile profile experience:**
   - Full-width banner + avatar on mobile
   - Swipeable tabs
   - Bottom sheet for editing (instead of modals)
   - Pull-to-refresh

2. **Animations & Transitions:**
   - Smooth tab transitions
   - Edit mode animations (section expand/collapse)
   - Save confirmations (success toast with animation)
   - Skeleton loading for profile sections

3. **Accessibility:**
   - Keyboard navigation for all edit actions
   - Screen reader labels
   - Focus management in modals

4. **Performance:**
   - Lazy load profile tabs
   - Image optimization for avatars/banners
   - Optimistic updates on save

---

## Data Model Changes

### No Schema Changes Needed For:
- Member profiles (MemberProfile type already has everything)
- Organization profiles (OrganizationProfile already comprehensive)
- All content types (jobs, events, scholarships - unchanged)
- Social features (posts, comments, likes - unchanged)

### New Fields to Add:
```typescript
// MemberProfile additions
interface MemberProfile {
  // ... existing fields ...
  bannerImageUrl?: string;        // Profile banner (like LinkedIn)
  profileTheme?: string;          // Optional theme color
  featuredContent?: string[];     // Pinned post/content IDs
}

// OrganizationProfile additions
interface OrganizationProfile {
  // ... existing fields ...
  bannerImageUrl?: string;        // Already may exist
  featuredJobIds?: string[];      // Pinned jobs at top
  announcementText?: string;      // Banner announcement
}
```

### New Collections:
```
notifications/{notificationId}
  - userId: string
  - type: 'application_update' | 'new_message' | 'connection_request' | 'mention' | 'job_match'
  - title: string
  - body: string
  - link: string
  - read: boolean
  - createdAt: Timestamp
```

---

## What We're NOT Changing

- **Admin panel** (`/admin/*`) - Stays as-is, it's for platform admins, not users
- **API routes** - All 109 endpoints stay the same, we're changing the frontend only
- **Firestore operations** - All 47 modules stay the same, we call the same functions
- **Auth system** - Firebase Auth unchanged
- **Payments** - Stripe integration unchanged
- **Content detail pages** - `/careers/[jobId]`, `/community/[powwowId]`, etc. stay as-is
- **Section feed pages** - `/careers`, `/education`, `/community` stay as FeedLayout pages
- **Public listing pages** - `/members`, `/organizations`, `/business/directory` stay as-is

---

## Lines of Code Impact

### Lines to REWRITE (merge into profile):
- Member: ~5,300 lines (dashboard tabs) → ~2,500 lines (profile components)
- Organization: ~5,000 lines (dashboard) → ~3,000 lines (profile tabs)

### Lines to CREATE:
- Shared components: ~1,500 lines (InlineEditor, ImageUploader, SlideOutPanel, etc.)
- Navigation: ~500 lines
- Messaging drawer: ~400 lines
- Notifications: ~600 lines

### Lines to DELETE (after migration):
- Member dashboard: ~5,300 lines
- Organization dashboard: ~5,000 lines
- Dashboard components: ~1,000 lines

### Net Result: Reduce by ~4,000-6,000 lines while adding major new UX

---

## Risk Mitigation

1. **Keep old routes as redirects** during transition - no broken bookmarks
2. **Phase by phase** - each phase is deployable independently
3. **Extract, don't rewrite** - pull logic from dashboard tabs into new components
4. **Same Firestore functions** - backend doesn't change, reducing risk
5. **Feature flags** - can toggle between old dashboard and new profile during rollout

---

## Success Criteria

After all 8 phases:
- [ ] Member can edit their entire profile from `/member/[userId]` without ever seeing a "dashboard"
- [ ] Organization can manage everything from `/organizations/[slug]`
- [ ] No page on the site has "dashboard" in its URL (except admin)
- [ ] Messages accessible from any page via drawer
- [ ] Notifications accessible from any page via dropdown
- [ ] Feed has post creation
- [ ] Mobile experience is on par with desktop
- [ ] Zero broken links (all old URLs redirect)
