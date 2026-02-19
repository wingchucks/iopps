# Dashboard Redesign: Employer/Vendor Mode Toggle

## Executive Summary

This plan outlines how to implement the simplified dashboard design from the mockup, which introduces a **sidebar-based navigation with a binary Employer/Vendor toggle** to replace the current horizontal tab navigation.

**Design Reference**: `EnhancedDashboard.tsx` mockup component (binary toggle version)

**Key Design Decisions** (from refined mockup):
- Binary toggle switch (click to flip between modes)
- localStorage persistence for mode preference
- Lucide icons throughout
- Glassmorphic UI with IOPPS brand colors
- Blue accent for Employer mode, Teal accent for Vendor mode

---

## Current State Analysis

### Existing Architecture (What We Have)

**Dashboard Location**: `/web/app/organization/dashboard/page.tsx`

**Current Navigation**: Horizontal tabs with 8 items:
- Overview, Opportunities, Applications, Messages, Videos, **Shop**, Billing, Profile

**Dual Profile System Already Exists**:
- `employers` collection - Organization/employer data
- `vendors` collection - Shop/vendor data
- Same `userId` links both profiles
- Vendors auto-created when employers register (draft status)
- Shop tab already embedded in employer dashboard

**Current Tabs by Category**:
| Employer-Focused | Vendor-Focused | Shared |
|------------------|----------------|--------|
| Overview | Shop (embedded) | Messages |
| Opportunities | | Billing |
| Applications | | Profile |
| Videos | | |

---

## Proposed Changes

### 1. Layout Transformation

**FROM**: Full-width page with horizontal tabs
**TO**: Sidebar + main content area (as shown in mockup)

```
┌─────────────────────────────────────────────────────────┐
│  Header (existing site header)                          │
├─────────────┬───────────────────────────────────────────┤
│  SIDEBAR    │  MAIN CONTENT                             │
│             │                                           │
│  [Org Logo] │  [Mode Badge] [Page Title]    [Action]   │
│  Org Name   │                                           │
│             │  [Stats Cards Row]                        │
│  ─────────  │                                           │
│  MODE       │  [Content Area]                           │
│  [Employer] │                                           │
│  [Vendor]   │                                           │
│             │                                           │
│  ─────────  │                                           │
│  [Mode Nav] │                                           │
│             │                                           │
│  ─────────  │                                           │
│  ACCOUNT    │                                           │
│  [Shared]   │                                           │
└─────────────┴───────────────────────────────────────────┘
```

### 2. Navigation Structure

**Employer Mode** (Blue accent - `#3B82F6`):
- Overview (stats: Active Jobs, Applications, Job Views, Interviews)
- Job Postings
- Applications (with badge count)
- Interview Videos
- Saved Candidates (future feature placeholder)

**Vendor Mode** (Green accent - `#10B981`):
- Overview (stats: Products, Services, Shop Views, Inquiries)
- Products
- Services
- Inquiries (with badge count)
- Shop Profile

**Shared (Account)** (Teal accent - `#14B8A6`):
- Messages (with badge count)
- Organization Profile
- Billing

### 3. Mode Toggle Behavior

- Toggle persists in URL: `?mode=employer` or `?mode=vendor`
- Toggle persists in localStorage for session continuity
- Switching modes resets to Overview of that mode
- Mode indicator badge shown in page header
- Primary action button changes based on mode:
  - Employer: "+ Post Job"
  - Vendor: "+ Add Product"

---

## Files to Create/Modify

### New Files

| File | Purpose |
|------|---------|
| `/components/organization/DashboardSidebar.tsx` | New sidebar component with mode toggle |
| `/components/organization/DashboardLayout.tsx` | Layout wrapper with sidebar + content |
| `/components/organization/ModeToggle.tsx` | Employer/Vendor toggle component |
| `/components/organization/StatCard.tsx` | Reusable stat card (from mockup) |
| `/app/organization/dashboard/VendorOverviewTab.tsx` | Vendor-specific overview |
| `/app/organization/dashboard/ProductsTab.tsx` | Products management (extracted from ShopTab) |
| `/app/organization/dashboard/ServicesTab.tsx` | Services management |
| `/app/organization/dashboard/InquiriesTab.tsx` | Vendor inquiries |
| `/app/organization/dashboard/ShopProfileTab.tsx` | Shop profile editor (extracted from ShopTab) |

### Modified Files

| File | Changes |
|------|---------|
| `/app/organization/dashboard/page.tsx` | Complete rewrite to use new layout |
| `/app/organization/dashboard/OverviewTab.tsx` | Rename to `EmployerOverviewTab.tsx`, update stats |
| `/app/organization/dashboard/ShopTab.tsx` | Split into separate tabs (Products, Services, ShopProfile) |
| `/lib/types.ts` | Add `DashboardMode` type |
| `/app/globals.css` | Add sidebar-specific styles |

