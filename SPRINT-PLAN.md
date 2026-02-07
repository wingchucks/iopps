
IOPPS
Indigenous Opportunities Platform & Professional Support
Production Implementation Guide
From Prototype to Production
44 Screens  ·  3 Modals  ·  7 Phases  ·  8,491 Lines
Prototype Reference: iopps-journey.jsx
February 2026
Prepared for Claude Code Implementation Sessions

Table of Contents
1. How to Use This Guide
2. Production Architecture
3. What’s Already Live vs. What’s New
4. Implementation Priority Matrix
5. Sprint 1: Settings & Account (P0)
6. Sprint 2: Social Feed & Comments (P0)
7. Sprint 3: Messaging System (P1)
8. Sprint 4: Indigenous News & Discovery (P1)
9. Sprint 5: Admin & Moderation (P2)
10. Sprint 6: Endorsements & Connections (P2)
11. Database Schema Additions
12. New Next.js Routes
13. Testing Checklist

1. How to Use This Guide
This guide maps every screen in the iopps-journey.jsx prototype to production implementation work. Hand this document to Claude Code at the start of each session.
For Each Claude Code Session
Open the relevant Sprint section below
Tell Claude Code: “Implement [Feature Name] from the IOPPS prototype. Here are the specs:”
Paste the feature description and Firestore schema from this document
Reference the prototype file for exact UI layout (colors, spacing, component structure)
Test with canonical profiles: Sarah Whitebear (member) and Northern Lights (org)
Important: Each feature below lists its prototype screen name (e.g., SettingsScreen) and the line range in iopps-journey.jsx where Claude Code can reference the exact UI structure.
2. Production Architecture
Stack: Next.js + Firebase/Firestore + Tailwind CSS + shadcn/ui + Vercel
Design system: Teal + deep blue gradients, rounded-xl cards, shadow-sm/md, spacing scale 2/3/4/6/8/10/12/16/20
Components: shadcn/ui (Button, Card, Badge, Tabs, Dialog, DropdownMenu, Input, Textarea, Select, Switch, Table)
Auth: Firebase Authentication
Storage: Firebase Storage (resumes, profile photos, product images)
Payments: Stripe (organization subscriptions)
Folder Structure for New Features
app/(protected)/settings/page.tsx — Settings hub
app/(protected)/settings/notifications/page.tsx — Notification prefs
app/(protected)/settings/privacy/page.tsx — Privacy controls
app/(protected)/settings/subscription/page.tsx — Billing
app/(protected)/settings/data-export/page.tsx — OCAP data export
app/(protected)/messages/page.tsx — Messaging
app/(protected)/news/page.tsx — Indigenous news
app/(protected)/admin/page.tsx — Admin dashboard
app/(protected)/admin/moderation/page.tsx — Content moderation
app/(protected)/admin/verification/page.tsx — Org verification
components/shared/CommentThread.tsx — Reusable comment component
components/shared/EndorsementFlow.tsx — Endorsement give/request
components/shared/ConnectModal.tsx — Connection request modal
components/shared/ShareModal.tsx — Share/repost modal
components/shared/ReportModal.tsx — Report/flag content modal

3. What’s Already Live vs. What’s New
Already Live on iopps.ca
User authentication (signup, login, password reset)
Member profiles with Indigenous identity fields (nation, territory, band)
Organization profiles with verification badges
Job listings (100+ active) with search and filtering
Job applications with document upload
Shop Indigenous marketplace (products and services)
Events and conferences listings
Organization dashboard (applicant management, analytics)
Member dashboard (applied jobs, saved items)
Stripe subscription billing for organizations
New from Prototype (Needs Production Build)
Settings hub with sub-pages (notification prefs, privacy, data export)
Social feed with unified content cards across all 6 pillars
Comment threads with reactions (Love, Honor, Fire) and threaded replies
Direct messaging system (split-pane desktop, thread list mobile)
Endorsement system (give/request with Elder designation)
Connection requests with optional message
Share/repost flow (feed share, copy link, external)
Report/flag content (cultural concern option)
Notification center (full page with category tabs)
Indigenous news feed with daily business ideas
Super admin dashboard with platform analytics
Content moderation queue (severity-coded reports)
Organization verification workflow
Privacy controls with OCAP/CARE compliance
Data export (JSON/CSV/PDF) for data sovereignty
People directory and organization directory
Global search across all content types
Live streaming pages (detail, replay)

