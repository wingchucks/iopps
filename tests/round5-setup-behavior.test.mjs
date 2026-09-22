import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { accountDestination } from '../src/lib/sign-in-destination.ts';
import { getUserAccessBlockReason } from '../src/lib/access-state.ts';
import { setupDestination, setupCompletionDestination } from '../src/app/setup/destination.ts';
function load(file, deps, extra = '', globals = {}) {
 const exports = {};
 vm.runInNewContext(ts.transpileModule(readFileSync(file, 'utf8') + extra, {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,
 {exports, console:{error(){}}, URLSearchParams, ...globals, require:id=>{if(id in deps)return deps[id]; throw Error(id);}});
 return exports;
}
const profile = {community:'Community',location:'Town',bio:'Stored bio',nation:'Nation',territory:'Territory',languages:'Languages',headline:'Headline',skillsText:'Writing, Testing',interests:['jobs']};
function api({blocked=false, intent, fail=false, initial={privateField:'keep',role:'moderator'}}={}) {
 const docs = {members:{...initial},users:{signupIntent:intent}}, writes=[];
 const db = {collection:name=>({doc:uid=>{assert.equal(uid,'owner');return name;}}),runTransaction:async fn=>{
  const pending=[];
  await fn({get:async ref=>({exists:!!docs[ref],data:()=>docs[ref]}),set:(ref,data,options)=>pending.push({ref,data,options})});
  if(fail)throw Error('offline');
  for(const item of pending){writes.push(item);docs[item.ref]={...docs[item.ref],...item.data};}
 }};
 const route=load('src/app/api/profile/setup/route.ts',{
  'next/server':{NextResponse:{json:Response.json}},
  '@/lib/api-auth':{verifyAuthToken:async req=>blocked||!req.headers.get('authorization')?{success:false,response:Response.json({error:'Unauthorized'},{status:blocked?403:401})}:{success:true,decodedToken:{uid:'owner',name:'Owner'},viewerEmail:'owner@example.invalid',userData:docs.users}},
  '@/lib/access-state':{getUserAccessBlockReason},
  '@/lib/firebase-admin':{getAdminDb:()=>db},'firebase-admin/firestore':{FieldValue:{serverTimestamp:()=> 'server-time'}},
 });
 return {docs,writes,run:(body=profile,auth=true)=>route.POST(new Request('https://example.invalid/api/profile/setup',{method:'POST',headers:auth?{authorization:'Bearer fictional'}:{},body:JSON.stringify(body)}))};
}
test('server save atomically persists completion and member data for subsequent sessions',async()=>{
 const h=api();const response=await h.run({...profile,uid:'victim',role:'admin',setupComplete:false});
 assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');
 assert.equal(h.docs.users.setupComplete,true);assert.equal(h.docs.members.bio,profile.bio);
 assert.equal(h.docs.members.role,'moderator');assert.equal(h.docs.members.privateField,'keep');
 assert.equal(h.docs.members.uid,undefined);assert.deepEqual(Array.from(h.docs.members.skills),['Writing','Testing']);
 assert.equal(accountDestination({hasMemberProfile:true,setupComplete:h.docs.users.setupComplete}),'/feed');
});
test('save denies absent/blocked auth and organization intent without any writes',async()=>{
 for(const [options,auth,status] of [[{},false,401],[{blocked:true},true,403],[{intent:'organization'},true,409]]) {
  const h=api(options);assert.equal((await h.run(profile,auth)).status,status);assert.equal(h.writes.length,0);
 }
});
test('invalid fields and failed transaction never mark completion',async()=>{
 for(const body of [[],{...profile,bio:42},{...profile,interests:[{}]}]){const h=api();assert.equal((await h.run(body)).status,400);assert.equal(h.writes.length,0);}
 const h=api({fail:true});assert.equal((await h.run()).status,503);assert.equal(h.docs.users.setupComplete,undefined);assert.equal(h.writes.length,0);
});
function wizard({existing=profile,readFailure=false,saveFailure=false,fieldError}={}) {
 let cells=[],cursor=0,effects=[],cleanups=[],user={uid:'owner',displayName:'Owner',getIdToken:async()=> 'owner-token'};
 const routes=[],requests=[];
 const hooks={useState(value){const i=cursor++;if(!(i in cells))cells[i]=value;return[cells[i],value=>cells[i]=typeof value==='function'?value(cells[i]):value];},useEffect(fn,deps){const i=cursor++;if(!cells[i]||!deps.every((v,j)=>v===cells[i][j])){cleanups[i]?.();cells[i]=deps;effects.push(()=>cleanups[i]=fn());}},useRef(value){const i=cursor++;return cells[i]??={current:value};}};
 const jsx=(type,props)=>({type,props});
 const deps={react:hooks,'react/jsx-runtime':{jsx,jsxs:jsx},'next/navigation':{useSearchParams:()=>new URLSearchParams(),useRouter:()=>({push:p=>routes.push(p)})},'next/link':{default:'a'},'./destination':{setupDestination,setupCompletionDestination},'@/lib/auth-context':{useAuth:()=>({user})},'@/lib/firestore/members':{getMemberProfile:async uid=>{assert.equal(uid,user.uid);if(readFailure)throw Error('offline');return existing;}},'@/lib/constants/interests':{interestOptions:[{id:'jobs',label:'Jobs',desc:'Work',icon:'*'}]}};
 for(const name of ['ProtectedRoute','Avatar','Badge','AccountAvatarMenu'])deps[`@/components/${name}`]={default:name};
 deps['firebase/storage']={};deps['firebase/auth']={updateProfile:async(target,data)=>Object.assign(target,data)};deps['@/lib/firebase']={storage:{},auth:{get currentUser(){return user}}};
 const component=load('src/app/setup/page.tsx',deps,'\nexport const TestWizard=SetupWizard;', {fetch:async(url,options)=>{requests.push({url,...options});return {ok:!saveFailure,status:fieldError?400:503,json:async()=>({field:fieldError,error:"untrusted provider text"})};}}).TestWizard;
 return {render(){cursor=0;return component();},async flush(){for(const effect of effects.splice(0))effect();await new Promise(r=>setImmediate(r));},routes,requests,switchUser(){user={...user,uid:'other'};},recoverSave(){saveFailure=false;}};
}
function nodes(tree){if(tree==null||typeof tree==='boolean')return[];if(Array.isArray(tree))return tree.flatMap(nodes);if(typeof tree!=='object')return[tree];return[tree,...nodes(tree.props?.children)];}
function text(tree){return nodes(tree).filter(n=>typeof n==='string'||typeof n==='number').join('');}
function click(h,label){const n=nodes(h.render()).find(n=>n.type==='button'&&text(n)===label);assert.ok(n,`button ${label}`);return n.props.onClick();}
test('reopened setup prefills all fields, reaches exactly five steps, and saves authenticated draft',async()=>{
 const h=wizard();assert.match(text(h.render()),/Loading your profile/);await h.flush();
 let values=[];
 for(let step=1;step<=5;step++){
  const tree=h.render();assert.match(text(tree),new RegExp(`Step ${step} of 5`));
  values.push(...nodes(tree).filter(n=>['input','textarea'].includes(n.type)).map(n=>n.props.value));
  if(step===1){assert.ok(nodes(tree).some(n=>n.type==='button'&&text(n)==='Choose profile photo'));assert.equal(nodes(tree).some(n=>n.type==='input'&&n.props.type==='file'),true);}
  if(step<5)click(h,'Continue');
 }
 for(const [key,value] of Object.entries(profile))if(key!=='interests')assert.ok(values.includes(value),`${key} prefilled`);
 await click(h,'Go to My Feed');assert.deepEqual(h.routes,['/feed']);
 assert.equal(h.requests[0].url,'/api/profile/setup');assert.equal(h.requests[0].headers.Authorization,'Bearer owner-token');assert.deepEqual(JSON.parse(h.requests[0].body),{...profile,targetRoles:[]});
});
test('prefill failure and UID change never expose an editable old profile',async()=>{
 const failed=wizard({readFailure:true});failed.render();await failed.flush();assert.match(text(failed.render()),/couldn’t load your profile/);assert.equal(nodes(failed.render()).some(n=>n.type==='input'),false);
 const h=wizard();h.render();await h.flush();h.switchUser();assert.match(text(h.render()),/Loading your profile/);assert.equal(nodes(h.render()).some(n=>n.type==='input'),false);
});
test('failed save keeps draft and permits successful retry',async()=>{
 const h=wizard({saveFailure:true});h.render();await h.flush();for(let i=0;i<4;i++)click(h,'Continue');
 await click(h,'Go to My Feed');assert.equal(h.routes.length,0);assert.match(text(h.render()),/draft is still here/);assert.match(text(h.render()),/Stored bio/);
 h.recoverSave();await click(h,'Go to My Feed');assert.deepEqual(h.routes,['/feed']);
});
for (const bio of ['', 'x'.repeat(5000), 'Fictional nurse community experience. '.repeat(140)]) test(`setup preserves ${bio.length}-character bio through authenticated save`, async()=>{
 const h=wizard({existing:{...profile,bio}});h.render();await h.flush();for(let i=0;i<4;i++)click(h,'Continue');await click(h,'Go to My Feed');
 const body=JSON.parse(h.requests[0].body);assert.equal(body.bio,bio);
 const server=api();assert.equal((await server.run(body)).status,200);assert.equal(server.docs.members.bio,bio);
});

test('setup validation shows only allowlisted actionable field guidance',async()=>{
 for(const field of ['community','skillsText','interests','untrusted']) {
  const h=wizard({saveFailure:true,fieldError:field});h.render();await h.flush();for(let i=0;i<4;i++)click(h,'Continue');await click(h,'Go to My Feed');
  const message=text(h.render());assert.doesNotMatch(message,/untrusted provider text/);assert.equal(h.routes.length,0);
  if(field==='untrusted')assert.match(message,/Please try again/);else assert.match(message,/Check .*Your draft is still here/);
 }
});