---

## Implementation Phases

### Phase 1: Core Layout & Toggle (Foundation)
1. Create `DashboardLayout.tsx` with grid layout (sidebar + content)
2. Create `DashboardSidebar.tsx` with organization info section
3. Create `ModeToggle.tsx` component with Employer/Vendor buttons
4. Add mode state management (URL params + localStorage)
5. Update `page.tsx` to use new layout

### Phase 2: Navigation System
1. Define mode-specific navigation items
2. Implement dynamic nav rendering based on active mode
3. Add active state styling (blue for employer, green for vendor)
4. Implement section switching within each mode
5. Add badge counts for Applications/Inquiries/Messages

### Phase 3: Split Shop Tab
1. Extract Products management into `ProductsTab.tsx`
2. Extract Services into `ServicesTab.tsx` (currently uses same product system)
3. Extract Shop Profile editor into `ShopProfileTab.tsx`
4. Create `InquiriesTab.tsx` for vendor inquiries/messages
5. Create `VendorOverviewTab.tsx` with vendor-specific stats

### Phase 4: Overview Tabs
1. Update `EmployerOverviewTab.tsx` with employer stats (jobs, applications, views, interviews)
2. Create `VendorOverviewTab.tsx` with vendor stats (products, services, views, inquiries)
3. Add "Recent Applications" list to employer overview
4. Add "Product Performance" list to vendor overview

### Phase 5: Styling & Polish
1. Apply brand colors from mockup (match existing Tailwind config)
2. Add mode indicator badge to page headers
3. Update primary action buttons based on mode
4. Add smooth transitions between modes
5. **Mobile bottom tab bar** - fixed navigation at bottom on screens <768px

### Phase 6: Persistence & Deep Linking
1. Persist mode in URL query params
2. Persist last-used mode in localStorage
3. Support deep links: `/organization/dashboard?mode=vendor&section=products`
4. Handle legacy URLs (redirect old tab params)

---

## Technical Considerations

### State Management

```typescript
// Mode type
type DashboardMode = 'employer' | 'vendor';

// Section types per mode
type EmployerSection = 'overview' | 'jobs' | 'applications' | 'videos' | 'candidates';
type VendorSection = 'overview' | 'products' | 'services' | 'inquiries' | 'shop-profile';
type SharedSection = 'messages' | 'profile' | 'billing';

// URL structure
// /organization/dashboard?mode=employer&section=applications
// /organization/dashboard?mode=vendor&section=products
```

### Color Mapping

| Element | Employer Mode | Vendor Mode | Shared |
|---------|---------------|-------------|--------|
| Toggle active | `bg-blue-500` | `bg-emerald-500` | - |
| Nav active | `text-blue-400` | `text-emerald-400` | `text-teal-400` |
| Badge | `bg-blue-500` | `bg-emerald-500` | `bg-teal-500` |
| Header badge | Blue | Green | - |

### Mobile Responsiveness

- **Desktop** (≥768px): Sidebar 280px fixed width
- **Mobile** (<768px): Bottom tab bar navigation
  - 5 tabs max visible (Overview, [Mode Tools], Messages, Profile, More)
  - Mode toggle in "More" menu or via swipe gesture
  - Sticky at bottom of screen
- Toggle remains accessible in both views

---

## Migration Path

### Backwards Compatibility

1. Old URLs (`?tab=shop`) redirect to new format (`?mode=vendor&section=overview`)
2. `switchTab` custom event still works, maps to new navigation
3. All existing functionality preserved, just reorganized

### Data Model (No Changes Required)

The existing data model already supports this redesign:
- `employers` collection stays the same
- `vendors` collection stays the same
- No new fields required
- No migration scripts needed

---

## Testing Checklist

- [ ] Mode toggle switches UI correctly
- [ ] URL updates when mode/section changes
- [ ] Refreshing page preserves mode/section
- [ ] Deep links work correctly
- [ ] Legacy URL redirects work
- [ ] All existing functionality works in new layout
- [ ] Mobile responsive behavior
- [ ] Badge counts update correctly
- [ ] Employer-only users see appropriate options
- [ ] Vendor-only users see appropriate options
- [ ] Both-enabled users can switch freely

---

## Design Decisions (Resolved from Mockup)

1. **Binary Toggle** (not checkboxes): Users simply click to flip between modes. Both modes always available to employers.

2. **Mode Persistence**: localStorage (`dashboard_active_mode`) - no URL params for mode itself.

3. **Icon System**: Lucide React icons throughout (already used elsewhere in codebase).

4. **Color Scheme**:
   - Employer Mode: Blue (`#3B82F6` / `blue-600`)
   - Vendor Mode: Teal (`#14B8A6` / accent color)
   - Shared Account: Teal accent

---

