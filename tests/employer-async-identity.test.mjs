import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

// Execute the actual component with deterministic hook scheduling; no provider claims.
function harness(file, initialUser, adapters={}) {
 let user=initialUser, cursor=0, dirty=true, tree, props={children:'SECRET_CHILD'}, slots=[], effects=[], routes=[], requests=[];
 const react={createElement:(type,props,...children)=>({type,props:props||{},children}),Fragment:'fragment',Suspense:'suspense',
 useState(initial){const i=cursor++;if(!slots[i])slots[i]={value:typeof initial==='function'?initial():initial};return [slots[i].value,v=>{slots[i].value=typeof v==='function'?v(slots[i].value):v;dirty=true;}];},
 useRef(initial){const i=cursor++;return slots[i] ||= {current:initial};},
 useCallback(fn){cursor++;return fn;},
 useEffect(fn,deps){const i=cursor++,old=slots[i];if(!old||deps.some((d,j)=>d!==old.deps[j])){slots[i]={deps,cleanup:old?.cleanup};effects.push(()=>{slots[i].cleanup?.();slots[i].cleanup=fn();});}}};
 const router={replace:p=>routes.push(p),push:p=>routes.push(p)}, storage=new Map();
 const draft={employerDraftKey:uid=>'draft:'+uid,decodeEmployerDraft:(_uid,text)=>text?JSON.parse(text):null,encodeEmployerDraft:(_uid,data)=>JSON.stringify(data)};
 const modules={'react':{...react,default:react},'next/navigation':{useRouter:()=>router,useSearchParams:()=>new URLSearchParams('resume=organization')},'@/lib/auth-context':{useAuth:()=>({user,loading:false})},'@/lib/employer-draft':draft,'@/lib/auth-redirect':{authIntentHref:p=>p,postSignupDestination:(_s,p)=>p},'@/lib/firebase':{getAppCheckTokenValue:async()=>null},'@/lib/organization-setup-error':{organizationSetupError:()=> 'Rejected'},'@/lib/auth-errors':{authErrorMessage:()=> 'Failed'},'@/lib/pricing':{SUBSCRIPTION_PLANS:{tier1:{price:1250},tier2:{price:2500}},ONE_TIME_PLANS:{}},'@/components/signup/constants':{CSS:{},PROVINCES:[],EMPLOYER_CAPABILITIES:[],INSTITUTION_TYPES:[],INDIGENOUS_SERVICES:[]},'@/components/signup/ui':{},'./StepHeader':{}};
 Object.assign(modules,adapters);
 let source=fs.readFileSync(file,'utf8');if(file.includes('/signup/'))source+='\nexport { UnifiedSignupContent };';
 const exports={};vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{jsx:ts.JsxEmit.React,module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText,{exports,React:react,require:n=>modules[n]||{},console,URLSearchParams,Date,localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},window:{scrollTo(){}},fetch:()=>new Promise((resolve,reject)=>requests.push({resolve,reject}))});
 const Component=exports.UnifiedSignupContent||exports.default;
 function render(flush=true){cursor=0;dirty=false;tree=Component(props);if(flush){while(effects.length)effects.shift()();if(dirty)return render();}return tree;}
 async function settle(){for(let i=0;i<8;i++){await Promise.resolve();if(dirty)render();}}
 function text(node=tree){if(node==null)return '';if(typeof node!=='object')return String(node);return (node.children||[]).flat(Infinity).filter(n=>n!==undefined).map(n=>text(n)).join('');}
 function nodes(node=tree){return node&&typeof node==='object'?[node,...(node.children||[]).flat(Infinity).filter(n=>n!==undefined).flatMap(n=>nodes(n))]:[];}
 return {render,settle,text,nodes,slots,routes,requests,storage,setUser:u=>{user=u;render();},setProps:p=>{props={...props,...p};render();}};
}
const user=uid=>({uid,email:uid+'@example.invalid',emailVerified:true,getIdToken:async()=>uid});
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
test('signup stale successful submission preserves B draft autosave and navigation',async()=>{
 const h=harness('src/app/signup/page.tsx',user('A'));
 const data=name=>({step:12,orgName:name,empDescription:'Description',empServices:'Services',empWebsite:'',empProvince:'',empCity:'',businessIdentity:'not_specified',capabilities:[]});
 h.storage.set('draft:A',JSON.stringify(data('A original')));h.storage.set('draft:B',JSON.stringify(data('B original')));h.render();
 const submit=h.nodes().find(n=>h.text(n)==='Create organization profile');assert.ok(submit);const pending=submit.props.onClick();await h.settle();assert.equal(h.requests.length,1);
 h.setUser(user('B'));await h.settle();h.requests[0].resolve({ok:true});await pending;await h.settle();
 // Exercise B's actual input handler by returning to Basics.
 const back=h.nodes().find(n=>h.text(n)==='← Back');back.props.onClick();h.render();h.nodes().find(n=>h.text(n)==='← Back').props.onClick();h.render();
 const input=h.nodes().find(n=>n.props.value==='B original');assert.ok(input);input.props.onChange({target:{value:'B newer'}});h.render();await h.settle();
 assert.equal(JSON.parse(h.storage.get('draft:B')).orgName,'B newer');assert.deepEqual(h.routes,[]);assert.equal(h.storage.has('draft:A'),false);
 });

 for(const boundary of ['token','appcheck','upload','http-error','http-rejection','refresh'])test('signup obsolete '+boundary+' cannot continue or mutate B',async()=>{
 let release;const gate=new Promise(r=>release=r);let downloadCalls=0;
 const a=user('A');if(boundary==='token')a.getIdToken=()=>gate;if(boundary==='refresh')a.getIdToken=force=>force?gate:Promise.resolve('A');
 const h=harness('src/app/signup/page.tsx',a,{'@/lib/firebase':{getAppCheckTokenValue:()=>boundary==='appcheck'?gate:Promise.resolve(null)},'firebase/storage':{ref:()=>({}),uploadBytes:()=>gate,getDownloadURL:()=>{downloadCalls++;return Promise.resolve('fictional-logo');}}});
 const data=name=>({step:boundary==='upload'?11:12,orgName:name,empDescription:'Description',empServices:'Services',empWebsite:'',empProvince:'',empCity:'',businessIdentity:'not_specified',capabilities:[]});
 h.storage.set('draft:A',JSON.stringify(data('A')));h.storage.set('draft:B',JSON.stringify({...data('B'),step:12}));h.render();
 if(boundary==='upload'){h.nodes().find(n=>n.props.label==='Upload Logo').props.onFileChange({name:'fictional.png'});h.render();h.nodes().find(n=>h.text(n)==='Continue →').props.onClick();h.render();}
 const pending=h.nodes().find(n=>h.text(n)==='Create organization profile').props.onClick();await h.settle();
 if(boundary==='refresh'){h.requests[0].resolve({ok:true});await h.settle();}
 h.setUser(user('B'));await h.settle();
 if(boundary==='http-error')h.requests[0].resolve({ok:false,status:503});else if(boundary==='http-rejection')h.requests[0].reject(new Error('offline'));else release('resolved');
 await pending;await h.settle();assert.deepEqual(h.routes,[]);assert.ok(!h.text().includes('Rejected'));assert.ok(!h.text().includes('Failed'));assert.equal(downloadCalls,0);
 if(['token','appcheck','upload'].includes(boundary))assert.equal(h.requests.length,0);
 const submit=h.nodes().find(n=>h.text(n)==='Create organization profile');assert.ok(submit);assert.ok(!submit.props.disabled);
 });
