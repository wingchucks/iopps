import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const tick = () => new Promise(resolve => setImmediate(resolve));
function fixture() {
  const requests = [], states = [], effects = [];
  let listener, cookie = null;
  const user = uid => ({uid, getIdToken: async () => uid});
  const auth = {currentUser: user('employer-a')};
  const exports = {};
  const emit = value => { auth.currentUser = value; return listener(value); };
  const modules = {
    react: {createContext: () => ({Provider:'provider'}), useContext: () => {}, useState: initial => [initial, value => states.push(value)], useEffect: fn => effects.push(fn)},
    'react/jsx-runtime': {jsx: (_type, props) => props},
    './firebase': {auth},
    '@/lib/signup-draft': {clearSignupDraft() {}},
    '@/lib/auth-errors': {authErrorMessage: () => 'error'},
    '@/lib/auth-verification-email': {},
    'firebase/auth': {onAuthStateChanged: (_auth, fn) => {listener=fn; return () => {};}, signOut: async () => {void emit(null);}, signInWithEmailAndPassword: async () => ({user: auth.currentUser})},
  };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(process.env.ROUND6_AUTH_BASELINE || 'src/lib/auth-context.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports,require:id=>{assert.ok(id in modules,id);return modules[id];},setTimeout,clearTimeout,AbortController,console,process:{env:{}},fetch:async (_url, init)=>new Promise(resolve=>requests.push({method:init.method,uid:init.body?JSON.parse(init.body).idToken:null,release(ok=true){if(this.released)return;this.released=true;if(ok)cookie=init.method==='POST'?this.uid:null;resolve({ok});}}))});
  const api=exports.AuthProvider({children:null}).value;
  const dispose=effects[0]();
  return {api,auth,user,requests,states,emit,dispose,get cookie(){return cookie;}};
}
async function drain(h) {for(let i=0;i<12;i++){for(const r of h.requests.splice(0))r.release();await tick();}}

test('confirmed signout cannot finish with an older in-flight session POST restoring its cookie', async () => {
  const h=fixture(); const restoring=h.emit(h.auth.currentUser); await tick();
  const old=h.requests.find(r=>r.method==='POST'); assert.ok(old);
  let finished=false;const exiting=h.api.signOut().then(()=>{finished=true;});await tick();
  // Release DELETEs first, just as a slow earlier POST can arrive last over the network.
  for(const r of h.requests.filter(r=>r.method==='DELETE'))r.release();await tick();
  for(const r of h.requests.filter(r=>r.method==='DELETE'))r.release();await tick();
  const finishedBeforeOldResponse=finished;
  old.release();await drain(h);await restoring;await exiting;
  assert.equal(h.cookie,null,'the last accepted cookie must be anonymous, not employer-a');
  assert.equal(finishedBeforeOldResponse,false,'logout must await older cookie writes before confirming');
});

test('SDK signout clears visible identity before waiting on session deletion', async () => {
  const h=fixture();const restored=h.emit(h.auth.currentUser);await tick();h.requests.shift().release();await restored;
  h.states.length=0;const clearing=h.emit(null);await tick();
  const beforeResponse=h.states.includes(null);
  await drain(h);await clearing;
  assert.equal(beforeResponse,true,'old employer cannot remain visible during anonymous session reconciliation');
});

test('failed server deletion rejects explicit signout instead of falsely confirming success', async () => {
  const h=fixture();let settled=false;const result=h.api.signOut().then(()=>({ok:true}),()=>({ok:false})).then(v=>{settled=true;return v;});
  for(let i=0;i<12&&!settled;i++){await tick();for(const r of h.requests.splice(0))r.release(false);}
  assert.equal((await result).ok,false);assert.equal(h.auth.currentUser,null,'Firebase persistence is still signed out after network failure');
});

test('a stale sign-in reconciliation failure cannot sign out the replacement account', async () => {
  const h=fixture();const pending=h.api.signIn('fictional@example.invalid','fictional').catch(()=>null);await tick();
  const old=h.requests.shift();assert.ok(old);const b=h.user('individual-b');const switched=h.emit(b);await tick();
  old.release(false);await drain(h);await Promise.all([pending,switched]);
  assert.equal(h.auth.currentUser,b,'the old account must not sign out individual-b');
});

test('superseded same-UID callbacks cannot publish after an anonymous boundary', async () => {
  const h=fixture(), a=h.auth.currentUser;const old=h.emit(a);await tick();
  const first=h.requests.shift(); const anonymous=h.emit(null);const newer=h.emit(a);await tick();
  h.states.length=0;first.release();await old;await tick();
  const published=h.states.filter(v=>v===a).length;
  await drain(h);await Promise.all([anonymous,newer]);
  assert.equal(published,0,'generation, not UID equality alone, owns publication');
});
