# Plan: Fix Community Member Access to Business Listing Features

## Problem Summary

Community members (non-employer accounts) can currently see and click "List Products" and "List Services" buttons on the Business Directory page (`/marketplace/directory`). While direct page access is already blocked with upgrade prompts, the CTAs themselves should be hidden from community members for a better UX.

## Current State Analysis

### Already Protected (Working Correctly)
1. **Marketplace Main Page** (`/marketplace/page.tsx`) - CTAs hidden for community members ✓
2. **Browse Products Page** (`/marketplace/products/page.tsx`) - "Start Selling" CTA hidden ✓
3. **Browse Services Page** (`/marketplace/services/page.tsx`) - "List Your Services" CTA hidden ✓
4. **Shop Dashboard** (`/organization/shop/dashboard/page.tsx`) - Shows upgrade card for community ✓
5. **Service Creation** (`/organization/services/new/page.tsx`) - Shows upgrade prompt for community ✓

### Needs Fixing
1. **Business Directory Page** (`/marketplace/directory/page.tsx`) - Lines 481-504
   - "Join Our Business Directory" section shows "List Products" and "List Services" buttons
   - NO role check currently in place
   - Community members can see these CTAs (though clicking leads to upgrade prompts)

## Solution

### Pattern to Follow
The codebase already uses a consistent pattern for hiding CTAs from community members:

```javascript
const { role } = useAuth();
const canListBusiness = role === "employer" || role === "admin";

{canListBusiness && (
  <section>
    {/* CTA buttons */}
  </section>
)}
```

### Implementation Steps

#### Step 1: Fix Business Directory Page
**File:** `web/app/marketplace/directory/page.tsx`

**Changes:**
1. Create a `canListBusiness` variable using the existing `role` from `useAuth()` (already imported at line 17)
2. Wrap the "Join Our Business Directory" CTA section (lines 481-504) with conditional rendering

**Before (lines ~481-504):**
```jsx
{/* Join CTA */}
<section className="mt-16 rounded-3xl bg-gradient-to-br from-slate-800/80 to-slate-900/80 ...">
  <div className="text-center space-y-6">
    <h2 className="text-2xl font-bold">Join Our Business Directory</h2>
    <p className="text-slate-300 max-w-2xl mx-auto">...</p>
    <div className="flex flex-wrap justify-center gap-4">
      <Link href="/organization/shop">
        <Button>List Products</Button>
      </Link>
      <Link href="/organization/services/new">
        <Button variant="outline">List Services</Button>
      </Link>
    </div>
  </div>
</section>
```

**After:**
```jsx
{/* Join CTA - Only show to employers/admins */}
{canListBusiness && (
  <section className="mt-16 rounded-3xl bg-gradient-to-br from-slate-800/80 to-slate-900/80 ...">
    <div className="text-center space-y-6">
      <h2 className="text-2xl font-bold">Join Our Business Directory</h2>
      <p className="text-slate-300 max-w-2xl mx-auto">...</p>
      <div className="flex flex-wrap justify-center gap-4">
        <Link href="/organization/shop">
          <Button>List Products</Button>
        </Link>
        <Link href="/organization/services/new">
          <Button variant="outline">List Services</Button>
        </Link>
      </div>
    </div>
  </section>
)}
```

## Verification

After implementation, verify:
1. Sign in as a **community member** → Visit `/marketplace/directory` → Should NOT see "List Products" / "List Services" CTAs at bottom
2. Sign in as an **employer** → Visit `/marketplace/directory` → Should see the CTA section
3. Sign in as an **admin** → Visit `/marketplace/directory` → Should see the CTA section

## Files to Modify

| File | Change |
|------|--------|
| `web/app/marketplace/directory/page.tsx` | Add role check and conditional render for CTA section |

## Estimated Complexity
**Low** - Single file, simple conditional wrapper using existing pattern
