import test from 'node:test';
import assert from 'node:assert/strict';
import {parseCleanupSourceKey,cleanupSourceDocId} from '../src/lib/server/job-cleanup-contract.ts';
test('cleanup source accepts only exact ADP recruitment identity',()=>{
 const u='https://workforcenow.adp.com/mascsr/default/mdf/recruitment/recruitment.html?cid=12345678-1234-1234-1234-123456789ABC&jobId=Ab12';
 assert.equal(parseCleanupSourceKey(u),'adp:12345678-1234-1234-1234-123456789abc:Ab12');
 for(const bad of [u.replace('https:','http:'),u+'&jobId=x',u.replace('workforcenow.adp.com','evil.test'),u.replace('/mascsr/default/mdf/recruitment/recruitment.html','/evil'),u.replace('jobId=Ab12','jobId=')]) assert.equal(parseCleanupSourceKey(bad),null);
 assert.match(cleanupSourceDocId('adp:a:b'),/^[a-f0-9]{64}$/);
});
