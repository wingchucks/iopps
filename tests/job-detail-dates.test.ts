import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
test('detail dates separate source posting, IOPPS addition and explicit source check',async()=>{
 const url=new URL('../src/lib/job-detail-dates.ts',import.meta.url);
 assert.ok(existsSync(url),'date labels missing');
 const {jobDetailDates: dates}=await import(url.href);
 const result=dates({postedAt:'2026-09-01',createdAt:'2026-09-03',sourceVerifiedAt:'2026-09-04',updatedAt:'2026-09-08'});
 assert.deepEqual(result.map((row:{label:string})=>row.label),['Originally posted','Added to IOPPS','Last source check']);
 assert.deepEqual(dates({updatedAt:'2026-09-08'}),[]);
 assert.match(readFileSync(new URL('../src/app/jobs/[slug]/page.tsx',import.meta.url),'utf8'),/jobDetailDates\(job\)/);
});
