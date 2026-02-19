# IOPPS — Master Implementation Brief

> **One document. Everything Claude Code needs to build IOPPS.ca.**
> This is the single source of truth for the Indigenous Opportunities Platform & Professional Support.

---

## Table of Contents

1. [What IOPPS Is](#1-what-iopps-is)
2. [Platform Philosophy](#2-platform-philosophy)
3. [Tech Stack & Architecture](#3-tech-stack--architecture)
4. [Design System](#4-design-system)
5. [Account Model & User Types](#5-account-model--user-types)
6. [The Three Journeys — 28 Screens](#6-the-three-journeys--28-screens)
7. [Employer Journey — 10 Screens](#7-employer-journey--10-screens)
8. [Community Member Journey — 10 Screens](#8-community-member-journey--10-screens)
9. [Admin Panel — 8 Screens](#9-admin-panel--8-screens)
10. [Data Models](#10-data-models)
11. [Pricing & Payments](#11-pricing--payments)
12. [Six Pillars of IOPPS](#12-six-pillars-of-iopps)
13. [Shop Indigenous Marketplace](#13-shop-indigenous-marketplace)
14. [Cultural Protocols & Indigenous Data Sovereignty](#14-cultural-protocols--indigenous-data-sovereignty)
15. [Testing Protocols](#15-testing-protocols)
16. [Interactive Prototype Reference](#16-interactive-prototype-reference)

---

## 1. What IOPPS Is

IOPPS (Indigenous Opportunities Platform & Professional Support) is a comprehensive professional networking and economic sovereignty platform designed specifically for Indigenous communities across Canada and the United States.

**It is NOT an "Indigenous LinkedIn."** It is a **Relationship Tracking System** — a digital gathering place that centers Indigenous values of:

- Relationships before transactions
- Community endorsement over individual advancement
- Cultural protocols around identity and knowledge sharing
- Collective benefit over extraction

**The platform operates on six interconnected pillars:**

| Pillar | What It Does |
|--------|-------------|
| **Jobs & Training** | Indigenous-focused job board + training program listings |
| **Shop Indigenous** | Vendor marketplace (discovery-based, non-transactional) |
| **Conferences** | Indigenous conference directory and registration |
| **Scholarships & Grants** | Aggregated funding opportunities for Indigenous people |
| **Pow Wows & Events** | Event calendar for cultural gatherings |
| **Live Streams** | IOPPS Spotlight video service for organizations |

**A seventh pillar — Education** — is planned, targeting universities and colleges for Indigenous student recruitment.

---

## 2. Platform Philosophy

### Why Mainstream Platforms Fail Indigenous Communities

1. **Profile architecture ignores Indigenous identity** — No fields for clan, nation, tribal affiliation, territory, or ancestral connections. A Cree professional's identity requires connection to Nation, Treaty territory, and Band — concepts LinkedIn cannot accommodate.

2. **Cold outreach violates relationship protocols** — Indigenous networking operates on relationship-first principles where trust must be established before business discussions. Algorithm-driven connections don't work.

3. **Algorithmic biases penalize Indigenous networks** — Engagement-reward algorithms conflict with communities observing cultural mourning or seasonal ceremonial obligations.

### What Makes IOPPS Different

- **Expanded identity fields**: Nation, clan, Treaty territory, Band membership, traditional territory
- **Community endorsement systems**: Collective validation from Elders, Knowledge Keepers, and nations — not individual skill endorsements
- **Warm introduction facilitation**: Relationship-based connections, not cold algorithmic matching
- **Territory-based discovery**: Find opportunities by traditional territory, not just city/province
- **Community-controlled algorithms**: Designed for Indigenous networking patterns

### Core Design Principles

- **Relationship-first**: Trust must be established before business
- **Decisions are community-based**: Outcomes aren't meaningful if everyone doesn't agree
- **Long-term orientation**: Partnerships take decades to mature
- **Collective over individual**: Supporting the good of the people
- **Reciprocity is expected**: Bidirectional exchange of value

---

## 3. Tech Stack & Architecture

### Current Production Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js (App Router) |
| **Backend/Database** | Firebase / Firestore |
| **Authentication** | Firebase Auth |
| **Hosting** | Vercel |
| **Payments** | Stripe |
| **Styling** | Tailwind CSS |
| **Component Library** | shadcn/ui |
| **State** | React hooks + Firestore real-time listeners |

### Architectural Principles

1. **Indigenous data sovereignty compliance** — Built on OCAP® (Ownership, Control, Access, Possession) and CARE (Collective Benefit, Authority to Control, Responsibility, Ethics) frameworks
2. **Offline-first considerations** — Essential for remote communities without reliable internet
3. **Mobile-first design** — Must work at 360px up to 1440px with no horizontal scrolling
4. **Community-controlled data** — No secondary use without re-consent, especially for AI/ML training

### Folder Structure (Next.js)

```
app/
├── (public)/           # Public-facing pages (landing, about, etc.)
├── (auth)/             # Login, signup, password reset
├── (dashboard)/        # Authenticated user dashboard
│   ├── employer/       # Organization-specific views
│   ├── member/         # Community member views
│   └── admin/          # Admin panel (super_admin only)
├── jobs/               # Job listings, search, detail, apply
├── shop/               # Shop Indigenous marketplace
├── events/             # Pow Wows & Events
├── conferences/        # Conference directory
├── scholarships/       # Scholarships & Grants
├── streams/            # IOPPS Spotlight live streams
└── api/                # API routes (Stripe webhooks, etc.)

components/
├── ui/                 # shadcn/ui primitives (Button, Card, Badge, etc.)
├── shared/             # IOPPS shared blocks (header, footer, navigation)
├── employer/           # Organization-specific components
├── member/             # Community member components
└── admin/              # Admin panel components
```

---

## 4. Design System

### Brand Identity

- **Brand vibe**: Professional + community (not corporate cold, not messy)
- **Primary accent**: Teal (#0D9488) — used for all interactive elements
- **Admin accent**: Amber (#D97706) — used exclusively in admin panel
- **Typography**: Inter (or system -apple-system, BlinkMacSystemFont, sans-serif)

### Color Tokens

```
CORE:
  bg:        #F8F9FA    (page background)
  surface:   #FFFFFF    (card/panel background)
  navy:      #0F1B2D    (header, dark surfaces)
  navyLt:    #1A2A40    (navy variant)

ACCENT (Teal):
  accent:    #0D9488    (primary interactive color)
  accentDk:  #0B7C72    (hover state)
  accentDp:  #075E57    (pressed state)
  accentBg:  #F0FDFA    (teal background tint)
  accentLt:  #CCFBF1    (teal border/tag)

ADMIN (Amber):
  amber:     #D97706    (admin interactive color)
  amberBg:   #FFFBEB    (amber background tint)
  amberLt:   #FEF3C7    (amber border/tag)

SEMANTIC:
  red:       #DC2626    (error, danger, high severity)
  redBg:     #FEF2F2
  green:     #059669    (success, verified)
  greenBg:   #ECFDF5
  greenLt:   #D1FAE5
  blue:      #2563EB    (info, links)
  blueBg:    #EFF6FF
  purple:    #7C3AED    (special/premium)
  purpleBg:  #F5F3FF
  pink:      #DB2777    (cultural concern highlight)
  pinkBg:    #FDF2F8
  orange:    #EA580C    (warning)
  orangeBg:  #FFF7ED

TEXT:
  text:      #111827    (primary text)
  textSoft:  #4B5563    (secondary text)
  textMd:    #6B7280    (tertiary text)
  textMuted: #9CA3AF    (placeholder, disabled)

BORDERS:
  border:    #E5E7EB    (standard border)
  borderLt:  #F3F4F6    (subtle border)

GRADIENTS:
  gradient:       linear-gradient(135deg, #0F1B2D 0%, #0B7C72 50%, #0D9488 100%)
  gradientSubtle: linear-gradient(135deg, #F0FDFA 0%, #ECFDF5 50%, #F0FDFA 100%)
```

### Spacing Scale (Tailwind)

Use consistent spacing: 2, 3, 4, 6, 8, 10, 12, 16, 20 (maps to Tailwind spacing utilities).

### Border Radius

- **Cards**: rounded-xl (12px)
- **Hero blocks**: rounded-2xl (16px)
- **Buttons/inputs**: 10px
- **Tags/badges**: 8px
- **Pills**: rounded-full (999px)
- **Avatars**: 12px (small), 20px (large)

### Shadows

- `shadow-sm` for cards at rest
- `shadow-md` for elevated cards on hover
- No heavy shadows or multiple shadow layers

### Shared Component Library

These components are used across ALL three journeys. When building in Next.js, create these as reusable components in `components/ui/`:

| Component | Purpose | Variants |
|-----------|---------|----------|
| **Btn** | Primary action button | primary, secondary, ghost, amber, danger, navy |
| **Input** | Form fields | text, textarea, select (with icon support) |
| **Tag** | Label/category tags | default, warn (amber), teal |
| **Bdg** | Status badges | default, teal, live |
| **Av** | Avatar with initials | Sizes 40px-80px, auto-color by name hash, optional ring |
| **StatBox** | Metric display card | icon + value + label |
| **EBtn** | Engagement button | icon + optional label, active state |
| **Progress** | Step progress bar | step count + optional labels |
| **ProgressBar** | Named step progress | steps array with named segments |
| **I** (Icon) | SVG icon wrapper | 30+ icons via path data |

### Animation System

```css
fadeUp:    opacity 0→1, translateY 16px→0, 0.4s ease-out
fadeIn:    opacity 0→1, 0.3s ease-out
pulse:     scale 1→1.05→1
slideIn:   opacity 0→1, translateX 20px→0
shimmer:   background-position sweep
float:     translateY 0→-6px→0
btn-hover: translateY(-1px) + box-shadow on hover
card-hover: translateY(-2px) + elevated box-shadow on hover
```

### Responsive Breakpoints

- **Mobile**: 0–700px (default, single column)
- **Desktop**: 700px+ (max-width container, enhanced spacing)
- Admin screens use 640px max-width (wider than 560px for employer/community)

---

## 5. Account Model & User Types

### Unified Account Architecture

IOPPS uses a **two-account-type** model (simplified from a previous three-type system):

| Account Type | Who | Capabilities |
|-------------|-----|-------------|
| **Community Member** | Job seekers, professionals, community members | Browse jobs, apply, build profile, follow orgs, save listings |
| **Organization** | Employers, vendors, educational institutions | Post jobs, list products/services, manage events, access analytics |

**Key architectural decision**: Organizations have a **unified account** with toggleable capabilities rather than separate "employer" and "vendor" profiles. This reflects how Indigenous businesses actually operate — the same organization might hire staff AND sell products AND run events.

### Organization Capabilities (toggleable)

- ✅ Hiring (post job listings)
- ✅ Products (Shop Indigenous vendor)
- ✅ Services (consulting, professional services)
- ✅ Events (conferences, pow wows)
- ✅ Training (educational programs)

### Admin Roles

| Role | Access |
|------|--------|
| **member** | Standard community member |
| **org_admin** | Organization dashboard + settings |
| **super_admin** | Full admin panel access (protected accounts) |

---

## 6. The Three Journeys — 28 Screens

The interactive prototype demonstrates three complete user journeys through the platform:

### Journey Architecture

```
┌─────────────────────────────────────────────────┐
│  IOPPS Header (sticky)                           │
│  [🏢 Employer] [👤 Community] [🔧 Admin]        │
│  [Screen navigation pills]                       │
├─────────────────────────────────────────────────┤
│                                                   │
│  Content Area                                     │
│  (max-width: 560px employer/community)            │
│  (max-width: 640px admin)                         │
│                                                   │
└─────────────────────────────────────────────────┘
```

### Journey Toggle

- Three toggle buttons in sticky navy header
- Employer and Community use **teal** accent
- Admin uses **amber** accent
- Each journey maintains independent screen state (switching back remembers position)

---

## 7. Employer Journey — 10 Screens

### Screen 7.1: Employer Landing Page (`EmpLandingScreen`)

**Purpose**: First impression. Sell the platform to organizations.

**Layout**:
- Hero section with gradient background (navy → teal)
- Headline: "Hire Indigenous Talent" with subtitle about connecting with 50,000+ Indigenous professionals
- Two CTAs: "Start Hiring" (primary) and "Learn More" (secondary/ghost)
- Three stat boxes: "50K+ Professionals", "500+ Nations", "98% Satisfaction"
- "Trusted By" section showing logos/names (SIGA, STC, Northern Lights)
- Three feature cards:
  1. "Targeted Reach" — reach qualified Indigenous candidates
  2. "Cultural Fit" — candidates matched by community, territory, values
  3. "Easy Posting" — post jobs in under 5 minutes
- Footer CTA: "Ready to make an impact?" with signup button

### Screen 7.2: Account Type Selection (`EmpTypeSelectScreen`)

**Purpose**: Confirm organization type.

**Layout**:
- Back button
- Heading: "How will you use IOPPS?"
- Two selectable cards (radio-style):
  1. **Employer** — "I want to hire Indigenous talent" (building icon)
  2. **Organization** — "I represent an Indigenous organization" (users icon)
- Note: "You can always add more capabilities later"
- Continue button (disabled until selection made)

### Screen 7.3: Organization Signup (`EmpSignupScreen`)

**Purpose**: Collect organization credentials.

**Layout**:
- Back button + Progress bar (Step 1 of 4: "Account")
- Heading: "Create Your Organization Account"
- Form fields:
  - Organization Name* (text input)
  - Your Full Name* (text input)
  - Email Address* (email input with mail icon)
  - Password* (password input with lock icon, hint: "Minimum 8 characters")
- Checkbox: "I agree to the Terms of Service and Privacy Policy"
- Submit button: "Create Account"
- Footer: "Already have an account? Sign in"

### Screen 7.4: Organization Onboarding (`EmpOnboardingScreen`)

**Purpose**: Build the organization profile. Multi-step wizard (4 tabs).

**Layout**:
- Progress bar (Step 2 of 4: "Profile")
- Tab-based interface with 4 sections:

**Tab 1 — "About"**:
- Organization Description (textarea)
- Industry (select: Healthcare, Education, Government, Mining, Technology, Construction, Social Services, Gaming & Entertainment)
- Indigenous Ownership (select: 100% Indigenous-owned, Majority Indigenous-owned, Partnership, Non-Indigenous with Indigenous programs)

**Tab 2 — "Identity"**:
- Nation/Affiliation (select: Cree, Ojibwe, Métis, Inuit, Mohawk, Mi'kmaq, Dene, Blackfoot, Coast Salish, Other)
- Treaty Territory (select: Treaty 1-11, Robinson-Superior, Robinson-Huron, Numbered Treaties, Modern Treaty, Unceded Territory)
- Community/Band (text input)

**Tab 3 — "Details"**:
- Location (text input with location icon)
- Website (text input with globe icon)
- Organization Size (select: 1-10, 11-50, 51-200, 201-500, 500+)
- Logo upload button (photo icon)

**Tab 4 — "Capabilities"**:
- Toggleable checkboxes:
  - ☐ Hiring — Post job listings
  - ☐ Products — Sell on Shop Indigenous
  - ☐ Services — List professional services
  - ☐ Events — Host conferences & events
  - ☐ Training — Offer training programs
- "Save Profile" button

### Screen 7.5: Plans & Pricing (`PlansScreen`)

**Purpose**: Select subscription plan.

**Layout**:
- Heading: "Choose Your Plan"
- Subtitle explaining value
- Toggle: Monthly / Annual (annual shows "Save 20%" badge)
- Two plan cards side by side:

**Essential Plan — $1,250/yr ($125/mo)**:
- ✅ Post up to 5 active job listings
- ✅ Basic organization profile
- ✅ Application management
- ✅ Email support
- ✅ Job performance analytics
- "Choose Essential" button (secondary style)

**Professional Plan — $2,500/yr ($250/mo)** ⭐ POPULAR:
- ✅ Unlimited job listings
- ✅ Enhanced profile with spotlight
- ✅ Shop Indigenous storefront
- ✅ Priority support
- ✅ Advanced analytics & reporting
- ✅ Featured placement in search
- ✅ IOPPS Spotlight video
- ✅ Conference & event listings
- "Choose Professional" button (primary style)

- Comparison section: "Compare Plans" table with feature-by-feature breakdown
- FAQ accordion:
  1. "Can I change plans later?" — Yes
  2. "Is there a free trial?" — 14-day free trial, no credit card required
  3. "What payment methods?" — Visa, Mastercard, direct bank transfer
  4. "Non-profit discount?" — 25% discount for registered non-profits
  5. "Can I cancel anytime?" — Yes, no long-term contracts

### Screen 7.6: Payment (`PaymentScreen`)

**Purpose**: Collect payment information.

**Layout**:
- Back button
- Order summary card (selected plan, price, any discounts)
- Form fields:
  - Card Number (input with lock icon)
  - Expiry / CVC (two fields side by side)
  - Billing Address (text input)
- Secure checkout badges (🔒 256-bit encryption, Stripe trust mark)
- "Complete Purchase" button (navy variant)
- "14-day money-back guarantee" note

### Screen 7.7: Welcome / Confirmation (`EmpWelcomeScreen`)

**Purpose**: Celebrate signup, guide to first action.

**Layout**:
- Animated checkmark with confetti effect
- "Welcome to IOPPS!" heading
- Organization name displayed
- Summary: plan selected, next steps
- Three quick-start cards:
  1. 📝 "Post Your First Job" — CTA button
  2. ✨ "Complete Your Profile" — CTA button
  3. 🔍 "Explore the Platform" — CTA button
- "Go to Dashboard" button

### Screen 7.8: Post a Job (`PostJobScreen`)

**Purpose**: Create a job listing.

**Layout**:
- Back button + Progress bar (Steps: Details → Requirements → Preview)
- Multi-step form:

**Step 1 — "Job Details"**:
- Job Title* (text input)
- Department (text input)
- Location* (text input with location icon)
- Job Type (select: Full-time, Part-time, Contract, Casual, Internship)
- Salary Range: Min and Max fields + Period (Annual, Monthly, Hourly, Contract)
- Application Deadline (date input)

**Step 2 — "Requirements"**:
- Job Description* (textarea, 6 rows)
- Requirements* (textarea, hint: "List key qualifications, one per line")
- Indigenous Preference (select: Indigenous candidates preferred, Open to all, Indigenous-only)
- Community tags (multi-select chips: Treaty 6, Cree, Healthcare, Government)
- "Post Job" button

**Step 3 — "Preview"**:
- Full preview card showing how the job will look
- Edit button, Post button

### Screen 7.9: Job Posted Success (`JobSuccessScreen`)

**Purpose**: Confirm job posting, next steps.

**Layout**:
- Animated checkmark
- "Job Posted!" heading
- Job title and key details
- Two action buttons: "Post Another Job" / "Go to Dashboard"
- Expected visibility stats: "Your job will be seen by X candidates in Treaty 6 territory"

### Screen 7.10: Employer Dashboard (`DashboardScreen`)

**Purpose**: Organization command center.

**Layout**:
- Welcome header with organization name + verified badge
- Quick stats row: Active Jobs, Total Applications, Profile Views, Shortlisted
- **Active Jobs section**:
  - Job cards with title, location, applicant count, posted date
  - Status badges (Active, Expiring Soon, Closed)
  - Action buttons: View Applications, Edit, Feature
- **Recent Applications section**:
  - Applicant cards with avatar, name, nation, applied position, date
  - Quick actions: View Profile, Shortlist, Message
- **Quick Actions grid**:
  - Post New Job
  - View Analytics
  - Edit Profile
  - Manage Team
  - View Shop (if vendor capability enabled)
  - Settings

---

## 8. Community Member Journey — 10 Screens

### Screen 8.1: Community Landing Page (`MemLandingScreen`)

**Purpose**: Welcome community members and job seekers.

**Layout**:
- Hero with gradient background
- Headline: "Your Indigenous Career Journey Starts Here"
- Subtitle: "Connect with employers who value your culture, skills, and community"
- Two CTAs: "Find Opportunities" (primary) and "Explore Platform" (ghost)
- Three stat boxes: "5K+ Jobs", "200+ Employers", "Free to Join"
- "How It Works" section — 4 steps:
  1. 🏠 "Create Profile" — Share your story, skills, and community
  2. 🔍 "Discover" — Find jobs, training, and events
  3. 📝 "Apply" — One-click applications
  4. 🤝 "Connect" — Build relationships with employers
- Testimonial card from community member
- Footer CTA: "Join thousands of Indigenous professionals"

### Screen 8.2: Member Type Selection (`MemTypeSelectScreen`)

**Purpose**: Understand the member's goals.

**Layout**:
- Back button
- Heading: "What brings you to IOPPS?"
- Three selectable cards:
  1. **Job Seeker** — "I'm looking for employment opportunities" (briefcase icon)
  2. **Professional** — "I want to network and grow my career" (users icon)
  3. **Community Member** — "I want to stay connected with my community" (heart icon)
- Note: "This helps us personalize your experience"
- Continue button

### Screen 8.3: Member Signup (`MemSignupScreen`)

**Purpose**: Create free community account.

**Layout**:
- Back button + Progress bar (Step 1 of 4: "Account")
- Heading: "Create Your Free Account"
- Form fields:
  - Full Name* (text input)
  - Email Address* (email input with mail icon)
  - Password* (password input with lock icon)
- Checkbox: Terms agreement
- "Create Free Account" button
- Social signup options (Continue with Google, Continue with Facebook)
- Footer: "Already have an account? Sign in"

### Screen 8.4: Member Onboarding (`MemOnboardingScreen`)

**Purpose**: Build the member profile. Multi-step wizard (4 tabs).

**Layout**:
- Progress bar (Step 2 of 4: "Profile")

**Tab 1 — "Identity"**:
- Nation/Affiliation (select: same options as employer)
- Treaty Territory (select)
- Community/Band (text input)
- Pronouns (select: He/Him, She/Her, They/Them, Two-Spirit, Prefer not to say)

**Tab 2 — "Professional"**:
- Current Role/Title (text input)
- Experience Level (select: Student, Entry Level, Mid-Career, Senior, Executive, Elder/Advisor)
- Industry (select: same as employer list)
- Skills (tag input: up to 10 skills)

**Tab 3 — "Preferences"**:
- Preferred Location(s) (text input)
- Open to Remote Work (toggle)
- Job Types Interested In (checkboxes: Full-time, Part-time, Contract, Casual, Internship)
- Willing to Relocate (toggle)

**Tab 4 — "Profile"**:
- Bio/About Me (textarea)
- Profile Photo upload
- Resume upload (PDF/DOC)
- LinkedIn URL (optional)
- "Complete Profile" button

### Screen 8.5: Welcome (`MemWelcomeScreen`)

**Purpose**: Celebrate and orient.

**Layout**:
- Animated checkmark with confetti
- "Welcome to the Community!" heading
- Three discovery cards:
  1. 🔍 "Browse Jobs" — Find opportunities matched to your profile
  2. 🎓 "Training & Scholarships" — Explore funding and programs
  3. 🥁 "Events & Pow Wows" — See what's happening near you
- "Start Exploring" button

### Screen 8.6: Discovery Feed (`DiscoverScreen`)

**Purpose**: Browse and filter opportunities.

**Layout**:
- Search bar with icon: "Search jobs, events, training..."
- Filter chips row: All, Jobs, Training, Events, Scholarships (horizontally scrollable)
- Featured section: "Featured Opportunity" card with gradient border
- Job listing cards (multiple):
  - Each shows: Job title, company name + verified badge, location, salary range, posted date, tags (Full-time, Remote, Treaty 6, etc.)
  - Save/bookmark button on each card
  - Engagement row: 👁 views, 📝 applicants
- "Load More" button at bottom

### Screen 8.7: Job Detail (`JobDetailScreen`)

**Purpose**: Full job listing view.

**Layout**:
- Back button
- Company header: Avatar + org name + verified badge + "Following" button
- Job title (large heading)
- Meta row: Location, Job Type, Salary Range, Posted Date
- Tags: relevant community/territory/skill tags
- **About This Role** section (full description)
- **Requirements** section (bullet list)
- **Indigenous Preference** badge (if applicable)
- **About the Employer** card:
  - Organization description
  - Size, industry, Indigenous ownership status
  - "View Organization Profile" link
- **How to Apply** section
- Sticky bottom bar: "Apply Now" button + Save/Bookmark button

### Screen 8.8: Job Application (`ApplyScreen`)

**Purpose**: Submit application.

**Layout**:
- Back button
- Progress bar: "Your Info → Documents → Review"
- Job summary card at top

**Step 1 — "Your Info"**:
- Pre-filled from profile: Name, Email, Phone, Location
- Edit button for each field
- "Why are you interested in this role?" (textarea)
- Nation/Territory (pre-filled)

**Step 2 — "Documents"**:
- Resume upload (with preview if already on file)
- Cover Letter (textarea or upload)
- Additional Documents (optional upload)
- Portfolio URL (optional)

**Step 3 — "Review"**:
- Full application summary
- Edit buttons for each section
- Checkbox: "I confirm this information is accurate"
- "Submit Application" button

### Screen 8.9: Application Success (`AppSuccessScreen`)

**Purpose**: Confirm submission.

**Layout**:
- Animated checkmark
- "Application Submitted!" heading
- Application summary (job title, company, date)
- What to expect timeline:
  1. ✅ Application received
  2. ⏳ Under review (typically 5-7 business days)
  3. 📧 Response via email
- "Browse More Jobs" and "View My Applications" buttons

### Screen 8.10: Member Profile (`ProfileScreen`)

**Purpose**: Public-facing member profile.

**Layout**:
- Profile header:
  - Large avatar with ring
  - Name + verified badge
  - Title/Role
  - Nation, Territory
  - Location
  - Pronouns
  - "Open to Work" badge (if enabled)
  - "Edit Profile" button
- **About** section (bio text)
- **Skills** section (tag chips)
- **Experience** section:
  - Position cards with company, dates, description
- **Education** section:
  - School, degree, dates
- **Community Endorsements** section:
  - Endorsement cards from other community members/elders
  - "Endorsed by Sarah M., Elder, Treaty 6" format
- **Activity** section:
  - Recent platform activity (applied to X, attended Y event)

---

## 9. Admin Panel — 8 Screens

> **Visual distinction**: Admin screens use **amber** (#D97706) instead of teal for all interactive elements (toggle, pills, buttons). Admin content area uses 640px max-width (wider than the 560px used for employer/community).

### Screen 9.1: Admin Dashboard (`AdminDashScreen`)

**Purpose**: Platform overview at a glance.

**Layout**:
- Heading: "Platform Overview" with subtitle "IOPPS Administration"
- **6 Stat Cards** (2×3 grid):
  - Total Users (2,847)
  - Active Jobs (143)
  - Organizations (89)
  - Monthly Revenue ($12,450)
  - Open Reports (7)
  - Shop Listings (234)
- **4 Quick Action Buttons**: Verify Orgs, Review Reports, Manage Users, Platform Settings
- **Platform Health** section:
  - Uptime: 99.97%
  - Avg Response: 142ms
  - Active Sessions: 47
  - Resolution Rate: 94%
- **Activity Feed** (8 items, color-coded):
  - 🟢 New organization registrations
  - 🔴 Reports submitted
  - 🔵 Job postings
  - 🟡 Verification completions
  - 🟣 New subscriptions
  - ⚪ Content flagged

### Screen 9.2: User Management (`AdminUsersScreen`)

**Purpose**: View, search, manage all platform users.

**Layout**:
- Heading: "User Management" with user count
- Search bar: "Search users by name or email..."
- Filter pills: All, Members, Org Admins, Super Admins
- **User list** (8 sample users):
  - Each row: Avatar, Name, Email, Role badge, Status, Nation, Joined date
  - Sample users include: Sarah Whitebear (member, verified), Jordan Morin (org_admin), Maria Thunderchild (org_admin, STC), flagged accounts, suspended users
- **User Detail View** (click-through):
  - Full profile information
  - Account status and history
  - Admin actions: Send Message, Suspend/Reinstate, Promote to Org Admin, Promote to Super Admin, Delete Account
  - **Protection rule**: Super admin accounts cannot be suspended or deleted

### Screen 9.3: Organization Management (`AdminOrgsScreen`)

**Purpose**: Oversee all organizations.

**Layout**:
- Heading: "Organizations" with count
- Filter pills: All, Verified, Pending, Rejected
- **Organization list** (8 sample orgs):
  - Each row: Avatar, Org name, Status badge, Member count, Job count, Plan type
  - Sample orgs: Northern Lights Consulting (verified), Saskatoon Tribal Council (verified), SIGA (verified), Métis Nation of Alberta (pending), Eagle Feather Designs (pending), rejected "Questionable Corp"
- Quick action: "Go to Verification Queue" button
- Click-through to full org detail with edit capabilities

### Screen 9.4: Verification Queue (`AdminVerifyScreen`)

**Purpose**: Review and process organization verification requests.

**Layout**:
- Heading: "Verification Queue" with pending count
- **SLA Banner**: "⚠️ Oldest pending: 23 days (target: 5 days)" — amber warning
- **Pending list** (4 items):
  - Each: Org name, submitted date, type, brief description
- **Verification Detail View** (click-through):
  - Organization info card (name, type, location, submitted by)
  - **Documents section**: List of uploaded verification docs with status (Uploaded ✅, Missing ❌)
    - Certificate of Incorporation
    - Indigenous Ownership Declaration
    - CCIB/NNASC Certification (if applicable)
    - Band Council Resolution
    - Additional Documents
  - **5-Point Verification Checklist**:
    1. ☐ Indigenous ownership verified (51%+ documented)
    2. ☐ Business registration confirmed
    3. ☐ Contact information validated
    4. ☐ No prior violations or flags
    5. ☐ Community reference confirmed
  - **Admin Notes** textarea
  - **Action buttons**:
    - ✅ Approve — "Approve Organization"
    - 📋 Request More Info — "Request Additional Documents"
    - ❌ Reject — "Reject Application"

### Screen 9.5: Job Oversight (`AdminJobsScreen`)

**Purpose**: Monitor and manage all job listings.

**Layout**:
- Heading: "Job Listings" with count
- Filter pills: All, Active, Pending, Flagged, Expired
- **Job list** (8 sample jobs):
  - Each: Job title, company, status badge, location, posted date, applicant count
  - Flagged items shown with red warning border + reason
  - Sample jobs: Senior Indigenous Policy Advisor, Indigenous Relations Manager, Community Health Worker, Casino Floor Supervisor, one flagged "Suspicious Job Posting"
- **Admin actions per job**:
  - Feature / Remove Feature (⭐)
  - Approve (pending jobs)
  - Pause (active jobs)
  - Remove (with confirmation)
  - Dismiss Flag (flagged jobs)

### Screen 9.6: Moderation Queue (`AdminModerationScreen`)

**Purpose**: Review user reports and content flags.

**Layout**:
- Heading: "Moderation Queue" with count
- **Cultural Concern Priority Banner** (pink background with feather icon):
  - "Cultural concerns are prioritized and may require Elder consultation"
- Status tabs: Pending, Under Review, Resolved, All
- **Report list** (7 items):
  - Severity-coded: High (red dot), Medium (amber dot), Low (gray dot)
  - 6 report categories: Cultural concern, Harassment, Fake business, Spam, Inappropriate, Other
  - Each: Reporter name, subject, category badge, severity, date, status
  - Sample reports: Cultural concern about fake Indigenous business, harassment in comments, fake dreamcatchers on Shop, spam job listing
- **Report Detail View** (click-through):
  - Reporter info + reported content
  - Full report text
  - Evidence/screenshots
  - Admin actions:
    - Dismiss Report
    - Warn User
    - Suspend User
    - Remove Content
    - **Request Elder Input** (cultural concerns only — special button)
  - Admin notes + resolution history

### Screen 9.7: Shop Indigenous Oversight (`AdminShopScreen`)

**Purpose**: Monitor marketplace listings.

**Layout**:
- Heading: "Shop Indigenous" with listing count
- Filter pills: All, Active, Flagged, Pending Review
- Verified vendor filter toggle
- **Listing grid** (8 sample items):
  - Each: Product name, vendor name, price, verified badge, category
  - Flagged items with red border + reason text
  - Sample items: Hand-beaded earrings, cedar/sage kits, ribbon skirts
  - Flagged: Mass-produced dreamcatchers ("Non-Indigenous vendor using Indigenous imagery"), health claim item ("Unverified health claims")
- **Admin actions per listing**:
  - View (opens listing detail)
  - Remove (with reason field)
  - Dismiss Flag
  - Verify Vendor
  - Feature on Homepage

### Screen 9.8: Platform Settings (`AdminSettingsScreen`)

**Purpose**: Configure platform-wide settings.

**Layout**:
- Heading: "Platform Settings"
- **Feature Toggles** (5 working switches):
  1. 🔧 Maintenance Mode — "Temporarily disable public access" (**triggers live red warning banner when enabled**)
  2. 👥 New Registrations — "Allow new user signups"
  3. 🛍️ Shop Indigenous — "Enable marketplace features"
  4. 🤖 Auto-Moderation — "AI-assisted content screening"
  5. ⏰ Job Auto-Expiry — "Auto-expire jobs after 30 days"

- **Site Announcement** section:
  - Banner Message (text input)
  - Banner Color (select: Info/Blue, Warning/Amber, Success/Green, Urgent/Red)
  - Expiry Date (date input)
  - Preview of how banner looks

- **Platform Information** table:
  - Version: 2.4.1
  - Environment: Production
  - Last Deploy: [date]
  - Database: Firestore
  - Hosting: Vercel
  - Auth: Firebase Auth
  - Payments: Stripe
  - CDN: Vercel Edge

- **Danger Zone** (red border section):
  - 🗑️ Purge Expired Jobs — "Remove all expired listings"
  - 🔄 Clear Cache — "Reset platform cache"
  - ⚠️ Reset Analytics — "Clear all analytics data"
  - Each with confirmation dialog requirement

---

## 10. Data Models

### User Document (Firestore: `users/{uid}`)

```
{
  uid: string,
  email: string,
  displayName: string,
  role: "member" | "org_admin" | "super_admin",
  status: "active" | "suspended" | "flagged" | "pending",
  verified: boolean,
  
  // Identity (Indigenous-specific)
  nation: string,           // e.g., "Cree (Nehiyaw)"
  territory: string,        // e.g., "Treaty 6 Territory"
  band: string,             // e.g., "Muskeg Lake Cree Nation"
  pronouns: string,
  
  // Professional
  title: string,
  industry: string,
  experienceLevel: string,
  skills: string[],
  bio: string,
  
  // Preferences
  openToWork: boolean,
  preferredLocations: string[],
  remoteOk: boolean,
  jobTypes: string[],       // ["Full-time", "Contract", etc.]
  willingToRelocate: boolean,
  
  // Files
  photoURL: string,
  resumeURL: string,
  
  // Meta
  createdAt: timestamp,
  updatedAt: timestamp,
  lastLogin: timestamp,
  memberType: "jobSeeker" | "professional" | "communityMember"
}
```

### Organization Document (Firestore: `organizations/{orgId}`)

```
{
  id: string,
  slug: string,             // URL-friendly name
  name: string,
  email: string,
  
  // Identity
  nation: string,
  territory: string,
  band: string,
  ownership: string,        // "100% Indigenous-owned", etc.
  
  // Details
  description: string,
  industry: string,
  location: string,
  website: string,
  size: string,             // "1-10", "11-50", etc.
  logoURL: string,
  
  // Capabilities (toggleable)
  capabilities: {
    hiring: boolean,
    products: boolean,
    services: boolean,
    events: boolean,
    training: boolean
  },
  
  // Verification
  verificationStatus: "verified" | "pending" | "rejected" | "unverified",
  verificationDocs: [
    { type: string, url: string, status: "uploaded" | "missing" | "verified" }
  ],
  verifiedAt: timestamp,
  verifiedBy: string,       // admin UID
  
  // Subscription
  plan: "essential" | "professional" | "none",
  planPeriod: "monthly" | "annual",
  stripeCustomerId: string,
  stripeSubscriptionId: string,
  planStartDate: timestamp,
  planEndDate: timestamp,
  
  // Stats
  jobCount: number,
  followerCount: number,
  profileViews: number,
  
  // Members
  members: [
    { uid: string, role: "owner" | "admin" | "member", joinedAt: timestamp }
  ],
  
  // Meta
  createdAt: timestamp,
  updatedAt: timestamp,
  createdBy: string         // UID of founding user
}
```

### Job Document (Firestore: `jobs/{jobId}`)

```
{
  id: string,
  organizationId: string,
  organizationName: string,
  organizationVerified: boolean,
  
  title: string,
  department: string,
  description: string,
  requirements: string,
  
  location: string,
  jobType: "Full-time" | "Part-time" | "Contract" | "Casual" | "Internship",
  salaryMin: number,
  salaryMax: number,
  salaryPeriod: "Annual" | "Monthly" | "Hourly" | "Contract",
  
  indigenousPreference: "preferred" | "open" | "only",
  tags: string[],           // ["Treaty 6", "Cree", "Healthcare"]
  
  status: "active" | "pending" | "expired" | "paused" | "flagged",
  featured: boolean,
  
  applicationDeadline: timestamp,
  applicantCount: number,
  viewCount: number,
  
  createdAt: timestamp,
  updatedAt: timestamp,
  expiresAt: timestamp,
  postedBy: string          // UID
}
```

### Application Document (Firestore: `applications/{appId}`)

```
{
  id: string,
  jobId: string,
  userId: string,
  organizationId: string,
  
  status: "submitted" | "reviewed" | "shortlisted" | "rejected" | "hired",
  
  coverLetter: string,
  resumeURL: string,
  additionalDocs: string[],
  portfolioURL: string,
  
  interestStatement: string, // "Why are you interested..."
  
  submittedAt: timestamp,
  reviewedAt: timestamp,
  reviewedBy: string
}
```

### Report Document (Firestore: `reports/{reportId}`)

```
{
  id: string,
  reporterId: string,
  
  subjectType: "user" | "organization" | "job" | "shopListing" | "comment",
  subjectId: string,
  
  category: "cultural_concern" | "harassment" | "fake_business" | "spam" | "inappropriate" | "other",
  severity: "high" | "medium" | "low",
  
  description: string,
  evidence: string[],        // URLs to screenshots/files
  
  status: "pending" | "under_review" | "resolved" | "dismissed",
  
  adminNotes: string,
  resolvedBy: string,        // admin UID
  resolution: string,        // "content_removed", "user_warned", "user_suspended", etc.
  elderConsultRequested: boolean,
  
  createdAt: timestamp,
  updatedAt: timestamp,
  resolvedAt: timestamp
}
```

### Shop Listing Document (Firestore: `shopListings/{listingId}`)

```
{
  id: string,
  organizationId: string,
  vendorName: string,
  vendorVerified: boolean,
  
  title: string,
  description: string,
  category: string,          // "Art & Fine Crafts", "Jewelry", etc.
  subcategory: string,
  
  price: number,
  priceType: "fixed" | "range" | "contact",
  
  images: string[],
  
  // Cultural context
  nation: string,
  materials: string[],
  techniques: string[],
  culturalContext: string,    // Story behind the product
  
  // Vendor's external link (discovery-based model)
  externalURL: string,
  
  status: "active" | "pending" | "flagged" | "removed",
  flagReason: string,
  featured: boolean,
  
  createdAt: timestamp,
  updatedAt: timestamp
}
```

---

## 11. Pricing & Payments

### Simplified Two-Tier Model

| Feature | Essential ($1,250/yr) | Professional ($2,500/yr) |
|---------|----------------------|-------------------------|
| Job Listings | Up to 5 active | Unlimited |
| Organization Profile | Basic | Enhanced + Spotlight |
| Shop Indigenous | ❌ | ✅ Storefront |
| Application Management | ✅ | ✅ |
| Analytics | Basic | Advanced + Reporting |
| Support | Email | Priority |
| Search Placement | Standard | Featured |
| IOPPS Spotlight Video | ❌ | ✅ |
| Conference/Event Listings | ❌ | ✅ |

### Monthly Options

- Essential: $125/month
- Professional: $250/month
- Annual saves 20% (displayed prominently)

### Special Pricing

- **Non-profit discount**: 25% off (verified non-profits)
- **Free trial**: 14 days, no credit card required
- **Community members**: Always free (no subscription required)

### Stripe Integration

- Stripe Checkout for initial subscription
- Stripe Billing for recurring payments
- Stripe Customer Portal for plan management
- Webhook endpoint at `/api/stripe/webhook` for:
  - `checkout.session.completed`
  - `invoice.paid`
  - `invoice.payment_failed`
  - `customer.subscription.deleted`

---

## 12. Six Pillars of IOPPS

Each pillar is both a content category and a navigation section:

### Pillar 1: Jobs & Training
- Job board with Indigenous-specific filtering
- Training program directory
- Territory-based discovery
- Community endorsements on listings

### Pillar 2: Shop Indigenous
- Discovery-based marketplace (vendors handle own transactions)
- Cultural authenticity verification
- Nation/territory-based browsing
- Vendor storytelling (cultural context with every listing)
- See Section 13 for full marketplace spec

### Pillar 3: Conferences
- Indigenous conference directory
- Registration links (external)
- "Who's Attending" social feature (planned)
- Conference organization tools for professional plan orgs

### Pillar 4: Scholarships & Grants
- Aggregated funding opportunities
- Eligibility filtering by nation, territory, field of study
- Deadline tracking and notifications
- Application tips and resources

### Pillar 5: Pow Wows & Events
- Cultural event calendar
- Territory-based event discovery
- Event hosting tools for organizations
- Community-submitted events

### Pillar 6: Live Streams (IOPPS Spotlight)
- Professional video service for organizations
- Live streaming capabilities
- Recorded content library
- Available with Professional plan

### Future Pillar 7: Education
- University and college partnerships
- Indigenous student recruitment tools
- Tiered pricing for educational institutions
- Program directory and application tracking

---

## 13. Shop Indigenous Marketplace

### Core Model: Discovery, Not Transactions

Shop Indigenous is a **discovery and promotion platform** — it does NOT process transactions. Vendors handle their own sales. The platform's value is:

1. **Visibility** — Exposure to qualified buyers
2. **Verification** — Indigenous authenticity badge
3. **Community** — Storytelling and cultural connection

### Vendor Storefront Elements

- Hero image / banner
- Vendor name + verified badge
- Nation/tribal affiliation
- Business story / maker biography
- Cultural context and craftsmanship methods
- Product grid with images, titles, prices
- Primary CTA: "Visit Website" / "Shop [Vendor]'s Collection" (external link)
- Secondary CTAs: "Contact Vendor", "Request Quote"
- Social proof: Response time, years in business, followers

### Category Structure (7 top-level categories)

1. Art & Fine Crafts (paintings, prints, sculptures, pottery)
2. Jewelry & Accessories (rings, necklaces, earrings, bags)
3. Textiles & Clothing (blankets, apparel, rugs, weavings)
4. Home & Living (décor, furniture, kitchenware)
5. Food & Beverage (traditional foods, specialty items)
6. Professional Services (consulting, design, marketing, education)
7. Experiences (cultural tourism, workshops, events)

### Indigenous-Specific Filtering

- **Nation/Tribe filter**: Searchable dropdown, 500+ options, grouped by region
- **Geographic filters**: Regions, provinces, territories, international
- **Materials filter**: Beads, leather, silver, turquoise, cedar, etc.
- **Techniques filter**: Hand-woven, hand-beaded, hand-carved, etc.
- **Price range filter**
- **Availability filter**: Ready to ship, made to order

### Verification & Badges

- ✅ **Verified Indigenous Artist** — Tribal enrollment documentation
- 🏷️ **Tribal Affiliation Display** — Specific nation shown
- ⚡ **Quick Responder** — 95%+ response rate within 24hr
- ⭐ **Top Rated** — 4.8+ average rating
- 🌟 **Featured Artisan** — Editorial selection
- 🆕 **New Artist** — First 90 days (automatic visibility boost)

### "Business of the Day" Feature

- Daily homepage rotation featuring one vendor
- Combines curated editorial selection + algorithmic boosting
- New vendors get 90-day automatic visibility boost

---

## 14. Cultural Protocols & Indigenous Data Sovereignty

### OCAP® Principles (First Nations, Canada)

- **Ownership**: Communities collectively own their information
- **Control**: First Nations govern all aspects of information management
- **Access**: First Nations access their own information regardless of where it's held
- **Possession**: Physical control through Indigenous-controlled stewardship

### CARE Principles (Global)

- **Collective Benefit**: Data ecosystems enabling Indigenous benefit
- **Authority to Control**: Indigenous rights and authority recognized
- **Responsibility**: Accountability for how data supports self-determination
- **Ethics**: Indigenous rights and wellbeing as primary concern

### Platform Implementation Requirements

1. **Community-controlled data storage** — Clear data storage agreements
2. **Granular permission systems** — Different access for family, clan, nation, public
3. **Exit rights and data portability** — Complete data export with metadata
4. **No secondary use without re-consent** — Especially for AI/ML training
5. **Community override capabilities** — Nations can request removal of misappropriated content

### Identity Protocol Support

- **Expanded identity fields**: Nation, clan, Treaty territory, Band, traditional territory
- **Introduction protocols**: Support for cultural introduction formats (pepeha, "Who's your mob?")
- **Approaching Elders**: Proper protocol facilitation (not cold outreach)
- **Knowledge tiering**: Sacred/restricted/public content levels
- **Deceased content protocols**: Respectful handling upon community notification

### Content Moderation — Cultural Sensitivity

- Cultural concern reports are **highest priority** and may require Elder consultation
- "Request Elder Input" button in moderation queue for cultural issues
- Community-endorsed content review for Indigenous authenticity claims
- Fake Indigenous goods flagging (the fake Indigenous art market exceeds $1 billion annually)

---

## 15. Testing Protocols

### Canonical Test Profiles

**ALWAYS use these profiles when testing. Do not create ad-hoc test data.**

#### Profile 1: Community Member — Sarah Whitebear

| Field | Value |
|-------|-------|
| ID | `test-member-001` |
| Email | `sarah.whitebear@test.iopps.ca` |
| Name | Sarah Whitebear |
| Nation | Cree (Nehiyaw) |
| Territory | Treaty 6 Territory |
| Band | Muskeg Lake Cree Nation |
| Location | Saskatoon, Saskatchewan |
| Role | Senior Education Consultant |
| Status | Verified member, open to work |

#### Profile 2: Organization — Northern Lights Indigenous Consulting

| Field | Value |
|-------|-------|
| ID | `test-org-001` |
| Slug | `northern-lights-indigenous-consulting` |
| Email | `hello@northernlightsconsulting.ca` |
| Name | Northern Lights Indigenous Consulting |
| Nation | Métis (Michif) |
| Territory | Métis Nation—Saskatchewan Homeland |
| Location | Saskatoon, Saskatchewan |
| Ownership | 100% Indigenous-owned |
| Verification | CCIB Certified Aboriginal Business |
| Plan | Professional tier, active |
| Capabilities | Hiring ✅, Products ✅, Services ✅, Events ✅, Training ✅ |

### Test Scenarios

**Scenario A: Employer Signs Up and Posts a Job**
1. Land on employer landing page
2. Select "Employer" type
3. Complete signup form with Northern Lights profile
4. Fill all 4 onboarding tabs
5. Select Professional plan
6. Enter payment details
7. View welcome screen, click "Post Your First Job"
8. Create job listing with all fields
9. View success confirmation
10. Navigate to dashboard, verify job appears

**Scenario B: Community Member Finds and Applies for a Job**
1. Land on community landing page
2. Select "Job Seeker" type
3. Complete signup with Sarah Whitebear profile
4. Fill all 4 onboarding tabs
5. View welcome screen, click "Browse Jobs"
6. Use search and filters on discovery feed
7. Click into a job detail
8. Complete 3-step application process
9. View success confirmation
10. Navigate to profile, verify activity

**Scenario C: Admin Reviews the Platform**
1. View admin dashboard, check all 6 stat cards
2. Navigate to user management, search for Sarah Whitebear
3. Navigate to organizations, filter by "Pending"
4. Open verification queue, review pending org
5. Check verification checklist, add notes
6. Navigate to jobs, filter by "Flagged"
7. Open moderation queue, review cultural concern report
8. Navigate to settings, toggle maintenance mode on/off

---

## 16. Interactive Prototype Reference

### The Prototype File

The interactive prototype is a **single React JSX file** (`iopps-journeys-combined.jsx`) containing all 28 screens across 3 journeys. It serves as the **visual specification** for the production website.

**File stats**: ~3,567 lines, 28 screen components, 1 default export

### How to Use the Prototype

1. The file is a self-contained React component using only `useState`, `useEffect`, `useRef` from React
2. It contains its own design tokens, icons, shared components, and all screen implementations
3. It can be rendered in any React environment (Claude Artifacts, CodeSandbox, etc.)
4. Each screen demonstrates exact layout, content, interactions, and visual design

### Screen Component Map

| Key | Component | Journey | Lines (approx) |
|-----|-----------|---------|----------------|
| landing | EmpLandingScreen | Employer | 234–322 |
| typeSelect | EmpTypeSelectScreen | Employer | 323–381 |
| signup | EmpSignupScreen | Employer | 382–440 |
| onboarding | EmpOnboardingScreen | Employer | 441–573 |
| plans | PlansScreen | Employer | 574–865 |
| payment | PaymentScreen | Employer | 866–928 |
| welcome | EmpWelcomeScreen | Employer | 929–969 |
| postJob | PostJobScreen | Employer | 970–1106 |
| jobSuccess | JobSuccessScreen | Employer | 1107–1145 |
| dashboard | DashboardScreen | Employer | 1146–1317 |
| landing | MemLandingScreen | Community | 1318–1402 |
| typeSelect | MemTypeSelectScreen | Community | 1403–1461 |
| signup | MemSignupScreen | Community | 1462–1523 |
| onboarding | MemOnboardingScreen | Community | 1524–1695 |
| welcome | MemWelcomeScreen | Community | 1696–1736 |
| discover | DiscoverScreen | Community | 1737–1891 |
| jobDetail | JobDetailScreen | Community | 1892–2019 |
| apply | ApplyScreen | Community | 2020–2179 |
| appSuccess | AppSuccessScreen | Community | 2180–2249 |
| profile | ProfileScreen | Community | 2250–2414 |
| dashboard | AdminDashScreen | Admin | 2415–2541 |
| users | AdminUsersScreen | Admin | 2542–2694 |
| orgs | AdminOrgsScreen | Admin | 2695–2782 |
| verification | AdminVerifyScreen | Admin | 2783–2952 |
| jobs | AdminJobsScreen | Admin | 2953–3045 |
| moderation | AdminModerationScreen | Admin | 3046–3205 |
| shop | AdminShopScreen | Admin | 3206–3289 |
| settings | AdminSettingsScreen | Admin | 3290–3409 |

### Translating Prototype → Production

The prototype uses inline styles for portability. In production:

| Prototype | Production |
|-----------|-----------|
| `const C = { ... }` (color tokens) | `tailwind.config.js` theme extension |
| Inline `style={{ }}` | Tailwind utility classes |
| Custom `Btn`, `Input`, etc. | shadcn/ui `Button`, `Input`, etc. |
| `useState` for screen routing | Next.js App Router pages |
| Mock data in components | Firestore queries + server components |
| Single-file architecture | Component-per-file structure |
| `fadeUp` animation objects | Tailwind `animate-` classes or Framer Motion |

---

## Appendix: Active Organizations (Real Data)

These organizations are already active on the platform:

- **Saskatchewan Indian Gaming Authority (SIGA)** — Gaming & Entertainment
- **Saskatoon Tribal Council (STC)** — Government/Tribal Council
- **Northern Lights Indigenous Consulting** — Professional Services

Over 100 job listings are currently live on the platform.

---

## Appendix: Competitive Research — Successful Indigenous Platforms

| Platform | Region | Key Innovation | Scale |
|----------|--------|---------------|-------|
| **Supply Nation** | Australia | 5-step verification, 51% Indigenous ownership required | 5,700+ businesses, $2.5B activity |
| **Whāriki** | New Zealand | "Tūrangawaewae" (culturally safe space), social franchise | 6,670 members, 3,676 businesses |
| **AISES** | USA | Professional + cultural grounding | 7,300+ members, 196 chapters |
| **FirstVoices** | Canada | Language revitalization, community control | 65+ language sites, 100+ languages |
| **Eighth Generation** | USA | Artist licensing, ongoing royalties | First tribally-owned lifestyle brand |
| **B.YELLOWTAIL** | USA | 70% profit to artists, major retail partnerships | 50+ artists, Met/Crate&Barrel |
| **Indigenous Box** | Canada | Corporate gifting channel | Ships to 27 countries |

---

*This document is the single source of truth for IOPPS.ca development. The interactive prototype file (`iopps-journeys-combined.jsx`) is the visual specification. Together, they contain everything needed to build the production platform.*
