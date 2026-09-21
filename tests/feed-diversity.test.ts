import test from 'node:test';
import assert from 'node:assert/strict';
import {freshFeedItems} from '../src/lib/feed-card-identity.ts';
test('personal feed limits one employer without altering other employers or non-job items',()=>{
 const jobs=Array.from({length:7},(_,i)=>({id:String(i),type:'job',orgSlug:'one'}));
 const other={id:'elsewhere',type:'job',orgSlug:'two'},event={id:'event',type:'event',orgSlug:'one'};
 const rows=freshFeedItems([...jobs,other,event],[jobs[0]]);
 assert.equal(rows.filter(row=>row.type==='job'&&row.orgSlug==='one').length,2);
 assert.ok(rows.includes(other));assert.ok(rows.includes(event));assert.equal(jobs.length,7);
});
