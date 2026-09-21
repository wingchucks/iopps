import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {restoreSignupSecurityLimits} from '../scripts/qa-signup-security-fixture.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex').slice(0,24);
const ipHash=hash('127.0.0.1');
const event={uid:'fictional-owner',name:'Fictional organization',contactEmail:'fixture@example.invalid',clientIpHash:ipHash};
const ids=[`uid_${hash(event.uid)}`,`email_${hash(event.contactEmail)}`,`org_${hash(event.name.toLowerCase())}`,`ip_${ipHash}`];
function fixture(){
 const start=new Date('2026-09-21T10:00:00Z');
 const original={scope:'ip',count:2,windowStartedAt:start,expiresAt:new Date('2026-09-21T10:30:00Z'),lastKind:'employer_signup'};
 const before=new Map([[ids[3],original],['org_unrelated',{count:7}]]);
 const rows=new Map([...before].map(([id,data])=>[id,{...data}]));
 for(const id of ids)rows.set(id,{scope:id.split('_')[0],count:id===ids[3]?3:1,windowStartedAt:start});
 const db={collection(name){assert.equal(name,'signup_security_limits');return {doc(id){return {id,path:name+'/'+id,async get(){return {exists:rows.has(id),data:()=>rows.get(id)};},async delete(){rows.delete(id);},async set(data){rows.set(id,data);}};}};}};
 return {db,before,rows};
}
const env={GCLOUD_PROJECT:'demo-iopps-preview',FIRESTORE_EMULATOR_HOST:'127.0.0.1:8080'};
test('removes only owned new counters, restores exact shared baseline and reads back absence',async()=>{
 const {db,before,rows}=fixture();const result=await restoreSignupSecurityLimits(db,before,[event],env);
 assert.deepEqual(rows,before);
 assert.equal(result.length,4);assert.ok(result.every(row=>row.verified));
 assert.equal(result.filter(row=>row.absent).length,3);
});
test('refuses cleanup outside the exact local demo emulator',async()=>{
 const {db,before,rows}=fixture();const snapshot=new Map(rows);
 await assert.rejects(restoreSignupSecurityLimits(db,before,[event],{...env,GCLOUD_PROJECT:'production'}));
 assert.deepEqual(rows,snapshot);
});
test('refuses unexpected counter activity without deleting any records',async()=>{
 const {db,before,rows}=fixture();rows.get(ids[3]).count++;const snapshot=new Map(rows);
 await assert.rejects(restoreSignupSecurityLimits(db,before,[event],env),/Unexpected signup counter activity/);
 assert.deepEqual(rows,snapshot);
});
test('aggregates repeated denied and accepted attempts before restoring counters',async()=>{
 const {db,before,rows}=fixture();for(const id of ids)rows.get(id).count++;
 await restoreSignupSecurityLimits(db,before,[event,event],env);assert.deepEqual(rows,before);
});
