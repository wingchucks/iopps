# IOPPS Mobile QA — Community Member Full Test

You are a QA tester. Your job is to systematically test every page, button, link, form, and interactive element on the IOPPS mobile website as a **community member** (not admin, not employer). You are already logged in.

**Test EVERYTHING. Click EVERYTHING. Submit forms for real. Document every bug you find.**

---

## RULES

1. **Viewport**: Set your browser to iPhone 14 Pro dimensions (393 x 852). Keep it in portrait mode for all tests unless the section says otherwise.
2. **Assume logged in**: You are already authenticated as a regular community member. Do NOT test login/signup flows.
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

## SECTION 1: LANDING PAGE (iopps.ca)

Navigate to `https://iopps.ca` (the root URL).

### Test these elements:
- [ ] Hero section renders with IOPPS branding and tagline
- [ ] "Sign Up" CTA button — tap it, verify it navigates to `/signup`, then go back
- [ ] "Sign In" CTA button — tap it, verify it navigates to `/login`, then go back
- [ ] Category tiles are visible (Jobs, Events, Scholarships, Shops, Schools, Stories) — tap each one and verify it navigates to the correct page, then go back each time
- [ ] Featured partner carousel/section — scroll/swipe through it, tap a partner
- [ ] Platform stats section (community members count, jobs posted, etc.) — verify numbers render (not dashes or NaN)
- [ ] Footer is visible at the bottom:
  - [ ] "About" link — tap, verify `/about` loads
  - [ ] "Privacy" link — tap, verify `/privacy` loads
  - [ ] "Terms" link — tap, verify `/terms` loads
  - [ ] "Contact" link — tap, verify `/contact` loads
  - [ ] Email `info@iopps.ca` is displayed
- [ ] Theme toggle button — tap it, verify the page switches between dark and light mode. Tap again to switch back.
- [ ] If a PWA "Install App" prompt appears at the bottom, tap "Not now" to dismiss it. Verify it disappears.

---

## SECTION 2: FEED (/feed)

Navigate to `https://iopps.ca/feed`.

### Layout checks:
- [ ] Welcome greeting appears with your name
- [ ] Profile completeness widget is visible (if profile is incomplete)
- [ ] Feed cards are rendering with content
- [ ] No desktop sidebars are visible (left sidebar and right sidebar should be hidden on mobile)

### Tab navigation:
Tap each tab at the top of the feed and verify it filters content:
- [ ] **All** — shows mixed content
- [ ] **Jobs** — shows only job posts
- [ ] **Events** — shows only event posts
- [ ] **Scholarships** — shows only scholarship posts
- [ ] **Businesses** — shows only business posts
- [ ] **Schools** — shows only school posts
- [ ] **Stories** — shows only story posts

### Create a post:
1. [ ] Tap the Create (+) button in the navigation
2. [ ] Verify the **CreateChooserModal** opens with options
3. [ ] Tap **"Share a Story"** (this should be available to community members)
4. [ ] Verify the **CreatePostModal** opens with:
   - Your avatar and name at the top
   - A title input field
   - A content textarea
   - A Photo button
   - A "Share Post" button
5. [ ] Type in the title field: `[QA TEST] Mobile Testing Post`
6. [ ] Type in the content area: `This is a QA test post created during mobile testing. Please delete after review. Testing character count and basic posting functionality.`
7. [ ] Tap the **Photo** button — verify the file picker opens. Select a test image (or skip if no image available).
8. [ ] If you uploaded an image, verify the preview appears. Test the "remove image" button on the preview.
9. [ ] Tap **"Share Post"** — verify the modal closes and a success toast appears
10. [ ] Scroll through the feed and verify your new post appears

### Feed card interactions:
- [ ] Tap on any job card in the feed — verify it navigates to `/jobs/[slug]`
- [ ] Go back to feed
- [ ] Tap on any event card — verify it navigates to `/events/[slug]`
- [ ] Go back to feed
- [ ] Tap on any story card — verify it navigates to the detail page
- [ ] Go back to feed

### Scroll behavior:
- [ ] Scroll down through the feed — verify more content loads (infinite scroll or pagination)
- [ ] Scroll back to top — verify the page scrolls smoothly
- [ ] Check the "Hiring now" carousel if visible — swipe/scroll through it

