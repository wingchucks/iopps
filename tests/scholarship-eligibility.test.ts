import test from 'node:test';
import assert from 'node:assert/strict';
import { eligibilityLabel, eligibleInProvince, scholarshipEligibility } from '../src/lib/scholarship-eligibility.ts';

// Curated eligibility notes as they appear on live listings (2026-09-25).
const cases: Array<[string, string]> = [
  ['Canada-wide through Indspire; review the official page for full criteria.', 'canada'],
  ['Canada-wide; preference for students from or studying in Ontario, Alberta, or Quebec.', 'canada'],
  ['Canada; STEM areas related to buildings, transportation/infrastructure, oil and gas, environment, mining, power and industrial.', 'canada'],
  ['Students currently attending a college or university within Canada.', 'canada'],
  ['Saskatchewan; students must meet the official Saskatchewan residency, university and program criteria.', 'SK'],
  ['British Columbia, Saskatchewan, or Nova Scotia; forestry trades and/or apprenticeship program focus.', 'BC/NS/SK'],
  ['Students living or studying in BC, Quebec, or Alberta; possibility of paid internship for qualified recipients is noted on the official page.', 'AB/BC/QC'],
  ['Yukon, Northwest Territories, and Nunavut home Indigenous communities; four-year post-secondary study in Canada.', 'NT/NU/YT'],
  ['Ontario-connected award for students from Saugeen, Nawash, or Métis Nation of Ontario Region 7; review Indspire/Bruce Power page for full criteria.', 'ON'],
  ['Specific eligible schools/program areas are listed on the official BASF / Indspire page.', 'unknown'],
  ['Indigenous students in Canada near Cenovus operating areas; review Cenovus and Indspire details for full criteria.', 'unknown'],
  ['See the official BluEarth eligibility and project/community proximity criteria.', 'unknown'],
];

test('curated eligibility notes are read conservatively from their first clause', () => {
  for (const [province, expected] of cases) {
    const scope = scholarshipEligibility({ province });
    assert.equal(scope.kind === 'provinces' ? scope.provinces.join('/') : scope.kind, expected, province);
  }
});

test('a blank statement is not Canada-wide; explicit regions win over the note', () => {
  // The TD Scholarship for Indigenous Peoples listing states no geography.
  assert.deepEqual(scholarshipEligibility({ location: '', province: undefined }), { kind: 'unknown' });
  assert.deepEqual(scholarshipEligibility({ eligibilityRegions: ['CANADA'], province: 'Saskatchewan' }), { kind: 'canada' });
  assert.deepEqual(scholarshipEligibility({ eligibilityRegions: ['sk', 'Alberta'] }), { kind: 'provinces', provinces: ['SK', 'AB'] });
});

test('the province filter includes eligible and Canada-wide listings and sets unknown apart', () => {
  assert.equal(eligibleInProvince({ kind: 'canada' }, 'SK'), true);
  assert.equal(eligibleInProvince({ kind: 'provinces', provinces: ['SK'] }, 'SK'), true);
  assert.equal(eligibleInProvince({ kind: 'provinces', provinces: ['BC'] }, 'SK'), false);
  assert.equal(eligibleInProvince({ kind: 'unknown' }, 'SK'), null);
  assert.equal(eligibilityLabel({ kind: 'provinces', provinces: ['BC', 'NS', 'SK'] }), 'Eligible in British Columbia, Nova Scotia or Saskatchewan');
  assert.equal(eligibilityLabel({ kind: 'unknown' }), "Where applicants can live or study isn't stated");
});