4. Implementation Priority Matrix
Features are prioritized by user impact and technical dependency. P0 ships first because other features depend on them.
#
Feature
What to Build
Priority
Firestore / Notes
1
Settings Hub
Central settings page linking to all sub-pages. Every user needs this.
P0
New route: /settings. Links to existing profile edit + new sub-pages.
2
Notification Prefs
Per-category toggles for email, push, in-app. Digest frequency.
P0
Firestore: users/{uid}/preferences (new subcollection)
3
Privacy Controls
Profile visibility, identity field toggles, messaging permissions.
P0
Firestore: users/{uid}/privacy (new subcollection)
4
Comment Thread
Comments on feed posts with reactions, threaded replies, Elder badges.
P0
Firestore: posts/{id}/comments (new subcollection)
5
Social Feed Upgrade
Unified feed aggregating jobs, events, products, posts with filter tabs.
P0
May need posts collection + aggregation queries
6
Notification Center
Full-page notifications with 6 category tabs, mark-all-read.
P1
Firestore: users/{uid}/notifications (new subcollection)
7
Messaging System
Real-time DMs. Split-pane desktop, thread list mobile. Online status.
P1
Firestore: conversations/{id}/messages. Firebase Realtime DB for presence.
8
Indigenous News
Curated positive news feed with category tabs, daily business idea.
P1
Could use RSS aggregation or manual curation. New collection: news
9
Global Search
Search across jobs, orgs, people, events, products. Recent + suggestions.
P1
Algolia or Firestore compound queries. Route: /search
10
People Directory
Browse members with filters (nation, territory, skills, availability).
P1
Query users collection with filters. Route: /people
11
Org Directory
Browse organizations with territory and category filters.
P1
Query organizations collection. Route: /organizations
12
Data Export
OCAP-compliant export in JSON/CSV/PDF. Category selection.
P2
Cloud Function to aggregate user data from all collections.
13
Admin Dashboard
Platform stats, activity feed, quick actions. Super admin only.
P2
Aggregation queries. Role check: user.role === 'super_admin'
14
Content Moderation
Report queue with severity, cultural concern flag, take action/dismiss.
P2
Firestore: reports collection with status field.
15
Org Verification
Review submitted docs, approve/reject/request more info workflow.
P2
Extend organizations collection: verificationStatus, verificationDocs
16
Endorsement System
Give/request endorsements with Elder designation, skill selection.
P2
Firestore: users/{uid}/endorsements (new subcollection)
17
Connection System
Send/accept connection requests with optional message.
P2
Firestore: connections collection with status: pending/accepted
18
Share Modal
Share to feed, copy link, external social sharing.
P3
Web Share API + internal post creation
19
Report Modal
6 reason categories including cultural concern. Feeds moderation queue.
P3
Creates document in reports collection
20
Subscription Page
Plan comparison, upgrade flow. Connects to existing Stripe integration.
P3
Extend existing Stripe billing UI
21
Live Stream Pages
Live detail with chat overlay, replay mode.
P3
Third-party integration (YouTube/Twitch embed or custom)