---

## SECTION 3: MOBILE NAVIGATION

### Hamburger menu:
1. [ ] Tap the hamburger menu icon (three horizontal lines)
2. [ ] Verify the dropdown menu opens with navigation links
3. [ ] Verify the menu contains these links (tap each one, verify the page loads, then come back and reopen the menu):

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

4. [ ] Test the **Saved** link/bookmark icon — verify it navigates to `/saved`
5. [ ] Test the **Settings** gear icon — verify it navigates to `/settings`
6. [ ] Tap your **avatar** — verify it navigates to `/profile`
7. [ ] Verify the menu **closes automatically** after tapping a link
8. [ ] Open the menu again and tap outside it — verify it closes

### Navigation bar behavior:
- [ ] Scroll down on any page — verify the navbar stays sticky at the top (or follows standard mobile behavior)
- [ ] The notification bell icon is accessible and tappable
- [ ] The chat/messages icon is accessible and tappable

---

## SECTION 4: PROFILE (/profile)

Navigate to `https://iopps.ca/profile`.

### Display mode:
- [ ] Your avatar displays (image or initials)
- [ ] Your name is displayed
- [ ] Headline/bio section is visible (or shows placeholder if empty)
- [ ] Followers count is displayed — tap it, verify it shows follower list
- [ ] Following count is displayed — tap it, verify it shows following list
- [ ] Activity stats are visible
- [ ] "My Applications" section is visible
- [ ] "My Events" section is visible
- [ ] "View Profile" or role badge is visible

### Edit mode:
1. [ ] Tap the **Edit** button/toggle to enter edit mode
2. [ ] Test the **Basics** accordion section:
   - [ ] Tap to expand it
   - [ ] Change the community field to a test value
   - [ ] Change the location field to `[QA TEST] Test Location`
   - [ ] Save changes
3. [ ] Test the **Identity & Heritage** accordion section:
   - [ ] Tap to expand it
   - [ ] Edit the nation field
   - [ ] Edit the territory field
   - [ ] Check language options
   - [ ] Save changes
4. [ ] Test the **About You** accordion section:
   - [ ] Tap to expand it
   - [ ] Change headline to `[QA TEST] QA Tester Headline`
   - [ ] Change bio to `[QA TEST] This bio was set during QA testing.`
   - [ ] Add or remove a skill
   - [ ] Save changes
5. [ ] Test the **Interests** accordion section:
   - [ ] Tap to expand it
   - [ ] Toggle several interest checkboxes on and off
   - [ ] Save changes
6. [ ] **Verify persistence**: Reload the page and confirm all your edits are still saved
7. [ ] Test **photo upload**:
   - [ ] Tap the avatar/photo area
   - [ ] Verify file picker opens
   - [ ] Upload a test image
   - [ ] Verify the preview updates
8. [ ] Test the **"Open to Work"** toggle — flip it on and off, verify it saves

### Resume page:
- [ ] Navigate to `/profile/resume`
- [ ] Verify the resume upload page loads
- [ ] Test the upload functionality (if a file picker appears)
- [ ] Go back to profile

---

## SECTION 5: JOBS (/jobs)

Navigate to `https://iopps.ca/jobs`.

### Listings page:
- [ ] Job listings render with titles, companies, and key details
- [ ] Page loads without errors

### Filters:
- [ ] Type a keyword in the search box — verify results filter
- [ ] Open the **employment type** dropdown — select a type, verify results filter
- [ ] Set a **minimum salary** value — verify results update
- [ ] Set a **maximum salary** value — verify results update
- [ ] Toggle the **remote-only** switch — verify results filter to remote jobs only
- [ ] Clear all filters — verify full listing returns

### Job detail:
- [ ] Tap any job card — verify `/jobs/[slug]` loads
- [ ] Verify all job details render: title, company, location, salary, description, requirements, posting date, deadline
- [ ] Verify the **Apply** button is visible
- [ ] Verify the **Save/Bookmark** button is visible — tap it to save the job

### Apply to a job:
1. [ ] Tap the **Apply** button on any job
2. [ ] Verify `/jobs/[slug]/apply` loads with an application form
3. [ ] Fill out all form fields with test data (prefix text fields with `[QA TEST]`)
4. [ ] **Submit the application**
5. [ ] Verify a success message/toast appears
6. [ ] Verify the application appears in your `/applications` list afterward

