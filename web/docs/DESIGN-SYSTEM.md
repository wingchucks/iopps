# IOPPS.ca Design System Documentation

> **Last Updated:** February 2026
> **Status:** Living Document
> **Related Bugs:** BUG-003, BUG-020, BUG-025

---

## Overview

IOPPS.ca (Indigenous Opportunities & Professional Support) is built with Next.js 16 (App Router), React 19, TypeScript 5, Tailwind CSS 4, and Firebase (Auth + Firestore). The platform serves three user roles: Community Members, Organizations/Employers, and Admins.

The platform currently uses two distinct layout systems that evolved organically to serve different content contexts. This document explains both systems, their intended use cases, and the plan to gradually converge them.

---

## Layout Systems

### 1. FeedLayout (Public/Discovery Pages)

**File:** web/components/opportunity-graph/FeedLayout.tsx

**Used by:** /careers, /education, /community, /business

**Characteristics:**
- Full-width, content-feed oriented design
- Collapsible left sidebar with navigation categories
- Top navigation bar (visible at >= 1024px)
- Mobile bottom navigation bar (visible at < 1024px)
- Floating Action Button (FAB) for org/admin users
- Search functionality integrated into the top bar
- Designed for browsing and discovering opportunities

**Responsive breakpoints:**
- Mobile (< 768px): Bottom nav + hamburger menu
- Tablet (768px - 1023px): Bottom nav + collapsible sidebar
- Desktop (>= 1024px): Top nav + persistent sidebar

### 2. CommunityShell / Dashboard Layout (Authenticated Pages)

**Files:**
- web/components/community/CommunityShell.tsx
- web/app/home/layout.tsx (dashboard wrapper)

**Used by:** /home, /member/*, /organization/*, /admin/*

**Characteristics:**
- Fixed left sidebar with user profile summary
- Card-based content areas
- Dashboard-style grid layouts
- Bottom navigation on mobile (5 items + overflow)
- Designed for managing personal content and settings

### Why Two Systems Exist

The two layouts serve fundamentally different UX goals:

| Aspect | FeedLayout | CommunityShell/Dashboard |
|--------|-----------|------------------------|
| Purpose | Discovery and browsing | Management and personal content |
| Content model | Scrolling feed of cards | Structured dashboard panels |
| Navigation | Category-based (Jobs, Education, etc.) | Role-based (My Profile, Messages, etc.) |
| User context | Minimal (logged-in indicator) | Rich (avatar, name, stats) |
| Search | Global, always visible | Contextual, per-section |

This is an intentional architectural decision, not a bug. Both layouts are fully functional and serve their intended purposes well.

---

## Shared Components

Components used across both layout systems (single source of truth):

| Component | Location | Used In |
|-----------|----------|---------|
| OpportunityCard | web/components/opportunity-graph/OpportunityCard.tsx | FeedLayout, Dashboard |
| MemberCard | web/components/network/MemberCard.tsx | Network pages |
| Footer | web/components/shared/Footer.tsx | All layouts |
| AuthGate | web/components/AuthGate.tsx | Route protection |
| Avatar | web/components/ui/avatar.tsx | Profile, cards, nav |

---

## Design Tokens

### Colors

| Token | Value | Usage |
|-------|-------|-------|
| Primary | #2563eb (blue-600) | CTAs, links, active states |
| Primary Dark | #1d4ed8 (blue-700) | Hover states |
| Background | #ffffff | Page background |
| Surface | #f8fafc (slate-50) | Card backgrounds |
| Border | #e2e8f0 (slate-200) | Dividers, card borders |
| Text Primary | #0f172a (slate-900) | Headings |
| Text Secondary | #64748b (slate-500) | Descriptions, metadata |

### Typography
- Headings: System font stack (Inter where available)
- Body: 16px base, 1.5 line-height
- Small text: 14px for metadata, 12px for labels

### Spacing
- Base unit: 4px
- Common spacings: 8px, 12px, 16px, 24px, 32px, 48px
- Card padding: 16px (mobile), 24px (desktop)
- Section gaps: 24px (mobile), 32px (desktop)

---

## Navigation Patterns

### Feed Pages Navigation
8 sections: Careers, Education, Community, Business, Network, Messages, Events, Home

- Mobile: 5 visible bottom nav items + "More" menu for overflow
- Desktop: Full sidebar with all 8 items

### Dashboard Navigation (role-specific)
- Members: Home, Profile, Jobs, Messages, Network, Saved
- Organizations: Home, Jobs, Applications, Team, Settings
- Admins: Overview, Users, Employers, Content, Settings

---

## Data and User Counts (BUG-020)

The admin dashboard may show two different user counts:

| Source | Count | What It Measures |
|--------|-------|-----------------|
| Firebase Auth | ~748 | Total accounts created (includes abandoned signups, test accounts) |
| Firestore users collection | ~574 | Users who completed profile setup |

The difference (~174 accounts) represents users who created an auth account but never completed onboarding, test/dev accounts, and accounts created via social auth that did not finish profile creation.

**Recommendation:** Display the Firestore count as the primary "active users" metric. Firebase Auth count can be shown separately as "total signups" in the admin detailed view.

---

## Accessibility Standards

All components must meet WCAG 2.1 AA:

- Heading hierarchy: Every page needs exactly one H1 (sr-only is acceptable). Sequential order: H1 then H2 then H3.
- Focus indicators: All interactive elements must have visible focus-visible outlines. Never use outline:none without replacement.
- Touch targets: Minimum 44x44px for all interactive elements on mobile.
- Color contrast: Minimum 4.5:1 for normal text, 3:1 for large text.
- Keyboard navigation: All functionality must be operable via keyboard alone.

---

## Indigenous Cultural Protocols

### Spelling and Terminology
- Always use Metis with accent (M-e-t-i-s) - never without the accent
- Capitalize Indigenous, First Nations, Inuit, and Metis (with accent)
- Use "Indigenous community" or "Nation" - not "tribe"

### Land Acknowledgment
A land acknowledgment must appear in the footer of every page, including feed pages, dashboard pages, and public pages.

### Nation/Community Data
- The indigenousNation field in member profiles supports free-text entry
- Network filtering by Nation/Community should be available
- Never auto-categorize or assume a user's Indigenous identity

---

## Long-Term Convergence Plan

### Phase 1: Shared Component Extraction (Current)
Extract common nav items, footer, search bar into shared modules. Both layouts import from the same component library. No visual changes, just code organization.

### Phase 2: Design Token Unification (Next Quarter)
Migrate both layouts to use the same Tailwind theme tokens. Ensure consistent spacing, colors, typography. Create a shared theme.ts configuration.

### Phase 3: Layout Shell Abstraction (Future)
Create a base AppShell component that both layouts extend. Shared: responsive breakpoint logic, mobile nav, footer. Divergent: sidebar content, content area structure. Goal: ~60% shared layout code, ~40% context-specific.

### Phase 4: Evaluate Full Convergence (Long-Term)
Assess whether a single layout can serve both discovery and management needs. May decide to keep two layouts permanently with shared internals. Decision based on user research and analytics data.

---

## Contributing

When adding new pages or components:

1. Choose the right layout: Feed pages use FeedLayout, authenticated management pages use CommunityShell/Dashboard layout
2. Use shared components: Check web/components/shared/ and web/components/ui/ before creating new ones
3. Follow heading hierarchy: Every page needs an H1 (sr-only is fine for feed pages)
4. Test at all breakpoints: 375px, 768px, 1024px, 1440px minimum
5. Include land acknowledgment: Ensure the footer renders on your page
6. Respect Indigenous protocols: Follow the spelling and terminology guidelines above
