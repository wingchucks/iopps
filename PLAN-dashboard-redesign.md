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

## Recommended Solution: Unified Profile with Feature Selection

### Registration Flow

When a user registers as an organization, they select what they want to do:

```
What would you like to do on IOPPS? (select all that apply)

☐ Post Jobs & Training Programs
☐ Host Events (Conferences, Pow Wows)
☐ Offer Scholarships
☐ Sell Products/Services
```

*(Live Streaming is IOPPS-only, not shown to users)*

---

## How Each Selection Affects the Dashboard

### Single Selection Scenarios

#### Option 1 Only: "Post Jobs & Training Programs"
**Use case:** Company that just wants to hire Indigenous talent

**Dashboard Tabs:**
| Tab | Included |
|-----|----------|
| Overview | ✓ (shows job stats only) |
| Jobs & Training | ✓ |
| Applications | ✓ |
| Messages | ✓ |
| Billing | ✓ |
| Profile | ✓ |

**Overview KPIs:**
- Active Jobs: 5
- Total Applications: 23
- Pending Review: 8
- Profile Views: 156

**Profile Fields Shown:**
- Organization name, logo, banner
- Description (focused on "why work here")
- Location, website
- Industry
- Contact email for applicants

---

#### Option 2 Only: "Host Events (Conferences, Pow Wows)"
**Use case:** Event organizer, cultural organization, or band council hosting gatherings

**Dashboard Tabs:**
| Tab | Included |
|-----|----------|
| Overview | ✓ (shows event stats only) |
| Events | ✓ (conferences + pow wows combined) |
| Messages | ✓ |
| Billing | ✓ |
| Profile | ✓ |

**Overview KPIs:**
- Active Events: 2
- Upcoming This Month: 1
- Total RSVPs: 340
- Profile Views: 89

**Profile Fields Shown:**
- Organization name, logo, banner
- Description (focused on your mission/history)
- Location
- Website, social media links
- Contact email

---

#### Option 3 Only: "Offer Scholarships"
**Use case:** Foundation, band, or company offering educational funding

**Dashboard Tabs:**
| Tab | Included |
|-----|----------|
| Overview | ✓ (shows scholarship stats only) |
| Scholarships | ✓ |
| Applications | ✓ |
| Messages | ✓ |
| Billing | ✓ |
| Profile | ✓ |

**Overview KPIs:**
- Active Scholarships: 3
- Total Applications: 67
- Awarded This Year: 12
- Total Value Awarded: $45,000

**Profile Fields Shown:**
- Organization name, logo, banner
- Description (focused on mission/giving back)
- Location
- Website
- Contact email

---

#### Option 4 Only: "Sell Products/Services"
**Use case:** Indigenous artisan, craftsperson, or service provider

**Dashboard Tabs:**
| Tab | Included |
|-----|----------|
| Overview | ✓ (shows shop stats only) |
| Shop | ✓ |
| Products | ✓ |
| Messages | ✓ |
| Billing | ✓ |
| Profile | ✓ |

**Overview KPIs:**
- Products Listed: 12
- Profile Views: 234
- Favorites: 18
- Messages This Week: 5

**Profile Fields Shown:**
- Business name, logo, cover image
- Tagline
- Description + "Your Story" (community connection)
- Category (Art & Crafts, Services, Food, etc.)
- Location, region
- Shipping options (offers shipping, online only)
- Contact: email, phone, website
- Social media: Instagram, Facebook, TikTok
- Nation/Affiliation

---

### Multi-Selection Scenarios

#### Options 1 + 2: "Jobs & Training" + "Events"
**Use case:** Large organization that hires AND hosts conferences/pow wows

**Dashboard Tabs:**
```
Overview | Jobs & Training | Events | Applications | Messages | Billing | Profile
```

**Overview shows:**
- Section: "Hiring" - Active Jobs, Applications, etc.
- Section: "Events" - Upcoming events, RSVPs, etc.

---

#### Options 1 + 3: "Jobs & Training" + "Scholarships"
**Use case:** Company that hires AND offers educational scholarships

**Dashboard Tabs:**
```
Overview | Jobs & Training | Scholarships | Applications | Messages | Billing | Profile
```

**Applications tab has sub-filters:**
- Job Applications
- Scholarship Applications

---

#### Options 1 + 4: "Jobs & Training" + "Sell Products"
**Use case:** Indigenous business that hires employees AND sells products

**Dashboard Tabs:**
```
Overview | Jobs & Training | Shop | Applications | Messages | Billing | Profile
```

**This is the current confusing state - but now it's OPT-IN, not forced on everyone**

---

#### Options 2 + 4: "Events" + "Sell Products"
**Use case:** Artisan who sells crafts AND hosts workshops/gatherings

**Dashboard Tabs:**
```
Overview | Events | Shop | Products | Messages | Billing | Profile
```

---

#### Options 1 + 2 + 3: "Jobs" + "Events" + "Scholarships"
**Use case:** Large Indigenous organization (band council, tribal enterprise)

