import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

import { getUserAccessBlockReason } from '../src/lib/access-state.ts';
import { profileFieldLimitError } from '../src/lib/profile-fields.ts';
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
  '@/lib/access-state':{getUserAccessBlockReason},'@/lib/profile-fields':{profileFieldLimitError},
  '@/lib/firebase-admin':{getAdminDb:()=>db},'firebase-admin/firestore':{FieldValue:{serverTimestamp:()=> 'server-time'}},
 });
 return {docs,writes,run:(body=profile,auth=true)=>route.POST(new Request('https://example.invalid/api/profile/setup',{method:'POST',headers:auth?{authorization:'Bearer fictional'}:{},body:JSON.stringify(body)}))};
}
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

test('saved member name overrides stale Auth name in greeting and preview',async()=>{
 const h=wizard({existing:{...profile,displayName:'Saved Member Name'}});h.render();await h.flush();assert.match(text(h.render()),/Hey Saved Member Name!/);for(let i=0;i<4;i++)click(h,'Continue');assert.match(text(h.render()),/Saved Member Name/);
});
test('target roles prefill edit and authenticated save use the member array',async()=>{
 const h=wizard({existing:{...profile,targetRoles:['Coordinator','Developer']}});h.render();await h.flush();click(h,'Continue');click(h,'Continue');const field=nodes(h.render()).find(n=>n.type==='input'&&n.props.id==='setup-target-roles');assert.ok(field,'editable target roles control');assert.equal(field.props.value,'Coordinator, Developer');field.props.onChange({target:{value:'Coordinator, Researcher'}});click(h,'Continue');click(h,'Continue');await click(h,'Go to My Feed');assert.deepEqual(JSON.parse(h.requests[0].body).targetRoles,['Coordinator','Researcher']);
});
test('selected interests expose toggled pressed state',async()=>{
 const h=wizard();h.render();await h.flush();for(let i=0;i<3;i++)click(h,'Continue');const choice=()=>nodes(h.render()).find(n=>n.type==='button'&&text(n).includes('Jobs'));assert.equal(choice().props['aria-pressed'],true);choice().props.onClick();assert.equal(choice().props['aria-pressed'],false);
});
test('setup API persists explicit targetRoles and preserves omitted legacy payloads',async()=>{
 const h=api({initial:{targetRoles:['Old role']}});assert.equal((await h.run({...profile,targetRoles:['Coordinator','Researcher']})).status,200);assert.deepEqual(Array.from(h.docs.members.targetRoles),['Coordinator','Researcher']);assert.equal((await h.run(profile)).status,200);assert.deepEqual(Array.from(h.docs.members.targetRoles),['Coordinator','Researcher']);assert.equal((await h.run({...profile,targetRoles:[]})).status,200);assert.deepEqual(Array.from(h.docs.members.targetRoles),[]);
});
test('setup API rejects malformed target roles without writes',async()=>{
 for(const targetRoles of ['not-an-array',[{}],null]){const h=api();assert.equal((await h.run({...profile,targetRoles})).status,400);assert.equal(h.writes.length,0);}
});
test('legacy long headline can be shortened one character at a time',async()=>{
 const h=wizard({existing:{...profile,headline:'h'.repeat(100)}});h.render();await h.flush();click(h,'Continue');click(h,'Continue');const input=()=>nodes(h.render()).find(n=>n.type==='input'&&n.props.placeholder==='e.g. Software Developer | Treaty 6');input().props.onChange({target:{value:'h'.repeat(99)}});assert.equal(input().props.value.length,99);
});
