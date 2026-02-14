# Security & Permissions Audit Report
## Agent 8: Employer Account Perspective

**Audit Date:** January 22, 2026
**Scope:** Lightweight security sanity check from an employer account perspective
**Auditor:** Automated Security Testing Agent

---

## Executive Summary

This audit examined permission leaks and missing admin controls from an employer account perspective. Overall, the IOPPS codebase has **strong employer-facing security** with proper ownership checks on most routes. However, **three critical admin API routes lack authorization** and could be exploited by any authenticated user.

---

## Confirmed Bugs

### P0 - Critical

| Issue | Location | Description | Repro Steps |
|-------|----------|-------------|-------------|
| **Admin Search No Auth** | `/api/admin/search/route.ts:17-20` | Admin search endpoint has NO authorization check. Comment says "Allow unauthenticated access for now" | 1. Get employer Firebase token 2. `GET /api/admin/search?q=competitor` 3. Returns all employers, users, jobs, members matching query |
| **Admin Check-Claims Exposed** | `/api/admin/check-claims/route.ts` | Endpoint only verifies token validity, no role check. Exposes auth system internals to any authenticated user | 1. Get employer token 2. `GET /api/admin/check-claims` 3. Returns claim format, what Firestore expects for admin access |
| **Broken Team Member Function** | `/firestore.rules:67` | `isTeamMemberOf()` returns `false` always (disabled). Team members cannot access jobs/applications they should be able to | Any team member tries to access org resources - denied despite being on team |

### P1 - Major

| Issue | Location | Description | Repro Steps |
|-------|----------|-------------|-------------|
| **Admin Notify No Auth** | `/api/admin/notify/route.ts` | Only rate-limited, no admin role check. Employers can spam admin inbox | 1. Get employer token 2. `POST /api/admin/notify` with `type: "new_employer"` 3. Triggers admin notification |
| **Weak Powwow/Event Storage Rules** | `/storage.rules:149-177` | Powwow/event poster uploads only require `isSignedIn()`, not ownership. API should validate but client-side bypass possible | Upload directly to `powwows/{anyId}/posters/` with guessed powwowId |

### P2 - Minor

| Issue | Location | Description |
|-------|----------|-------------|
| **Hardcoded Super Admin Email** | `/api/admin/set-claims/route.ts:39` | Super admin check uses hardcoded email instead of env variable |
| **Confusing Impersonate Logic** | `/api/admin/impersonate/route.ts:45-62` | First allows admin+moderator, then restricts to super admin. Unclear intent |
| **Moderators See All Admin Pages** | `/app/admin/layout.tsx:207` | Moderators can access all 18+ admin pages, may be intentional but undocumented |

---

## UX Friction Points

*None identified - this audit focused on security, not UX*

---

## Conflicts / Redundancies

1. **Inconsistent Admin Role Checks**: Some routes check `admin` only, others check `admin || moderator`. No central authorization middleware.

2. **Dual Employer ID Patterns**: Some routes use `employerId === userId` (doc ID match), others check `resource.data.userId`. Both work but creates confusion.

3. **Storage Rules vs API Validation**: Storage rules for powwows/events rely on API-level validation that isn't clearly documented or enforced.

---

## Improvement Suggestions

### Quick (< 1 hour)

1. **Add auth check to `/api/admin/search`** - Copy pattern from other admin routes:
   ```typescript
   const userDoc = await db.collection("users").doc(userId).get();
   if (userDoc.data()?.role !== "admin" && userDoc.data()?.role !== "moderator") {
     return NextResponse.json({ error: "Forbidden" }, { status: 403 });
   }
   ```

2. **Add auth check to `/api/admin/check-claims`** - Same pattern

3. **Add auth check to `/api/admin/notify`** - Same pattern, or restrict to internal calls only

### Medium (1-4 hours)

4. **Fix `isTeamMemberOf()` in Firestore rules** - Re-implement without `[*]` operator:
   ```firestore
   function isTeamMemberOf(employerId) {
     let employer = get(/databases/$(database)/documents/employers/$(employerId));
     return employer.data.teamMemberIds != null &&
            request.auth.uid in employer.data.teamMemberIds;
   }
   ```
   This requires storing team member IDs as a flat array.

5. **Create shared auth middleware** for admin routes to prevent copy-paste inconsistencies

6. **Move super admin emails to environment variable**

### Structural (1+ day)

7. **Implement proper RBAC** with a roles table and permission matrix

8. **Add audit logging** for all admin actions (some routes have this, not all)

9. **Restrict storage upload paths** by validating ownership in a Cloud Function trigger

---

## Security Pattern Summary

### Well Protected

| Area | Protection |
|------|------------|
| Employer CRUD | Ownership checks on all routes via `employerId === userId` |
| Applications | Query scoped by `employerId`, per-item ownership validation |
| Interviews | Explicit ownership check before update/delete |
| Team Management | Requires employer owner role |
| Job Posting | Approval status enforced, unapproved employers can only create drafts |
| Firestore Rules | Defense-in-depth with `isEmployerOwner()`, `isApprovedEmployer()` |

### Potential Attack Vectors

1. **Information Disclosure**: Employer can enumerate all platform users/employers via `/api/admin/search`
2. **Auth Probing**: Employer can understand admin claim requirements via `/api/admin/check-claims`
3. **Notification Spam**: Employer can trigger admin notifications (rate-limited but annoying)
4. **Storage Bypass**: If client-side validation bypassed, employer could upload to other powwow/event paths

---

## "Would I Use This Again?" Verdict

**Yes, with caveats.** The employer-facing security is solid - proper ownership checks, token verification, and Firestore rules provide defense-in-depth. However, the exposed admin endpoints are a significant oversight that needs immediate attention. An attacker could use the search endpoint to enumerate the entire platform database and use check-claims to understand how to potentially escalate privileges.

The broken `isTeamMemberOf()` function is also concerning as it completely disables team member access control - any employer with team members will find that feature non-functional from a security perspective.

**Priority fixes:**
1. Lock down the three admin endpoints immediately
2. Fix or remove the team member function
3. Add centralized auth middleware to prevent future inconsistencies

---

## Files Requiring Changes

| File | Priority | Change Required |
|------|----------|-----------------|
| `/web/app/api/admin/search/route.ts` | P0 | Add admin role check |
| `/web/app/api/admin/check-claims/route.ts` | P0 | Add admin role check |
| `/firestore.rules` (line 67) | P0 | Fix `isTeamMemberOf()` function |
| `/web/app/api/admin/notify/route.ts` | P1 | Add admin role check or restrict to internal |
| `/storage.rules` (lines 149-177) | P1 | Add ownership validation or document API requirement |
| `/web/app/api/admin/set-claims/route.ts` | P2 | Move email to env var |

---

*Report generated by Security Testing Agent - Session ID: session_01EABdsTe1hy5tNAGwXJ8vmb*
