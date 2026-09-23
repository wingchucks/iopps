import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {setupDestination,setupCompletionDestination} from '../src/app/setup/destination.ts';
const tick=()=>new Promise(r=>setImmediate(r));
function access({destination='/feed',query='',photoURL='',authPhoto='',held=false}={}){
 let cells=[],cursor=0,effects=[],user={uid:'member',photoURL:authPhoto,getIdToken:async()=> 'fictional'},release;
 const auth={currentUser:user},routes=[],params=new URLSearchParams(query),router={replace:p=>routes.push(p)};
 const hooks={useState(init){const i=cursor++;if(!(i in cells))cells[i]=init;return[cells[i],v=>cells[i]=v];},useEffect(fn){effects.push(fn);}};
 const jsx=(type,props)=>({type,props});const exports={};
 const deps={react:hooks,'react/jsx-runtime':{jsx,jsxs:jsx},'next/navigation':{useRouter:()=>router,useSearchParams:()=>params},'./destination':{setupDestination,setupCompletionDestination},'@/lib/auth-context':{useAuth:()=>({user})},'@/lib/firebase':{auth},'@/lib/firestore/members':{getMemberProfile:async()=>({photoURL})},'firebase/auth':{},'firebase/storage':{},'next/link':{},'@/lib/constants/interests':{}};
 for(const n of ['AccountAvatarMenu','ProtectedRoute','Avatar','Badge'])deps['@/components/'+n]={};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/app/setup/page.tsx','utf8')+'\nexport const TestAccess=SetupAccess;',{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports,require:id=>{assert.ok(id in deps,id);return deps[id];},setTimeout,clearTimeout,AbortController,fetch:async()=>{if(held)await new Promise(r=>release=r);return {ok:true,json:async()=>({destination})};}});
 return {routes,auth,render(){cursor=0;return exports.TestAccess();},async run(){this.render();effects.shift()();await tick();},release:()=>release(),async settle(){await tick();await tick();}};
}
test('completed ordinary setup revisit redirects before showing Step 1',async()=>{const h=access();await h.run();await h.settle();assert.deepEqual(h.routes,['/feed']);assert.notEqual(h.render().type.name,'SetupWizard');});
test('completed setup consumes safe latest saved-job continuation and rejects external/self loops',()=>{for(const [query,expected] of [['redirect=%2Fjobs%2Ffictional%3Fsave%3D1','/jobs/fictional?save=1'],['redirect=https%3A%2F%2Fevil.invalid','/feed'],['redirect=%2Fsetup','/feed']])assert.equal(setupDestination('/feed',new URLSearchParams(query)),expected);});
test('unfinished setup and explicit completed edit remain editable',async()=>{for(const opts of [{destination:'/setup'},{query:'edit=1'}]){const h=access(opts);await h.run();await h.settle();assert.deepEqual(h.routes,[]);assert.equal(h.render().type.name,'SetupWizard');}});
test('persisted member photo with failed Auth sync retains recovery wizard',async()=>{const h=access({photoURL:'fictional-new-photo',authPhoto:'fictional-old-photo'});await h.run();await h.settle();assert.deepEqual(h.routes,[]);assert.equal(h.render().type.name,'SetupWizard');});
test('late account result cannot redirect after SDK identity switches ahead of context',async()=>{const h=access({held:true,destination:'/org/dashboard'});await h.run();h.auth.currentUser={uid:'different'};h.release();await h.settle();assert.deepEqual(h.routes,[]);});