5. Sprint 1: Settings & Account (P0)
Estimated: 2–3 Claude Code sessions  |  Prototype: SettingsScreen, NotifPrefsScreen, PrivacyScreen
5.1 Settings Hub
Route: /settings
Prototype reference: SettingsScreen (line ~7248)
Central page with grouped menu items linking to sub-pages. Sections: Account, Preferences, Subscription, Data & Sovereignty, Support. Quick profile card at top showing avatar, name, nation, territory with link to profile edit.
Claude Code prompt: "Create a /settings page with grouped menu sections. Use shadcn Card for each section, shadcn Button for menu items. Link to /settings/notifications, /settings/privacy, /settings/subscription, /settings/data-export. Include profile card at top pulling from user's Firestore document. Add sign-out button at bottom."
5.2 Notification Preferences
Route: /settings/notifications
Prototype reference: NotifPrefsScreen (line ~7312)
Toggle-based preferences organized by category: Job Alerts, Messages & Connections, Endorsements, Events & Live Streams, Community. Master toggle for all in-app notifications. Email digest frequency selector (instant/daily/weekly/off). Use shadcn Switch components for toggles.
Firestore schema:
users/{uid}/preferences/notifications → { emailJobs: bool, pushJobs: bool, emailMessages: bool, pushMessages: bool, emailEndorse: bool, pushEndorse: bool, pushEvents: bool, pushLive: bool, emailEvents: bool, emailNews: bool, inappAll: bool, digestFreq: 'instant'|'daily'|'weekly'|'off' }
5.3 Privacy & Visibility
Route: /settings/privacy
Prototype reference: PrivacyScreen (line ~7420)
OCAP/CARE compliance banner at top. Toggle sections for Profile Visibility (public profile, searchable, open-to-work badge, show connections), Identity Information (show nation, show territory, show endorsements), Contact & Messaging (show email, show phone, who-can-message selector: anyone/connections/none).
Firestore schema:
users/{uid}/preferences/privacy → { profilePublic: bool, searchable: bool, openToWork: bool, showConnections: bool, showNation: bool, showTerritory: bool, showEndorsements: bool, showEmail: bool, showPhone: bool, allowMessages: 'anyone'|'connections'|'none' }

6. Sprint 2: Social Feed & Comments (P0)
Estimated: 3–4 Claude Code sessions  |  Prototype: FeedScreen, CommentThreadScreen
6.1 Unified Social Feed Upgrade
Route: / (home/feed)
Prototype reference: FeedScreen (line ~482)
The feed is the most important screen. It aggregates content across all 6 pillars into unified cards. Filter tabs: All, Jobs, Training, Shop, Events, Live, Community. Each card shows: author avatar + name + nation + verified badge, content type indicator, title + summary, engagement strip (like/comment/share/bookmark), and contextual CTA button (Apply, View, Shop, Join Live).
Key implementation notes:
Feed data comes from a posts collection OR an aggregation view across jobs, events, products, etc.
Each card type has different metadata (job shows salary/deadline, event shows date/location, product shows price)
Save/like state stored in users/{uid}/saves subcollection
Profile nudges for new users (add photo, add skills) — shown when profile completeness < 80%
6.2 Comment Thread
Route: /posts/{postId}
Prototype reference: CommentThreadScreen (line ~7900)
Full post view with 5 custom reactions: Love (❤️), Honor (🪶), Fire (🔥), Comment (💬), Share (🔗). Threaded replies with Elder badge for Elder-designated users. “Most Relevant” ranking for top comments. Sticky comment input bar at bottom.
Firestore schema:
posts/{postId}/comments/{commentId} → { authorUid: string, text: string, createdAt: timestamp, likes: number, isElder: bool, parentCommentId: string|null }
posts/{postId}/reactions/{uid} → { type: 'love'|'honor'|'fire', createdAt: timestamp }

