import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=(p:string)=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('application API stores server archive URLs rather than mutable client documents',()=>{
 const route=source('src/app/api/applications/route.ts');
 assert.match(route,/archiveApplicationResume/);
 assert.match(route,/input\.resumeUrl = await/);
});
test('only authenticated server can create applications; applicants cannot delete and recreate',()=>{
 const rules=source('firestore.rules').split('match /applications/{applicationId}')[1].split('// Posts')[0];
 assert.match(rules,/allow create: if false/);
 assert.match(rules,/allow delete: if false/);
 const route=source('src/app/api/applications/route.ts');
 assert.match(route,/export async function POST/);
 assert.match(route,/submitApplication/);
 const client=source('src/lib/firestore/applications.ts');
 assert.doesNotMatch(client,/await setDoc\(/);
});
