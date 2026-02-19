# Redesign Agent Teams — Execution Plan

## Wave Structure

### Wave 1: Foundation (Phase 1 + Phase 2)
No dependencies — can run after shared components are built.

#### Team 1A: Shared Components
**Files owned:** `web/components/shared/inline-edit/`
- `InlineEditField.tsx` — Click-to-edit text field with save/cancel
- `InlineEditTextArea.tsx` — Click-to-edit textarea
- `SectionEditWrapper.tsx` — Wraps any section with pencil icon + edit mode toggle
- `ImageUploader.tsx` — Click avatar/banner to upload (reuse existing upload logic)
- `ProfileTabBar.tsx` — Tab navigation for profile sub-sections
- `SettingsDrawer.tsx` — Slide-out panel for settings

**Depends on:** Nothing
**Blocks:** Team 1B, Team 2A

#### Team 1B: Member Profile Hub
**Files owned:** `web/app/member/[userId]/`, `web/components/member/profile/`
- Rewrite `PublicProfileView.tsx` → `MemberProfile.tsx`
- Merge inline editing from `ProfileTab.tsx` (1,607 lines)
- Add profile tabs: Activity, Applications, Saved, Alerts
- Extract from dashboard: `ApplicationsTab`, `SavedItemsTab`, `SavedScholarshipsTab`, `JobAlertsTab`
- Add profile action bar (Share, Preview as Visitor, Settings gear)

**Depends on:** Team 1A (shared components)
**Blocks:** Wave 2

#### Team 2A: Organization Profile Page
**Files owned:** `web/app/organizations/[slug]/`, `web/components/organization/profile/`
- Enhance `OrganizationProfileClient.tsx` with inline editing
- Add manage mode toggle
- Add admin-only tabs: Applications, Analytics, Billing, Team, Settings
- Extract from org dashboard pages into profile tabs
- Add inline content creation buttons (Post Job, Add Event, etc.)

**Depends on:** Team 1A (shared components)
**Blocks:** Wave 2

---

### Wave 2: Platform Features (Phase 3 + 4 + 5)
Depends on Wave 1 completing.

#### Team 3A: Navigation
**Files owned:** `web/lib/constants/navigation.ts`, `web/components/opportunity-graph/FeedLayout.tsx`
- Rewrite nav items — remove all dashboard links
- New top bar: Search, Home, Network, Jobs, Education, Events, Messages, Notifications, Avatar
- Avatar dropdown: View Profile, Settings, Billing, Help, Sign Out
- Mobile bottom nav: Home, Search, +Post, Messages, Profile

**Depends on:** Wave 1
**Blocks:** Nothing

#### Team 4A: Messaging Drawer
**Files owned:** `web/components/messaging/MessageDrawer.tsx` (new), modify `web/components/messaging/`
- Create global slide-out messaging panel
- Extract logic from `MessagesTab.tsx` (435 lines)
- Real-time unread count badge via Firestore onSnapshot
- Accessible from nav icon on any page

**Depends on:** Wave 1, Team 3A (nav has messages icon)
**Blocks:** Nothing

#### Team 4B: Notification Center
**Files owned:** `web/components/notifications/`
- `NotificationDropdown.tsx` — Bell icon dropdown
- `NotificationItem.tsx` — Individual notification card
- `UnreadBadge.tsx` — Real-time count badge
- Wire up to existing notification Firestore collection
- Notification types: application updates, messages, connections, mentions, job matches

**Depends on:** Wave 1, Team 3A
**Blocks:** Nothing

#### Team 5A: Social Feed Enhancement
**Files owned:** `web/components/opportunity-graph/OpportunityFeed.tsx`, `web/components/social/`
- "What's on your mind?" post creation bar at top of feed
- Post types: Text, Job share, Event share, Achievement, Article
- Rich feed cards with embedded previews
- Enhanced engagement (like, comment, share improvements)

**Depends on:** Wave 1
**Blocks:** Nothing

---

### Wave 3: Content & Cleanup (Phase 6 + 7 + 8)
Depends on Wave 2 completing.

