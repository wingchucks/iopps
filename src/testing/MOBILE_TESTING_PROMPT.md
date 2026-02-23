# IOPPS Mobile QA — Community Member Full Test (v2)

You are a QA tester. Your job is to systematically test every page, button, link, form, and interactive element on the IOPPS mobile website (**iopps.ca**) as a **community member**. Start unauthenticated, test the auth flow, then test everything else while logged in.

**Test EVERYTHING. Click EVERYTHING. Submit forms for real. Document every bug you find.**

---

## RULES

1. **Viewport**: Set your browser to iPhone 14 Pro dimensions (393 x 852). Keep it in portrait mode unless the section says otherwise.
2. **Start unauthenticated**: Begin from the landing page. Sections 0–3 test auth flows. After Section 3, you will be logged in for the rest.
3. **Actually submit**: When you encounter forms (posts, applications, RSVPs, messages, profile edits), fill them out and submit for real. Use obvious test data prefixed with `[QA TEST]` so it can be identified and cleaned up later.
4. **Screenshot every page**: Take a screenshot of every page you visit. Note layout issues.
5. **Log every bug** using this format:

```
BUG: [PAGE] /path — [SEVERITY] — Description
```

Severity levels:
- **Critical** — Feature is completely broken, crashes, or loses data
- **Major** — Feature partially works but key functionality is missing or wrong
- **Minor** — Feature works but has noticeable UX issues
- **Cosmetic** — Visual-only issue (alignment, spacing, color, typo)

6. **Log every success** briefly:
```
OK: [PAGE] /path — Description of what worked
```

7. After all sections, produce a **Summary Table**.

---

## SECTION 0: SETUP & BASELINE

1. Navigate to `https://iopps.ca`
2. Open DevTools and set device to iPhone 14 Pro (393 x 852) or equivalent mobile viewport
3. Reload the page
4. Verify:
   - [ ] Hamburger menu icon (three lines) is visible in the top navigation
   - [ ] No desktop sidebar rail is visible on the left side
   - [ ] No horizontal scrollbar appears
   - [ ] Page content fills the viewport width without overflow
   - [ ] Text is readable without zooming (minimum ~14px effective font size)
5. Take a screenshot — this is your baseline

---

## SECTION 1: LANDING PAGE (Unauthenticated)

Navigate to `https://iopps.ca` (the root URL). You should NOT be logged in.

### Hero & Navigation:
- [ ] Hero section renders with IOPPS branding and tagline
- [ ] Top nav links are visible: **Jobs, Events, Partners, Schools, Stories, Shop, Pricing**
- [ ] "Sign Up" CTA button — tap it, verify it navigates to `/signup`, then go back
- [ ] "Log In" CTA button — tap it, verify it navigates to `/login`, then go back

### "What's on IOPPS" category tiles:
Tap each tile and verify navigation, then go back each time:
- [ ] **Jobs** → `/jobs`
- [ ] **Events** → `/events`
- [ ] **Scholarships** → `/scholarships`
- [ ] **Shop** → `/shop`
- [ ] **Schools** → `/schools`
- [ ] **Spotlight** → `/stories` or `/spotlight`

### Partner strip:
- [ ] Featured partner logos are visible: **SIGA, STC, Westland, Saskatchewan Polytechnic, First Nations University**
- [ ] Logos render without broken images
- [ ] Scroll/swipe through if it's a carousel — tap a partner

### Stats strip:
- [ ] Stats render with real numbers (not dashes, NaN, or 0):
  - 756 members
  - 111 jobs
  - 25 events
  - 3 organizations

### Footer:
- [ ] "About" link → `/about`
- [ ] "Privacy" link → `/privacy`
- [ ] "Terms" link → `/terms`
- [ ] "Contact" link → `/contact`
- [ ] Email `info@iopps.ca` is displayed and not broken

### Other:
- [ ] Theme toggle button — tap it, verify dark/light mode switch, tap again to switch back
- [ ] If a PWA "Install App" prompt appears, tap "Not now" to dismiss. Verify it disappears and doesn't block content.

---

## SECTION 2: AUTHENTICATION — SIGNUP

Navigate to `https://iopps.ca/signup`.

### Layout:
- [ ] Split layout renders — branding panel (gradient) on top/left, form panel on right/below
- [ ] IOPPS logo and tagline visible in branding panel
- [ ] No horizontal overflow

