import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Parser } from 'htmlparser2';
import { sourceModule, offlineNetwork } from './helpers/security-fixtures.mjs';

const fixtures = JSON.parse(readFileSync(new URL('./fixtures/import-content-quality.json', import.meta.url), 'utf8'));
for (const fixture of fixtures) {
  test(`offline fixture: ${fixture.name}`, () => {
    const { prepareImportedDescription, normalizePartnerDescription, normalizeImportedLabel, normalizeImportedLocation } = sourceModule('src/lib/server/import-content-quality.ts');
    const result = prepareImportedDescription(fixture.raw, fixture.format, fixture.labels);
    assert.equal(result.description, fixture.expected);
    assert.equal(result.importContentQuality.needsReview, fixture.review);
    assert.equal(result.importContentQuality.rawDescription, fixture.raw);
    if (fixture.label !== undefined) {
      const normalize = fixture.labelKind === 'location' ? normalizeImportedLocation : normalizeImportedLabel;
      assert.equal(normalize(fixture.label), fixture.expectedLabel);
      assert.equal(normalize(fixture.expectedLabel), fixture.expectedLabel);
    }
    assert.equal(normalizePartnerDescription(result.description, result.descriptionFormat), result.description);
    const tags = [];
    const parser = new Parser({ onopentag: name => tags.push(name) });
    parser.end(renderToStaticMarkup(React.createElement('div', null, result.description)));
    assert.deepEqual(tags, ['div']);
  });
}

test('imported Markdown becomes readable paragraphs, bullets and safe link text exactly once', () => {
  const { normalizeImportedDescription: normalize } = imports();
  const raw = '## Opportunity\r\n\r\n**Join our team**\r\n\r\n- Paid training\r\n- [Apply](https://example.test/jobs)\r\n\r\n<p>Visit <a href="https://example.test/about">our team</a>.</p>';
  const text = normalize(raw);
  assert.match(text, /^Opportunity\n\nJoin our team/);
  assert.match(text, /• Paid training\n• Apply \(https:\/\/example.test\/jobs\)/);
  assert.match(text, /Visit our team \(https:\/\/example.test\/about\)\./);
  assert.equal(normalize(text, 'plain-text'), text);
  assert.equal(normalize('&amp;lt;img src=x onerror=fixture()&amp;gt;'), '&lt;img src=x onerror=fixture()&gt;');
  assert.equal(normalize('literal **stars** &lt;b&gt;', 'plain-text'), 'literal **stars** &lt;b&gt;');
});

test('ingest metadata flags irrecoverable replacement characters and exact typo without rewriting copy', () => {
  const quality = sourceModule('src/lib/server/import-content-quality.ts');
  const raw = '<p>SIGA �s employees explore possiblilties.</p>';
  const patch = quality.prepareImportedDescription(raw);
  assert.equal(patch.description, 'SIGA �s employees explore possiblilties.');
  assert.equal(patch.descriptionFormat, 'plain-text');
  assert.equal(patch.importContentQuality.rawDescription, raw);
  assert.equal(patch.importContentQuality.needsReview, true);
  assert.deepEqual(Array.from(patch.importContentQuality.issues), ['replacement-character', 'suspect-copy:possiblilties']);
  const publicRecord = sourceModule('src/lib/server/public-content-record.ts').publicContentRecord(patch);
  assert.equal('importContentQuality' in publicRecord, false);
  assert.equal(quality.prepareImportedDescription('Healthy possibilities').importContentQuality.needsReview, false);
});

test('ADP and Oracle hydration attach review metadata for the actual selected provider text', async () => {
  for (const provider of ['adp', 'oracle']) {
    const raw = '**SIGA �s employees** &lt;img src=x onerror=fixture()&gt;';
    const net = offlineNetwork({ response: () => ({ body: provider === 'adp' ? JSON.stringify({ requisitionDescription: raw }) : `<meta property="og:description" content="${raw}">` }) });
    const patch = await sourceModule('src/lib/server/imported-job-descriptions.ts', net).fetchImportedDescriptionPatch({
      externalUrl: provider === 'adp' ? 'https://workforcenow.adp.com/jobs?cid=fixture&jobId=123' : 'https://fixture.fa.ca2.oraclecloud.com/hcmUI/CandidateExperience/en/sites/Fixture/job/123',
      feedUrl: 'https://fixture.fa.ca2.oraclecloud.com/hcmRestApi/resources/latest/recruitingCEJobRequisitions',
    });
    assert.equal(patch.description, 'SIGA �s employees <img src=x onerror=fixture()>');
    assert.equal(patch.importContentQuality.needsReview, true);
    assert.match(patch.importContentQuality.rawDescription, /\*\*SIGA/);
  }
});

const imports = () => sourceModule('src/lib/server/imported-job-descriptions.ts', offlineNetwork());

test('location deduplication never rewrites titles, organization names or literal entity text', () => {
  const { parseSimpleXml } = sourceModule('src/lib/server/feed-source.ts');
  const [job] = parseSimpleXml('<jobs><job><title>Manager; Manager | Operations</title><company>Walla Walla</company><location>Vancouver, Vancouver</location></job></jobs>');
  assert.equal(job.title, 'Manager; Manager | Operations');
  assert.equal(job.company, 'Walla Walla');
  assert.equal(job.location, 'Vancouver');
  const { normalizeImportedLabel } = sourceModule('src/lib/server/import-content-quality.ts');
  assert.equal(normalizeImportedLabel('&amp;lt;team&amp;gt;'), '&lt;team&gt;');
});

test('known mojibake repair preserves adjacent legitimate Unicode, never invents U+FFFD meaning', () => {
  const { normalizeImportedDescription } = imports();
  assert.equal(normalizeImportedDescription('SIGA â€™s employees — Métis ᐃ 💚'), 'SIGA ’s employees — Métis ᐃ 💚');
  assert.equal(normalizeImportedDescription('SIGA �s employees'), 'SIGA �s employees');
});
