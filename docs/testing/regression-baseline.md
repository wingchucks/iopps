# IOPPS Employer Regression Baseline

Last Updated: 2026-01-21

## Canonical Routes

| Feature | Route | Notes |
|---------|-------|-------|
| Employer Home/Dashboard | `/organization` | Main dashboard after login |
| Pricing | `/pricing` | Public pricing page |
| Public Org Profile | `/businesses/[slug]` | Public-facing business profile |
| Jobs List | `/organization/hire/jobs` | Employer's job listings |
| Applications | `/organization/hire/applications` | Job applications received |
| Conferences | `/organization/host/conferences` | Conference management |
| Events | `/organization/host/events` | Event management |
| Onboarding | `/organization/onboarding` | New employer setup flow |
| Shop/Products | `/organization/shop` | Product listings |
| Services | `/organization/services` | Service listings |
| Team | `/organization/team` | Team management |
| Settings | `/organization/settings` | Org settings |

## Must Never Break (10 Critical Paths)

1. **Employer Login** → lands on `/organization` dashboard (not `/employer`)
2. **Job Post Flow** → Create → Save Draft → Publish → appears in public listings
3. **Job Edit/Duplicate** → Edit published job, duplicate job works without data loss
4. **Onboarding Completion** → All steps save, profile becomes visible after approval
5. **Profile Image Upload** → Logo + Cover image persist after save (mobile Safari included)
6. **Public Profile View** → `/businesses/[slug]` shows correct data for approved employers
7. **Pricing Page** → Accessible from dashboard and public nav, shows correct tiers
8. **Application Inbox** → Employer can view all applications for their jobs
9. **Event/Conference Publish** → Host can create, publish, and view events
10. **Role Gates** → Admin endpoints return 403 for non-admin employers

## Deprecated Routes (Must Not Exist)

| Route | Status | Notes |
|-------|--------|-------|
| `/employer/*` | DEPRECATED | All employer routes consolidated to `/organization/*` |
| `/setup` | DEPRECATED | Replaced by `/organization/onboarding` |

## Known Issues

_No known issues at baseline creation._

## Field Naming Standards

| Canonical Field | Aliases (deprecated) |
|-----------------|---------------------|
| `coverImageUrl` | `bannerUrl`, `heroImageUrl` |
| `directoryVisible` | `isPublic`, `showInDirectory` |
| `publicationStatus` | `isPublished`, `published` |

## Security Gates Checklist

- [ ] `/api/admin/*` routes check `role === 'admin'`
- [ ] Storage rules enforce `request.auth.uid == userId`
- [ ] Firestore rules enforce employer ownership on write
- [ ] No PII exposed in public profile queries
