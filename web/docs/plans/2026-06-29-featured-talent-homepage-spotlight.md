# Featured Talent Homepage Spotlight Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task if delegating.

**Goal:** Make the current Featured Talent profile front and center on the IOPPS.ca homepage so visitors immediately see Audrey Fiddler and understand that IOPPS showcases Indigenous talent, not only listings.

**Architecture:** Reuse the existing static Featured Talent data in `web/lib/featured-talent.ts` and add a homepage spotlight component above the six-pillar section. Keep the feature public, email-only, and linked to `/featured-talent/audrey-fiddler`. Update the contract test so future homepage changes cannot accidentally remove the spotlight or expose phone/contact fields.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind/CSS variables, Node test runner.

---

## Product direction

The homepage should show Audrey near the top, directly after the main hero or integrated into the hero as a high-priority card.

Recommended layout:

1. Keep the existing IOPPS hero headline and join/sign-in CTAs.
2. Add a strong `Featured Talent` card immediately below the hero CTA area or as a two-column hero card on desktop.
3. Use Audrey's photo, name, Nation/community, short role headline, and a clear CTA:
   - `View Audrey's Profile`
   - secondary link: `See Featured Talent`
4. Add a small employer/community prompt:
   - `Employers and organizations: meet Indigenous talent ready for the right opportunity.`
5. Keep contact private on the homepage. Do **not** show phone number. Prefer not to show email on the homepage; let the detail page carry the public email contact.

## Acceptance criteria

- Homepage shows `Featured Talent` and `Audrey Fiddler` above `Everything in One Place`.
- Homepage links to `/featured-talent/audrey-fiddler`.
- Homepage links to `/featured-talent`.
- Homepage uses Audrey's existing image: `/featured-talent/audrey-fiddler.jpeg`.
- Homepage does **not** include `phone`, `tel:`, or any phone-number-shaped string from Audrey's resume/contact details.
- Mobile layout stacks cleanly with image first or card first and no horizontal overflow.
- Existing `/featured-talent` and `/featured-talent/audrey-fiddler` pages keep working.
- Checks pass:
  - `node --test tests/featured-talent-contract.test.mjs`
  - `npx eslint app/page.tsx 'app/(public)/featured-talent/page.tsx' 'app/(public)/featured-talent/[slug]/page.tsx' lib/featured-talent.ts tests/featured-talent-contract.test.mjs`
  - `npx tsc --noEmit`
  - `npm run build`

---

## Task 1: Extend the contract test for homepage visibility

**Objective:** Lock in that Featured Talent is front-and-center on the homepage.

**Files:**
- Modify: `web/tests/featured-talent-contract.test.mjs`

**Step 1: Add homepage assertions**

Add a new test:

```js
it('features Audrey on the homepage above the main pillar grid', () => {
  const homePage = read('app/page.tsx');
  const featuredIndex = homePage.indexOf('Featured Talent');
  const pillarsIndex = homePage.indexOf('Everything in One Place');

  assert.ok(featuredIndex > -1, 'homepage should include Featured Talent copy');
  assert.ok(pillarsIndex > -1, 'homepage should include the existing pillars section');
  assert.ok(featuredIndex < pillarsIndex, 'Featured Talent should appear before the pillar grid');
  assert.match(homePage, /Audrey Fiddler/);
  assert.match(homePage, /\/featured-talent\/audrey-fiddler/);
  assert.match(homePage, /\/featured-talent/);
});
```

**Step 2: Run the test to verify failure**

Run from `web`:

```bash
node --test tests/featured-talent-contract.test.mjs
```

Expected: FAIL because the homepage does not yet contain the new spotlight.

---

## Task 2: Import Featured Talent data into the homepage

**Objective:** Reuse the existing Audrey data instead of duplicating name/headline/image strings across the codebase.

**Files:**
- Modify: `web/app/page.tsx`

**Step 1: Add import**

At the top:

```ts
import { featuredTalentProfiles } from '@/lib/featured-talent';
```

**Step 2: Select the first profile**

Inside `HomePage`, after the stats setup:

```ts
const featuredTalent = featuredTalentProfiles[0];
```

Do not hard-code private fields. Do not import or expose resume details.

---

## Task 3: Add the homepage spotlight block

**Objective:** Put Audrey front and center directly after the hero and before `Everything in One Place`.

**Files:**
- Modify: `web/app/page.tsx`

**Step 1: Insert a new section after the closing hero `</section>` and before `{/* Six Pillars */}`**

Use this structure:

