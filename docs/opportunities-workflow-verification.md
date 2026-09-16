# Events and funding opportunities — preview verification

Preview branch: `codex/core-journeys-redesign`.

## What changed

Events and scholarships now share an organization editor and listing manager, including the dashboard tabs and dedicated create/list routes. The editor has Canadian province/territory dropdowns, draft saving, explicit review before publication, editing, and reversible closing. Application instructions, links, eligibility, contact details and optional funding fields survive the API handoff. Existing optional fields are retained when an editor does not change them.

Public discovery uses the IOPPS navy/teal palette, searchable listings, type/province/date filters, useful empty states and visible loading errors. Events in progress remain discoverable. Funding distinguishes a fixed deadline, an explicitly rolling intake and an unknown deadline. Expired funding can be inspected for the next intake without claiming that applications are open.

Event calendar downloads now use the actual event dates. They explicitly create all-day entries instead of inventing local times or time zones. Calendar text is escaped, dates use an exclusive end date and UTF-8 lines are folded per RFC 5545: https://www.rfc-editor.org/rfc/rfc5545#section-3.6.1.

Anonymous Save and RSVP actions go to the existing sign-in flow and retain intent. Public detail pages use canonical visibility-checked APIs, avoid raw HTML execution, and distinguish an unavailable service from a missing listing. Event and scholarship metadata follows the same visibility checks.

## Storage and publication

Unpublished content is stored in `organizationOpportunityDrafts`, a server-only collection covered by the existing default-deny rule. A public routing tombstone contains only ID, slug, ownership, status, revision and update time. Publishing atomically moves the content into the public collection; saving a published listing as a draft or closing it moves its content back to private storage. Public discovery and detail APIs suppress matching legacy feed copies when a canonical record is hidden.

Authentication resolves the organization server-side. Only owners/admins may change listings; publishing also requires verified email and completed organization setup. Creation IDs are scoped to the organization and request ID; retries do not duplicate listings. Edits require the current revision. Publication URLs are unique even when titles repeat. Input cannot grant featured placement, verification or another organization's ownership.

The public projection uses an allowlist, accepts only HTTP(S) application/registration links, and has no stale response cache. The cron scholarship endpoint rejects requests when no secret is configured.

## Verification

- Production build completed successfully.
- New editor/directory/server modules and changed detail pages pass ESLint.
- `tests/opportunity-workflow.test.ts`: five behavior tests covering publication requirements, preserved fields, deadlines, ongoing events, calendar encoding and hidden legacy copies.
- `scripts/qa-opportunity-journey-http.mjs`: nine end-to-end API groups against the production build and isolated Firebase emulators. Both content types were created as drafts, published, closed, reopened and unpublished. Checks cover ownership, email verification, request replay, duplicate titles, stale edits, public fields, metadata visibility and the cron authorization guard.
- `tests/opportunity-rules-emulator.test.ts`: verifies private reads, direct-write bypass prevention and continued admin corrections.
- Existing release rules and scholarship freshness checks pass. Combined Node test run: eight passed, zero failed.

Fictional preview workspace: `/demo/opportunities`. The same editor runs locally in that page; demo actions do not create accounts or write to Firebase. `/demo/responsive` includes both public directories and this editor for 320, 390, 768 and 1280px review.

## Release boundaries

This change is preview-only. No production deployment or live Firebase rule update was performed. The checked-in Firestore rules additionally restrict raw events/scholarship reads and organization writes; their deployment remains a separate release gate, alongside the previously documented business-review rules. New drafts use the private collection regardless of that additional gate. Existing legacy drafts require an audited migration before claiming they were moved to private storage.

Real email delivery, live file uploads, and a real signed-in account were not used for this verification. The existing poster upload integration remains available in the authenticated editor; uploaded posters are intended for public use. The preview demonstration uses fictional local state.
