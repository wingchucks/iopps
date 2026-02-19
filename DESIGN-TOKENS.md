# IOPPS Design System V1

This document defines the design tokens, components, and patterns used across the IOPPS platform to ensure visual consistency and maintainability.

## Color Palette

### Brand Colors
```css
--accent: #14B8A6          /* IOPPS teal */
--accent-soft: #0B8A7A     /* darker teal */
--accent-hover: #16cdb8    /* teal hover state */
```

**Tailwind equivalents:**
- Primary: `text-[#14B8A6]` or `bg-[#14B8A6]`
- Hover: `hover:bg-[#16cdb8]`

### Base Colors
```css
--background: #020617      /* slate-950 */
--foreground: #e2e8f0      /* slate-200 */
```

**Tailwind equivalents:**
- Background: `bg-slate-950`
- Text: `text-slate-200`

### Card System
```css
--card-bg: #08090C                        /* dark card background */
--card-border: rgba(30, 41, 59, 0.8)      /* slate-800/80 */
--card-border-hover: rgba(20, 184, 166, 0.7)  /* accent/70 */
```

**Tailwind equivalents:**
- Card background: `bg-[#08090C]`
- Card border: `border border-slate-800/80`
- Card hover: `hover:border-[#14B8A6]`

### Input System
```css
--input-bg: #020617        /* slate-950 */
--input-border: #1e293b    /* slate-800 */
--input-focus: #14B8A6     /* accent teal */
```

**Tailwind equivalents:**
- Input bg: `bg-slate-950`
- Input border: `border-slate-800`
- Input focus: `focus:border-teal-500`

### Text Colors
```css
--text-primary: #f8fafc    /* slate-50 */
--text-secondary: #cbd5e1  /* slate-300 */
--text-muted: #94a3b8      /* slate-400 */
--text-subtle: #64748b     /* slate-500 */
```

**Tailwind equivalents:**
- Primary: `text-slate-50`
- Secondary: `text-slate-300`
- Muted: `text-slate-400`
- Subtle: `text-slate-500`

### Semantic Colors
```css
--success: #14B8A6         /* teal */
--warning: #fbbf24         /* amber-400 */
--error: #ef4444           /* red-500 */
--info: #38bdf8            /* sky-400 */
```

**Tailwind equivalents:**
- Success: `text-[#14B8A6]` or `bg-[#14B8A6]`
- Warning: `text-amber-400` or `bg-amber-400`
- Error: `text-red-500` or `bg-red-500`
- Info: `text-sky-400` or `bg-sky-400`

## Typography

### Font Family
- **Primary font:** Inter (loaded via Google Fonts)
- **Applied in:** `app/layout.tsx`

### Type Scale

#### Page Headers
```tsx
// Eyebrow label
<p className="text-xs uppercase tracking-[0.4em] text-[#14B8A6]">
  Label Text
</p>

// Heading
<h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
  Page Headline
</h1>

// Subheadline
<p className="mt-3 text-sm text-slate-400 sm:text-base">
  Supporting description text
</p>
```

#### Form Labels
```tsx
<label className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
  Field Label
</label>
```

#### Body Text
- Primary: `text-sm text-slate-200` or `text-base text-slate-100`
- Secondary: `text-sm text-slate-300`
- Muted: `text-sm text-slate-400`

## Spacing

### Page Container
```tsx
// Standard page wrapper
<div className="mx-auto max-w-6xl px-4 py-10 sm:py-16">
  {/* page content */}
</div>
```

### Section Spacing
- Between major sections: `mt-8`
- Between card items in lists: `space-y-4`
- Internal card spacing: `p-6` or `p-5 sm:p-6`

## Components

### PageShell
Provides consistent page spacing across all routes.

```tsx
import { PageShell } from "@/components/PageShell";

<PageShell>
  {/* Your page content */}
</PageShell>
```

**Renders:**
```tsx
<div className="mx-auto max-w-6xl px-4 py-10 sm:py-16">
  {children}
</div>
```

### SectionHeader
Standardized page header with eyebrow, title, and optional subtitle.

```tsx
import { SectionHeader } from "@/components/SectionHeader";

<SectionHeader
  eyebrow="Jobs & Careers"
  title="Build your career with these employers"
  subtitle="Explore roles across Turtle Island with employers committed to Indigenous talent."
/>
```

**Props:**
- `eyebrow` (string): Small uppercase label
- `title` (string): Main heading (H1)
- `subtitle?` (string): Optional supporting text
- `className?` (string): Optional additional classes

### FilterCard
Wrapper for filter/search sections.

```tsx
import { FilterCard } from "@/components/FilterCard";

<FilterCard>
  {/* Filter inputs and controls */}
</FilterCard>
```

**Style:**
- Background: `bg-[#08090C]`
- Border: `border-slate-800/80`
- Padding: `p-5 sm:p-6`
- Shadow: `shadow-lg shadow-black/30`

### ContentCard
Wrapper for list item cards (jobs, conferences, etc.).

```tsx
import { ContentCard } from "@/components/ContentCard";

<ContentCard hover={true}>
  {/* Card content */}
</ContentCard>
```