**Dashboard Tabs:**
```
Overview | Jobs & Training | Events | Scholarships | Applications | Messages | Billing | Profile
```

---

#### All 4 Options Selected
**Use case:** Full-service Indigenous organization doing everything

**Dashboard Tabs:**
```
Overview | Jobs & Training | Events | Scholarships | Shop | Applications | Messages | Billing | Profile
```

**This is essentially today's dashboard - but the user CHOSE to have all these features**

---

## Profile Field Mapping

The unified profile combines fields from both current profiles:

| Field | Jobs | Events | Scholarships | Shop | Source |
|-------|------|--------|--------------|------|--------|
| Organization/Business Name | ✓ | ✓ | ✓ | ✓ | Both |
| Logo | ✓ | ✓ | ✓ | ✓ | Both |
| Banner/Cover Image | ✓ | ✓ | ✓ | ✓ | Both |
| Description | ✓ | ✓ | ✓ | ✓ | Both |
| Tagline | - | - | - | ✓ | Vendor |
| Location | ✓ | ✓ | ✓ | ✓ | Both |
| Region/Province | - | - | - | ✓ | Vendor |
| Industry | ✓ | - | - | - | Employer |
| Category | - | - | - | ✓ | Vendor |
| Website | ✓ | ✓ | ✓ | ✓ | Both |
| Contact Email | ✓ | ✓ | ✓ | ✓ | Both |
| Phone | - | - | - | ✓ | Vendor |
| Instagram | - | - | - | ✓ | Vendor |
| Facebook | - | - | - | ✓ | Vendor |
| TikTok | - | - | - | ✓ | Vendor |
| Nation/Affiliation | - | - | - | ✓ | Vendor |
| "Your Story" | - | - | - | ✓ | Vendor |
| Offers Shipping | - | - | - | ✓ | Vendor |
| Online Only | - | - | - | ✓ | Vendor |

**Key insight:** The profile form dynamically shows only the fields relevant to the selected features.

---

## User Flow: Changing Features Later

Users can enable/disable features anytime from Settings:

```
Organization Settings → Features

Currently Active:
✓ Jobs & Training     [Manage →]
✓ Events              [Manage →]

Available to Enable:
○ Scholarships        [Enable →]
○ Marketplace         [Enable →]

Note: Disabling a feature hides it from your dashboard
but doesn't delete your data.
```

---

## Billing Considerations

Different features may have different pricing:

| Feature | Pricing Model |
|---------|---------------|
| Jobs & Training | Pay per posting OR subscription |
| Events | Free to list (conferences, pow wows) |
| Scholarships | Free to list |
| Marketplace | Monthly subscription ($15-50/mo) |

When a user enables a paid feature, they're prompted to subscribe or pay.

---

## Implementation Phases

### Phase 1: Data Model Update
1. Add `enabledFeatures` object to EmployerProfile:
   ```typescript
   enabledFeatures: {
     hiring: boolean,      // jobs & training
     events: boolean,      // conferences & pow wows
     scholarships: boolean,
     marketplace: boolean  // shop
   }
   ```
2. Add missing Vendor fields to EmployerProfile (tagline, category, nation, social links, etc.)

### Phase 2: Registration Update
1. Replace role selector with feature checkboxes
2. Create appropriate initial profile based on selections
3. Redirect to relevant onboarding

### Phase 3: Dashboard Refactor
1. Create `useDashboardTabs()` hook that returns tabs based on `enabledFeatures`
2. Update Overview to show only relevant KPIs
3. Conditionally render Quick Actions
4. Update navigation

### Phase 4: Profile Form Update
1. Create sections that show/hide based on features
2. Merge Vendor profile editing into main Profile tab
3. Remove separate Shop profile editing

### Phase 5: Migration
1. For existing users with Vendor data, set `marketplace: true`
2. For existing employers without Vendor data, set based on activity
3. Merge Vendor fields into EmployerProfile where applicable

---

## Visual Mockups

