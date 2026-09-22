import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {chromium} from '@playwright/test';
import {goal01BrowserOptions} from '../scripts/qa-goal01-browser-options.mjs';
const start=server=>new Promise(r=>server.listen(0,'127.0.0.1',r));
const stop=server=>{server.closeAllConnections();return new Promise(r=>server.close(r));};
test('Chrome reaches only approved loopback ports directly and denies all other destinations',async()=>{
 const denied=[],direct=[];
 const app=http.createServer((req,res)=>{direct.push(req.url);res.end('owned loopback');});
 const unapproved=http.createServer((_req,res)=>{res.end('must never reach');});let unapprovedHits=0;unapproved.on('request',()=>unapprovedHits++);
 const proxy=http.createServer((req,res)=>{denied.push(req.url);res.writeHead(403);res.end('explicitly denied');});
 proxy.on('connect',(req,s)=>{denied.push(req.url);s.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');});
 let browser;
 try{
  await Promise.all([start(app),start(unapproved),start(proxy)]);
  browser=await chromium.launch(goal01BrowserOptions({proxyPort:proxy.address().port,allowedPorts:[app.address().port]}));
  const page=await browser.newPage();
  const statuses=[];
  for(const hostname of ['localhost','127.0.0.1'])statuses.push((await page.goto('http://'+hostname+':'+app.address().port+'/owned')).status());
  const blocked=(await page.goto('http://127.0.0.1:'+unapproved.address().port+'/not-owned')).status();
  const external=(await page.goto('http://fictional-goal01.invalid/denied')).status();
  assert.deepEqual(statuses,[200,200]);
  assert.equal(blocked,403);assert.equal(external,403);assert.equal(unapprovedHits,0);
  assert.equal(denied.some(u=>u.includes(':'+app.address().port+'/owned')),false);
  assert.equal(direct.filter(u=>u==='/owned').length,2);
 }finally{if(browser)await browser.close();await Promise.all([stop(app),stop(unapproved),stop(proxy)]);}
});
