import test from 'node:test';
import assert from 'node:assert/strict';
import { mergePublicJobRecords, withAuthoritativeJobCounts } from '../src/lib/public-job-merge.ts';
import { parseSimpleXml, parseAdp, parseDayforcePage, fetchOracleItems } from '../src/lib/server/feed-source.ts';
import { prepareImportedDescription, normalizePartnerDescription } from '../src/lib/server/import-content-quality.ts';

test('round2: Oracle labels normalize safely through actual offline importer', async () => {
 const rows=await fetchOracleItems('https://example.test/jobs?finder=findReqs;site=fixture', async()=>Response.json({items:[{TotalJobsCount:1,Offset:0,requisitionList:[{Id:'1',Title:'Canad Inns &amp; Suites',PrimaryLocation:'Winnipeg&nbsp;MB'}]}]}));
 assert.equal(rows[0].title,'Canad Inns & Suites');
 assert.equal(rows[0].location,'Winnipeg MB');
});

test('round2: JSON provider titles also decode entities without brand changes', () => {
 const title='Canad Inns &amp; Suites';
 const [adp]=parseAdp(JSON.stringify({jobRequisitions:[{itemID:'1',requisitionTitle:title}]}));
 assert.equal(adp.title,'Canad Inns & Suites');
 const dayforce=parseDayforcePage({maxCount:1,offset:0,jobPostings:[{jobPostingId:1,jobTitle:title,clientNamespace:'fixture'}]}, {origin:'https://example.test',namespace:'fixture',board:'board',culture:'en-CA'},0);
 assert.equal(dayforce.items[0].title,'Canad Inns & Suites');
});

test('round2: imported XML labels decode entities once, normalize whitespace and preserve proper names', () => {
 const [item] = parseSimpleXml('<rss><item><title>Canad Inns &amp; Suites&nbsp; &#8211; Cook</title><location>  Winnipeg&#160; MB </location><description>&lt;p&gt;Text&lt;/p&gt;</description></item></rss>');
 assert.equal(item.title, 'Canad Inns & Suites – Cook');
 assert.equal(item.location, 'Winnipeg MB');
 assert.equal(item.description, '&lt;p&gt;Text&lt;/p&gt;');
 const [literal] = parseSimpleXml('<rss><item><title>FNC&amp;FS&amp;JPS &amp;lt;team&amp;gt; �</title></item></rss>');
 assert.equal(literal.title,'FNC&FS&JPS &lt;team&gt; �');
});
test('round2: uncertain imported copy enters review without invented corrections; Canad Inns is a real brand', () => {
 for (const text of ['Circle Camp& National Day','FNC&FS&JPS Mental Health Worker','ChildYouth Support Worker']) {
  const result = prepareImportedDescription(text);
  assert.equal(result.description,text);
  assert.equal(result.importContentQuality.needsReview,true,text);
  assert.ok(result.importContentQuality.issues.includes('suspect-copy:source-verification'));
 }
 const brand = prepareImportedDescription('Canad Inns');
 assert.equal(brand.description,'Canad Inns');
 assert.equal(brand.importContentQuality.needsReview,false);
 const damaged = prepareImportedDescription('Canad Inns � peoples');
 assert.equal(damaged.description,'Canad Inns � peoples');
 assert.ok(damaged.importContentQuality.issues.includes('replacement-character'));
});

test('round2: typed and case-sensitive requisition identities cannot be erased by normalization', () => {
 for (const [field, left, right] of [
  ['requisitionId',101,102], ['externalId','ABC','abc'],
  ['applicationUrl','https://example.test/JobA','https://example.test/joba'],
  ['publishedAt',new Date('2099-01-01'),new Date('2099-01-02')],
 ] as const) assert.equal(mergePublicJobRecords([job('a',{[field]:left}),job('b',{[field]:right})],[]).length,2,field);
});
const reviewBase = { employerId: 'fictional-employer', employerName: 'Example Employer', title: 'Branch Manager', location: 'Winnipeg', closingDate: '2099-10-01', description: 'Manage the branch.', active: true };
for (const [name, left, right] of [
 ['shared externalUrl cannot mask applicationUrl', { externalUrl: 'https://example.test/careers', applicationUrl: 'https://example.test/apply/REQ-A' }, { externalUrl: 'https://example.test/careers', applicationUrl: 'https://example.test/apply/REQ-B' }],
 ['externalApplyUrl is independent evidence', { externalApplyUrl: 'https://example.test/apply/REQ-A' }, { externalApplyUrl: 'https://example.test/apply/REQ-B' }],
 ['applicationLink consumed by apply route remains evidence', { applicationLink: 'https://example.test/apply/REQ-A' }, { applicationLink: 'https://example.test/apply/REQ-B' }],
 ['description URLs remain case-sensitive', { description: 'Apply at https://example.test/JobA' }, { description: 'Apply at https://example.test/joba' }],
] as const) {
 test(`review P1: ${name}`, () => {
  assert.deepEqual(mergePublicJobRecords([{ ...reviewBase, id: 'a', ...left }, { ...reviewBase, id: 'b', ...right }], []).map(row => row.id), ['a', 'b']);
 });
}

