import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
test('worker is delivered uncached and registrations bypass HTTP caches',()=>{
 assert.match(fs.readFileSync('src/app/layout.tsx','utf8'),/updateViaCache:.*none/);
 assert.match(fs.readFileSync('next.config.ts','utf8'),/source: "\/sw.js"/);
});
test('worker activation only removes owned caches and announces update without destroying unsaved forms',async()=>{
 const handlers={};const deleted=[];const messages=[];let pending;
 vm.runInNewContext(fs.readFileSync('public/sw.js','utf8'),{Response,Promise,self:{addEventListener:(n,fn)=>handlers[n]=fn,clients:{claim:async()=>{},matchAll:async()=>[{postMessage:m=>messages.push(m)}]},skipWaiting(){}},caches:{keys:async()=>['unrelated-cache','iopps-v2','iopps-launch-v1'],delete:async k=>deleted.push(k)}});
 handlers.activate({waitUntil:p=>pending=p});await pending;
 assert.deepEqual(deleted,['iopps-v2']);assert.equal(messages.length,1);assert.equal(messages[0].type,'IOPPS_RELEASE_UPDATED');
});