### Bookmark:
- [ ] Go back to job listings
- [ ] Tap the bookmark/save icon on a different job
- [ ] Navigate to `/saved` — verify the bookmarked job appears there

---

## SECTION 6: EVENTS (/events)

Navigate to `https://iopps.ca/events`.

- [ ] Event listings render with titles, dates, and locations
- [ ] Tap an event card — verify `/events/[slug]` loads
- [ ] Verify event details render: title, date/time, location, description, organizer
- [ ] Tap the **RSVP** button
- [ ] Verify RSVP is submitted (success toast or state change on button)
- [ ] Go back to events list

---

## SECTION 7: SCHOLARSHIPS (/scholarships)

Navigate to `https://iopps.ca/scholarships`.

- [ ] Scholarship listings render
- [ ] Tap a scholarship — verify `/scholarships/[slug]` loads
- [ ] Verify details: title, deadline, amount, eligibility, description
- [ ] Test any **Apply** or **Save** buttons present
- [ ] Go back to listings

---

## SECTION 8: TRAINING (/training)

Navigate to `https://iopps.ca/training`.

- [ ] Training program listings render
- [ ] Tap a program — verify `/training/[slug]` loads
- [ ] Verify details render: program name, institution, description, dates, requirements
- [ ] Test any interactive buttons on the detail page
- [ ] Go back to listings

---

## SECTION 9: SCHOOLS (/schools)

Navigate to `https://iopps.ca/schools`.

- [ ] School directory renders
- [ ] Tap a school — verify `/schools/[slug]` loads
- [ ] Verify details render properly
- [ ] Go back to directory

---

## SECTION 10: STORIES (/stories)

Navigate to `https://iopps.ca/stories`.

- [ ] Stories list renders
- [ ] Tap a story — verify `/stories/[slug]` loads
- [ ] Verify full story content renders (title, author, date, body text, images)
- [ ] Go back to stories list

---

## SECTION 11: SHOP (/shop)

Navigate to `https://iopps.ca/shop`.

- [ ] Business listings render
- [ ] Tap a business — verify `/shop/[slug]` loads
- [ ] Verify details render: business name, description, products/services, contact info
- [ ] Go back to listings

---

## SECTION 12: MEMBERS (/members)

Navigate to `https://iopps.ca/members`.

### Directory:
- [ ] Member list renders with names and avatars
- [ ] Search for a member by name — verify results filter
- [ ] Tap a member — verify `/members/[uid]` loads

### Member profile:
- [ ] Verify profile details render: name, avatar, headline, bio, skills, interests
- [ ] Tap the **Follow** button — verify it changes to "Following"
- [ ] Hover/tap the button again — verify it shows "Unfollow" state
- [ ] Tap **Unfollow** — verify it changes back to "Follow"
- [ ] Tap **Followers** count — verify `/members/[uid]/followers` loads with a list
- [ ] Go back
- [ ] Tap **Following** count — verify `/members/[uid]/following` loads with a list
- [ ] Go back
- [ ] Navigate to `/members/[uid]/endorsements` — verify endorsements page loads
- [ ] Check endorsement cards render (if any exist): endorser info, type badge, message, skills

---

## SECTION 13: MENTORSHIP (/mentorship)

Navigate to `https://iopps.ca/mentorship`.

- [ ] Mentorship hub page loads
- [ ] Browse available mentors/mentees (if listed)
- [ ] Navigate to `/mentorship/become` — verify the "Become a Mentor" form loads
- [ ] Fill out the form with test data prefixed with `[QA TEST]`
- [ ] Submit the form — verify success feedback
- [ ] Navigate to `/mentorship/requests` — verify the requests page loads

---

## SECTION 14: MESSAGES (/messages)

Navigate to `https://iopps.ca/messages`.

- [ ] Messaging interface loads
- [ ] Conversation list renders (or empty state if no conversations)
- [ ] If conversations exist, tap one — verify the message thread opens
- [ ] Type a test message: `[QA TEST] Mobile QA test message — please ignore`
- [ ] Send the message — verify it appears in the conversation
- [ ] Go back to conversation list — verify the conversation updates with the new message

---

## SECTION 15: NOTIFICATIONS

