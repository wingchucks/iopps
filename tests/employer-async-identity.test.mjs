import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { sourceModule } from './helpers/security-fixtures.mjs';
const { organizationContactEmailError } = sourceModule('src/lib/organization-setup-error.ts');

// Execute the actual component with deterministic hook scheduling; no provider claims.
function harness(file, initialUser, adapters={}) {
 let user=initialUser, cursor=0, dirty=true, tree, props={children:'SECRET_CHILD'}, slots=[], effects=[], routes=[], requests=[];
 const react={createElement:(type,props,...children)=>({type,props:props||{},children}),Fragment:'fragment',Suspense:'suspense',
 useState(initial){const i=cursor++;if(!slots[i])slots[i]={value:typeof initial==='function'?initial():initial};return [slots[i].value,v=>{slots[i].value=typeof v==='function'?v(slots[i].value):v;dirty=true;}];},
 useRef(initial){const i=cursor++;return slots[i] ||= {current:initial};},
 useCallback(fn){cursor++;return fn;},
 useEffect(fn,deps){const i=cursor++,old=slots[i];if(!old||deps.some((d,j)=>d!==old.deps[j])){slots[i]={deps,cleanup:old?.cleanup};effects.push(()=>{slots[i].cleanup?.();slots[i].cleanup=fn();});}}};
 const router={replace:p=>routes.push(p),push:p=>routes.push(p)}, storage=new Map();
 const session=new Map();
 const storageAdapter=map=>({getItem:key=>map.get(key)??null,setItem:(key,value)=>map.set(key,String(value)),removeItem:key=>map.delete(key)});
 const localStorage=storageAdapter(storage), sessionStorage=storageAdapter(session);
 function loadHelper(file) {
  const exports={};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports,Date,sessionStorage});
  return exports;
 }
 const draft=loadHelper('src/lib/employer-draft.ts');
 const signupDraft=loadHelper('src/lib/signup-draft.ts');
 const modules={'react':{...react,default:react},'next/navigation':{useRouter:()=>router,useSearchParams:()=>new URLSearchParams('resume=organization')},'@/lib/auth-context':{useAuth:()=>({user,loading:false})},'@/lib/employer-draft':draft,'@/lib/signup-draft':signupDraft,'@/lib/auth-redirect':{authIntentHref:p=>p,postSignupDestination:(_s,p)=>p},'@/lib/firebase':{getAppCheckTokenValue:async()=>null},'@/lib/organization-setup-error':{organizationSetupError:()=> 'Rejected', organizationContactEmailError},'@/lib/auth-errors':{authErrorMessage:()=> 'Failed'},'@/lib/pricing':{SUBSCRIPTION_PLANS:{tier1:{price:1250},tier2:{price:2500}},ONE_TIME_PLANS:{}},'@/components/signup/constants':{CSS:{},PROVINCES:[],EMPLOYER_CAPABILITIES:[],INSTITUTION_TYPES:[],INDIGENOUS_SERVICES:[]},'@/components/signup/ui':{},'./StepHeader':{}};
 const unexpectedUpload=()=>{throw new Error('Unexpected Firebase storage operation');};
 Object.assign(modules,{'firebase/storage':{ref:unexpectedUpload,uploadBytes:unexpectedUpload,getDownloadURL:unexpectedUpload}},adapters);
 let source=fs.readFileSync(file,'utf8');if(file.includes('/signup/'))source+='\nexport { UnifiedSignupContent };';
 const exports={};vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{jsx:ts.JsxEmit.React,module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText,{exports,React:react,require:n=>{if(!(n in modules))throw new Error('Unconfigured module: '+n);return modules[n];},console,URLSearchParams,Date,localStorage,sessionStorage,window:{scrollTo(){}},fetch:()=>new Promise((resolve,reject)=>requests.push({resolve,reject}))});
 const Component=exports.UnifiedSignupContent||exports.default;
 function render(flush=true){cursor=0;dirty=false;tree=Component(props);if(flush){while(effects.length)effects.shift()();if(dirty)return render();}return tree;}
 async function settle(){for(let i=0;i<8;i++){await Promise.resolve();if(dirty)render();}}
 function text(node=tree){if(node==null)return '';if(typeof node!=='object')return String(node);return (node.children||[]).flat(Infinity).filter(n=>n!==undefined).map(n=>text(n)).join('');}
 function nodes(node=tree){return node&&typeof node==='object'?[node,...(node.children||[]).flat(Infinity).filter(n=>n!==undefined).flatMap(n=>nodes(n))]:[];}
 return {render,settle,text,nodes,slots,routes,requests,storage,session,signupDraft,
  seedDraft:(uid,data)=>localStorage.setItem(draft.employerDraftKey(uid),draft.encodeEmployerDraft(uid,data)),
  readDraft:uid=>draft.decodeEmployerDraft(uid,localStorage.getItem(draft.employerDraftKey(uid))),
  setUser:(u,flush=true)=>{user=u;return render(flush);},setProps:p=>{props={...props,...p};render();}};
}
function switchAndResume(h,nextUser) {
 h.setUser(nextUser,false);
 assert.equal(h.text(),'Updating account…','hide all previous-account fields before effects');
 assert.equal(h.nodes().length,1);
 h.render();
 // Public organization intent survives; the current UID resumes automatically.
 assert.ok(!h.nodes().some(n=>n.props.label==='Business or organization'));
}
const user=uid=>({uid,email:uid+'@example.invalid',emailVerified:true,getIdToken:async()=>uid});
for(const query of ['resume=organization','type=employer','intent=indigenous-business'])test('signup public intent '+query+' survives A -> signout -> B -> signout -> A',()=>{
 const h=harness('src/app/signup/page.tsx',user('A'),{'next/navigation':{useRouter:()=>({}),useSearchParams:()=>new URLSearchParams(query)}});
 h.seedDraft('A',{step:10,orgName:'A private',empDescription:'A description',empServices:'A services'});
 h.render();assert.ok(h.nodes().some(n=>n.props.value==='A private'));
 h.setUser(null);h.setUser(user('B'));
 const organization=h.nodes().find(n=>['Business or organization','My business'].includes(n.props.label));
 assert.equal(organization?.props.selected,true,'explicit public intent remains selected for new B');
 const next=h.nodes().find(n=>h.text(n)==='Continue →' && n.props.onClick);assert.equal(next.props.disabled,false);
 next.props.onClick();h.render();
 assert.ok(!h.nodes().some(n=>n.props.value==='A private'));
 assert.equal(h.readDraft('B'),null,'query does not create or authorize an employer');
 h.setUser(null);h.setUser(user('A'));
 assert.ok(h.nodes().some(n=>n.props.value==='A private'),'returning A automatically resumes Basics');
 assert.equal(h.readDraft('A').step,10,'reset cannot overwrite the restored step');
 assert.deepEqual(h.requests,[]);assert.deepEqual(h.routes,[]);
});
test('signup delayed cross-tab login preserves the public Account step but clears anonymous private fields',()=>{
 const h=harness('src/app/signup/page.tsx',user('A'));
 h.seedDraft('A',{step:10,orgName:'A private',empDescription:'A description',empServices:'A services'});
 h.render();h.setUser(null);
 // The other tab may already have signed in while this tab still observes null.
 h.nodes().find(n=>h.text(n)==='Continue →' && n.props.onClick).props.onClick();h.render();
 for(const id of ['name','email','password','confirmPassword'])h.nodes().find(n=>n.props.id===id).props.onChange({target:{value:'Anonymous private '+id}});
 h.nodes().find(n=>n.props.id==='signup-consent').props.onChange({target:{checked:true}});h.render();
 h.setUser(user('B'));
 const resume=h.nodes().find(n=>h.text(n)==='Continue organization setup as B@example.invalid' && n.props.onClick);
 assert.ok(resume,'late B auth notification must not undo Continue and strand the user on Role');
 for(const id of ['name','email','password','confirmPassword'])assert.equal(h.nodes().find(n=>n.props.id===id).props.value,'');
 assert.equal(h.nodes().find(n=>n.props.id==='signup-consent').props.checked,false);
 assert.equal(h.readDraft('B'),null,'public navigation must not authorize or create B draft');
 resume.props.onClick();h.render();
 assert.equal(h.nodes().find(n=>n.props.label==='Organization Name').props.value,'');
 h.nodes().find(n=>n.props.label==='Organization Name').props.onChange({target:{value:'B private'}});h.render();
 assert.equal(h.readDraft('B').orgName,'B private');assert.equal(h.readDraft('A').orgName,'A private');
 h.setUser(null);h.setUser(user('A'));
 assert.ok(h.nodes().some(n=>n.props.value==='A private'));
 assert.deepEqual(h.requests,[]);assert.deepEqual(h.routes,[]);
});
test('signup page restores and persists only anonymous navigation, not free text',()=>{
 const saved=[];
 const h=harness('src/app/signup/page.tsx',null,{'@/lib/signup-draft':{
  SIGNUP_DRAFT_TTL:3600000,clearSignupDraft(){},
  readSignupDraft:()=>({role:'organization',orgType:'employer',step:2,expiresAt:Date.now()+3600000,name:'Legacy private',email:'legacy@example.invalid'}),
  saveSignupDraft:data=>saved.push(data),
 }});
 h.render();
 for(const id of ['name','email','password','confirmPassword'])assert.equal(h.nodes().find(n=>n.props.id===id).props.value,'');
 h.nodes().find(n=>n.props.id==='name').props.onChange({target:{value:'In memory only'}});h.render();
 assert.equal(h.nodes().find(n=>n.props.id==='name').props.value,'In memory only');
 assert.ok(saved.length>0);for(const data of saved)assert.deepEqual(Object.keys(data).sort(),['orgType','role','step']);
});
test('signup identity reset clears typed credentials and consent without inventing organization intent',()=>{
 const h=harness('src/app/signup/page.tsx',null,{'next/navigation':{useRouter:()=>({}),useSearchParams:()=>new URLSearchParams('uid=A&role=employer')}});
 h.render();h.nodes().find(n=>n.props.label==='Individual').props.onClick();h.render();
 h.nodes().find(n=>h.text(n)==='Continue →' && n.props.onClick).props.onClick();h.render();
 for(const id of ['name','email','password','confirmPassword'])h.nodes().find(n=>n.props.id===id).props.onChange({target:{value:'Private-'+id}});
 h.nodes().find(n=>n.props.id==='signup-consent').props.onChange({target:{checked:true}});h.render();
 h.seedDraft('A',{step:10,orgName:'A private'});h.setUser(user('B'));
 assert.equal(h.nodes().find(n=>n.props.label==='Business or organization').props.selected,false);
 assert.equal(h.nodes().find(n=>h.text(n)==='Continue →' && n.props.onClick).props.disabled,true);
 assert.ok(!h.nodes().some(n=>String(n.props.value||'').includes('Private-')));
 h.nodes().find(n=>n.props.label==='Individual').props.onClick();h.render();h.nodes().find(n=>h.text(n)==='Continue →' && n.props.onClick).props.onClick();h.render();
 for(const id of ['name','email','password','confirmPassword'])assert.equal(h.nodes().find(n=>n.props.id===id).props.value,'');
 assert.equal(h.nodes().find(n=>n.props.id==='signup-consent').props.checked,false);
 assert.equal(h.readDraft('B'),null);assert.deepEqual(h.requests,[]);
});
test('signup generation rejects held A token after A -> B -> A',async()=>{
 let release;const gate=new Promise(resolve=>release=resolve);const a=user('A');a.getIdToken=()=>gate;
 const h=harness('src/app/signup/page.tsx',a);
 h.seedDraft('A',{step:12,orgName:'A original',empDescription:'Description',empServices:'Services'});
 h.seedDraft('B',{step:10,orgName:'B private'});h.render();
 const pending=h.nodes().find(n=>h.text(n)==='Create organization profile').props.onClick();await h.settle();
 h.setUser(user('B'));h.setUser(user('A'));release('stale-A');await pending;await h.settle();
 assert.deepEqual(h.requests,[]);assert.deepEqual(h.routes,[]);
 assert.equal(h.readDraft('A').orgName,'A original');assert.equal(h.readDraft('B').orgName,'B private');
 assert.equal(h.nodes().find(n=>h.text(n)==='Create organization profile').props.disabled,false);
});
const response=(uid,authorized=true)=>({ok:true,json:async()=>({authorized,profile:{uid,orgRole:'owner'},profileReady:true})});
for(const outcome of ['pending','denied','signout'])test('OrgRoute rejects old A success with B '+outcome,async()=>{
 const h=harness('src/components/OrgRoute.tsx',user('A'));h.render();await h.settle();h.setUser(outcome==='signout'?null:user('B'));await h.settle();
 if(outcome==='denied'){h.requests[1].resolve(response('B',false));await h.settle();}
 h.requests[0].resolve(response('A'));await h.settle();assert.ok(!h.text().includes('SECRET_CHILD'));assert.ok(!h.routes.includes('/admin'));
});
test('OrgRoute binds role and retry generations, including reversed completion',async()=>{
 const h=harness('src/components/OrgRoute.tsx',user('A'));h.render();await h.settle();h.setProps({requiredRole:'owner'});await h.settle();h.requests[1].reject(new Error('offline'));await h.settle();
 h.nodes().find(n=>n.type==='button').props.onClick();h.render();await h.settle();h.requests[2].resolve(response('A',false));await h.settle();h.requests[0].resolve(response('A'));await h.settle();assert.ok(!h.text().includes('SECRET_CHILD'));
});
for(const nextUid of ['B',null])test('signup hides A before '+(nextUid||'signout')+' effects and discards selected files',()=>{
 const h=harness('src/app/signup/page.tsx',user('A'));
 h.seedDraft('A',{step:11,orgName:'A private',empDescription:'Private description',empServices:'Private services'});
 h.signupDraft.saveSignupDraft({role:'organization',orgType:'employer',step:2},Date.now()+h.signupDraft.SIGNUP_DRAFT_TTL);
 assert.equal(h.signupDraft.readSignupDraft().role,'organization');
 h.render();assert.equal(h.session.has(h.signupDraft.SIGNUP_DRAFT_KEY),false);
 for(const label of ['Upload Logo','Upload Cover'])h.nodes().find(n=>n.props.label===label).props.onFileChange({name:'private.png'});
 h.render();assert.equal(h.nodes().filter(n=>n.props.hasFile===true).length,2);
 h.setUser(nextUid?user(nextUid):null,false);
 assert.equal(h.text(),'Updating account…');assert.equal(h.nodes().length,1);
 h.render();
 // Returning to the original owner restores only persisted text, never selected files.
 h.setUser(user('A'));h.render();
 for(const label of ['Upload Logo','Upload Cover'])assert.equal(h.nodes().find(n=>n.props.label===label).props.hasFile,false);
 assert.equal(h.readDraft('A').orgName,'A private');
});
test('signup stale successful submission preserves B draft autosave and navigation',async()=>{
 const h=harness('src/app/signup/page.tsx',user('A'));
 const data=name=>({step:12,orgName:name,empDescription:'Description',empServices:'Services',empWebsite:'',empProvince:'',empCity:'',businessIdentity:'not_specified',capabilities:[]});
 h.seedDraft('A',data('A original'));h.seedDraft('B',data('B original'));h.render();
 const submit=h.nodes().find(n=>h.text(n)==='Create organization profile');assert.ok(submit);const pending=submit.props.onClick();await h.settle();assert.equal(h.requests.length,1);
 switchAndResume(h,user('B'));await h.settle();h.requests[0].resolve({ok:true});await pending;await h.settle();
 // Exercise B's actual input handler by returning to Basics.
 const back=h.nodes().find(n=>h.text(n)==='← Back');back.props.onClick();h.render();h.nodes().find(n=>h.text(n)==='← Back').props.onClick();h.render();
 const input=h.nodes().find(n=>n.props.value==='B original');assert.ok(input);input.props.onChange({target:{value:'B newer'}});h.render();await h.settle();
 assert.equal(h.readDraft('B').orgName,'B newer');assert.deepEqual(h.routes,[]);assert.equal(h.readDraft('A'),null);
 });

 for(const boundary of ['token','appcheck','upload','http-error','http-rejection','refresh'])test('signup obsolete '+boundary+' cannot continue or mutate B',async()=>{
 let release;const gate=new Promise(r=>release=r);let downloadCalls=0;
 const a=user('A');if(boundary==='token')a.getIdToken=()=>gate;if(boundary==='refresh')a.getIdToken=force=>force?gate:Promise.resolve('A');
 const h=harness('src/app/signup/page.tsx',a,{'@/lib/firebase':{getAppCheckTokenValue:()=>boundary==='appcheck'?gate:Promise.resolve(null)},'firebase/storage':{ref:()=>({}),uploadBytes:()=>gate,getDownloadURL:()=>{downloadCalls++;return Promise.resolve('fictional-logo');}}});
 const data=name=>({step:boundary==='upload'?11:12,orgName:name,empDescription:'Description',empServices:'Services',empWebsite:'',empProvince:'',empCity:'',businessIdentity:'not_specified',capabilities:[]});
 h.seedDraft('A',data('A'));h.seedDraft('B',{...data('B'),step:12});h.render();
 if(boundary==='upload'){h.nodes().find(n=>n.props.label==='Upload Logo').props.onFileChange({name:'fictional.png'});h.render();h.nodes().find(n=>h.text(n)==='Continue →').props.onClick();h.render();}
 const pending=h.nodes().find(n=>h.text(n)==='Create organization profile').props.onClick();await h.settle();
 if(boundary==='refresh'){h.requests[0].resolve({ok:true});await h.settle();}
 switchAndResume(h,user('B'));await h.settle();
 if(boundary==='http-error')h.requests[0].resolve({ok:false,status:503});else if(boundary==='http-rejection')h.requests[0].reject(new Error('offline'));else release('resolved');
 await pending;await h.settle();assert.deepEqual(h.routes,[]);assert.ok(!h.text().includes('Rejected'));assert.ok(!h.text().includes('Failed'));assert.equal(downloadCalls,0);
 if(['token','appcheck','upload'].includes(boundary))assert.equal(h.requests.length,0);
 const submit=h.nodes().find(n=>h.text(n)==='Create organization profile');assert.ok(submit);assert.ok(!submit.props.disabled);assert.equal(h.readDraft('B').orgName,'B');
 });

test('temporary email repeated launch attempts explain the rule without requesting a token or spending API attempts',async()=>{
 let tokens=0;
 const account={...user('qa-round5'),email:'qaretest5biz@mailinator.com',getIdToken:async()=>{tokens++;throw new Error('No token should be requested');}};
 const h=harness('src/app/signup/page.tsx',account);
 h.seedDraft(account.uid,{step:12,orgName:'Fictional QA',empDescription:'Description',empServices:'Services'});h.render();
 for(let i=0;i<4;i++) {await h.nodes().find(n=>h.text(n)==='Create organization profile').props.onClick();await h.settle();}
 assert.equal(tokens,0);assert.deepEqual(h.requests,[]);assert.deepEqual(h.routes,[]);assert.match(h.text(),/permanent contact email/);
});
