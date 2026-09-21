import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import ts from 'typescript';
import { readFileSync } from 'node:fs';
type SavedRecord = {userId:string;postId:string;postType:string;savedAt:string;postTitle?:string;postOrgName?:string};
type MockFilter = {field:keyof SavedRecord;value:string};
type SavedItemsModule = typeof import('../src/lib/firestore/savedItems');
function fixture() {
 const docs=new Map<string,SavedRecord>([
  ['random-legacy',{userId:'alice',postId:'old',postType:'job',savedAt:'original'}],
  ['alice_new',{userId:'alice',postId:'new',postType:'job',savedAt:'later'}],
  ['bob_old',{userId:'bob',postId:'old',postType:'job',savedAt:'bob-time'}],
 ]);
 const deleted:string[]=[];let offline=false;
 const sdk={collection:()=>({}),doc:(_db:unknown,_col:string,id:string)=>id,where:(field:keyof SavedRecord,_op:string,value:string)=>({field,value}),query:(_col:unknown,...filters:MockFilter[])=>filters,
  getDocsFromServer:async(filters:MockFilter[])=>{if(offline)throw Error('offline');const rows=[...docs.entries()].filter(([,data])=>filters.every(f=>data[f.field]===f.value));return {empty:!rows.length,docs:rows.map(([id,data])=>({id,ref:id,data:()=>data}))};},
  writeBatch:()=>{const pending:string[]=[];return {delete:(id:string)=>pending.push(id),commit:async()=>{if(offline)throw Error('offline');for(const id of pending){deleted.push(id);docs.delete(id);}}};},
  deleteDoc:async(id:string)=>{deleted.push(id);docs.delete(id);},setDoc:async(id:string,data:SavedRecord)=>{if(docs.has(id))throw Error('exists');docs.set(id,data);},serverTimestamp:()=> 'new-time'};
 const exports={} as SavedItemsModule;
 vm.runInNewContext(ts.transpileModule(readFileSync('src/lib/firestore/savedItems.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports,require:(id:string)=>id==='firebase/firestore'?sdk:id==='../saved-job-aliases'?{loadSavedJobAliases:async()=>[{originalId:'old',canonicalId:'new',destination:'/jobs/role--new'}]}:{db:{}}});
 return {docs,deleted,exports,offline:()=>{offline=true;}};
}
test('actual saved library removes only queried own actual document IDs across aliases',async()=>{
 const f=fixture();assert.equal(await f.exports.isJobSaved('alice','new'),true);
 await f.exports.saveJob('alice','new','Role','Org');assert.equal(f.docs.size,3);assert.equal(f.docs.get('random-legacy')?.savedAt,'original');
 await f.exports.unsaveJob('alice','new');assert.deepEqual(f.deleted,['random-legacy','alice_new']);assert.deepEqual([...f.docs.keys()],['bob_old']);
});
test('foreign actual ID fails ownership validation before any deletion; offline does not acknowledge removal',async()=>{
 const f=fixture();await assert.rejects(f.exports.removeOwnSavedRecords('alice',['random-legacy','bob_old']),/ownership/);assert.deepEqual(f.deleted,[]);
 f.offline();await assert.rejects(f.exports.unsaveJob('alice','new'),/offline/);assert.deepEqual(f.deleted,[]);
});
test('new canonicalized save does not migrate existing saves and old duplicate records are not overwritten',async()=>{
 const f=fixture();f.docs.delete('random-legacy');f.docs.delete('alice_new');
 await f.exports.saveJob('alice','old','Role','Org');assert.equal(f.docs.has('alice_old'),false);assert.equal(f.docs.get('alice_new')?.postId,'new');assert.equal(f.docs.get('bob_old')?.savedAt,'bob-time');
});
