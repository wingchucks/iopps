import {test as nodeTest} from 'node:test';
const test=(name,fn)=>nodeTest(name,{timeout:5000},fn);
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const NEW='https://fixture.invalid/new.png',OLD='https://fixture.invalid/old.png';
const tick=()=>new Promise(r=>setImmediate(r));
function fixture({photo=OLD,memberPhoto=photo,failAt,holdAt,status=200}={}) {
 let cells=[],cursor=0,effects=[],cleanups=[],contextUser;
 const calls=[],routes=[],members=new Map([['owner',{photoURL:memberPhoto}]]),persisted=new Map();
 const user={uid:'owner',displayName:'Fixture',photoURL:photo,getIdToken:async()=>{await boundary('token');return 'fictional'}};
 contextUser=user;const auth={currentUser:user};let release,entered;const waiting=new Promise(r=>entered=r);
 const state={failAt,complete:false};
 async function boundary(name){calls.push(name);if(name===holdAt){entered();await new Promise(r=>release=r)}if(name===state.failAt)throw Error('fictional failure');}
 const hooks={useState(value){const i=cursor++;if(!(i in cells))cells[i]=value;return[cells[i],v=>cells[i]=typeof v==='function'?v(cells[i]):v]},useRef(value){const i=cursor++;return cells[i]??={current:value}},useEffect(fn,deps){const i=cursor++;if(!cells[i]||!deps.every((v,j)=>v===cells[i][j])){cleanups[i]?.();cells[i]=deps;effects.push(()=>cleanups[i]=fn())}}};
 const jsx=(type,props)=>({type,props});
 const deps={react:hooks,'react/jsx-runtime':{jsx,jsxs:jsx},'next/navigation':{useRouter:()=>({push:p=>routes.push(p)}),useSearchParams:()=>new URLSearchParams()},'next/link':{default:'a'},'./destination':{setupCompletionDestination:()=>'/feed'},'@/lib/auth-context':{useAuth:()=>({user:contextUser})},'@/lib/constants/interests':{interestOptions:[]},'@/lib/firebase':{storage:{},auth},'firebase/auth':{updateProfile:async(target,data)=>{assert.equal(target,user,'must mutate captured owner, never newly current account');await boundary('auth');Object.assign(target,data);persisted.set(target.uid,{...data})}},'firebase/storage':{ref:(_,p)=>p,uploadBytes:async()=>boundary('upload'),getDownloadURL:async()=>{await boundary('download');return NEW}},'@/lib/firestore/members':{getMemberProfile:async uid=>{await boundary('prefill');return members.get(uid)},updateMemberProfile:async(uid,p)=>{await boundary('member');members.set(uid,{...p})}}};
 for(const name of ['ProtectedRoute','Avatar','Badge','AccountAvatarMenu'])deps['@/components/'+name]={default:name};
 const exports={};vm.runInNewContext(ts.transpileModule(readFileSync('src/app/setup/page.tsx','utf8')+'\nexport const Wizard=SetupWizard;',{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports,URLSearchParams,URL:{createObjectURL:()=> 'blob:fictional',revokeObjectURL(){}},console:{error(){}},fetch:async()=>{await boundary('response');state.complete=status===200;return{ok:status===200,status,json:async()=>{await boundary('json');return{field:'bio'}}}},require:id=>{if(id in deps)return deps[id];throw Error(id)}});
 return {render(){cursor=0;return exports.Wizard()},async flush(){for(const effect of effects.splice(0))effect();await tick()},remount(){cleanups.forEach(fn=>fn?.());cells=[];effects=[];cleanups=[]},switchAuth(){auth.currentUser={uid:'other',photoURL:'other.png'};return auth.currentUser},user,auth,state,calls,routes,members,persisted,get waiting(){return new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Awaited '+holdAt+' was never reached')),1000);waiting.then(()=>{clearTimeout(timer);resolve()})})},release:()=>release()};
}
function nodes(t){if(t==null||typeof t==='boolean')return[];if(Array.isArray(t))return t.flatMap(nodes);if(typeof t!=='object')return[t];return[t,...nodes(t.props?.children)]}
const text=t=>nodes(t).filter(n=>typeof n==='string').join('');
async function ready(h,select=true){h.render();await h.flush();if(select){nodes(h.render()).find(n=>n.type==='input'&&n.props.type==='file').props.onChange({target:{files:[{type:'image/png',size:50}],value:'fixture.png'}});h.render();await h.flush()}}
function save(h){return nodes(h.render()).find(n=>n.type==='button'&&text(n)==='Skip for now').props.onClick()}
// Skip's wrapper is intentionally void; wait for asynchronous handler completion.
async function finish(h){save(h);await tick();await tick()}
for(const photo of [OLD,null])test(`B1 successful setup synchronizes member, Auth and menu from ${photo}`,async()=>{
 const h=fixture({photo});await ready(h);await finish(h);
 assert.equal(h.members.get('owner').photoURL,NEW);assert.equal(h.user.photoURL,NEW);assert.equal(h.persisted.get('owner').photoURL,NEW);assert.deepEqual(h.routes,['/feed']);
 assert.equal(nodes(h.render()).find(n=>n.type==='AccountAvatarMenu').props.src,NEW);
 h.remount();await ready(h,false);assert.equal(nodes(h.render()).find(n=>n.type==='AccountAvatarMenu').props.src,NEW);
});
test('B1 Auth failure is explicit partial success; retry and reentry repair persisted member photo',async()=>{
 for(const remount of [false,true]){
  const h=fixture({failAt:'auth'});await ready(h);await finish(h);
  assert.equal(h.state.complete,true);assert.equal(h.members.get('owner').photoURL,NEW);assert.equal(h.user.photoURL,OLD);assert.deepEqual(h.routes,[]);
  assert.match(text(h.render()),/profile and photo were saved, but your account photo/);
  h.state.failAt=undefined;if(remount){h.remount();await ready(h,false)}await finish(h);
  assert.equal(h.user.photoURL,NEW);assert.deepEqual(h.routes,['/feed']);
 }
});
for(const boundary of ['token','response','upload','download','member','auth','json'])test(`B1 stale Auth UID during awaited ${boundary} cannot continue`,async()=>{
 const h=fixture({holdAt:boundary,status:boundary==='json'?400:200});await ready(h);save(h);await h.waiting;
 const before=h.calls.length,other=h.switchAuth();h.release();await tick();await tick();
 assert.equal(h.calls.length,before,'no subsequent side effect after identity switch, even before context rerenders');
 assert.deepEqual(h.routes,[]);assert.equal(other.photoURL,'other.png');assert.doesNotMatch(text(h.render()),/profile was saved|Check Bio|account photo could/);
});
for(const boundary of ['upload','member','auth'])test(`B1 stale rejected ${boundary} does not show another account an error`,async()=>{
 const h=fixture({holdAt:boundary,failAt:boundary});await ready(h);save(h);await h.waiting;h.switchAuth();h.release();await tick();await tick();assert.deepEqual(h.routes,[]);assert.doesNotMatch(text(h.render()),/could not be saved|account photo could/);
});
for(const failAt of [undefined,'prefill'])test(`B1 stale prefill ${failAt||'success'} cannot expose old account fields`,async()=>{
 const h=fixture({holdAt:'prefill',failAt});h.render();await h.flush();await h.waiting;h.switchAuth();h.release();await tick();
 assert.equal(nodes(h.render()).some(n=>n.type==='input'||n.type==='AccountAvatarMenu'),false);assert.doesNotMatch(text(h.render()),/couldn’t load your profile/);
});
test('B1 a replaced same-UID Auth session cannot resume an old upload',async()=>{
 const h=fixture({holdAt:'upload'});await ready(h);save(h);await h.waiting;h.auth.currentUser={...h.user};h.release();await tick();await tick();assert.equal(h.calls.includes('member'),false);assert.deepEqual(h.routes,[]);
});
for(const failAt of ['upload','download','member'])test(`B1 ${failAt} failure preserves selection and completion, then retry succeeds`,async()=>{
 const h=fixture({failAt});await ready(h);await finish(h);assert.equal(h.state.complete,true);assert.deepEqual(h.routes,[]);assert.equal(h.user.photoURL,OLD);assert.match(text(h.render()),/profile was saved, but your photo/);h.state.failAt=undefined;await finish(h);assert.equal(h.user.photoURL,NEW);assert.deepEqual(h.routes,['/feed']);
});