test('review P2: mixed HTML/plain-text identity agrees with jobs normalization without mutating source', () => {
 const rows = [
  { ...reviewBase, id: 'a', description: '<p>Manage the branch.</p>', descriptionFormat: 'html' },
  { ...reviewBase, id: 'b', description: 'Manage the branch.', descriptionFormat: 'plain-text' },
 ];
 const before = structuredClone(rows);
 const raw = mergePublicJobRecords(rows, []);
 const normalized = mergePublicJobRecords(rows.map(row => ({ ...row, description: normalizePartnerDescription(row.description, row.descriptionFormat), descriptionFormat: 'plain-text' })), []);
 assert.equal(normalized.length, 1);
 assert.equal(withAuthoritativeJobCounts([{id:'fictional-employer'}], raw)[0].openJobs, 1);
 assert.deepEqual(raw.map(row => row.id), normalized.map(row => row.id));
 assert.equal(raw[0], rows[0]);
 assert.deepEqual(rows, before);
});

test('review safeguards: every URL field preserves independent case-sensitive evidence and positive duplicates', () => {
 const urls = { externalUrl: 'https://example.test/careers', applicationUrl: 'https://example.test/apply', applyUrl: 'https://example.test/Apply', externalApplyUrl: 'https://example.test/ExternalApply' };
 for (const field of Object.keys(urls) as Array<keyof typeof urls>) {
  const a = { ...reviewBase, ...urls, id: 'a' };
  const b = { ...a, id: 'b', [field]: `${urls[field]}?Req=A` };
  assert.deepEqual(mergePublicJobRecords([a, b], []).map(row => row.id), ['a', 'b'], field);
  assert.deepEqual(mergePublicJobRecords([{ ...a, active: false }], [b]).map(row => row.id), ['b'], `hidden ${field}`);
  assert.deepEqual(mergePublicJobRecords([a, { ...a, id: 'b' }], []).map(row => row.id), ['a']);
  assert.equal(mergePublicJobRecords([{ ...a, closingDate: '', externalUrl: '', applicationUrl: '', applyUrl: '', externalApplyUrl: '', [field]: urls[field] }, { ...a, id: 'b', closingDate: '', externalUrl: '', applicationUrl: '', applyUrl: '', externalApplyUrl: '', [field]: urls[field] }], []).length, 1, `undated evidence ${field}`);
 }
});

test('review safeguards: format-aware identity retains HTML link targets and plain-text literals', () => {
 for (const format of ['html', 'plain-text']) {
  const description = format === 'html' ? '<p>Apply <a href="https://example.test/JobA">here</a></p>' : 'Apply at https://example.test/JobA';
  const a = { ...reviewBase, id: 'a', description, descriptionFormat: format };
  const b = { ...a, id: 'b', description: description.replace('JobA', 'joba') };
  assert.equal(mergePublicJobRecords([a, b], []).length, 2);
 }
 assert.equal(mergePublicJobRecords([{...reviewBase,id:'a',description:'<p>Manage the branch.</p>',descriptionFormat:'plain-text'}, {...reviewBase,id:'b',descriptionFormat:'plain-text'}], []).length, 2);
 assert.deepEqual(mergePublicJobRecords([{...reviewBase,id:'a',active:false}], [{...reviewBase,id:'a',description:'Different mirror.',applicationUrl:'https://example.test/other'}]), []);
});

test('round2: equivalent explicit calendar deadline spellings have one identity', () => {
 assert.equal(mergePublicJobRecords([job('a'),job('b',{closingDate:'October 1, 2099'})],[]).length,1);
});

test('round2: preserve explicit requisitions, repost dates, different deadlines and changed content', () => {
 for (const field of ['requisitionId', 'externalId', 'publishedAt', 'closingDate', 'description', 'employerId']) {
   const values = field === 'closingDate' ? ['2099-10-02','2099-10-03'] : ['first','second'];
   assert.equal(mergePublicJobRecords([job('a',{[field]:values[0]}),job('b',{[field]:values[1]})],[]).length,2,field);
 }
});
test('round2: canonical hidden and expired copies suppress matching visible content independent of IDs', () => {
 assert.deepEqual(mergePublicJobRecords([job('z',{active:false})],[job('a')]),[]);
 assert.deepEqual(mergePublicJobRecords([job('a'),job('z',{status:'deleted'})],[]),[]);
 assert.deepEqual(mergePublicJobRecords([job('a'),job('z',{expiresAt:'2000-01-01'})],[]),[]);
});

const job = (id: string, extra: Record<string, unknown> = {}) => ({ id, employerName: 'Example Employer', title: 'Branch Manager', location: 'Winnipeg', closingDate: '2099-10-01', description: 'Manage the branch.', active: true, ...extra });
test('round2: incomplete undated identity cannot silently collapse a possible repost', () => {
 assert.equal(mergePublicJobRecords([job('a',{closingDate:''}),job('b',{closingDate:''})],[]).length,2);
});

test('round2: identical postings with distinct IDs collapse before totals and stable pagination', () => {
 const rows = [job('z'), job('a', { employerName: ' EXAMPLE  Employer ', title: 'Branch\u00a0Manager' }), job('b', {location:'Saskatoon'})];
 const forward = mergePublicJobRecords(rows, []);
 const reverse = mergePublicJobRecords([...rows].reverse(), []);
 assert.equal(forward.length, 2);
 assert.deepEqual(forward.map(j=>j.id), reverse.map(j=>j.id));
 assert.deepEqual(forward.map(j=>j.id), ['a','b']);
 assert.equal(new Set([...forward.slice(0,1), ...forward.slice(1,2)].map(j=>j.id)).size, 2);
});
