# Plan: Improve Social Media Sharing Appearance

## Current State

**What's Working:**
- Root layout has base Open Graph implementation (og:title, og:description, og:image 1200x630px)
- Twitter cards configured with summary_large_image
- 5 pages have dynamic `generateMetadata`:
  - Job postings (`/jobs-training/[jobId]`)
  - Training programs (`/jobs-training/programs/[id]`)
  - Services (`/marketplace/services/[id]`)
  - Organizations (`/organizations/[id]`)
  - Pow wow events (`/powwows/[powwowId]`)
- ShareButtons component exists with multi-platform support
- Basic SEO infrastructure in `/lib/seo.ts`

**What's Missing:**
- No dynamic OG image generation (biggest visual impact opportunity)
- Missing metadata on high-traffic pages (vendor profiles, employer profiles)
- Client components blocking metadata (scholarships, conferences)
- No structured data on detail pages

---

## Solution Overview

To make content visually appealing when shared on social media, we'll implement:

1. **Dynamic OG Image Generation** - Auto-generate branded preview images with titles/logos
2. **Add Metadata to Missing Pages** - Cover all shareable content
3. **Enhanced Structured Data** - Improve search/social platform understanding

---

## Implementation Plan

### Phase 1: Dynamic OG Image Generation (High Visual Impact)

Create an API route that generates branded OG images on-the-fly using `@vercel/og` or `satori`.

**File:** `web/app/api/og/route.tsx`

**Features:**
- Accept query params: `title`, `subtitle`, `type`, `image` (optional logo/cover)
- Generate 1200x630px images with:
  - IOPPS branding (logo, colors)
  - Dynamic title text
  - Category/type badge
  - Optional business logo or cover image
  - Gradient background matching brand

**Example URLs:**
```
/api/og?title=Eagle Feather Crafts&type=business&subtitle=Traditional Indigenous Art
/api/og?title=Software Developer&type=job&subtitle=Remote • Full-time
/api/og?title=Indigenous Youth Scholarship&type=scholarship&subtitle=$5,000 Award
```

**Visual Design:**
```
┌─────────────────────────────────────────────────────┐
│  ┌────┐                                             │
│  │LOGO│  [Type Badge]                               │
│  └────┘                                             │
│                                                     │
│        TITLE TEXT HERE                              │
│        Subtitle or description                      │
│                                                     │
│        ─────────────────────                        │
│        iopps.ca                                     │
└─────────────────────────────────────────────────────┘
```

**Dependencies to add:**
```bash
npm install @vercel/og
```

---

### Phase 2: Add Metadata to High-Priority Pages

#### 2.1 Vendor/Business Profiles (URGENT)
**File:** `web/app/marketplace/[slug]/page.tsx`

```typescript
export async function generateMetadata({ params }): Promise<Metadata> {
  const vendor = await getVendorBySlug(params.slug);
  if (!vendor) return {};

  const ogImageUrl = `/api/og?title=${encodeURIComponent(vendor.businessName)}&type=business&subtitle=${encodeURIComponent(vendor.tagline || vendor.category)}`;

  return {
    title: `${vendor.businessName} | IOPPS Marketplace`,
    description: vendor.tagline || `Shop ${vendor.category} from ${vendor.businessName}`,
    openGraph: {
      title: vendor.businessName,
      description: vendor.tagline || `Indigenous-owned ${vendor.category} business`,
      images: [{ url: vendor.coverImageUrl || ogImageUrl, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title: vendor.businessName,
      description: vendor.tagline,
      images: [vendor.coverImageUrl || ogImageUrl],
    },
  };
}
```

#### 2.2 Employer Profiles
**File:** `web/app/employers/[employerId]/page.tsx`

Similar pattern - fetch employer data, generate dynamic OG image with company name/logo.

#### 2.3 Scholarship Detail Pages
**File:** `web/app/scholarships/[scholarshipId]/page.tsx`

**Challenge:** Currently a client component ('use client')

**Solution Options:**
- Option A: Extract data fetching to server, keep display as client component
- Option B: Use route segment config for metadata
- Option C: Create separate metadata file

#### 2.4 Conference Detail Pages
**File:** `web/app/conferences/[conferenceId]/page.tsx`

Same challenge as scholarships - client component needs refactoring.

---

### Phase 3: Add Metadata to Listing Pages

These pages benefit from static metadata with page-specific titles:

| Page | Title | Description |
|------|-------|-------------|
| `/marketplace` | Indigenous Marketplace | Shop authentic Indigenous-made products and services |
| `/marketplace/products` | Browse Products | Discover Indigenous art, jewelry, food & more |
| `/marketplace/services` | Browse Services | Find Indigenous professionals and service providers |
| `/marketplace/directory` | Business Directory | Explore Indigenous-owned businesses across North America |
| `/scholarships` | Indigenous Scholarships | Find scholarships and funding for Indigenous students |
| `/conferences` | Indigenous Conferences | Discover conferences and networking events |
| `/jobs-training` | Jobs & Training | Find employment and training opportunities |

---

### Phase 4: Structured Data Enhancement

Add LD+JSON schemas to improve how content appears in search results and social platforms.

**Schemas to implement:**

1. **Product pages** - `Product` schema with price, availability
2. **Service pages** - `Service` schema with provider info
3. **Job postings** - `JobPosting` schema (partially exists)
4. **Events** - `Event` schema for conferences/powwows
5. **Scholarships** - `EducationalOccupationalCredential` or custom schema
6. **Businesses** - `LocalBusiness` or `Organization` schema

---

## Files to Create/Modify

### New Files:
| File | Purpose |
|------|---------|
| `web/app/api/og/route.tsx` | Dynamic OG image generation API |

### Files to Modify:
| File | Change |
|------|--------|
| `web/app/marketplace/[slug]/page.tsx` | Add generateMetadata |
| `web/app/employers/[employerId]/page.tsx` | Add generateMetadata |
| `web/app/scholarships/[scholarshipId]/page.tsx` | Refactor + add metadata |
| `web/app/conferences/[conferenceId]/page.tsx` | Refactor + add metadata |
| `web/app/marketplace/page.tsx` | Add static metadata export |
| `web/app/marketplace/products/page.tsx` | Add static metadata export |
| `web/app/marketplace/services/page.tsx` | Add static metadata export |
| `web/app/marketplace/directory/page.tsx` | Add static metadata export |
| `web/app/scholarships/page.tsx` | Add static metadata export |
| `web/app/conferences/page.tsx` | Add static metadata export |

---

## Priority Order

1. **Phase 1: Dynamic OG Image API** - Biggest visual impact, enables all other improvements
2. **Phase 2.1: Vendor profiles** - High-traffic, most shared business content
3. **Phase 2.2: Employer profiles** - Important for job seekers sharing opportunities
4. **Phase 3: Listing pages** - Quick wins with static metadata
5. **Phase 2.3-2.4: Scholarships/Conferences** - Requires refactoring
6. **Phase 4: Structured data** - SEO improvement, lower priority for social visuals

---

## Expected Results

**Before:** Generic IOPPS preview image for all pages
**After:**
- Branded, dynamic images with page-specific content
- Business names, logos, and descriptions visible in previews
- Job titles, companies visible when sharing job posts
- Scholarship names and award amounts visible
- Professional, consistent branding across all shares

---

## Testing

After implementation, test with:
- [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/)
- [Twitter Card Validator](https://cards-dev.twitter.com/validator)
- [LinkedIn Post Inspector](https://www.linkedin.com/post-inspector/)
- [Open Graph Preview Tool](https://www.opengraph.xyz/)
