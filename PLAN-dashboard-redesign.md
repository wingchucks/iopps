# IOPPS Dashboard Redesign Plan

## Problem Statement

The current employer dashboard serves **two distinct user personas** with different needs, creating confusion:

1. **Employers** - Organizations that want to post jobs, training programs, conferences, scholarships, and pow wows
2. **Vendors** - Indigenous businesses that want to sell products or services on the marketplace

Currently, both personas share ONE dashboard with:
- 8 tabs that aren't relevant to everyone
- TWO separate profile systems (Employer Profile + Vendor/Shop Profile)
- Different data requirements for each use case
- Confusing navigation where a job poster sees "Shop" and a product seller sees "Applications"

---

## Current Architecture Analysis

### Data Models
```
EmployerProfile (employers collection)
├── organizationName, description, website, location
├── logoUrl, bannerUrl
├── industry, contactEmail
├── status (pending/approved/rejected)
└── Used for: jobs, conferences, scholarships, pow wows, training

Vendor (vendors collection)
├── businessName, tagline, description
├── category, region, location
├── logoUrl, coverImageUrl
├── email, phone, social links
├── nation, communityStory
├── status (draft/pending/active)
└── Used for: marketplace products/services
```

### Current Dashboard Tabs
| Tab | Employer Use | Vendor Use |
|-----|-------------|------------|
| Overview | Yes | Partial |
| Opportunities | Yes (jobs, events) | No |
| Applications | Yes | No |
| Messages | Yes | Yes |
| Videos | Yes | No |
| **Shop** | No | **Yes** |
| Billing & Payments | Yes | Yes (separate) |
| Profile & Settings | Yes | Has separate profile in Shop |

### Registration Flow Problem
When someone registers as "employer":
- They get an `EmployerProfile` created
- They ALSO get a draft `Vendor` profile auto-created
- But they might only want ONE of these features

---

## Proposed Solutions

### Option A: Role-Based Tab Visibility (Quick Fix)
**Effort: Low | Impact: Medium**

Keep the single dashboard but show/hide tabs based on user activity:

```
Default view (new employer):
├── Overview
├── Opportunities (jobs, conferences, pow wows, scholarships)
├── Applications
├── Messages
├── Billing
└── Profile

If vendor profile is activated:
├── + Shop tab appears
```

**Pros:**
- Minimal code changes
- Progressive disclosure - users see complexity only when needed
- Preserves existing data architecture

**Cons:**
- Still one profile per feature (employer + vendor profiles remain separate)
- Doesn't solve the "two profiles" confusion

---

### Option B: Unified Profile with Feature Toggles (Recommended)
**Effort: Medium | Impact: High**

Create a single Organization profile with toggleable features:

```
Organization Profile (unified)
├── Core Info: name, logo, banner, description, location
├── Contact: email, phone, website, social links
├── Identity: industry, nation/affiliation
│
├── Features Enabled:
│   ├── [ ] Hiring (jobs, training)
│   ├── [ ] Events (conferences, pow wows)
│   ├── [ ] Scholarships
│   ├── [ ] Marketplace (products/services)
│   └── [ ] Live Streaming
```

**Dashboard Structure:**
```
Overview (shows only enabled features)
├── Jobs & Training (if hiring enabled)
├── Events (if events enabled)
├── Scholarships (if enabled)
├── Shop (if marketplace enabled)
├── Applications (if hiring enabled)
├── Messages
├── Analytics
├── Billing
└── Organization Settings (single profile)
```

**Pros:**
- Single source of truth for organization info
- Users enable only what they need
- Cleaner mental model
- Scales well as you add more pillars

**Cons:**
- Requires data migration (merge employer + vendor profiles)
- Medium development effort

---

### Option C: Separate Dashboards (Complete Split)
**Effort: High | Impact: High**

Create TWO distinct dashboards with separate entry points:

```
/organization/dashboard     → Employer Dashboard (jobs, events, scholarships)
/shop/dashboard            → Vendor Dashboard (marketplace only)
```

**Registration Options:**
- "I want to post jobs/opportunities" → Employer flow
- "I want to sell products/services" → Vendor flow
- "Both" → Creates both accounts linked together

**Pros:**
- Cleanest separation of concerns
- Each dashboard is focused and simple
- Different subscription tiers per dashboard

**Cons:**
- Users who want both must manage two dashboards
- More code to maintain
- May confuse users who want both features

---

### Option D: Workspace/Context Switcher
**Effort: Medium-High | Impact: High**

Single dashboard with a context switcher at the top:

```
┌─────────────────────────────────────────────────────┐
│  [IOPPS Indigenous Opportunities]  [Switch Context ▼]│
│                                    ├── Hiring & Events│
│                                    └── Shop & Sell   │
└─────────────────────────────────────────────────────┘
```

