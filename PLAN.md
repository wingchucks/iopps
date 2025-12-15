# SmartJobBoard-Style Job Posting Editor Implementation Plan

## Overview

Add a professional job posting editor to iopps.ca with features matching SmartJobBoard:
- Rich text editor for descriptions
- Structured salary range inputs
- Location type selection (Onsite/Remote/Hybrid)
- Job categories
- Application method toggle (Email/URL/Quick Apply)
- Posting and expiration date pickers
- Featured job toggle

---

## Phase 1: Database Schema Updates

**File: `/web/lib/types.ts`**

Add new types and extend JobPosting interface:

```typescript
export type LocationType = 'onsite' | 'remote' | 'hybrid';
export type ApplicationMethod = 'email' | 'url' | 'quickApply';
export type SalaryPeriod = 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly';

export const JOB_CATEGORIES = [
  'Accounting & Finance',
  'Administration',
  'Arts & Culture',
  'Construction & Trades',
  'Education & Training',
  'Engineering',
  'Environmental',
  'Government',
  'Healthcare',
  'Human Resources',
  'Information Technology',
  'Legal',
  'Management',
  'Marketing & Communications',
  'Natural Resources',
  'Operations',
  'Sales',
  'Social Services',
  'Transportation',
  'Other',
] as const;

// Add to JobPosting interface:
category?: string;
locationType?: LocationType;
applicationMethod?: ApplicationMethod;
salaryRange?: {
  min?: number;
  max?: number;
  currency?: string;
  period?: SalaryPeriod;
  disclosed?: boolean;
};
postedAt?: Timestamp | null;
featured?: boolean;
```

---

## Phase 2: Install Rich Text Editor

**Recommended: TipTap** (modern, extensible, React-friendly)

```bash
npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-link @tiptap/extension-image @tiptap/extension-text-align @tiptap/extension-underline @tiptap/extension-table @tiptap/extension-table-row @tiptap/extension-table-cell @tiptap/extension-table-header
```

---

## Phase 3: Create New Form Components

### 1. Rich Text Editor
**File: `/web/components/forms/RichTextEditor.tsx`**

Features:
- Bold, Italic, Underline buttons
- Text alignment (left, center, right, justify)
- Bullet and numbered lists
- Links with URL input modal
- Image insertion via URL
- Tables
- Heading levels
- Clear formatting button

### 2. Salary Range Input
**File: `/web/components/forms/SalaryRangeInput.tsx`**

Features:
- Currency dropdown (CAD, USD)
- Min/Max number inputs with $ prefix
- Period dropdown (hourly, yearly, etc.)
- "Don't disclose salary" checkbox

### 3. Location Type Selector
**File: `/web/components/forms/LocationTypeSelector.tsx`**

Features:
- Radio buttons: Onsite, Remote, Hybrid
- Text input for address (shown when Onsite or Hybrid)

### 4. Application Method Selector
**File: `/web/components/forms/ApplicationMethodSelector.tsx`**

Features:
- Radio buttons: By Email, By URL, Quick Apply (IOPPS)
- Conditional input field based on selection

### 5. Category Dropdown
**File: `/web/components/forms/CategorySelect.tsx`**

Features:
- Dropdown with all job categories
- Optional multi-select support

---

## Phase 4: Create Admin Job Editor Page

**File: `/web/app/admin/jobs/new/page.tsx`** (new)
**File: `/web/app/admin/jobs/[jobId]/edit/page.tsx`** (enhance)

Admin-specific features:
1. **Employer Dropdown** - Select from existing employers
2. **Product Selection** - Pricing tier (Single, Featured, Subscription)
3. **Featured Checkbox** - Mark job as featured

Full form fields:
- Job Title
- Job Description (RichTextEditor)
- Job Type (Full-time, Part-time, Contract, etc.)
- Category (dropdown)
- Location Type (Onsite/Remote/Hybrid)
- Location Address
- Salary Range (structured input)
- Application Method (Email/URL/Quick Apply)
- Posting Date
- Expiration Date
- Indigenous Preference checkbox
- CPIC Required checkbox
- Will Train checkbox
- Driver's License Required checkbox

---

## Phase 5: Update Employer Job Editor

**File: `/web/app/organization/jobs/new/page.tsx`** (enhance)
**File: `/web/app/organization/jobs/[jobId]/edit/page.tsx`** (enhance)

Same form as admin but without:
- Employer selection (auto-filled)
- Product override (determined by payment)

---

## Phase 6: Display Updates

**File: `/web/app/jobs-training/[jobId]/JobDetailClient.tsx`**

Add display for:
- Job category badge
- Location type indicator (Remote/Onsite/Hybrid badge)
- Structured salary display ($70,000 - $100,000/year)

---

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `web/lib/types.ts` | Modify | Add new types and extend JobPosting |
| `web/package.json` | Modify | Add TipTap dependencies |
| `web/components/forms/RichTextEditor.tsx` | Create | Rich text editor |
| `web/components/forms/SalaryRangeInput.tsx` | Create | Salary input |
| `web/components/forms/LocationTypeSelector.tsx` | Create | Location type selector |
| `web/components/forms/ApplicationMethodSelector.tsx` | Create | Application method |
| `web/components/forms/CategorySelect.tsx` | Create | Category dropdown |
| `web/app/admin/jobs/new/page.tsx` | Create | Admin job creation |
| `web/app/admin/jobs/[jobId]/edit/page.tsx` | Modify | Enhance admin editor |
| `web/app/organization/jobs/new/page.tsx` | Modify | Enhance employer form |
| `web/app/organization/jobs/[jobId]/edit/page.tsx` | Modify | Enhance employer form |
| `web/lib/firestore/jobs.ts` | Modify | Handle new fields |
| `web/app/jobs-training/[jobId]/JobDetailClient.tsx` | Modify | Display new fields |

---

## Implementation Order

1. **Schema First**: Update types.ts with new fields
2. **Install Dependencies**: Add TipTap packages
3. **Build Components**: Create form components
4. **Admin Editor**: Build complete admin job editor
5. **Employer Editor**: Update employer-facing forms
6. **Display Updates**: Update job detail pages
7. **Testing**: Test full flow

---

## Styling

Follow existing dark theme patterns:
- Background: `bg-slate-900`, `bg-slate-800`
- Borders: `border-slate-700`, `border-slate-800`
- Text: `text-slate-100`, `text-slate-300`
- Accent: `#14B8A6` (teal)
- Rounded: `rounded-xl`, `rounded-2xl`
- Focus: `focus:border-[#14B8A6] focus:outline-none`