**Props:**
- `hover?` (boolean): Enable hover effect (default: true)
- `className?` (string): Optional additional classes

**Style:**
- Background: `bg-[#08090C]`
- Border: `border-slate-800/80`
- Padding: `p-6`
- Hover: `hover:border-[#14B8A6]`

### ButtonLink
Reusable link/button component with variants.

```tsx
import { ButtonLink } from "@/components/ui/ButtonLink";

<ButtonLink href="/jobs" variant="primary">
  View Jobs
</ButtonLink>
```

**Variants:**
- `primary`: Teal background
- `secondary`: White/10 background with border
- `outline`: Border only
- `ghost`: Text only

## Patterns

### Filter Section Pattern
```tsx
<FilterCard className="mt-8">
  {/* Row 1: Input grid */}
  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
    <div>
      <label className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
        Keyword
      </label>
      <input
        type="text"
        placeholder="Search..."
        className="mt-1 w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-teal-500 focus:outline-none"
      />
    </div>
    {/* More inputs... */}
  </div>

  {/* Row 2: Radio toggles */}
  <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-200">
    <label className="inline-flex items-center gap-2">
      <input type="radio" name="filter" />
      Option A
    </label>
    <label className="inline-flex items-center gap-2">
      <input type="radio" name="filter" />
      Option B
    </label>

    <button className="ml-auto text-xs font-semibold text-[#14B8A6] underline hover:text-[#14B8A6]/80">
      Reset filters
    </button>
  </div>
</FilterCard>
```

### Content Card Pattern
```tsx
<ContentCard>
  <div className="space-y-4">
    {/* 1. Title and badges */}
    <div className="flex flex-wrap items-start justify-between gap-3">
      <h2 className="text-xl font-bold text-slate-50">{title}</h2>
      {/* Badges */}
    </div>

    {/* 2. Metadata (employer, location, etc.) */}
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
      {/* Icons and text */}
    </div>

    {/* 3. Tags */}
    <div className="flex flex-wrap items-center gap-2">
      {/* Badge pills */}
    </div>

    {/* 4. Description */}
    <p className="line-clamp-2 text-sm leading-relaxed text-slate-400">
      {description}
    </p>

    {/* 5. Actions */}
    <div className="flex items-center gap-2 pt-2">
      {/* CTAs */}
    </div>
  </div>
</ContentCard>
```

### Badge/Pill Pattern
```tsx
// Standard badge
<span className="inline-flex items-center rounded-lg border border-slate-700/60 bg-slate-800/60 px-2.5 py-1 text-xs font-semibold text-slate-300">
  Badge Text
</span>

// Accent badge (teal)
<span className="inline-flex items-center gap-1.5 rounded-lg border border-[#14B8A6]/30 bg-[#14B8A6]/10 px-2.5 py-1 text-xs font-medium text-[#14B8A6]">
  <svg className="h-3.5 w-3.5" {...iconProps} />
  Badge Text
</span>

// Warning badge (amber)
<span className="inline-flex items-center gap-1.5 rounded-lg border border-amber-400/30 bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-400">
  <svg className="h-3 w-3" {...iconProps} />
  Badge Text
</span>
```

## Focus States

Global focus styles are defined in `globals.css`:

```css
/* Visible focus ring for all interactive elements */
button:focus-visible,
a:focus-visible,
input:focus-visible,
select:focus-visible,
textarea:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

/* Input-specific focus (border color change) */
input:focus,
select:focus,
textarea:focus {
  outline: none;
  border-color: var(--input-focus);
}
```

## Background

The platform uses a dark theme with subtle gradient overlays:

```css
body {
  background:
    radial-gradient(circle at top left, rgba(20, 184, 166, 0.15), transparent 55%),
    radial-gradient(circle at bottom right, rgba(56, 189, 248, 0.15), transparent 55%),
    #020617;
}
```

This creates:
- Teal glow in top-left corner
- Blue glow in bottom-right corner
- Base slate-950 background

## Usage Guidelines

### Do's ✅
- Use `PageShell` for all top-level page containers
- Use `SectionHeader` for consistent page headers
- Use `FilterCard` for all filter/search sections
- Use `ContentCard` for all list item cards
- Use design tokens from `globals.css` where possible
- Follow the 5-section content card hierarchy (title → metadata → tags → description → actions)

### Don'ts ❌
- Don't create one-off card styles - use `FilterCard` or `ContentCard`
- Don't hardcode spacing - use the standard patterns
- Don't deviate from the color palette
- Don't create custom focus states - let global styles handle it
- Don't use different header patterns - use `SectionHeader`

## File Locations

- **Design tokens:** `web/app/globals.css`
- **Layout/Typography:** `web/app/layout.tsx`
- **Components:**
  - `web/components/PageShell.tsx`
  - `web/components/SectionHeader.tsx`
  - `web/components/FilterCard.tsx`
  - `web/components/ContentCard.tsx`
  - `web/components/ui/ButtonLink.tsx`

## Version

**Design System V1** - Frozen as of 2025-11-16

All new features and pages should follow these patterns. Any deviations should be discussed and documented as V2 changes.
