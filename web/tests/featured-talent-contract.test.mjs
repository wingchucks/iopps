import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

describe('Featured Talent contract', () => {
  it('ships public Featured Talent pages backed by Audrey data', () => {
    assert.ok(fs.existsSync(path.join(root, 'app/(public)/featured-talent/page.tsx')));
    assert.ok(fs.existsSync(path.join(root, 'app/(public)/featured-talent/[slug]/page.tsx')));

    const data = read('lib/featured-talent.ts');
    assert.match(data, /audrey-fiddler/);
    assert.match(data, /Audrey Fiddler/);
    assert.match(data, /audreylynnefiddler@outlook\.com/i);
  });

  it('does not expose phone fields or phone-number shaped strings in the public talent feature', () => {
    const publicFiles = [
      'lib/featured-talent.ts',
      'app/(public)/featured-talent/page.tsx',
      'app/(public)/featured-talent/[slug]/page.tsx',
    ].map(read).join('\n');

    assert.doesNotMatch(publicFiles, /phone/i);
    assert.doesNotMatch(publicFiles, /tel:/i);
    assert.doesNotMatch(publicFiles, /\b\d{1}[-.\s]?\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/);
  });

  it('adds member profile consent controls with email-only public contact language', () => {
    const profilePage = read('app/(member)/member/settings/profile/page.tsx');
    assert.match(profilePage, /Featured Talent/);
    assert.match(profilePage, /publicTalentProfile/);
    assert.match(profilePage, /talentPublicEmail/);
    assert.match(profilePage, /No phone numbers are shown publicly/i);
  });

  it('features Audrey on the homepage above the main pillar grid', () => {
    const homePage = read('app/page.tsx');
    const featuredIndex = homePage.indexOf('Featured Talent');
    const pillarsIndex = homePage.indexOf('Everything in One Place');

    assert.ok(featuredIndex > -1, 'homepage should include Featured Talent copy');
    assert.ok(pillarsIndex > -1, 'homepage should include the existing pillars section');
    assert.ok(featuredIndex < pillarsIndex, 'Featured Talent should appear before the pillar grid');
    const talentData = read('lib/featured-talent.ts');
    assert.match(talentData, /Audrey Fiddler/);
    assert.match(talentData, /audrey-fiddler/);
    assert.match(homePage, /featuredTalentProfiles\[0\]/);
    assert.match(homePage, /`\/featured-talent\/\$\{featuredTalent\.slug\}`/);
    assert.match(homePage, /\/featured-talent/);
  });
});
