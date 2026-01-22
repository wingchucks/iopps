# Agent 6 — Events/Conferences/Community Posting Test Report

**Date:** 2026-01-22
**Tester:** Automated Testing Agent 6
**Scope:** Event/Conference Posting, Approval Logic, Public Visibility/Search

---

## Visibility Matrix: Draft / Pending / Approved / Public

| Content Type | Draft State | Pending/Approval | Published | Public Visibility |
|---|---|---|---|---|
| **Conference** | `active: false` (created at `/new`) | **NO APPROVAL** - Direct publish | `active: true` (toggle) | `/conferences/[id]` |
| **Powwow/Event** | `active: false` (default in `createPowwowEvent`) | **NO APPROVAL** - Direct publish | `active: true` | `/community/[id]` |
| **Education Event** | `isPublished: false` | **NO APPROVAL** - Direct publish | `isPublished: true` | No public browse page |
| **Social Post** | N/A - immediate | **NO APPROVAL** | `visibility: public` | `/feed` |

---

## Confirmed Bugs

| ID | URL/Screen | Action | Expected | Actual | Severity |
|----|------------|--------|----------|--------|----------|
| **B1** | `/web/lib/firestore/conferences.ts:51` | `createConference()` | Creates draft (`active: false`) | Defaults to `active: true` unless explicitly passed | **P1 Major** |
| **B2** | `/organization/events/new/page.tsx:141` | Create new event | Respect draft/publish intent | Hardcodes `active: true` - events go live immediately | **P1 Major** |
| **B3** | `/organization/powwows/page.tsx:56` | Access control | Check for `employer` or admin | Only checks `role !== "employer"` - super admin bypass inconsistent | **P2 Minor** |
| **B4** | `/community/[powwowId]/page.tsx:165` | SEO JSON-LD | URL should match route | Generates URL as `/powwows/${powwowId}` instead of `/community/${powwowId}` | **P2 Minor** |
| **B5** | `/organization/dashboard/EventsTab.tsx:31` | Warning on missing dependency | useEffect should list `loadData` | `loadData` not in dependency array | **P3 Nice-to-have** |
| **B6** | Firestore rules | Team member access | `isTeamMemberOf()` should work | Function disabled with `return false` comment | **P2 Minor** |
| **B7** | `/organization/conferences/page.tsx:31` | Dependency warning | Missing `isSuperAdmin` in deps | `isSuperAdmin` used but not in `useEffect` dependency array | **P3 Nice-to-have** |

---

## UX Friction Points

| ID | Screen | Issue | Impact |
|----|--------|-------|--------|
| **UX1** | Conference creation (`/new`) | Auto-creates "Untitled Conference" draft immediately on page load | User may abandon, leaving orphan records. No cancel/abort option. |
| **UX2** | Event/Powwow creation | Two different flows: Modal in EventsTab vs. dedicated `/organization/events/new` page | Confusing UX - user doesn't know which to use |
| **UX3** | All event types | **No "Pending Approval" status visible** anywhere | User publishes immediately without knowing events go live instantly |
| **UX4** | Public conference page | Inactive/expired conferences return generic "not found" | Should differentiate between "ended" vs "unpublished" vs "deleted" |
| **UX5** | `/organization/powwows/` | Missing Edit button | Users can only Delete, not Edit existing pow wows from this page |
| **UX6** | Conference builder | No preview of public page while editing | User must save, then click "Preview Page" link |
| **UX7** | Event dates | Start/End dates not required | Events can be created with no dates, causing filter/sort issues |
| **UX8** | Education Events | No public browse page exists | Events are created but members can't discover them organically |

---

## Conflicts / Redundancies

| ID | Issue | Files Affected |
|----|-------|----------------|
| **C1** | **Duplicate event creation paths**: `/organization/events/new` AND `/organization/powwows/new` both create powwow events | `events/new/page.tsx`, `powwows/new/page.tsx` |
| **C2** | **Inconsistent visibility field naming**: `active` for Conferences/Powwows, `isPublished` for Education Events | `conferences.ts`, `powwows.ts`, `educationEvents.ts` |
| **C3** | **Redirect loop risk**: `/organization/events/powwow/new` redirects to `/organization/powwows/new` - legacy URL preserved | `events/powwow/new/page.tsx` |
| **C4** | **Super admin check duplicated**: Hardcoded email `nathan.arias@iopps.ca` appears in multiple files | `conferences/page.tsx`, `powwows/new/page.tsx`, etc. |
| **C5** | **Two different delete flows for powwows**: Direct `deletePowwow()` in one page, API route in another | `powwows/page.tsx` uses direct, `EventsTab.tsx` uses API |