### Bell dropdown:
1. [ ] Tap the **notification bell** icon in the navbar
2. [ ] Verify the dropdown panel opens
3. [ ] Verify notifications render with: type icon, title, body, timestamp
4. [ ] Check unread count badge on the bell icon
5. [ ] Tap a notification — verify it marks as read (visual change)
6. [ ] Tap **"Mark All Read"** button — verify all notifications mark as read
7. [ ] Tap outside the dropdown — verify it closes

### Full notifications page:
- [ ] Navigate to `/notifications`
- [ ] Verify the full notifications page loads
- [ ] Verify notifications list renders with details

---

## SECTION 16: SEARCH (/search)

Navigate to `https://iopps.ca/search`.

- [ ] Search page loads with input field
- [ ] Type `jobs` — verify results appear across categories (jobs, people, events, scholarships)
- [ ] Type a specific term like `SIGA` — verify relevant results
- [ ] Tap a search result — verify it navigates to the correct detail page
- [ ] Go back to search
- [ ] Clear the search — verify results clear
- [ ] Type a nonsense query like `xyzzy12345` — verify empty state message

---

## SECTION 17: SAVED ITEMS (/saved)

Navigate to `https://iopps.ca/saved`.

- [ ] Saved items page loads
- [ ] Items you bookmarked earlier (jobs, events) appear in the list
- [ ] Tap a saved item — verify it navigates to the detail page
- [ ] Go back
- [ ] Remove a saved item (tap the bookmark icon to unsave) — verify it disappears from the list

---

## SECTION 18: APPLICATIONS (/applications)

Navigate to `https://iopps.ca/applications`.

- [ ] Applications page loads
- [ ] The job you applied to earlier appears in the list
- [ ] Status badge renders correctly (should show "Submitted" or similar)
- [ ] Status badge colors are correct and readable
- [ ] Tap an application — verify it navigates to the job detail or shows more info

---

## SECTION 19: SETTINGS

### Settings hub:
Navigate to `https://iopps.ca/settings`.
- [ ] Settings page loads with links to sub-pages

### Account settings (/settings/account):
- [ ] Navigate to `/settings/account`
- [ ] Email is displayed
- [ ] Password change form is present
- [ ] Test form fields accept input (but do NOT actually change your password)

### Career settings (/settings/career):
- [ ] Navigate to `/settings/career`
- [ ] **Open to Work** toggle — flip on and off
- [ ] **Target roles** field — add/edit a role
- [ ] **Salary range** field — enter min/max values
- [ ] **Work preference** dropdown — select an option (remote, hybrid, on-site)
- [ ] Save changes — verify success feedback

### Notification settings (/settings/notifications):
- [ ] Navigate to `/settings/notifications`
- [ ] Toggle switches are present for different notification types
- [ ] Toggle each switch on/off — verify they respond
- [ ] Save changes if there is a save button

### Privacy settings (/settings/privacy):
- [ ] Navigate to `/settings/privacy`
- [ ] Privacy toggles/options are present
- [ ] Toggle each option — verify they respond
- [ ] Save changes if applicable

---

## SECTION 20: STATIC PAGES

Test each page loads and renders without errors:

| Page | URL | Check |
|------|-----|-------|
| About | `/about` | [ ] Content renders, no broken layout |
| Privacy | `/privacy` | [ ] Policy text renders |
| Terms | `/terms` | [ ] Terms text renders |
| Contact | `/contact` | [ ] Contact info/form renders |
| Pricing | `/pricing` | [ ] PricingTabs component renders |
| Partners | `/partners` | [ ] Partner list renders |
| Spotlight | `/spotlight` | [ ] Content renders |
| Livestreams | `/livestreams` | [ ] Page renders |

### Pricing page deep test (/pricing):
- [ ] Tab: **Subscriptions** — verify plan cards render (Standard, Premium, School)
- [ ] Tab: **Pay Per Post** — verify pricing cards render
- [ ] Tab: **Conferences** — verify content renders
- [ ] Tab: **Shop Indigenous** — verify content renders
- [ ] **FAQ accordion** — tap each question, verify answer expands. Tap again, verify it collapses.
- [ ] Tap a CTA button on a plan card — verify it navigates appropriately

---

## SECTION 21: ORGANIZATIONS