### Registration Screen
```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│              Join IOPPS as an Organization              │
│                                                         │
│  Organization Name                                      │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Red Pheasant First Nation                       │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  Email                                                  │
│  ┌─────────────────────────────────────────────────┐   │
│  │ contact@example.com                             │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  Password                                               │
│  ┌─────────────────────────────────────────────────┐   │
│  │ ••••••••••••                                    │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  What would you like to do on IOPPS?                   │
│  Select all that apply - you can change this later     │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ ☑ Post Jobs & Training Programs                 │   │
│  │   Reach Indigenous talent across Canada         │   │
│  ├─────────────────────────────────────────────────┤   │
│  │ ☐ Host Events (Conferences, Pow Wows)          │   │
│  │   Promote gatherings and cultural events        │   │
│  ├─────────────────────────────────────────────────┤   │
│  │ ☐ Offer Scholarships                           │   │
│  │   Support Indigenous students and learners      │   │
│  ├─────────────────────────────────────────────────┤   │
│  │ ☑ Sell Products or Services                    │   │
│  │   List on the Indigenous Marketplace            │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │            Create Organization Account          │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Dashboard - Jobs + Shop Selected
```
┌─────────────────────────────────────────────────────────────────────────┐
│  IOPPS                                           [Notifications] [User] │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Organization Dashboard                                                 │
│  Manage your opportunities and business                                 │
│                                                                         │
│  ┌─────────┬─────────────┬─────────────┬──────────┬─────────┬────────┐ │
│  │Overview │Jobs&Training│    Shop     │Applications│Messages│Settings│ │
│  └─────────┴─────────────┴─────────────┴──────────┴─────────┴────────┘ │
│       ↑                        ↑                                        │
│    (active)              (because they                                  │
│                          enabled Shop)                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ Profile Strength: 85%  [████████████████░░░░]                   │   │
│  │ Quick wins: Add banner image (+5%), Add contact email (+5%)     │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  HIRING                                    MARKETPLACE                  │
│  ┌──────────────┐ ┌──────────────┐        ┌──────────────┐             │
│  │   5          │ │   23         │        │   12         │             │
│  │ Active Jobs  │ │ Applications │        │ Products     │             │
│  │              │ │ 8 pending    │        │ Listed       │             │
│  └──────────────┘ └──────────────┘        └──────────────┘             │
│                                                                         │
│  Quick Actions                                                          │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐          │
│  │ 💼         │ │ 📦         │ │ 💬         │ │ ⚙️         │          │
│  │ Post a Job │ │ Add Product│ │ Messages   │ │ Settings   │          │
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘          │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Dashboard - Shop Only Selected
```
┌─────────────────────────────────────────────────────────────────────────┐
│  IOPPS                                           [Notifications] [User] │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Shop Dashboard                                                         │
│  Manage your Indigenous business listing                                │
│                                                                         │
│  ┌─────────┬──────────┬──────────┬─────────┬────────┐                  │
│  │Overview │ Products │ Messages │ Billing │Settings│                  │
│  └─────────┴──────────┴──────────┴─────────┴────────┘                  │
│                                                                         │
│  ↑ Much simpler! Only 5 tabs instead of 8                              │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐                    │
│  │   12         │ │   234        │ │ Saskatchewan │                    │
│  │ Products     │ │ Profile      │ │   Region     │                    │
│  │ Listed       │ │ Views        │ │              │                    │
│  └──────────────┘ └──────────────┘ └──────────────┘                    │
│                                                                         │
│  Your Listing Preview                                                   │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  [Banner Image]                                                  │   │
│  │  ┌────┐                                                         │   │
│  │  │Logo│  INDIGENOUS CRAFTS CO.                                  │   │
│  │  └────┘  Handmade beadwork and traditional crafts               │   │
│  │          Art & Crafts · Saskatchewan · Offers Shipping          │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  Quick Actions                                                          │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐                         │
│  │ 📦         │ │ ✏️         │ │ 👁️         │                         │
│  │Add Product │ │Edit Profile│ │View Public │                         │
│  └────────────┘ └────────────┘ └────────────┘                         │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Settings - Enable More Features
```
┌─────────────────────────────────────────────────────────────────────────┐
│  Organization Settings                                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Features                                                               │
│  Choose what you want to do on IOPPS                                   │
│                                                                         │
│  CURRENTLY ACTIVE                                                       │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ ✓ Sell Products or Services                      [Manage →]     │   │
│  │   Your shop is live with 12 products                            │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  AVAILABLE TO ENABLE                                                    │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ ○ Post Jobs & Training Programs                  [Enable →]     │   │
│  │   Reach Indigenous talent across Canada                         │   │
│  │   Free to enable · Pay per job posting                          │   │
│  ├─────────────────────────────────────────────────────────────────┤   │
│  │ ○ Host Events (Conferences, Pow Wows)           [Enable →]     │   │
│  │   Promote gatherings and cultural events                        │   │
│  │   Free to enable and post                                       │   │
│  ├─────────────────────────────────────────────────────────────────┤   │
│  │ ○ Offer Scholarships                            [Enable →]     │   │
│  │   Support Indigenous students and learners                      │   │
│  │   Free to enable and post                                       │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ℹ️ Enabling a feature adds it to your dashboard. You can disable     │
│     features anytime without losing your data.                         │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Questions for You

1. **Should "Events" be split into "Conferences" and "Pow Wows" as separate features?**
   - Or keep them combined since they share similar data?

2. **For the marketplace subscription, should it be separate from job posting credits?**
   - Current: Separate billing flows
   - Proposed: Keep separate OR bundle into tiers?

3. **Should we keep separate public profile pages?**
   - `/employers/[id]` - Shows jobs, about company
   - `/marketplace/[slug]` - Shows products, shop info
   - Or unify into `/organizations/[slug]` with sections?

4. **Migration strategy for existing users?**
   - Auto-detect based on what they've posted?
   - Ask them to select features on next login?

---

*Created: 2025-12-20*
*Updated: 2025-12-20*
