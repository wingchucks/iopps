import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceModule} from './helpers/security-fixtures.mjs';
const tick=()=>new Promise(r=>setImmediate(r));
function fixture(){
 let next,error,unsubscribed=0,started=0;
 const auth={currentUser:{uid:'fictional-a'}};
 const mocks={
  '../firebase':{auth,db:{}},
  'firebase/firestore':{
   doc:(_db,collection,id)=>({collection,id}),collection:(_db,name)=>({name}),query:(...args)=>({args}),where:(...args)=>args,
   getDoc:()=>{started++;return new Promise(()=>{});},getDocs:()=>{started++;return new Promise(()=>{});},
   onSnapshot:(_ref,_options,n,e)=>{started++;next=n;error=e;return()=>unsubscribed++;},
  },
 };
 const options={mocks,globals:{DOMException}};
 return {members:sourceModule('src/lib/firestore/members.ts',options),subscriptions:sourceModule('src/lib/firestore/subscriptions.ts',options),get started(){return started;},get unsubscribed(){return unsubscribed;},next:v=>{assert.ok(next,'snapshot listener started');next(v);},error:e=>{assert.ok(error,'error listener started');error(e);}};
}
for(const kind of ['member','subscriptions']){
 const read=(f,signal)=>kind==='member'?f.members.getMemberProfile('fictional-a',signal):f.subscriptions.getOrgSubscriptions('fictional-a',signal);
 test(kind+' pending read is truly unsubscribed on disposal',async()=>{const f=fixture(),c=new AbortController();let rejection;read(f,c.signal).catch(e=>rejection=e);c.abort();await tick();assert.equal(rejection?.name,'AbortError');assert.equal(f.unsubscribed,1);});
 test(kind+' already cancelled does not start SDK work',async()=>{const f=fixture(),c=new AbortController();c.abort();let rejection;read(f,c.signal).catch(e=>rejection=e);await tick();assert.equal(rejection?.name,'AbortError');assert.equal(f.started,0);});
 test(kind+' server result preserves data and removes listener',async()=>{const f=fixture(),c=new AbortController();const promise=read(f,c.signal);const document={id:'fictional-a',exists:()=>true,data:()=>({displayName:'Fictional',amount:42,status:'active',plan:'fictional-plan'})};let settled=false;promise.then(()=>settled=true);f.next({...document,docs:[document],metadata:{fromCache:true}});await tick();assert.equal(settled,false,'cache alone is not server confirmation');f.next({...document,docs:[document],metadata:{fromCache:false}});const result=await promise;assert.equal((kind==='member'?result:result[0]).amount,42);assert.equal(f.unsubscribed,1);c.abort();assert.equal(f.unsubscribed,1);});
 test(kind+' genuine current-session SDK error is not swallowed',async()=>{const f=fixture(),c=new AbortController(),sdkError=new Error('permission denied');const promise=read(f,c.signal);const rejection=assert.rejects(promise,e=>e===sdkError);f.error(sdkError);await rejection;assert.equal(f.unsubscribed,1);});
}

test('plans component aborts owned read and ignores late completion',async()=>{
 let cleanup,signal,resolve;const writes=[];
 const {default:Page}=sourceModule('src/app/org/plans/page.tsx',{mocks:{
  react:{useEffect:fn=>cleanup=fn(),useState:()=>[undefined,v=>writes.push(v)]},
  'next/link':{default:()=>null},'@/components/ProtectedRoute':{default:()=>null},'@/components/NavBar':{default:()=>null},'@/components/PricingTabs':{default:()=>null},
  '@/lib/auth-context':{useAuth:()=>({user:{uid:'fictional-a'}})},'@/lib/firestore/subscriptions':{getOrgSubscriptions:(_uid,s)=>{signal=s;return new Promise(r=>resolve=r);}},'@/lib/pricing':{isSubscriptionPlanId:()=>true},
 }});
 const content=Page().props.children.props.children[1];content.type();assert.ok(signal instanceof AbortSignal,'component owns cancellation signal');cleanup();assert.equal(signal.aborted,true);resolve([{status:'active',plan:'fictional-plan'}]);await tick();assert.deepEqual(writes,[]);
});
