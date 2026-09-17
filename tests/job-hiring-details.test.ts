import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeHiringDetails, TERRITORY_OPTIONS } from '../src/lib/job-hiring-details.ts';

test('unspecified screening is distinct from explicitly not required', () => {
  assert.equal(normalizeHiringDetails({}).criminalRecordCheck, '');
  assert.equal(normalizeHiringDetails({criminalRecordCheck:'Not required'}).criminalRecordCheck,'Not required');
  assert.equal(normalizeHiringDetails({criminalRecordCheck:'Required after an offer'}).criminalRecordCheck,'Required after an offer');
});
test('legacy job flags survive migration and explicit changes clear them', () => {
  assert.equal(normalizeHiringDetails(undefined,{driversLicense:true,willTrain:true}).driversLicense,true);
  const cleared = normalizeHiringDetails({driversLicense:false,licenceClass:'Class 5',willTrain:false,trainingDetails:'Training'}, {driversLicense:true,willTrain:true});
  assert.equal(cleared.driversLicense,false);
  assert.equal(cleared.licenceClass,'');
  assert.equal(cleared.trainingDetails,'');
});
test('only supported values survive and text is bounded', () => {
  const result = normalizeHiringDetails({territory:'Treaty 13',supports:['Mentorship','invented','Mentorship'],criminalRecordCheck:true,indigenousEncouraged:'true',territoryName:'x'.repeat(300)});
  assert.equal(result.territory,'');
  assert.equal(result.criminalRecordCheck,'');
  assert.equal(result.indigenousEncouraged,false);
  assert.deepEqual(result.supports,['Mentorship']);
  assert.equal(result.territoryName.length,200);
  assert.ok(TERRITORY_OPTIONS.includes('Treaty 11'));
});
test('all advertised details round-trip through normalization', () => {
  const value = normalizeHiringDetails({territory:'Modern treaty / land claim agreement',territoryName:'Example region',criminalRecordCheck:'Required',vulnerableSectorCheck:'Not required',driversLicense:true,licenceClass:'Class 5',willTrain:true,trainingDetails:'Paid first week',certifications:'First Aid preferred',schedule:'Weekdays',supports:['Mentorship','Cultural leave'],indigenousEncouraged:true});
  assert.deepEqual(normalizeHiringDetails(JSON.parse(JSON.stringify(value))),value);
});
