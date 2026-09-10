import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import { maintenanceResponse } from '../src/lib/launch-maintenance';

test('hosted CI exercises built maintenance responses and dedicated freeze-rule emulators',()=>{
 const ci=readFileSync('.github/workflows/ci.yml','utf8');assert.match(ci,/node --test scripts\/qa-maintenance-http\.mjs/);assert.match(ci,/--project demo-iopps-launch-freeze --config firebase\.maintenance-ci\.json/);assert.match(ci,/node --test scripts\/qa-maintenance-rules\.mjs/);
});

test('maintenance is off only when unset or explicitly off',()=>{
 for(const value of [undefined,'off']) assert.equal(maintenanceResponse('/api/stripe/webhook',value),null);
});
test('paused and malformed maintenance settings fail closed for every dynamic route',async()=>{
 for(const value of ['paused','true','0','', 'OFF']) for(const path of ['/api/stripe/webhook','/api/cron/expire-jobs','/api/auth/session','/api/hermes/v1/reports/billing-publishing','/jobs/test/apply','/']) {
  const response=maintenanceResponse(path,value)!;assert.equal(response.status,503);assert.equal(response.headers.get('retry-after'),'120');assert.equal(response.headers.get('cache-control'),'no-store');
  if(path.startsWith('/api/')) assert.equal((await response.json()).code,'MAINTENANCE');
  else assert.match(await response.text(),/temporarily unavailable/i);
 }
});
test('maintenance status is a read-only no-store exception',()=>{
 assert.equal(maintenanceResponse('/api/launch-status','paused'),null);
 assert.equal(maintenanceResponse('/sw.js','paused'),null);
 assert.equal(maintenanceResponse('/api/launch-status','paused','POST')?.status,503);
 assert.equal(maintenanceResponse('/api/launch-status/unsafe','paused')?.status,503);
});
test('middleware invokes maintenance before session logic and covers auth endpoints',()=>{
 const s=readFileSync('src/middleware.ts','utf8');assert.ok(s.indexOf('maintenanceResponse(req.nextUrl.pathname')<s.indexOf('req.cookies.get'));assert.match(s,/maintenanceResponse\(req.nextUrl.pathname/);assert.doesNotMatch(s,/manifest.*api\/auth\//);
});