### Google OAuth:
- [ ] Google Sign-In button is visible and tappable (don't actually sign in with Google)

### Form fields:
- [ ] **Full Name** input is present
- [ ] **Email** input is present
- [ ] **Password** input is present with show/hide toggle
- [ ] **Confirm Password** input is present with show/hide toggle

### Validation:
- [ ] Submit with all fields empty — validation errors appear for each required field
- [ ] Enter mismatched passwords — "Passwords must match" error shows
- [ ] Enter password under 8 characters — min-length error shows
- [ ] Show/hide toggle works on both password fields

### Links:
- [ ] "Already have an account?" link navigates to `/login`
- [ ] **⚠️ KNOWN BUG CHECK**: Is there a Privacy Policy link? Does it go to `/privacy` or `/terms`? (Should be `/privacy`)

---

## SECTION 3: AUTHENTICATION — LOGIN

Navigate to `https://iopps.ca/login`.

### Layout:
- [ ] Same split layout as signup (branding panel + form panel)

### Google OAuth:
- [ ] Google Sign-In button visible and tappable

### Form fields:
- [ ] **Email** input present
- [ ] **Password** input present with show/hide toggle

### Validation:
- [ ] Submit with empty fields — validation errors appear
- [ ] Enter wrong credentials — "Invalid email or password" error shows

### Links:
- [ ] "Forgot password?" link navigates to `/forgot-password`
- [ ] "Create an account" link navigates to `/signup`

### Login and proceed:
- [ ] **Log in with valid credentials** (use your test account)
- [ ] Verify redirect — should go to `/feed` (or `/setup` if first-time user)

---

## SECTION 3B: FORGOT PASSWORD

Navigate to `https://iopps.ca/forgot-password`.

- [ ] Email input field is present
- [ ] Enter a valid email and submit — success confirmation message appears
- [ ] "Back to login" link navigates to `/login`

---

## SECTION 3C: SETUP WIZARD (First-Time Users)

Navigate to `https://iopps.ca/setup`. (Skip if you've already completed setup — the app redirects away.)

### Step 1 — Profile:
- [ ] Progress indicator shows step 1 of 5
- [ ] Avatar upload area — tap to open file picker
- [ ] **Community** dropdown/input is present
- [ ] **Location** input is present
- [ ] "Next" button advances to step 2
- [ ] "Skip" button is available

### Step 2 — Identity & Heritage:
- [ ] **Nation/People** field (optional)
- [ ] **Territory/Homeland** field (optional)
- [ ] **Languages** field (optional)
- [ ] All fields are clearly marked as optional

### Step 3 — About You:
- [ ] **Headline** input (max 80 characters) — verify character limit
- [ ] **Bio** textarea
- [ ] **Skills** input (add/remove pills)

### Step 4 — Interests:
- [ ] 2-column grid of interest categories shown
- [ ] Tap to toggle selections on/off
- [ ] Visual feedback on selected items

### Step 5 — Completion:
- [ ] Profile preview card shows all entered data
- [ ] "Go to Feed" button navigates to `/feed`

---

## SECTION 4: MOBILE NAVIGATION

(You should now be logged in)

### Hamburger menu:
1. [ ] Tap the hamburger menu icon (☰)
2. [ ] Verify the dropdown menu opens with smooth animation
3. [ ] Verify the menu contains these links — tap each one, verify the page loads, then come back and reopen the menu:

| Link | Expected URL | Result |
|------|-------------|--------|
| Home | `/feed` | |
| Search | `/search` | |
| Partners | `/partners` | |
| Schools | `/schools` | |
| Stories | `/stories` | |
| Members | `/members` | |
| Training | `/training` | |
| Mentorship | `/mentorship` | |
| Shop | `/shop` | |
| Live | `/livestreams` | |

4. [ ] **Saved** link/bookmark icon → `/saved`
5. [ ] **Settings** gear icon → `/settings`
6. [ ] Tap your **avatar** → `/profile`
7. [ ] **Theme toggle** (☀️/🌙) is present in the menu — tap it
8. [ ] **Sign Out** button is present
9. [ ] Menu **closes automatically** after tapping a link
10. [ ] Open menu again — tap the ✕ close button or tap outside — menu closes

### **⚠️ KNOWN BUG CHECK**:
- [ ] Do any links point to `/signin` instead of `/login`? (Should be `/login`)

### NavBar behavior:
- [ ] Scroll down on any page — navbar stays sticky at top
- [ ] **Notification bell** icon is visible and tappable
- [ ] **Messages/chat** icon is visible and tappable

---

## SECTION 5: FEED (/feed)

Navigate to `https://iopps.ca/feed`.

### Layout:
- [ ] Welcome greeting appears with your name
- [ ] Feed cards render with content
- [ ] No desktop sidebars visible (left/right sidebars hidden on mobile)

### Profile completeness (if profile incomplete):
- [ ] Profile completeness banner/widget is visible
- [ ] Shows a checklist and progress bar
- [ ] Can be dismissed (✕ button)

### Onboarding tour:
- [ ] Does the onboarding tour auto-start for new users? (tooltip highlights)
- [ ] Can the tour be dismissed?

### Tab navigation:
Tap each tab and verify content filters:
- [ ] **All** — shows mixed content
- [ ] **Jobs** — shows only job posts
- [ ] **Events** — shows only event posts
- [ ] **Scholarships** — shows only scholarship posts
- [ ] **Businesses** — shows only business/vendor posts
- [ ] **Schools** — shows only school posts
- [ ] **Stories** — shows only story posts

### LIVE banner:
- [ ] If a red LIVE banner appears, does it link to `/livestreams`?

### "Hiring Now" carousel:
- [ ] If visible, can you scroll it horizontally?
- [ ] Tap a card — does it navigate to the job detail?

### Feed card types (verify each renders correctly):
- [ ] **Job cards**: org avatar (initials on gradient), title, org name (teal), location icon + text, employment type badge, salary, posted date
- [ ] **Featured job cards**: gold border/star distinguishing them
- [ ] **Event cards**: date, location, event type
- [ ] **Scholarship cards**: amount badge, deadline
- [ ] **Story cards**: author, community, quote/preview
- [ ] **Vendor/Business cards**: category badge

### Create a post:
1. [ ] Tap the Create (+) button in the navigation
2. [ ] Verify the **CreateChooserModal** opens with options
3. [ ] Tap **"Share a Story"** (available to community members)
4. [ ] Verify the **CreatePostModal** opens with:
   - Your avatar and name at the top
   - A title input field
   - A content textarea
   - A Photo button
   - A "Share Post" button
5. [ ] Type title: `[QA TEST] Mobile Testing Post`
6. [ ] Type content: `This is a QA test post created during mobile testing. Please delete after review.`
7. [ ] Tap **Photo** button — file picker opens. Select a test image (or skip).
8. [ ] If uploaded, verify preview appears. Test the "remove image" button.
9. [ ] Tap **"Share Post"** — modal closes, success toast appears
10. [ ] Scroll through feed — verify your new post appears

### Feed card interactions:
- [ ] Tap a job card → navigates to `/jobs/[slug]` → go back
- [ ] Tap an event card → navigates to `/events/[slug]` → go back
- [ ] Tap a story card → navigates to detail page → go back

### Scroll behavior:
- [ ] Scroll down — more content loads (infinite scroll or Load More)
- [ ] Scroll back to top — smooth scrolling, no jank

---

## SECTION 6: PROFILE (/profile)

Navigate to `https://iopps.ca/profile`.

### Hero header:
- [ ] Gradient background renders (navy-teal-gold gradient)
- [ ] Avatar displayed with correct photo or initials fallback

### View mode:
- [ ] Display name, email, headline visible
- [ ] Role badge visible (e.g., "Community Member")
- [ ] Community badge visible
- [ ] **About** section (bio or placeholder text)
- [ ] **Details card**: location, community, email, nation, territory, languages, skills
- [ ] **Interests**: tag pills displayed
- [ ] **Connections**: follower count (tap → follower list), following count (tap → following list)
- [ ] **Activity**: applications count, saved items count, events count
- [ ] **Application cards** with status badges:
  - Blue = Submitted
  - Gold = Reviewing
  - Teal = Shortlisted
  - Purple = Interview
  - Green = Offered
  - Red = Rejected
  - Gray = Withdrawn
- [ ] **Open to Work** banner visible (if enabled)
- [ ] **Quick Links**: Resume, Career Preferences — tap each to verify navigation

### Edit mode:
1. [ ] Tap **Edit** button — page switches to edit mode
2. [ ] **Basics** accordion:
   - [ ] Expand — Community and Location fields present
   - [ ] Change location to `[QA TEST] Test Location`
   - [ ] Save — success toast
3. [ ] **Identity & Heritage** accordion:
   - [ ] Expand — Nation, Territory, Languages fields present
   - [ ] Edit a field, save
4. [ ] **About You** accordion:
   - [ ] Expand — Headline (max 80 chars), Bio, Skills fields present
   - [ ] Headline: verify character limit enforced
   - [ ] Change headline to `[QA TEST] QA Tester Headline`
   - [ ] Add or remove a skill pill
   - [ ] Save — success toast
5. [ ] **Interests** accordion:
   - [ ] Expand — grid of selectable interest categories
   - [ ] Toggle several on/off
   - [ ] Save
6. [ ] **Verify persistence**: Reload page — confirm edits are saved
7. [ ] **Photo upload**: Tap avatar → file picker opens → upload test image → preview updates
8. [ ] **"Open to Work"** toggle — flip on/off, verify it persists
9. [ ] Tap **Cancel** — reverts unsaved changes

### Resume:
- [ ] Navigate to `/profile/resume`
- [ ] Upload page loads
- [ ] Test upload functionality
- [ ] Go back to profile

---

## SECTION 7: JOBS (/jobs)

Navigate to `https://iopps.ca/jobs`.

### Hero:
- [ ] **Blue gradient** hero renders correctly with "Find your next opportunity..." text

### Search & Filters:
- [ ] Search bar is functional — type a keyword (e.g., "manager"), results filter
- [ ] **Location** text input — type a location, results filter
- [ ] **Employment Type** dropdown — options: Full-time, Part-time, Contract, Temporary, Internship — select one, results filter
- [ ] **Salary Range** — Min $ and Max $ inputs — enter values, results update
- [ ] **Remote** toggle — flip on, results filter to remote-only
- [ ] Results count updates ("X jobs found")
- [ ] Clear all filters — full listing returns

### Job cards:
Each card should show:
- [ ] Org avatar (initials on colored gradient)
- [ ] Job title (max 2 lines, truncated if longer)
- [ ] Organization name (teal colored)
- [ ] Location icon + text
- [ ] Employment type badge
- [ ] Salary + posted date
- [ ] **Featured badge** (gold star) if applicable
- [ ] **"Closing Soon"** badge if deadline within 7 days

### Empty state:
- [ ] Search for gibberish (e.g., `xyzzy12345`) — "No jobs found" message appears

### Job detail:
- [ ] Tap any job card → `/jobs/[slug]` loads
- [ ] "← Back to Jobs" link present and works
- [ ] Badges shown: Featured, Employment type, Indigenous Preference
- [ ] Job title (h1) and org info (avatar + name)
- [ ] Location, salary, closing date shown inline
- [ ] Content sections: About This Role, Requirements, Responsibilities (✓ checkmarks), Qualifications (• dots)
- [ ] Sidebar/bottom card: "Apply Now" (teal), "Save Job" (bookmark), job details (type, salary, location, deadline)

### Save a job:
- [ ] Tap "Save Job" bookmark → icon toggles, toast appears
- [ ] Tap again → unsaves

### Apply to a job:
1. [ ] Tap "Apply Now" → `/jobs/[slug]/apply` loads (or external link)
2. [ ] Fill out form fields with `[QA TEST]` prefix
3. [ ] Submit application
4. [ ] Success message/toast appears
5. [ ] If already applied, button shows green with checkmark

---

## SECTION 8: EVENTS (/events)

Navigate to `https://iopps.ca/events`.

### Hero:
- [ ] **Purple gradient** hero renders correctly with "Browse events & pow wows..." text

### Search & Filters:
- [ ] Search bar is functional
- [ ] **Date filter pills**: All Dates, This Week, This Month, Upcoming — tap each, results filter
- [ ] **Location** dropdown — select a location
- [ ] **Event Type** dropdown (includes "Pow Wow") — select a type

### Event cards:
Each card should show:
- [ ] Purple top accent bar
- [ ] **Date badge** (month + day on purple background)
- [ ] Event title (max 2 lines)
- [ ] Event type badge
- [ ] Location (with icon)
- [ ] Date range (with icon)
- [ ] Organizer (with icon)
- [ ] CTA: "RSVP - Free Event" or "View Details →"

### Event detail:
- [ ] Tap a card → `/events/[slug]` loads
- [ ] Title, date/time, location, description, organizer all render
- [ ] **RSVP** button — tap it, verify success (toast or button state change)
- [ ] Go back to events list

### Empty state:
- [ ] Search gibberish → appropriate empty message

---

## SECTION 9: SCHOLARSHIPS (/scholarships)

Navigate to `https://iopps.ca/scholarships`.

### Hero:
- [ ] **Gold gradient** hero renders correctly

### Search & Filters:
- [ ] Search bar is functional
- [ ] **Eligibility** dropdown — select an option
- [ ] **"Closing Soon"** toggle — gold highlight when active, filters to deadlines within 14 days

### Scholarship cards:
Each card should show:
- [ ] Gold top accent bar
- [ ] **Amount badge** (gold)
- [ ] **"Closing Soon"** badge if deadline within 14 days
- [ ] Title (max 2 lines)
- [ ] Organization name
- [ ] Eligibility snippet
- [ ] Deadline (calendar icon)
- [ ] Location (map icon)
- [ ] CTA: "Apply →"

### Scholarship detail:
- [ ] Tap a card → `/scholarships/[slug]` loads
- [ ] Details render: title, deadline, amount, eligibility, description, how to apply
- [ ] Test any Apply or Save buttons
- [ ] Go back to listings

---

## SECTION 10: TRAINING (/training)

Navigate to `https://iopps.ca/training`.

### Hero:
- [ ] **Teal gradient** hero renders correctly

### Search & Filters:
- [ ] Search bar in hero is functional
- [ ] **Category** dropdown: Technology, Business, Trades, Health, Culture
- [ ] **Format pills**: All, Online, In-Person, Hybrid — tap each

### Featured programs:
- [ ] When no filters active, featured programs have **gold border**

### Program cards:
Each card should show:
- [ ] Category-colored top bar
- [ ] Badges: Category, Format, Featured (if applicable)
- [ ] Title (max 2 lines)
- [ ] Instructor name
- [ ] Duration badge
- [ ] Enrollment count + Price (green if free, teal if paid)

### Program detail:
- [ ] Tap a card → `/training/[slug]` loads
- [ ] Details render: program name, institution, description, dates, requirements
- [ ] Go back to listings

---

## SECTION 11: SCHOOLS (/schools)

Navigate to `https://iopps.ca/schools`.

### Hero:
- [ ] **Teal gradient** hero renders with "Explore Indigenous-focused educational institutions..."

### Search & Filters:
- [ ] Search bar is functional
- [ ] Filter dropdown works

### School cards:
- [ ] Logo/avatar displayed
- [ ] School name
- [ ] Location
- [ ] Description
- [ ] Programs info

### School detail:
- [ ] Tap a card → `/schools/[slug]` loads
- [ ] Details render properly (org profile for type="school")
- [ ] Go back to directory

---

## SECTION 12: STORIES (/stories)

Navigate to `https://iopps.ca/stories`.

### Hero:
- [ ] **Teal/navy gradient** hero renders with "Celebrating Indigenous success and community voices"

### Tabs:
- [ ] **All** — shows all content
- [ ] **Stories** — filters to stories only
- [ ] **Spotlights** — filters to spotlights only

### Search:
- [ ] Search bar is functional

### Story cards:
- [ ] Author name
- [ ] Community tag
- [ ] Date
- [ ] Content preview/quote

### Story detail:
- [ ] Tap a card → `/stories/[slug]` loads
- [ ] Full content renders: title, author, date, body text, images
- [ ] Go back to stories list

---

## SECTION 13: SHOP (/shop)

Navigate to `https://iopps.ca/shop`.

### Tabs:
- [ ] **Products** — shows products
- [ ] **Services** — shows services
- [ ] **Vendors** — shows vendor listings

### Filters:
- [ ] **Categories**: Art, Food, Clothing, Jewelry, Services, Education — tap each
- [ ] **Location** filter
- [ ] **Price range** filter
- [ ] Search bar is functional

### Cards:
- [ ] Category badge
- [ ] Name, description, price
- [ ] Image loads (or placeholder)

### Detail:
- [ ] Tap a card → `/shop/[slug]` loads
- [ ] Business/product details render: name, description, products/services, contact
- [ ] Go back to listings

---

## SECTION 14: MEMBERS (/members)

Navigate to `https://iopps.ca/members`.

### Directory:
- [ ] Member list renders with names and avatars
- [ ] Search bar — search for a member by name, results filter

### Community filter pills:
- [ ] **All** — shows everyone
- [ ] **First Nations** — filters
- [ ] **Métis** — filters
- [ ] **Inuit** — filters
- [ ] **Non-Indigenous Ally** — filters

### Member cards:
- [ ] Avatar
- [ ] Name
- [ ] Headline
- [ ] Location

### Important checks:
- [ ] Your own profile card does NOT appear in the list
- [ ] **Load More** pagination works at the bottom

### Member profile:
- [ ] Tap a member → `/members/[uid]` loads
- [ ] Profile details render: name, avatar, headline, bio, community, skills, interests
- [ ] **Follow** button — tap it → changes to "Following"
- [ ] Tap again → shows "Unfollow" → tap → changes back to "Follow"
- [ ] **Followers** count — tap → `/members/[uid]/followers` loads with list
- [ ] **Following** count — tap → `/members/[uid]/following` loads with list
- [ ] Navigate to `/members/[uid]/endorsements` — page loads, endorsement cards render (if any)

---

## SECTION 15: MENTORSHIP (/mentorship)

Navigate to `https://iopps.ca/mentorship`.

### Filters:
- [ ] **Name search** — type a name, results filter
- [ ] **Expertise** dropdown: Technology, Business, Health, Education, Trades, Arts & Culture, Law, Finance
- [ ] **Availability** filter
- [ ] **Location** filter

### Mentor cards:
- [ ] Avatar
- [ ] Name
- [ ] Bio snippet
- [ ] Expertise tags
- [ ] **Availability badge**: Available (green), Limited (gold), Unavailable (gray)

### Request mentorship:
- [ ] Tap "Request Mentorship" on a mentor card → modal opens
- [ ] Modal has: **message** field, **goals** field, submit button
- [ ] Fill in with `[QA TEST]` prefix and submit
- [ ] Success feedback appears

### Become a mentor:
- [ ] Navigate to `/mentorship/become`
- [ ] "Become a Mentor" form loads
- [ ] Fill out with `[QA TEST]` prefix and submit
- [ ] Success feedback

### Requests:
- [ ] Navigate to `/mentorship/requests` — page loads

---

## SECTION 16: MESSAGES (/messages)

Navigate to `https://iopps.ca/messages`.

### Conversation list:
- [ ] Interface loads
- [ ] Conversation list renders (or empty state: "No conversations yet")
- [ ] Each conversation item shows: avatar, name (bold if unread), last message preview, time, unread dot

### Start new conversation:
- [ ] Tap "+ New" button → new chat modal opens
- [ ] Member search is functional — shows up to 10 matching members
- [ ] Tap a member → creates/opens conversation

### Chat view:
- [ ] Tap a conversation → chat view opens
- [ ] Messages displayed: own messages = right side / teal, other's messages = left side / card bg
- [ ] Timestamps shown on messages
- [ ] Type: `[QA TEST] Mobile QA test message — please ignore`
- [ ] Tap send → message appears immediately
- [ ] **Auto-scroll** to bottom works

### Mobile-specific:
- [ ] **Back arrow** present to return to conversation list
- [ ] Conversation list updates with new message preview

---

## SECTION 17: NOTIFICATIONS

### Bell dropdown (NavBar):
1. [ ] Tap the **notification bell** icon
2. [ ] Dropdown panel opens
3. [ ] **Unread count badge** on the bell icon
4. [ ] Notifications render with: type icon, title (bold), body, relative timestamp
5. [ ] Notification type icons:
   - 👋 Welcome
   - 💼 Job match
   - 📋 Application update
   - 🪶 Event reminder
   - 📝 New post
   - ⚙️ System
6. [ ] Unread notifications have a **blue dot**
7. [ ] Tap a notification → marks as read (visual change) + navigates to linked page
8. [ ] **"Mark All Read"** button works
9. [ ] **"View all"** link navigates to `/notifications`
10. [ ] Tap outside dropdown → closes

### Full notifications page (/notifications):
- [ ] Navigate to `/notifications`
- [ ] **Tabs**: All, Unread — tap each, content filters
- [ ] Notifications list renders with details
- [ ] Relative timestamps: "just now", "X minutes ago", "X hours ago", "X days ago"

---

## SECTION 18: SEARCH (/search)

Navigate to `https://iopps.ca/search?q=SIGA`.

### Search input:
- [ ] Search input pre-filled with query parameter ("SIGA")
- [ ] Results load

### Type filter:
Tap each and verify results change:
- [ ] **All**
- [ ] **Jobs**
- [ ] **Events**
- [ ] **Scholarships**
- [ ] **Programs**
- [ ] **Organizations**
- [ ] **Businesses**
- [ ] **Stories**

### Additional filters:
- [ ] **Salary range**: under $40K, $40-60K, $60-80K, $80-100K, $100K+
- [ ] **Date range**: 24h, 7d, 30d
- [ ] **Sort**: Relevance, Newest, A-Z

### Interactions:
- [ ] Filters update results dynamically
- [ ] Tap a result → navigates to correct detail page
- [ ] Search for gibberish → empty state message

---

## SECTION 19: SAVED ITEMS (/saved)

Navigate to `https://iopps.ca/saved`.

### Tabs:
- [ ] **All** — shows everything saved
- [ ] **Jobs** — filters to saved jobs
- [ ] **Events** — filters to saved events
- [ ] **Scholarships** — filters to saved scholarships
- [ ] **Other** — filters to other saved items

### Saved items:
- [ ] Each item shows: title, type badge (color-coded), unsave button
- [ ] **Type badge colors**: Job = blue, Event = purple, Scholarship = gold
- [ ] Items you bookmarked earlier appear in the list

### Interactions:
- [ ] Tap an item → navigates to detail page → go back
- [ ] Tap "Unsave" → item disappears, toast notification appears
- [ ] Empty state when no saved items (test by unsaving all, or switch to an empty tab)

---

## SECTION 20: APPLICATIONS (/applications)

Navigate to `https://iopps.ca/applications`.

### Status filter:
- [ ] Filter dropdown with options: All, Submitted, Reviewing, Shortlisted, Interview, Offered, Rejected, Withdrawn
- [ ] Selecting a status filters the list

### Application cards:
- [ ] Job title
- [ ] Organization name
- [ ] **Status badge** with correct color:
  - Blue = Submitted
  - Gold = Reviewing
  - Teal = Shortlisted
  - Purple = Interview
  - Green = Offered
  - Red = Rejected
  - Gray = Withdrawn
- [ ] Deadline
- [ ] Last updated date

### Interactions:
- [ ] **Withdraw** button → confirmation dialog appears → confirm → status changes to Withdrawn
- [ ] Tap an application → navigates to job detail
- [ ] If you have an org role, "Org Dashboard" link is visible

---

## SECTION 21: SETTINGS

### Settings hub (/settings):
Navigate to `https://iopps.ca/settings`.
- [ ] 4 menu cards visible:
  - 💼 Career Preferences → `/settings/career`
  - 🔒 Privacy & Visibility → `/settings/privacy`
  - 🔔 Notifications → `/settings/notifications`
  - 👤 Account → `/settings/account`
- [ ] 🎓 **Restart Tour** button visible — tap it, verify onboarding tour restarts

### Career Preferences (/settings/career):
- [ ] **Open to Work** toggle — green when active, flip on/off
- [ ] **Target Roles** — add/remove pill tags
- [ ] **Salary Range** — min/max inputs
- [ ] **Work Preference** — radio buttons: Remote, In-Person, Hybrid, Any
- [ ] **Skills** — add/remove pill tags
- [ ] **Education** — add/remove entries (school, degree, field, year)
- [ ] Save → success toast
- [ ] Reload → changes persist

### Privacy & Visibility (/settings/privacy):
- [ ] Profile visibility controls present
- [ ] Toggle each option
- [ ] Save works

### Notifications (/settings/notifications):
- [ ] Email, push, in-app toggles present for different notification types
- [ ] Toggle each on/off
- [ ] Save works

### Account (/settings/account):
- [ ] **Display name** input + Update button — change and verify
- [ ] **Email** shown (read-only)
- [ ] **Change password**: Current password, New password, Confirm password fields + button
  - Test fields accept input (do NOT actually change password)
- [ ] **Sign Out** button present
- [ ] **Delete Account** (red zone) — tap → password confirmation dialog appears
  - Do NOT actually delete the account

---

## SECTION 22: STATIC & INFO PAGES

Test each page loads and renders without errors:

| Page | URL | Checks |
|------|-----|--------|
| About | `/about` | [ ] Mission statement, value prop, links to signup/contact |
| Contact | `/contact` | [ ] 4 contact cards (General, Partnerships, Support, Post a Listing), emails (info@, partnership@, support@), contact form works |
| Privacy | `/privacy` | [ ] 9 sections of privacy policy text render |
| Terms | `/terms` | [ ] 11 sections of terms text render |
| Pricing | `/pricing` | [ ] PricingTabs component renders (variant="public") |
| For Employers | `/for-employers` | [ ] Value props, 2 pricing tiers (Standard $1,250/yr, Premium $2,500/yr), CTA to `/org/signup` |
| Education | `/education` | [ ] 4 category cards: Schools, Training, Programs, Scholarships + stats section |

### Pricing deep test (/pricing):
- [ ] Tab: **Subscriptions** — plan cards render (Standard, Premium, School)
- [ ] Tab: **Pay Per Post** — pricing cards render
- [ ] Tab: **Conferences** — content renders
- [ ] Tab: **Shop Indigenous** — content renders
- [ ] **FAQ accordion** — tap each question → answer expands. Tap again → collapses.
- [ ] Tap a CTA button on a plan card → navigates appropriately

---

## SECTION 23: ORGANIZATIONS & PARTNERS

### Organizations (/organizations):
Navigate to `https://iopps.ca/organizations`.
- [ ] **Type filter**: Employer, School, Non-Profit, Government, Business — tap each
- [ ] **Search** by name, location, tags
- [ ] Organization cards show: logo, name, description, open jobs count, location
- [ ] Tap a card → `/org/[slug]` loads with full org profile
- [ ] Go back

### Partners (/partners):
Navigate to `https://iopps.ca/partners`.
- [ ] **Filter buttons**: All, Employers, Schools, Businesses — tap each
- [ ] Search bar is functional
- [ ] **Featured school card** at the top
- [ ] Org cards with **tier/verification badges**
- [ ] Tap a card → org profile loads

---

## SECTION 24: PROGRAMS (/programs)

Navigate to `https://iopps.ca/programs`.

### Hero:
- [ ] **Green gradient** hero renders with "Community programs and initiatives across Saskatchewan"

### Search & Filters:
- [ ] Search bar is functional
- [ ] **Category filter** dropdown

### Program cards:
- [ ] Organization name
- [ ] Location
- [ ] Description

### Detail:
- [ ] Tap a card → `/programs/[slug]` loads
- [ ] Details render properly
- [ ] Go back to listings

---

## SECTION 25: LIVESTREAMS & SPOTLIGHT

### Livestreams (/livestreams):
Navigate to `https://iopps.ca/livestreams`.
- [ ] Navy/teal gradient hero renders
- [ ] Sections visible: **Live**, **Upcoming**, **Recent**
- [ ] Video player works (YouTubePlayer component)
- [ ] View counts and date/time info shown
- [ ] Tap a video → player activates

### Spotlight (/spotlight):
Navigate to `https://iopps.ca/spotlight`.
- [ ] Category filters: All, Interviews, Community Stories, Events, Training
- [ ] Livestream cards show **status**: scheduled, live, archived
- [ ] Tap a card → detail/player loads

---

## SECTION 26: THEME TOGGLE & PWA

### Theme toggle (test on 5+ pages):
- [ ] **Feed** — toggle dark/light → colors switch, text readable
- [ ] **Profile** — toggle → cards and form fields look correct
- [ ] **Jobs** — toggle → job cards and filters contrast adequate
- [ ] **Settings** — toggle → form elements visible
- [ ] **Scholarships** — toggle → gold accents still visible in dark mode

### PWA install prompt:
- [ ] If "Install App" prompt appears, tap "Install" or "Not now"
- [ ] Dismissed prompt does not immediately reappear
- [ ] Prompt does not block other content

---

## SECTION 27: CROSS-CUTTING MOBILE CHECKS

Perform these checks across multiple pages (feed, profile, jobs, events, members):

### Layout:
- [ ] No horizontal scrollbar on any page
- [ ] No content overflowing the right edge of the screen
- [ ] All images scale to fit the viewport width
- [ ] Cards do not extend beyond screen width

### Touch targets:
- [ ] All buttons are at least 44x44px touch area
- [ ] Links have enough spacing — no accidental taps
- [ ] Small icon buttons (bell, chat, settings) are tappable without difficulty

### Modals:
- [ ] CreateChooserModal fits mobile screen
- [ ] CreatePostModal fits mobile screen (scrollable if needed)
- [ ] Mentorship request modal fits mobile screen
- [ ] Notification dropdown does not overflow screen
- [ ] All modals closeable via ✕ button or tapping outside

### Text:
- [ ] Body text ≥ ~14px and readable
- [ ] Headings proportional and not cut off
- [ ] Long text wraps properly (no overflow hiding important info)
- [ ] Dates, times, and numbers format correctly

### Images:
- [ ] Avatars and org logos load properly
- [ ] **Broken images** show initials fallback (colored gradient with letters)
- [ ] No empty/blank avatar placeholders

### Loading states:
- [ ] Skeleton loaders appear when navigating between pages
- [ ] No page shows blank white screen while loading
- [ ] Loading spinners/indicators for async actions (posting, saving, following)

### Toast notifications:
- [ ] Success toasts appear and auto-dismiss after ~4 seconds
- [ ] Toasts don't overlap navbar or cover critical UI
- [ ] Toasts readable (proper contrast in both themes)

### Error states:
- [ ] Visit `/jobs/nonexistent-slug-12345` → "Job Not Found" with "Browse Jobs" button
- [ ] Visit `/events/nonexistent` → appropriate error/404 page
- [ ] Visit `/members/nonexistent-uid` → appropriate error

### Protected routes:
- [ ] Sign out → visit `/feed` → redirects to `/login`
- [ ] Sign out → visit `/profile` → redirects to `/login`
- [ ] Sign out → visit `/saved` → redirects to `/login`

### Auth redirect:
- [ ] Sign out → visit `/login?redirect=/saved` → log in → redirects to `/saved` (not /feed)

### Orientation (optional):
- [ ] Rotate to landscape on feed → layout adjusts
- [ ] Rotate to landscape on profile → no broken layout
- [ ] Rotate back to portrait → everything returns to normal

---

## SECTION 28: FULL END-TO-END USER JOURNEY

Walk through this complete flow without stopping:

1. [ ] Visit `iopps.ca` → tap "Sign Up"
2. [ ] Create a new account with email/password
3. [ ] Verify email (check inbox)
4. [ ] Complete setup wizard (all 5 steps)
5. [ ] Land on `/feed` → browse content, tap a card
6. [ ] Navigate to `/jobs` → search for a job → view detail → save it → apply
7. [ ] Navigate to `/events` → browse → RSVP to an event
8. [ ] Navigate to `/scholarships` → view one → note the amount and deadline
9. [ ] Navigate to `/members` → find a member → view profile → follow them
10. [ ] Navigate to `/messages` → start new conversation → send a message
11. [ ] Navigate to `/mentorship` → request mentorship from a mentor
12. [ ] Check `/notifications` → verify any received notifications
13. [ ] Check `/saved` → verify saved job appears
14. [ ] Check `/applications` → verify submitted application appears
15. [ ] Go to `/settings/career` → update career preferences → save
16. [ ] Go to `/profile` → edit profile → save
17. [ ] Toggle dark mode on → verify across 2 pages → toggle off
18. [ ] Sign out → verify redirected to landing page

---

## SECTION 29: FINAL CLEANUP & SUMMARY

### Known Bugs to Verify:
- [ ] **NavBar /signin bug**: Check if any navigation link points to `/signin` instead of `/login`
- [ ] **Signup Privacy link bug**: On `/signup`, check if Privacy Policy link goes to `/terms` instead of `/privacy`

### Cleanup:
Note all test data you created so it can be cleaned up:
- Posts with `[QA TEST]` prefix
- Job applications with `[QA TEST]` prefix
- Profile changes (revert if possible)
- Messages with `[QA TEST]` prefix
- Mentorship submissions with `[QA TEST]` prefix

### Summary Table:

| # | Section | Pages Tested | Buttons/Links Clicked | Forms Submitted | Bugs Found (C/Mj/Mn/Co) |
|---|---------|-------------|----------------------|-----------------|--------------------------|
| 0 | Setup & Baseline | | | | |
| 1 | Landing Page | | | | |
| 2 | Signup | | | | |
| 3 | Login | | | | |
| 3B | Forgot Password | | | | |
| 3C | Setup Wizard | | | | |
| 4 | Navigation | | | | |
| 5 | Feed | | | | |
| 6 | Profile | | | | |
| 7 | Jobs | | | | |
| 8 | Events | | | | |
| 9 | Scholarships | | | | |
| 10 | Training | | | | |
| 11 | Schools | | | | |
| 12 | Stories | | | | |
| 13 | Shop | | | | |
| 14 | Members | | | | |
| 15 | Mentorship | | | | |
| 16 | Messages | | | | |
| 17 | Notifications | | | | |
| 18 | Search | | | | |
| 19 | Saved Items | | | | |
| 20 | Applications | | | | |
| 21 | Settings | | | | |
| 22 | Static Pages | | | | |
| 23 | Orgs & Partners | | | | |
| 24 | Programs | | | | |
| 25 | Livestreams | | | | |
| 26 | Theme & PWA | | | | |
| 27 | Cross-Cutting | | | | |
| 28 | E2E Journey | | | | |
| **TOTAL** | | | | | |

### Bug List:
List all bugs found, grouped by severity:

**Critical:**
(list or "None")

**Major:**
(list or "None")

**Minor:**
(list or "None")

**Cosmetic:**
(list or "None")

### Top 5 Recommendations:
Based on your testing, list the top 5 most impactful issues or improvements for the mobile experience.
