import test from 'node:test';
import assert from 'node:assert/strict';
import { sourceModule } from './helpers/security-fixtures.mjs';

test('previously marked plain text repairs reversible punctuation without decoding text twice or guessing U+FFFD', () => {
  const { prepareImportedDescription, normalizePartnerDescription } = sourceModule('src/lib/server/import-content-quality.ts');
  const raw = 'SIGA â€™s employees — Métis ᐃ 💚 �s &lt;b&gt; **literal**';
  const result = prepareImportedDescription(raw, 'plain-text');
  assert.equal(result.description, 'SIGA ’s employees — Métis ᐃ 💚 �s &lt;b&gt; **literal**');
  assert.equal(result.importContentQuality.rawDescription, raw);
  assert.deepEqual(Array.from(result.importContentQuality.issues), ['replacement-character']);
  assert.equal(normalizePartnerDescription(result.description, 'plain-text'), result.description);
});

test('suspect source labels remain exact and flagged until editorial wording is approved', () => {
  const { prepareImportedDescription } = sourceModule('src/lib/server/import-content-quality.ts');
  for (const title of ['FNC&FS&JPS Mental Health Worker', 'Circle Camp& National Day', 'Well-Being Services ChildYouth Support Worker']) {
    const result = prepareImportedDescription(title, 'plain-text', {title});
    assert.equal(result.description, title);
    assert.equal(result.importContentQuality.rawLabels.title, title);
    assert.ok(result.importContentQuality.issues.includes('suspect-copy:source-verification'));
  }
});
