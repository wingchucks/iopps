import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import ts from 'typescript';
const tick=()=>new Promise(r=>setImmediate(r));
function fixture(hold,fail=false){
 let cleanup,release;const calls=[],errors=[],states=[];
 const user={uid:'fictional-a',getIdToken:async()=>{calls.push('token');return 'fictional'},getIdTokenResult:async()=>{calls.push('claims');return{token:'fictional',claims:{}}}};
 const auth={currentUser:user};
 const wait=async name=>{calls.push(name);if(name===hold)await new Promise(r=>release=r);if(fail&&name===hold)throw new TypeError('Failed to fetch');};
 const imports={react:{useEffect:fn=>cleanup=fn(),useState:()=>[{},s=>states.push(s)]},'@/lib/auth-context':{useAuth:()=>({user,loading:false})},'@/lib/firebase':{db:{},auth},'firebase/firestore':{doc:()=>({})},'@/lib/firestore/cancellable-read':{getDocCancellable:async()=>{await wait('user');return{exists:()=>false}}},'@/lib/firestore/members':{getMemberProfile:async()=>{await wait('member');return null}},'@/lib/firestore/organizations':{getOrganization:async()=>null},'@/lib/account-state':{resolveLinkedOrganizationId:()=>null},'@/lib/access-state':{isOrganizationAccessBlocked:()=>false},'@/lib/client/fetch-with-timeout':{fetchWithTimeout:async(_url,init)=>{await wait('fetch');if(init.signal?.aborted)throw new DOMException('Aborted','AbortError');return{ok:true,json:async()=>({authorized:false})}},isAbortError:e=>e.name==='AbortError'}};
 const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/useAccountContext.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,AbortController,console:{error:(...a)=>errors.push(a)},require:n=>{assert.ok(n in imports,n);return imports[n]}});
 exports.useAccountContext();return{calls,errors,states,auth,stop:()=>cleanup(),release:()=>release(),ready:async()=>{for(let i=0;i<20&&!release;i++)await tick();assert.ok(release,'held boundary reached')}};
}
for(const hold of ['member','user','fetch'])test('obsolete account work stops after '+hold,async()=>{const h=fixture(hold,true);await h.ready();h.stop();const n=h.calls.length;h.release();await tick();await tick();assert.equal(h.calls.length,n,'no next operation after disposal');assert.deepEqual(h.errors,[],'obsolete failure must not report a current employer outage');});
test('SDK session replacement before context rerender stops old work',async()=>{const h=fixture('member');await h.ready();h.auth.currentUser={uid:'fictional-b'};const n=h.calls.length;h.release();await tick();assert.equal(h.calls.length,n);});
test('current employer network failure remains observable',async()=>{const h=fixture('fetch',true);await h.ready();h.release();await tick();assert.equal(h.errors.length,1);assert.match(h.errors[0][0],/employer check failed/);});