---

## Improvement Suggestions

### Quick Fixes (1-2 hours each)
1. **Fix `createPowwowEvent` default** - Change `active: input.active ?? true` to `active: input.active ?? false` in `powwows.ts:51` for draft-first behavior
2. **Fix SEO URL mismatch** - Update JSON-LD URL from `/powwows/` to `/community/` in `community/[powwowId]/page.tsx:165`
3. **Add Edit link to powwows list** - Add edit functionality to `/organization/powwows/page.tsx`
4. **Consolidate super admin check** - Create `isSuperAdmin()` helper in auth provider

### Medium Effort (4-8 hours each)
1. **Add "Pending" status messaging** - Show banner on create: "Your event will go live immediately. Consider saving as draft first."
2. **Create public Education Events page** - Add `/education/events` browse page similar to `/community`
3. **Unify visibility field** - Migrate all event types to use `isPublished` boolean for consistency
4. **Add confirmation before publish** - "Are you sure you want to publish this event? It will be immediately visible."

### Structural Changes (Multi-day)
1. **Implement approval workflow** - Add `status: 'draft' | 'pending' | 'approved' | 'rejected'` field with admin review for first-time posters
2. **Unify event creation flow** - Single `/organization/events/new` page with type selector, deprecate `/powwows/new`
3. **Add scheduled publishing** - Allow setting a future publish date
4. **Add event analytics dashboard** - View counts, registration stats, engagement metrics

---

## Questions from Test Scope (Answered)

| Question | Answer |
|----------|--------|
| **If approval is required, is it stated before posting?** | NO APPROVAL EXISTS - Events publish immediately. No warning shown. |
| **After submission, do I get a clear "pending" status?** | NO - Events go live immediately with "Active" status. No pending state. |
| **Are public pages actually implemented (no 404s)?** | YES - `/conferences/[id]` and `/community/[id]` work correctly. Education events have no public browse page. |

---

## "Would I Use This Again?" Verdict

**Score: 6/10 - Functional but Friction-Heavy**

The events/conferences posting system is technically functional—employers can create events that appear on public pages. However, the experience is marred by several critical issues:

1. **No safety net for accidental publishing** - Events go live immediately with no draft review or scheduling option. This is especially risky for conferences where organizers may want to prepare content before making it public.

2. **Confusing navigation** - Multiple paths to create the same content type (events vs. powwows), inconsistent UI patterns between conference builder (full editor) and events (simple form).

3. **Missing approval workflow for a platform serving Indigenous communities** - Given IOPPS's cultural context and TRC commitments, there should be at least optional moderation for event quality/authenticity.

4. **Orphan record potential** - The conference auto-create-on-page-load pattern means abandoned browser tabs create empty "Untitled Conference" records.

**The good**: Public pages work well, filtering/search is solid, the conference builder is comprehensive with Indigenous protocol sections. Events do expire automatically via cron job.

**Recommendation**: Before recommending this to employers, implement at minimum: (1) draft-first default, (2) publish confirmation dialog, (3) consolidate creation flows, and (4) add pending status messaging. The platform's target users (Indigenous organizations, First Nations) deserve a more deliberate publishing experience.

---

## Key File References

### Firestore Operations
- `/web/lib/firestore/conferences.ts` - Conference CRUD
- `/web/lib/firestore/powwows.ts` - Powwow CRUD
- `/web/lib/firestore/educationEvents.ts` - Education event CRUD
- `/web/lib/firestore/social.ts` - Social posting & feed

### Employer Routes
- `/web/app/organization/conferences/` - Conference management
- `/web/app/organization/events/` - Event management
- `/web/app/organization/powwows/` - Powwow management
- `/web/app/organization/education/events/` - Education events
- `/web/app/organization/dashboard/EventsTab.tsx` - Events overview

### Public Routes
- `/web/app/conferences/` - Conference browsing
- `/web/app/conferences/[conferenceId]/` - Conference detail
- `/web/app/community/` - Powwow/event browsing
- `/web/app/community/[powwowId]/` - Powwow detail
- `/web/app/feed/` - Social feed

### API Routes
- `/web/app/api/cron/expire-events/route.ts` - Event expiration cron
- `/web/app/api/events/powwow/delete/` - Powwow deletion API

### Security Rules
- `/firestore.rules` - Lines 237-248 (conferences), 377-383 (powwows)