7. Sprint 3: Messaging System (P1)
Estimated: 3–4 Claude Code sessions  |  Prototype: MessagesScreen
Route: /messages and /messages/{conversationId}
Prototype reference: MessagesScreen (line ~6732)
Desktop: split-pane layout with conversation list (left, 320px) and active chat (right). Mobile: thread list view, tap to open conversation. Features: online status indicators (green dot), compose new message overlay, unread count badges, message timestamps.
Firestore schema:
conversations/{id} → { participants: [uid1, uid2], lastMessage: string, lastMessageAt: timestamp, unreadCount: { uid1: number, uid2: number } }
conversations/{id}/messages/{msgId} → { senderUid: string, text: string, createdAt: timestamp, read: bool }
Implementation notes:
Use Firestore onSnapshot for real-time message updates
Consider Firebase Realtime Database for online presence (more efficient for presence)
Respect privacy settings: check allowMessages field before allowing new conversations
Header should show unread message count badge (pull from conversations where unreadCount > 0)
8. Sprint 4: Indigenous News & Discovery (P1)
Estimated: 2–3 Claude Code sessions  |  Prototype: IndigenousNewsScreen, GlobalSearchScreen, PeopleDirectoryScreen, OrgDirectoryScreen
8.1 Indigenous News Feed
Route: /news
Prototype reference: IndigenousNewsScreen (line ~8050)
Curated positive Indigenous news with category tabs (All, Business, Culture, Policy, Sports). Features a Daily Business Idea card (highlighted yellow gradient) with startup cost estimate, category tags. Trending hashtags section at bottom. News items show: category tag, headline, excerpt, source, timestamp, optional image placeholder.
Content strategy: Initially manual curation by admin. Later: RSS feeds from CBC Indigenous, APTN, Eagle Feather News. Firestore collection: news/{id} with fields: title, excerpt, source, sourceUrl, category, imageUrl, publishedAt, tags[].
8.2 Global Search
Route: /search
Prototype reference: GlobalSearchScreen (line ~6144)
Search across all content types with category-specific result cards. Recent searches stored locally. Quick category shortcuts (People, Organizations, Jobs, Events, Products). Consider Algolia for production search if Firestore queries aren’t performant enough.
8.3 People & Organization Directories
Routes: /people and /organizations
Prototype: PeopleDirectoryScreen (line ~6601), OrgDirectoryScreen (line ~6450)
Filterable directories. People: filter by nation, territory, skills, open-to-work status. Organizations: filter by territory, category, verified status. Both use card grid layout with connect/follow actions.