```tsx
{/* Featured Talent Spotlight */}
<section className="relative -mt-10 z-10 max-w-6xl mx-auto px-4">
  <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-3xl shadow-xl overflow-hidden">
    <div className="grid md:grid-cols-[0.9fr_1.1fr] gap-0">
      <div className="bg-[var(--navy)] p-6 md:p-8 flex items-center justify-center">
        <div className="relative w-full max-w-sm">
          <div className="absolute inset-0 bg-[var(--teal)]/20 blur-3xl rounded-full" />
          <img
            src={featuredTalent.imageUrl}
            alt={`${featuredTalent.name}, ${featuredTalent.featuredLabel} on IOPPS.ca`}
            className="relative w-full aspect-square object-cover rounded-3xl border-4 border-white/15 shadow-2xl"
          />
        </div>
      </div>

      <div className="p-6 md:p-10">
        <span className="inline-flex items-center rounded-full bg-[var(--teal)]/10 text-[var(--teal-dark)] px-4 py-2 text-sm font-bold mb-4">
          {featuredTalent.featuredLabel}
        </span>
        <h2 className="text-3xl md:text-4xl font-bold text-[var(--text-primary)] mb-3">
          Meet {featuredTalent.name}
        </h2>
        <p className="text-lg font-semibold text-[var(--text-primary)] mb-2">
          {featuredTalent.headline}
        </p>
        <p className="text-[var(--text-secondary)] mb-4">
          {featuredTalent.nation} • {featuredTalent.location}
        </p>
        <p className="text-[var(--text-secondary)] leading-relaxed mb-6">
          IOPPS Featured Talent helps Indigenous job seekers get seen by employers,
          organizations, and community opportunity providers. Audrey is seeking full-time
          employment and is open to the right opportunity.
        </p>

        <div className="flex flex-wrap gap-2 mb-6">
          {featuredTalent.skills.slice(0, 4).map((skill) => (
            <span key={skill} className="rounded-full border border-[var(--card-border)] px-3 py-1 text-sm text-[var(--text-secondary)]">
              {skill}
            </span>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href={`/featured-talent/${featuredTalent.slug}`}
            className="bg-[var(--teal)] hover:bg-[var(--teal-dark)] text-white font-semibold px-6 py-3 rounded-lg text-center transition-colors"
          >
            View Audrey's Profile
          </Link>
          <Link
            href="/featured-talent"
            className="border border-[var(--card-border)] hover:border-[var(--teal)] text-[var(--text-primary)] font-semibold px-6 py-3 rounded-lg text-center transition-colors"
          >
            See Featured Talent
          </Link>
        </div>
      </div>
    </div>
  </div>
</section>
```

**Implementation note:** `app/page.tsx` is currently a client component. A plain `<img>` is the lowest-risk change. If lint complains about `<img>`, switch to `next/image` and add an import.

---

## Task 4: Adjust homepage spacing

**Objective:** Make the new spotlight feel intentional, not jammed between sections.

**Files:**
- Modify: `web/app/page.tsx`

**Step 1: Reduce the six-pillars top padding**

Change:

```tsx
<section className="max-w-6xl mx-auto px-4 py-20">
```

for the Six Pillars section to something like:

```tsx
<section className="max-w-6xl mx-auto px-4 pt-16 pb-20">
```

**Step 2: Check mobile spacing**

On mobile, make sure the card does not crowd the hero CTA. If needed, change the spotlight wrapper from `-mt-10` to `-mt-6`.

---

## Task 5: Re-run focused privacy and contract tests

**Objective:** Verify the homepage spotlight is visible and still privacy-safe.

**Files:**
- Test: `web/tests/featured-talent-contract.test.mjs`

Run:

```bash
node --test tests/featured-talent-contract.test.mjs
```

Expected: PASS.

Also run a direct text scan:

```bash
node -e "const fs=require('fs'); const s=fs.readFileSync('app/page.tsx','utf8'); if (/phone|tel:|1-639|639-597|597-6123/i.test(s)) process.exit(1); console.log('homepage privacy scan passed')"
```

Expected: `homepage privacy scan passed`.

---

## Task 6: Lint, typecheck, and build

**Objective:** Prove the homepage change did not break the app.

Run from `web`:

```bash
npx eslint app/page.tsx 'app/(public)/featured-talent/page.tsx' 'app/(public)/featured-talent/[slug]/page.tsx' lib/featured-talent.ts tests/featured-talent-contract.test.mjs
npx tsc --noEmit
npm run build
```

Expected: all pass. If warnings are pre-existing, report them separately from failures.

---

## Task 7: Local visual preview

**Objective:** Show Nat how the homepage looks before deploy.

Run from `web`:

```bash
npm run dev -- --hostname 127.0.0.1 --port 3017
```

Capture screenshots:

- Desktop: `http://127.0.0.1:3017/` at 1440×1400
- Mobile: `http://127.0.0.1:3017/` at 390×1200

Verify visually:

- Audrey appears before the pillar grid.
- The card feels premium and prominent.
- Text is readable on mobile.
- CTAs work.
- No phone number appears.

Stop the dev server after screenshots.

---

## Task 8: Commit only the scoped homepage work

**Objective:** Keep this clean on the existing Featured Talent branch.

Run from repo root:

```bash
git status --short
git add web/app/page.tsx web/tests/featured-talent-contract.test.mjs web/docs/plans/2026-06-29-featured-talent-homepage-spotlight.md
git commit -m "feat: feature talent spotlight on homepage"
git push
```

Before committing, confirm the diff only contains:

- homepage spotlight
- Featured Talent contract test update
- this plan

No scheduling files, invoices, social graphics, or unrelated local files should be committed.

---

## Follow-up ideas after MVP

Do **not** build these in this task unless Nat asks:

1. Rotate multiple Featured Talent profiles once more people are approved.
2. Add an admin toggle to choose the homepage featured profile from Firestore.
3. Add analytics tracking for `View Audrey's Profile` clicks.
4. Add an employer CTA block on `/for-employers` pointing to Featured Talent.
5. Add a small homepage badge saying `New feature` during the launch week.
