import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { sourceModule } from './helpers/security-fixtures.mjs';

test('a deactivated featured talent profile is not built, served or described', async () => {
  const talent = sourceModule('src/lib/featured-talent.ts');
  const inactive = talent.featuredTalentProfiles.filter(profile => !profile.isActive);
  assert.ok(inactive.length > 0, 'fixture: the stored profile is deactivated');
  assert.equal(talent.getActiveFeaturedTalentProfiles().filter(profile => !profile.isActive).length, 0);
  const component = { __esModule: true, default: () => null };
  const page = sourceModule('src/app/featured-talent/[slug]/page.tsx', { mocks: {
    'next/navigation': { notFound: () => { throw new Error('NOT_FOUND'); } },
    'next/image': component, 'next/link': component,
    ...Object.fromEntries(['Badge', 'Button', 'Card', 'Footer', 'ThemeToggle'].map(name => [`@/components/${name}`, component])),
  } });
  const built = page.generateStaticParams().map(params => params.slug);
  for (const profile of inactive) {
    assert.equal(talent.getFeaturedTalentProfile(profile.slug), null);
    assert.ok(!built.includes(profile.slug), `${profile.slug} must not be prerendered`);
    await assert.rejects(page.default({ params: Promise.resolve({ slug: profile.slug }) }), /NOT_FOUND/);
    const metadata = await page.generateMetadata({ params: Promise.resolve({ slug: profile.slug }) });
    assert.deepEqual(JSON.parse(JSON.stringify(metadata.robots)), { index: false, follow: false });
    for (const value of [profile.name, profile.publicEmail, profile.nation, profile.summary]) assert.ok(!JSON.stringify(metadata).includes(value));
  }
  // No other public surface lists profiles directly.
  for (const file of ['src/app/sitemap.ts', 'src/app/page.tsx']) assert.doesNotMatch(readFileSync(file, 'utf8'), /featured-talent|featuredTalentProfiles/);
});