Navigate to `https://iopps.ca/organizations`.

- [ ] Organization directory renders
- [ ] Tap an organization — verify `/org/[slug]` loads
- [ ] Verify org details render: name, logo, description, open jobs, contact
- [ ] Go back to directory

---

## SECTION 22: THEME TOGGLE & PWA

### Theme toggle:
Test the dark/light mode toggle on at least 5 different pages:
- [ ] Feed — toggle theme, verify colors switch, text remains readable
- [ ] Profile — toggle theme, verify cards and form fields look correct
- [ ] Jobs — toggle theme, verify job cards and filters look correct
- [ ] Settings — toggle theme, verify form elements contrast is adequate
- [ ] Pricing — toggle theme, verify pricing cards and tabs look correct

### PWA install prompt:
- [ ] If the "Install App" prompt appears, tap **"Install"** or **"Not now"**
- [ ] If dismissed, verify it does not immediately reappear
- [ ] Verify the prompt does not block other content

---

## SECTION 23: CROSS-CUTTING MOBILE CHECKS

Perform these checks across multiple pages (feed, profile, jobs, events, members):

### Layout:
- [ ] No horizontal scrollbar on any page
- [ ] No content overflowing the right edge of the screen
- [ ] All images scale to fit the viewport width
- [ ] Cards do not extend beyond screen width

### Touch targets:
- [ ] All buttons are at least 44x44px touch area
- [ ] Links have enough spacing that you don't accidentally tap the wrong one
- [ ] Small icon buttons (bell, chat, settings) are tappable without difficulty

### Modals:
- [ ] CreateChooserModal fits the mobile screen
- [ ] CreatePostModal fits the mobile screen (no overflow, scrollable if needed)
- [ ] Report modal (if testable) fits the mobile screen
- [ ] Notification dropdown does not overflow the screen
- [ ] Modals can be closed by tapping the X button or tapping outside

### Text:
- [ ] Body text is at least ~14px and readable
- [ ] Headings are proportional and not cut off
- [ ] Long text wraps properly (no overflow or truncation hiding important info)
- [ ] Dates, times, and numbers format correctly

### Loading states:
- [ ] Skeleton loaders appear when navigating between pages
- [ ] No page shows a blank white screen while loading
- [ ] Loading spinners or indicators appear for async actions (posting, saving, following)

### Toast notifications:
- [ ] Success toasts appear and auto-dismiss after a few seconds
- [ ] Toasts don't overlap with the navbar or cover critical UI
- [ ] Toasts are readable (proper contrast)

### Orientation (optional):
- [ ] Rotate to landscape on the feed page — verify layout adjusts
- [ ] Rotate to landscape on the profile page — verify no broken layout
- [ ] Rotate back to portrait — verify everything returns to normal

---

## SECTION 24: FINAL CLEANUP & SUMMARY

### Cleanup:
Note all test data you created so it can be cleaned up:
- Posts with `[QA TEST]` prefix
- Job applications with `[QA TEST]` prefix
- Profile changes (revert if possible)
- Messages with `[QA TEST]` prefix
- Mentorship form submissions with `[QA TEST]` prefix

### Summary Table:

Fill in this table with your results:

| # | Section | Pages Tested | Buttons/Links Clicked | Forms Submitted | Bugs Found (Critical/Major/Minor/Cosmetic) |
|---|---------|-------------|----------------------|-----------------|---------------------------------------------|
| 0 | Setup | | | | |
| 1 | Landing Page | | | | |
| 2 | Feed | | | | |
| 3 | Navigation | | | | |
| 4 | Profile | | | | |
| 5 | Jobs | | | | |
| 6 | Events | | | | |
| 7 | Scholarships | | | | |
| 8 | Training | | | | |
| 9 | Schools | | | | |
| 10 | Stories | | | | |
| 11 | Shop | | | | |
| 12 | Members | | | | |
| 13 | Mentorship | | | | |
| 14 | Messages | | | | |
| 15 | Notifications | | | | |
| 16 | Search | | | | |
| 17 | Saved Items | | | | |
| 18 | Applications | | | | |
| 19 | Settings | | | | |
| 20 | Static Pages | | | | |
| 21 | Organizations | | | | |
| 22 | Theme & PWA | | | | |
| 23 | Cross-Cutting | | | | |
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
