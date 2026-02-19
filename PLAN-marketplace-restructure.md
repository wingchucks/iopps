# Marketplace Restructure Plan

## Current State Analysis

### Three Marketplace Sections

| Section | URL | Data Source | Purpose |
|---------|-----|-------------|---------|
| **Browse Products** | `/marketplace/products` | `vendors` collection | Physical goods - art, clothing, jewelry, food |
| **Browse Services** | `/marketplace/services` | `services` collection | Professional services - legal, accounting, tech |
| **Business Directory** | `/marketplace/directory` | BOTH vendors + services | Combined listing of all businesses |

### The Confusion

1. **Services vs Directory overlap**: Both show businesses, but with different filters
2. **Unclear user journey**: When should someone use Services vs Directory?
3. **Data duplication**: Services appear in both `/services` and `/directory`
4. **Mixed messaging**: "Find professionals" vs "Find partners and suppliers"

### Current Service Categories
- Consulting
- Legal Services
- Accounting & Finance
- Marketing & Communications
- IT & Technology
- Construction & Trades
- Health & Wellness
- Education & Training
- Creative Services
- Transportation & Logistics
- Other

---

## Options to Consider

### Option A: Merge Services into Directory (Simplify to 2 sections)

**Structure:**
```
/marketplace
├── /products     → Physical goods from vendors
└── /directory    → ALL businesses (products + services) with filters
```

**Pros:**
- Simpler navigation (2 choices instead of 3)
- Directory becomes the unified business discovery tool
- Filter by "Products" or "Services" within Directory

**Cons:**
- Services lose their dedicated spotlight page
- May dilute service providers' visibility

---

### Option B: Keep Services, Remove Directory (2 sections, split by type)

**Structure:**
```
/marketplace
├── /products     → Shop physical goods
└── /services     → Hire professional services
```

**Pros:**
- Clear distinction: "Buy things" vs "Hire people"
- No overlap or confusion
- Each section is purpose-driven

**Cons:**
- Lose the "all businesses" discovery feature
- Can't easily browse both types at once

---

### Option C: Rename & Clarify (Keep 3, but clarify purpose)

**Structure:**
```
/marketplace
├── /products     → "Shop Products" - Buy Indigenous-made goods
├── /services     → "Hire Services" - Find professionals to hire
└── /directory    → "All Businesses" - Browse & connect with businesses
```

**Changes needed:**
- Rename cards on homepage for clarity
- Add explanatory text about when to use each
- Maybe make Directory the default/primary view

---

### Option D: Products + Services with Tab (Single unified view)

**Structure:**
```
/marketplace
└── /browse       → Unified page with Products/Services tabs
```

**Pros:**
- One destination for all browsing
- Tabs make switching easy
- Simpler mental model

**Cons:**
- Major restructure
- Loses dedicated category pages

---

## Questions for You

1. **What's the primary goal?**
   - Help people BUY products?
   - Help people HIRE services?
   - Help businesses GET DISCOVERED?

2. **Who's the main audience?**
   - Individual consumers shopping?
   - Businesses looking for partners/vendors?
   - Both equally?

3. **Do service providers want their own spotlight?**
   - Or is being in the directory sufficient?

4. **Is "Business Directory" meant for B2B connections?**
   - "Find partners and suppliers" suggests B2B
   - Products/Services seem more B2C

---

## My Recommendation

**Option B with Enhancement**: Products + Services (remove Directory)

Why:
- Clean separation: "Buy stuff" vs "Hire someone"
- Add a "View All Businesses" link that goes to Directory but don't feature it as a main card
- Directory becomes a secondary/advanced feature, not a primary navigation item

**Homepage would show:**
```
┌─────────────────┐  ┌─────────────────┐
│  Shop Products  │  │  Hire Services  │
│                 │  │                 │
│  Browse goods   │  │  Find pros to   │
│  from vendors   │  │  work with      │
└─────────────────┘  └─────────────────┘

         [View All Businesses →]
              (smaller link)
```

---

## Next Steps (After Decision)

1. Update `/marketplace/page.tsx` - Remove or de-emphasize Directory card
2. Update navigation if needed
3. Consider redirect from `/directory` to `/marketplace` with filter
4. Update any internal links

---

Let me know your thoughts on these options!
