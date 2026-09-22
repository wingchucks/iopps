// Actual QA proxy callback + real HTTP worker; no application/Firebase adapters.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import {Worker} from 'node:worker_threads';
import {PassThrough,Writable} from 'node:stream';
import {once} from 'node:events';

function callback(port,timeline){
 const source=fs.readFileSync(new URL('./e2e-goals/goal-01-auth.mjs',import.meta.url),'utf8');
 const start=source.indexOf('denyProxy=http.createServer(')+'denyProxy=http.createServer('.length;
 const end=source.indexOf(');denyProxy.on(',start);
 assert.ok(start>25&&end>start);
 return new Function('http','server','timeline','blocked','activeCheck','crypto','return '+source.slice(start,end))(http,{base:'http://localhost:'+port},timeline,[],'transport-regression',globalThis.crypto);
}
function request(handler,port){
 const req=new PassThrough();req.url='http://127.0.0.1:'+port+'/fixture';req.method='GET';req.headers={origin:'http://localhost:fictional'};req.aborted=false;
 const res=new Writable({write(_chunk,_encoding,done){done();}});res.writeHead=(status,headers)=>{res.statusCode=status;res.headers=headers;res.headersSent=true;};
 const result=once(res,'finish').then(()=>res.statusCode);handler(req,res);req.end();return result;
}
test('proxy does not return CORS-less 502 when a pooled upstream closes before reuse',async()=>{
 const worker=new Worker(`
  const http=require('node:http');const {parentPort}=require('node:worker_threads');
  const server=http.createServer((req,res)=>{res.writeHead(200,{'access-control-allow-origin':'http://localhost:fictional','keep-alive':'timeout=5'});res.end('real fixture response');setTimeout(()=>req.socket.end(),50);});
  server.listen(0,'127.0.0.1',()=>parentPort.postMessage(server.address().port));
 `,{eval:true});
 try{
  const [port]=await once(worker,'message'),timeline=[],handler=callback(port,timeline);
  assert.equal(await request(handler,port),200);
  await new Promise(resolve=>setImmediate(resolve));
  // Hold this event loop while the independent upstream closes its pooled socket.
  // This widens the real close-vs-reuse race without fabricating an HTTP response.
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,180);
  const status=await request(handler,port);
  assert.equal(status,200,JSON.stringify(timeline.filter(e=>e.event.includes('error')||e.event==='proxy-generated-502')));
  assert.equal(timeline.some(e=>e.event==='proxy-generated-502'),false);
 }finally{http.globalAgent.destroy();await worker.terminate();}
});
