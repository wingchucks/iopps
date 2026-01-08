# Plan: Fix Staging Content Appearing on Production

## Problem Summary

The user reported seeing staging/test content on the production website (iopps.ca):
1. A "Map" navigation option in the mobile bottom nav that leads to a 404 page
2. A fake "Sarah Bear" profile appearing instead of their actual community profile
3. Mock timeline data with fake posts showing on the Passport page

## Root Cause Analysis

### Issue 1: Map Navigation Tab (404 Error)
- **File**: `web/components/MobileBottomNav.tsx:19`
- **Problem**: The navigation includes a "Map" tab linking to `/map`, but no `/map` page exists
- **Evidence**: The glob search for `**/map/page.tsx` returned no results
- **Impact**: Users clicking "Map" see a 404 error

### Issue 2: Sarah Bear Mock Profile
- **File**: `web/app/member/dashboard/MemberProfileView.tsx:13-52`
- **Problem**: The component has hardcoded fallback mock data:
  ```typescript
  const displayProfile = {
      displayName: profile?.displayName || "Sarah Bear",
      indigenousAffiliation: profile?.indigenousAffiliation || "Nehiyaw / Cree",
      headline: profile?.tagline || "Project Manager & Community Builder",
      // ... more mock data
  };
  ```
- **Impact**: When a user's profile is incomplete or hasn't loaded, they see fake "Sarah Bear" data instead of empty state or their own partial data

### Issue 3: Mock Timeline Data
- **File**: `web/app/member/dashboard/MemberProfileView.tsx:25-52`
- **Problem**: Hardcoded `mockTimeline` array with fake posts always displays
- **Impact**: Users see fake celebratory posts that aren't theirs

## Solution

### Fix 1: Remove Map Tab from Navigation
Remove the Map navigation item from `MobileBottomNav.tsx` since the feature doesn't exist yet.

**Before:**
```typescript
const navItems = [
    { href: "/live", label: "Live", Icon: VideoCameraIcon, ActiveIcon: VideoCameraIconSolid },
    { href: "/map", label: "Map", Icon: MapIcon, ActiveIcon: MapIconSolid },
    { href: "/passport", label: "Passport", Icon: UserCircleIcon, ActiveIcon: UserCircleIconSolid },
];
```

**After:**
```typescript
const navItems = [
    { href: "/live", label: "Live", Icon: VideoCameraIcon, ActiveIcon: VideoCameraIconSolid },
    { href: "/passport", label: "Passport", Icon: UserCircleIcon, ActiveIcon: UserCircleIconSolid },
];
```

### Fix 2: Remove Mock Profile Data Fallback
Update `MemberProfileView.tsx` to display the actual profile data (even if incomplete) instead of falling back to "Sarah Bear" mock data.

**Changes:**
1. Remove the Sarah Bear default values
2. Show actual user data or "Not specified" placeholders
3. Remove the hardcoded `mockTimeline` array
4. Show empty state message when no timeline data exists

### Fix 3: Clean Up Unused Imports
Remove the `MapIcon` imports from `MobileBottomNav.tsx` since they'll no longer be used.

## Files to Modify

1. `web/components/MobileBottomNav.tsx`
   - Remove Map navigation item
   - Remove unused MapIcon imports

2. `web/app/member/dashboard/MemberProfileView.tsx`
   - Remove Sarah Bear fallback data
   - Remove mock timeline
   - Add proper empty states

## Testing

After changes:
1. Verify mobile bottom nav shows only "Live" and "Passport" tabs
2. Verify Passport page shows real user data or appropriate empty state
3. Verify no mock data appears on production
4. Run `npm run lint` and `npx tsc --noEmit` to check for errors

## Risk Assessment

- **Low Risk**: These are UI-only changes that remove mock/staging content
- **No Database Changes**: No Firestore rules or data migrations needed
- **Backward Compatible**: Removing mock data fallbacks won't break existing functionality
