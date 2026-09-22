import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {PassThrough} from 'node:stream';

for (const file of ['scripts/qa-goal01-signout-probe.mjs', 'tests/e2e-goals/goal-01-auth.mjs', 'tests/e2e-goals/goal-02-onboarding.mjs', 'tests/e2e-goals/goal-03-employer.mjs']) {
  test(`${file}: proxy dials a fixed loopback address and trusted port`, () => {
    const source=fs.readFileSync(file,'utf8');
    const owner=file.includes('signout-probe')?'proxy':'denyProxy';
    const marker=owner+'=http.createServer(';
    const start=source.indexOf(marker)+marker.length;
    const end=source.indexOf(');'+owner+'.on(',start);
    const fallbackEnd=source.indexOf(');\n '+owner+'.on(',start);
    const stop=end<0?fallbackEnd:end;
    assert.ok(start>=marker.length && stop>start);
    const calls=[];
    const http={request:(...args)=>{calls.push(args);return new PassThrough();}};
    const handler=new Function('http','server','timeline','blocked','activeCheck','crypto','event','return '+source.slice(start,stop))(http,{base:'http://localhost:43123'},[],[],'destination-test',globalThis.crypto,()=>{});
    for(const host of ['localhost','127.0.0.1'])for(const port of [43123,8080,9099,9199]){
      const req=new PassThrough();req.url=`http://${host}:${port}/fixture?x=1`;req.method='GET';req.headers={};
      const res=new PassThrough();res.writeHead=()=>{};
      handler(req,res);req.end();
      const [destination]=calls.at(-1);
      assert.equal(destination.hostname,'127.0.0.1');
      assert.equal(destination.protocol,'http:');
      assert.equal(destination.port,port);
      assert.equal(destination.path,'/fixture?x=1');
    }
    for(const url of ['http://example.invalid:43123/','http://127.0.0.1:43124/','https://localhost:43123/']){
      const before=calls.length,req=new PassThrough(),res=new PassThrough();req.url=url;req.method='GET';req.headers={};let status;
      res.writeHead=value=>{status=value;};handler(req,res);req.end();assert.equal(status,403);assert.equal(calls.length,before);
    }
  });
}
