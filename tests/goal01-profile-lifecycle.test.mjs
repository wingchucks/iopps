import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceModule} from './helpers/security-fixtures.mjs';
const tick=()=>new Promise(r=>setImmediate(r));
function fixture(hold){
 let cleanup,release,reject,signal;const writes=[],errors=[],calls=[];const user={uid:'fictional-profile-a'},auth={currentUser:user};
 const wait=()=>new Promise((resolve,fail)=>{release=resolve;reject=fail;});
 const profile={displayName:'Fictional Profile'};
 const mocks={react:{useState:init=>[init,v=>writes.push(v)],useRef:v=>({current:v}),useCallback:fn=>fn,useEffect:fn=>{cleanup=fn();}},'next/navigation':{useRouter:()=>({replace:path=>calls.push('redirect:'+path)})},'next/link':{default:()=>null},'firebase/storage':{},'@/lib/firebase':{auth,storage:{}},'@/lib/auth-context':{useAuth:()=>({user,signOut:async()=>{}})},'@/lib/toast-context':{useToast:()=>({showToast:()=>{}})},'@/lib/firestore/members':{getMemberProfile:async(_uid,s)=>{signal=s;calls.push('member');if(hold==='member')await wait();return profile;},updateMemberProfile:async()=>{}},'@/lib/firestore/applications':{getApplications:async()=>{calls.push('applications');return hold==='stats'?await wait():[];}},'@/lib/firestore/savedItems':{getSavedItems:async()=>[]},'@/lib/firestore/rsvps':{getUserRSVPs:async()=>[]},'@/lib/account-labels':{getPublicAccountTypeLabel:()=>''},'@/lib/constants/interests':{interestOptions:[],interestLabels:{}}};
 for(const name of ['ProtectedRoute','AppShell','Footer','Avatar','Badge','Button','Card'])mocks['@/components/'+name]={default:()=>null};
 const {default:Page}=sourceModule('src/app/profile/page.tsx',{mocks,globals:{console:{error:(...a)=>errors.push(a)}}});
 function find(node){if(!node)return;if(Array.isArray(node)){for(const n of node){const result=find(n);if(result)return result;}}else if(node.type?.name==='ProfileContent')return node.type;else return find(node.props?.children);}
 const Content=find(Page());assert.ok(Content);Content();
 return {auth,calls,writes,errors,get signal(){return signal;},stop:()=>cleanup?.(),release:()=>release([]),reject:()=>reject(new Error('permission denied')),ready:async()=>{for(let i=0;i<20&&!release;i++)await tick();assert.ok(release);}};
}
test('profile stops before launching stats after SDK identity changes',async()=>{const f=fixture('member');await f.ready();f.auth.currentUser={uid:'fictional-profile-b'};f.release();await tick();assert.deepEqual(f.calls,['member']);assert.deepEqual(f.writes,[]);});
test('profile member read belongs to effect cancellation',async()=>{const f=fixture('member');await f.ready();f.stop();assert.equal(f.signal?.aborted,true);f.release();await tick();assert.deepEqual(f.calls,['member']);});
test('disposed profile activity rejection is not reported as a current-user error',async()=>{const f=fixture('stats');await f.ready();f.stop();const count=f.writes.length;f.reject();await tick();assert.deepEqual(f.errors,[]);assert.equal(f.writes.length,count);});
test('disposed profile activity success cannot update the next screen',async()=>{const f=fixture('stats');await f.ready();f.stop();const count=f.writes.length;f.release();await tick();assert.equal(f.writes.length,count);});
test('genuine current-session profile activity error remains visible',async()=>{const f=fixture('stats');await f.ready();f.reject();await tick();assert.equal(f.errors.length,1);assert.equal(f.errors[0][0],'Failed to load profile:');});