## Component Mapping (Mockup → Codebase)

### From EnhancedDashboard.tsx Mockup

| Mockup Element | Target Location | Notes |
|----------------|-----------------|-------|
| `EnhancedDashboard` | `/app/organization/dashboard/page.tsx` | Complete rewrite |
| Sidebar section | `/components/organization/DashboardSidebar.tsx` | New component |
| Binary toggle | Part of `DashboardSidebar.tsx` | Inline, not separate |
| `SidebarItem` | `/components/organization/SidebarItem.tsx` | Reusable nav item |
| `StatCard` | `/components/organization/StatCard.tsx` | New component |
| Background glows | Already in `globals.css` | Matches existing |

### Existing Tabs → New Sections

| Current Tab | New Location | Mode |
|-------------|--------------|------|
| `OverviewTab.tsx` | Keep as `EmployerOverviewTab.tsx` | Employer |
| `OpportunitiesTab.tsx` | Keep, rename to `JobsTab.tsx` | Employer |
| `ApplicationsTab.tsx` | Keep as-is | Employer |
| `VideosTab.tsx` | Keep as-is | Employer |
| `ShopTab.tsx` → Overview | `VendorOverviewTab.tsx` | Vendor |
| `ShopTab.tsx` → Products | `ProductsTab.tsx` | Vendor |
| `ShopTab.tsx` → Profile | `ShopProfileTab.tsx` | Vendor |
| `MessagesTab.tsx` | Keep as-is | Shared |
| `BillingTab.tsx` | Keep as-is | Shared |
| `ProfileTab.tsx` | Keep as-is | Shared |

---

## Final Decisions

1. **Mobile Navigation**: **Bottom tab bar**
   - On mobile (<768px), sidebar converts to a fixed bottom navigation
   - Mode toggle accessible via a dedicated tab or long-press
   - Clean, native mobile feel

2. **Vendor-Only Users**: Future consideration
   - Current: All employers get draft vendor profile
   - May add pure vendor accounts based on platform growth

3. **Shop Performance**: **Part of Overview (no separate page)**
   - Vendor Overview shows stats (Products, Services, Views, Inquiries)
   - "Product Performance" list shows per-product metrics
   - Dedicated analytics page can be added later if needed

---

## Detailed Integration Analysis

### ShopTab Decomposition

The current `ShopTab.tsx` has 4 sub-tabs that need to be extracted:

```
ShopTab (current)
├── overview    → VendorOverviewTab.tsx (new)
├── profile     → ShopProfileTab.tsx (new)
├── products    → ProductsTab.tsx (new)
└── subscription → VendorBillingTab.tsx (new, or merge into BillingTab)
```

**Shared State to Extract**:
- `vendor` state (Vendor profile)
- `products` state (VendorProduct[])
- `formData` for profile editing
- Image upload handlers

**Recommendation**: Create a `VendorContext.tsx` provider to share vendor state across tabs.

### OverviewTab Enhancement

Current `OverviewTab.tsx` loads:
- Employer profile
- Jobs list
- Applications list
- Conferences
- Pow wows
- Unread message count

**Changes needed**:
1. Rename to `EmployerOverviewTab.tsx`
2. Update stats to match mockup (Active Jobs, Applications, Job Views, Interviews)
3. Add "Recent Applications" list component

### New VendorOverviewTab

**Data to load**:
- Vendor profile (from `getVendorByUserId`)
- Products list (from `getVendorProducts`)
- Shop views (need new field or analytics)
- Inquiries count (need to define - messages to vendor?)

**Stats to display**:
- Products count
- Services count (products with type='service')
- Shop views
- Inquiries

### State Architecture

```typescript
// New context for dashboard state
interface DashboardState {
  mode: 'employer' | 'vendor';
  setMode: (mode: 'employer' | 'vendor') => void;
  activeSection: string;
  setActiveSection: (section: string) => void;

  // Employer data
  employerProfile: EmployerProfile | null;
  jobs: JobPosting[];
  applications: JobApplication[];

  // Vendor data
  vendor: Vendor | null;
  products: VendorProduct[];
}
```

### URL Structure

**Current**: `/organization/dashboard?tab=shop`
**New**: `/organization/dashboard?section=products`

Mode stored in localStorage, section in URL for deep linking.

### Event System

The existing `switchTab` custom event needs to be updated:

```typescript
// Old
window.dispatchEvent(new CustomEvent('switchTab', { detail: { tab: 'shop' } }));

// New
window.dispatchEvent(new CustomEvent('switchSection', {
  detail: { mode: 'vendor', section: 'products' }
}));
```

---

## Estimated Scope

- **Files to create**: ~8 new components/pages
- **Files to modify**: ~6 existing files
- **Data model changes**: None
- **API changes**: None
- **Breaking changes**: None (backwards compatible)
