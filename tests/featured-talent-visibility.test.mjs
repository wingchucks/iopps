import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { sourceModule } from './helpers/security-fixtures.mjs';

// Clearly fictional profiles; no real person's data belongs in these tests.
function fictionalProfile(slug, isActive) {
  return {
    slug,
    name: `Fixture ${slug}`,
    featuredLabel: 'Featured Talent',
    headline: 'Fictional test headline',
    nation: 'Fictional Test Nation',
    location: 'Testville',
    openTo: 'Fictional opportunities',
    imageUrl: `/featured-talent/${slug}.jpeg`,
    publicEmail: `${slug}@example.invalid`,
    summary: `Fictional summary for ${slug}.`,
    skills: ['Fixture skill'],
    experience: ['Fixture experience'],
    isActive,
  };
}

function loadPage(talent) {
  const component = { __esModule: true, default: () => null };
  return sourceModule('src/app/featured-talent/[slug]/page.tsx', { mocks: {
    '@/lib/featured-talent': talent,
    'next/navigation': { notFound: () => { throw new Error('NOT_FOUND'); } },
    'next/image': component, 'next/link': component,
    ...Object.fromEntries(['Badge', 'Button', 'Card', 'Footer', 'ThemeToggle'].map(name => [`@/components/${name}`, component])),
  } });
}

test('a deactivated featured talent profile is not built, served or described', async () => {
  const talent = sourceModule('src/lib/featured-talent.ts');
  const active = fictionalProfile('fixture-active-talent', true);
  const inactive = fictionalProfile('fixture-deactivated-talent', false);
  talent.featuredTalentProfiles.push(active, inactive);
  const page = loadPage(talent);

  // The modules run in their own realm: copy arrays into this one before comparing.
  assert.deepEqual(Array.from(talent.getActiveFeaturedTalentProfiles(), profile => profile.slug), [active.slug]);
  assert.deepEqual(Array.from(page.generateStaticParams(), params => params.slug), [active.slug], 'only active profiles are prerendered');
  assert.equal(talent.getFeaturedTalentProfile(active.slug)?.slug, active.slug);
  assert.match(JSON.stringify(await page.generateMetadata({ params: Promise.resolve({ slug: active.slug }) })), /Fixture fixture-active-talent/);

  assert.equal(talent.getFeaturedTalentProfile(inactive.slug), null);
  await assert.rejects(page.default({ params: Promise.resolve({ slug: inactive.slug }) }), /NOT_FOUND/);
  const metadata = await page.generateMetadata({ params: Promise.resolve({ slug: inactive.slug }) });
  assert.deepEqual(JSON.parse(JSON.stringify(metadata.robots)), { index: false, follow: false });
  for (const value of [inactive.name, inactive.publicEmail, inactive.nation, inactive.summary]) assert.ok(!JSON.stringify(metadata).includes(value));

  // No other public surface lists profiles directly.
  for (const file of ['src/app/sitemap.ts', 'src/app/page.tsx']) assert.doesNotMatch(readFileSync(file, 'utf8'), /featured-talent|featuredTalentProfiles/);
});

test('no featured talent photo is served without an active profile', () => {
  // Files under public/ are served whatever isActive says, so a deactivated or deleted
  // profile must not leave its photo behind.
  const talent = sourceModule('src/lib/featured-talent.ts');
  const activePhotos = new Set(talent.getActiveFeaturedTalentProfiles().map(profile => profile.imageUrl));
  const directory = 'public/featured-talent';
  for (const file of existsSync(directory) ? readdirSync(directory) : []) {
    assert.ok(activePhotos.has(`/featured-talent/${file}`), `public/featured-talent/${file} belongs to no active profile`);
  }
});
