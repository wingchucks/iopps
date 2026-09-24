import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
function harness(count) {
  const rows = Array.from({length:count},(_,i)=>({ id:String(i+1), conversationId:'thread', createdAt:i+1, text:`message ${i+1}` }));
  let listener;
  const execute = q => { let result=[...rows]; for(const c of q) { if(c.kind==='order') result.sort((a,b)=>(a.createdAt-b.createdAt)*(c.direction==='desc'?-1:1)); if(c.kind==='limit') result=result.slice(0,c.n); if(c.kind==='last') result=result.slice(-c.n); } return { docs:result.map(r=>({id:r.id,data:()=>r})) }; };
  const sdk={ collection:()=>({}), where:()=>({}), query:(_c,...rest)=>rest, orderBy:(_field,direction)=>({kind:'order',direction}),limit:n=>({kind:'limit',n}),limitToLast:n=>({kind:'last',n}), getDocs:async q=>execute(q), onSnapshot:(q,cb)=>{listener=()=>cb(execute(q));listener();return ()=>{};} };
  const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(process.env.AUDIT_MESSAGE_SOURCE || 'src/lib/firestore/messages.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require:id=>id==='firebase/firestore'?sdk:{auth:{},db:{}}});
  return { api:exports, append:()=>{rows.push({id:String(rows.length+1),createdAt:rows.length+1});listener();} };
}
for(const count of [0,1,50,51,120])test(`one-shot and live messages expose latest chronological window with ${count} records`,async()=>{
 const h=harness(count),expected=Array.from({length:Math.min(count,50)},(_,i)=>String(Math.max(0,count-50)+i+1));
 assert.deepEqual(Array.from(await h.api.getMessages('thread'),m=>m.id),expected);
 let visible;h.api.onMessages('thread',rows=>{visible=Array.from(rows,m=>m.id);});assert.deepEqual(visible,expected);
 h.append();assert.equal(visible.at(-1),String(count+1));assert.equal(visible.length,Math.min(count+1,50));
});