#### Team 6A: Content Creation Panels
**Files owned:** `web/components/shared/SlideOutPanel.tsx`, `web/components/organization/create-panels/`
- `SlideOutPanel.tsx` — Full-height side panel component
- `CreateJobPanel.tsx` — Extract from `/organization/jobs/new/page.tsx` (1,328 lines)
- `CreateEventPanel.tsx` — Extract from events new page (449 lines)
- `CreateScholarshipPanel.tsx` — Extract from scholarships new page (505 lines)
- `CreateProductPanel.tsx` — Extract from products new page (427 lines)
- `CreateTrainingPanel.tsx` — Extract from training new page (933 lines)
- `CreateFundingPanel.tsx` — Extract from funding new page (585 lines)
- Wire into org profile tabs (button click → open panel)

**Depends on:** Wave 2 (org profile tabs exist)
**Blocks:** Team 7A

#### Team 7A: Redirects & Link Updates
**Files owned:** `web/app/member/dashboard/page.tsx`, routing files
- Add redirects: `/member/dashboard` → `/member/[userId]`
- Add redirects: `/organization/dashboard` → `/organizations/[slug]`
- Grep & update ALL internal links referencing old dashboard URLs
- Verify zero broken links

**Depends on:** Team 6A (all new pages exist)
**Blocks:** Team 7B

#### Team 7B: Old File Cleanup
**Files owned:** Old dashboard files (DELETE operations)
- Delete member dashboard tab files (12 files, ~5,300 lines)
- Delete member dashboard components (MemberDashboardLayout, MemberSidebar, MemberMobileNav)
- Delete organization dashboard pages (24+ files)
- Delete org dashboard components (OrganizationShell, etc.)

**Depends on:** Team 7A (redirects working)
**Blocks:** Nothing

#### Team 8A: Polish & Mobile
**Files owned:** Cross-cutting (final pass)
- Mobile-optimized profiles (full-width banner, swipeable tabs)
- Animations & transitions (tab transitions, save confirmations)
- Accessibility (keyboard nav, screen reader labels, focus management)
- Performance (lazy load tabs, image optimization, optimistic updates)

**Depends on:** All previous waves
**Blocks:** Nothing

---

## File Ownership Map (Conflict Prevention)

| Directory/File | Owner | Wave |
|---|---|---|
| `web/components/shared/inline-edit/` | Team 1A | 1 |
| `web/app/member/[userId]/` | Team 1B | 1 |
| `web/components/member/profile/` | Team 1B | 1 |
| `web/app/organizations/[slug]/` | Team 2A | 1 |
| `web/components/organization/profile/` | Team 2A | 1 |
| `web/lib/constants/navigation.ts` | Team 3A | 2 |
| `web/components/opportunity-graph/FeedLayout.tsx` | Team 3A | 2 |
| `web/components/messaging/MessageDrawer.tsx` | Team 4A | 2 |
| `web/components/notifications/` | Team 4B | 2 |
| `web/components/opportunity-graph/OpportunityFeed.tsx` | Team 5A | 2 |
| `web/components/social/` | Team 5A | 2 |
| `web/components/shared/SlideOutPanel.tsx` | Team 6A | 3 |
| `web/components/organization/create-panels/` | Team 6A | 3 |
| `web/app/member/dashboard/` | Team 7A→7B | 3 |
| `web/app/organization/(dashboard)/` | Team 7A→7B | 3 |

## Execution Timeline

```
Wave 1:  [1A: Shared Components] ──→ [1B: Member Profile] + [2A: Org Profile]
                                          ↓                       ↓
Wave 2:  [3A: Nav] + [4A: Messaging] + [4B: Notifications] + [5A: Feed]
                                          ↓
Wave 3:  [6A: Content Panels] ──→ [7A: Redirects] ──→ [7B: Cleanup] ──→ [8A: Polish]
```

## Agent Count Per Wave
- **Wave 1:** 3 agents (1 then 2 parallel)
- **Wave 2:** 4 agents (all parallel)
- **Wave 3:** 4 agents (sequential chain)
- **Total:** 11 agents
