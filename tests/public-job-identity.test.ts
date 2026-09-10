import test from 'node:test';
import assert from 'node:assert/strict';
import {mergePublicJobRecords} from '../src/lib/public-job-merge.ts';

test('closed jobs cannot hide unrelated posts sharing a slug across employers',()=>{
 const jobs=[{id:'old-import',slug:'nurse',employerId:'employer-a',active:false,status:'closed'}];
 const posts=[{id:'new-post',slug:'nurse',employerId:'employer-b',status:'active'}];
 assert.deepEqual(mergePublicJobRecords(jobs,posts).map(j=>j.id),['new-post']);
});
test('same employer may have different jobs sharing a title slug',()=>{
 const jobs=[{id:'old-import',slug:'nurse',employerId:'employer-a',active:false,status:'closed'}];
 const posts=[{id:'new-post',slug:'nurse',employerId:'employer-a',status:'active'}];
 assert.deepEqual(mergePublicJobRecords(jobs,posts).map(j=>j.id),['new-post']);
});
test('closed authoritative identity still suppresses its active same-ID mirror',()=>{
 assert.deepEqual(mergePublicJobRecords([{id:'same',active:false}],[{id:'same',status:'active'}]),[]);
});
