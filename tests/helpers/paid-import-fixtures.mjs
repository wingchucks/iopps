import assert from 'node:assert/strict';
/** Persistent fictional DB. Native tests separately cover Firestore contention. */
export function paidImportMemoryDb() {
 const rows=new Map();const jobWrites=[];let serial=0;
 const snapshot=ref=>{const data=rows.get(ref.path);const copy=data&&{...data};return {id:ref.id,ref,exists:!!copy,data:()=>copy,get:k=>copy?.[k]};};
 const apply=(path,data)=>{rows.set(path,data);if(path.startsWith('jobs/'))jobWrites.push(data);};
 const reference=(name,id)=>({id,path:`${name}/${id}`,collection:name,parent:{id:name},
  async get(){return snapshot(this);},async update(patch){assert.ok(rows.has(this.path));apply(this.path,{...rows.get(this.path),...patch});},
  async set(data,options){apply(this.path,options?.merge?{...rows.get(this.path),...data}:{...data});}});
 const db={
  doc(path){const [name,id]=path.split('/');return reference(name,id);},
  collection(name){
   const query=(filters=[],cap=Infinity)=>({
    where(key,op,value){assert.equal(op,'==');return query([...filters,[key,value]],cap);},
    limit(n){assert.ok(Number.isInteger(n)&&n>0);return query(filters,n);},
    async get(){const docs=[...rows].filter(([path,data])=>path.startsWith(name+'/')&&filters.every(([k,v])=>data[k]===v)).slice(0,cap).map(([path])=>snapshot(reference(name,path.slice(name.length+1))));return {docs,size:docs.length,empty:!docs.length};},
    doc(id=`fixture-${++serial}`){return reference(name,id);},
    async add(data){const ref=reference(name,`fixture-${++serial}`);await ref.set(data);return ref;},
   });return query();
  },
  async runTransaction(callback){
   const staged=new Map();
   const result=await callback({
    async get(ref){assert.equal(staged.size,0,'transaction reads precede writes');return ref.path?snapshot(ref):ref.get();},
    create(ref,data){assert.ok(!rows.has(ref.path)&&!staged.has(ref.path));staged.set(ref.path,{...data});},
    set(ref,data,options){staged.set(ref.path,options?.merge?{...(staged.get(ref.path)??rows.get(ref.path)),...data}:{...data});},
    update(ref,data){assert.ok(rows.has(ref.path)||staged.has(ref.path));staged.set(ref.path,{...(staged.get(ref.path)??rows.get(ref.path)),...data});},
   });
   for(const [path,data] of staged)apply(path,data);return result;
  },
  batch(){const pending=[];return {set:(ref,data)=>pending.push(()=>ref.set(data)),update:(ref,data)=>pending.push(()=>ref.update(data)),async commit(){for(const write of pending)await write();}};},
 };
 return {db,rows,jobWrites,jobs:()=>[...rows].filter(([path])=>path.startsWith('jobs/'))};
}