9. Sprint 5: Admin & Moderation (P2)
Estimated: 2–3 Claude Code sessions  |  Prototype: AdminDashScreen, ModerationScreen, OrgVerifyScreen
9.1 Super Admin Dashboard
Route: /admin
Prototype: AdminDashScreen (line ~7638)
Restricted to users with role: 'super_admin'. Stats grid (total users, active jobs, orgs, shop listings, reports queue, live sessions). Quick action buttons linking to moderation and verification. Platform health metrics. Recent activity feed from across the platform.
Access control: Middleware check on /admin/* routes. Firestore security rules: allow read if request.auth.token.role == 'super_admin'
9.2 Content Moderation Queue
Route: /admin/moderation
Prototype: ModerationScreen (line ~7730)
Severity-coded report cards (high=red, medium=amber, low=gray). Filter tabs: Pending, Under Review, Resolved, All. Each report shows: type icon, category (Cultural concern, Fake business, Spam, Harassment, Inappropriate), item name, reporter info with nation, description, and action buttons (Take Action, Dismiss). Cultural concern reports get special handling and priority.
Firestore: reports/{id} → { type, severity, itemId, itemType, reporterUid, reporterNation, description, status: 'pending'|'reviewed'|'resolved', createdAt, resolvedBy, resolvedAt }
9.3 Organization Verification
Route: /admin/verification
Prototype: OrgVerifyScreen (line ~7828)
List of organizations awaiting verification. Each card shows: org name, nation, territory, type, submitted date, uploaded documents (Business License, Band Council Letter, etc.), and action buttons (Approve, Request More Info, Reject). Verification criteria banner at top. Status badges: Pending, Under Review, Verified.
10. Sprint 6: Endorsements & Connections (P2)
Estimated: 2–3 Claude Code sessions  |  Prototype: EndorsementScreen, ConnectModal, ShareModal, ReportModal
10.1 Endorsement System
Route: /endorsements
Prototype: EndorsementScreen (line ~6860)
Two flows: Give Endorsement (3-step: select person, choose skill, add context + Elder toggle) and Request Endorsement (select skill, choose who to ask, add message). Elder designation checkbox adds special badge. Relationship context field (e.g., “Supervised for 3 years”).
Firestore: users/{uid}/endorsements/{id} → { endorserUid, skill, relationship, isElder, message, createdAt }
10.2 Connection System
Component: ConnectModal (shared component)
Prototype: ConnectModal (line ~6952)
Modal overlay triggered from People Directory and member profiles. Optional message field. Sent confirmation state. Connections stored bidirectionally.
Firestore: connections/{id} → { requesterUid, recipientUid, message, status: 'pending'|'accepted'|'declined', createdAt, respondedAt }
10.3 Share & Report Modals
Share modal: Share to feed (creates a repost), copy link, open in external app (Web Share API). Report modal: 6 categories (Inappropriate, Spam, Harassment, Cultural concern, Fake/misleading, Other) with optional description. Cultural concern option is highlighted. Submission creates a document in the reports collection for the moderation queue.

11. Database Schema Additions
These are NEW Firestore collections and subcollections needed. Existing collections (users, organizations, jobs, events, products) remain unchanged.
Collection / Subcollection
Key Fields
Used By
users/{uid}/preferences
notifications{}, privacy{}
Settings screens
posts/{id}
authorUid, type, title, text, media[], reactions{}, commentCount, createdAt
Social feed, comment thread
posts/{id}/comments/{id}
authorUid, text, likes, isElder, parentCommentId, createdAt
Comment thread
posts/{id}/reactions/{uid}
type: love|honor|fire
Post reactions
conversations/{id}
participants[], lastMessage, lastMessageAt, unreadCount{}
Messaging
conversations/{id}/messages/{id}
senderUid, text, read, createdAt
Messaging
users/{uid}/endorsements/{id}
endorserUid, skill, relationship, isElder, message
Endorsement system
connections/{id}
requesterUid, recipientUid, message, status, createdAt
Connection system
users/{uid}/notifications/{id}
type, title, body, read, linkedItemId, createdAt
Notification center
reports/{id}
type, severity, itemId, itemType, reporterUid, description, status
Moderation queue
news/{id}
title, excerpt, source, sourceUrl, category, imageUrl, tags[], publishedAt
Indigenous news
users/{uid}/saves/{itemId}
itemType, savedAt
Saved/bookmarks

12. New Next.js Routes
Route
Prototype Screen
Auth Required
Sprint
/settings
SettingsScreen
Yes
1
/settings/notifications
NotifPrefsScreen
Yes
1
/settings/privacy
PrivacyScreen
Yes
1
/settings/subscription
SubscriptionScreen
Yes
1
/settings/data-export
DataExportScreen
Yes
1
/posts/{id}
CommentThreadScreen
Yes
2
/messages
MessagesScreen
Yes
3
/messages/{id}
MessagesScreen (detail)
Yes
3
/news
IndigenousNewsScreen
Yes
4
/search
GlobalSearchScreen
Optional
4
/people
PeopleDirectoryScreen
Optional
4
/organizations
OrgDirectoryScreen
Optional
4
/admin
AdminDashScreen
Super Admin
5
/admin/moderation
ModerationScreen
Super Admin
5
/admin/verification
OrgVerifyScreen
Super Admin
5
/endorsements
EndorsementScreen
Yes
6

13. Testing Checklist
After each sprint, test every new feature with both canonical test profiles.
Test as Sarah Whitebear (Community Member)
Can access settings and update all preferences
Can see unified feed with filter tabs working
Can comment on posts and see threaded replies
Can react to posts (Love, Honor, Fire)
Can send and receive direct messages
Can browse Indigenous news with category filters
Can search across all content types
Can browse People and Org directories
Can send connection requests from People Directory
Can give and request endorsements
Can share content and report content
Can export data in JSON/CSV/PDF
Privacy settings actually control what others can see
Indigenous identity fields display correctly (nation, territory, band)
Cannot access /admin routes
Test as Northern Lights (Organization)
Can access settings and update organization preferences
Can create posts that appear in social feed
Can respond to comments on own posts
Can send/receive messages from applicants
Organization profile shows verified badge correctly
Verification status displays on Org Directory
Cannot access /admin routes (unless also super_admin)
Test as Super Admin
Can access /admin dashboard with real stats from Firestore
Can view and act on moderation queue
Can approve/reject organization verification requests
Platform health metrics are accurate
— End of Implementation Guide —
Prototype file: iopps-journey.jsx (8,491 lines, 44 screens, 3 modals)
Hand this document + the prototype file to Claude Code to begin implementation.