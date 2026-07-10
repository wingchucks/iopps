# IOPPS Site Reliability, SEO, Accessibility, and Content Implementation Plan

**Date:** 2026-07-09
**Base:** `origin/master` (`713991cb`)
**Branch:** `feat/site-reliability-seo-accessibility-20260709`

## Scope

Implement the verified July 9 website-audit recommendations that improve reliability, SEO, accessibility, public-directory usability, performance, navigation, and opportunity-detail trust.

## Explicit exclusions

- Do not edit the pricing page, pricing configuration, plan structure, or pricing copy.
- Do not create or launch a customer/partner campaign.
- Do not add partner outreach, recurring promotion, paid spend, or campaign automation.
- Do not deploy to production without a separate Telegram approval.
- Do not submit public forms or create accounts during QA.
- Do not delete production records directly from this branch; exclude obvious automated QA content from public discovery and provide a separately reviewed cleanup path.

## Corrected audit interpretation

The unified signup page is not simply broken: selecting **Organization** reveals a required employer/school choice. The implementation will make that second choice obvious, keyboard accessible, and announced to assistive technology rather than bypassing it or changing pricing-related onboarding.

## Phase 1 — Reliability

1. Add tests around bounded analytics counter storage and daily summaries.
2. Replace unbounded dynamic maps in a single daily document with bounded aggregate data plus per-metric subcollection counters, while preserving existing report compatibility.
3. Make analytics writes fail safely and retain meaningful server logging without exposing private data.
4. Remove the hard-coded App Check site key. Initialize App Check only when explicitly enabled and configured by environment.
5. Update signup security wording so it remains truthful when App Check is disabled.
6. Make homepage and public organization job counts use the same public-visibility rules as `/api/jobs`.

## Phase 2 — Technical SEO

1. Extract sitemap construction into testable helpers.
2. Remove auth, account, redirect, and low-value utility routes from the sitemap.
3. Add index-worthy public routes: businesses, livestreams, Featured Talent, privacy, training, and organizations where appropriate.
4. Deduplicate normalized URLs.
5. Exclude hidden, inactive, expired, draft, and obvious automated-QA records.
6. Use real update timestamps when available instead of claiming every URL changed on every request.
7. Add the `training_programs` collection to metadata/JSON-LD lookup so training pages receive unique titles.
8. Add canonical metadata to public index pages that lack it.
9. Add breadcrumb/organization/course structured data where the underlying record supports it.

## Phase 3 — Public directory UX and accessibility

1. Add reusable client-side pagination with a 24-item initial page and accessible previous/next controls.
2. Apply it to jobs, events, training, scholarships, schools, and businesses without altering paid placement ordering.
3. Reset pagination when filters change and preserve useful filter state in the URL where practical.
4. Add result-count announcements and labelled filter controls.
5. Replace clickable signup `div` controls with native buttons/radios and keyboard support.
6. Use semantic headings, fieldsets, legends, and a real `main` landmark.
7. Keep the brand palette while using accessible dark teal for text and controls on light surfaces.

## Phase 4 — Content, trust, navigation, and performance

1. Strengthen task-first homepage pathways for work, hiring, training/education, and events/livestreams.
2. Keep one shared public navigation model across shells.
3. Show official-source, organizer/provider, registration/application destination, and last-verified information when records contain it.
4. Avoid implying IOPPS processes enrollment when the action is an external provider link.
5. Improve scholarship card facts such as amount, deadline, eligibility, region, and source when available.
6. Add clear expired/cancelled/full/closed states without inventing unavailable facts.
7. Ensure below-the-fold images are lazy-loaded and appropriately sized; replace heavy embeds with click-to-load behavior where present.
8. Do not change partner campaign strategy or pricing.

## Verification

- Run focused RED tests before each implementation slice.
- Run `npm test`.
- Run `npm run lint`.
- Run `npm run build`.
- Run targeted Playwright journeys on desktop and mobile without submitting forms.
- Re-run focused Lighthouse checks for homepage, jobs, events, contact, and signup.
- Verify sitemap uniqueness, route inclusion/exclusion, canonicals, metadata, JSON-LD, and browser console/network errors.
- Review `git diff origin/master...HEAD` and confirm no pricing or customer/partner-campaign files changed.
- Push and open a pull request for review. Do not deploy until Nat explicitly approves the production deployment.