Each context shows only relevant tabs and uses the appropriate profile:

**Hiring & Events Context:**
- Overview, Opportunities, Applications, Messages, Billing, Profile

**Shop & Sell Context:**
- Overview, Products, Orders, Messages, Analytics, Profile

**Pros:**
- Clear separation without separate URLs
- Easy to switch between roles
- Familiar pattern (like Slack workspaces)

**Cons:**
- Still two profiles under the hood
- UI complexity for the switcher

---

## Recommended Approach: Option B (Unified Profile)

### Implementation Phases

#### Phase 1: Profile Unification (Week 1-2)
1. Create migration script to merge Vendor fields into EmployerProfile
2. Add feature flags to EmployerProfile:
   ```typescript
   enabledFeatures: {
     hiring: boolean,      // jobs, training
     events: boolean,      // conferences, pow wows
     scholarships: boolean,
     marketplace: boolean, // shop/products
     streaming: boolean    // live streams
   }
   ```
3. Update registration to ask "What do you want to do on IOPPS?" with checkboxes
4. Single profile form with all fields

#### Phase 2: Dashboard Refactor (Week 2-3)
1. Conditionally render tabs based on `enabledFeatures`
2. Merge Shop profile editing into main Profile tab
3. Update Overview to only show relevant KPIs
4. Clean up Quick Actions based on enabled features

#### Phase 3: Onboarding Flow (Week 3)
1. New user sees feature selection screen
2. Guided setup based on selected features
3. Easy way to enable new features later (Settings → Features)

#### Phase 4: Data Migration (Week 4)
1. Run migration for existing users
2. Map Vendor data → EmployerProfile fields
3. Handle edge cases (users with both profiles)

---

## UI/UX Wireframes

### New Registration Flow
```
Step 1: Create Account
┌─────────────────────────────────────────┐
│         Welcome to IOPPS                │
│                                         │
│  Organization Name: [________________]  │
│  Email: [________________]              │
│  Password: [________________]           │
│                                         │
│  What would you like to do? (select all)│
│  ┌─────────────────────────────────┐   │
│  │ ☐ Post Jobs & Training Programs │   │
│  │ ☐ Host Events (Conferences, etc)│   │
│  │ ☐ Offer Scholarships            │   │
│  │ ☐ Sell Products/Services        │   │
│  │ ☐ Live Stream Events            │   │
│  └─────────────────────────────────┘   │
│                                         │
│  [Create Account]                       │
└─────────────────────────────────────────┘
```

### New Dashboard (Unified)
```
┌─────────────────────────────────────────────────────────────────┐
│  IOPPS Organization Dashboard                                    │
├─────────────────────────────────────────────────────────────────┤
│  [Overview] [Jobs] [Events] [Shop] [Messages] [Billing] [Settings]│
│                ↑       ↑       ↑                                 │
│           (only if  (only if (only if                           │
│            hiring)   events)  marketplace)                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Profile Strength: 85%                                          │
│  [================----]                                          │
│                                                                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                        │
│  │ 5 Active │ │ 2 Events │ │ 12 Prods │  ← Only shows          │
│  │   Jobs   │ │  Posted  │ │ Listed   │    enabled features    │
│  └──────────┘ └──────────┘ └──────────┘                        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Settings → Enable Features
```
┌─────────────────────────────────────────┐
│  Organization Features                   │
│                                         │
│  Active Features:                        │
│  ✓ Jobs & Training     [Manage →]       │
│  ✓ Events              [Manage →]       │
│                                         │
│  Available Features:                     │
│  ○ Marketplace         [Enable →]       │
│  ○ Scholarships        [Enable →]       │
│  ○ Live Streaming      [Enable →]       │
│                                         │
└─────────────────────────────────────────┘
```

---

## Questions to Consider

1. **Should marketplace (Shop) have its own subscription tier separate from job posting?**
   - Currently both seem to have different billing flows

2. **Can one organization have multiple "brands"?**
   - e.g., Main company + separate marketplace storefront name

3. **Should we keep separate public pages for employers vs vendors?**
   - `/employers/[id]` shows job-focused profile
   - `/marketplace/[slug]` shows shop-focused profile

4. **Data migration strategy for existing users?**
   - Some may have both employer AND vendor profiles with different data

---

## Next Steps

1. **Decide on approach** - Review this plan and pick an option
2. **Create detailed tasks** - Break down chosen option into specific dev tasks
3. **Design mockups** - Create detailed UI mockups for user approval
4. **Implementation** - Build incrementally with frequent feedback

---

*Created: 2025-12-20*
*Author: Claude (AI Assistant)*
