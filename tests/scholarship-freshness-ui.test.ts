import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
test('scholarship directory and detail show closed intake rather than an Apply Now claim',()=>{
 const directory=readFileSync('src/app/scholarships/page.tsx','utf8');
 const detail=readFileSync('src/app/scholarships/[slug]/ScholarshipDetailClient.tsx','utf8');
 for(const source of [directory,detail]) {
   assert.match(source,/isJobRecordExpired/);
   assert.match(source,/Intake closed/);
 }
 assert.match(detail,/Check next intake/);
});
