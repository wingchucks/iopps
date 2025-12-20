# Dashboard Redesign: Employer/Vendor Mode Toggle

## Executive Summary

This plan outlines how to implement the simplified dashboard design from the mockup, which introduces a **sidebar-based navigation with an Employer/Vendor toggle** to replace the current horizontal tab navigation.

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
5. Responsive design for mobile (sidebar collapses to bottom nav or hamburger)

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

- Sidebar: 280px fixed width on desktop
- Mobile (<768px): Sidebar becomes collapsible drawer or bottom navigation
- Toggle remains accessible in mobile view

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

## Open Questions for Discussion

1. **Enable/Disable Modes**: Should users be able to disable a mode they don't use? (mockup shows checkboxes)
   - If yes: Where is this preference stored? User profile or localStorage?
   - If no: Both modes always available to employers

2. **Vendor-Only Users**: Can someone be a vendor without being an employer?
   - Current: All employers get draft vendor profile
   - Future: Pure vendor accounts?

3. **Mobile Navigation**: Sidebar drawer or bottom tab bar?
   - Drawer: More consistent with desktop
   - Bottom tabs: More native mobile feel

4. **Analytics Section**: The shared nav in mockup shows "Analytics" - is this a new feature or existing?
   - Currently no dedicated analytics tab
   - Could aggregate stats from both modes

---

## Estimated Scope

- **Files to create**: ~10 new components/pages
- **Files to modify**: ~8 existing files
- **Data model changes**: None
- **API changes**: None
- **Breaking changes**: None (backwards compatible)
