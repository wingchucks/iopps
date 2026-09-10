import test from 'node:test';
import assert from 'node:assert/strict';
import {startIsolatedQaServer} from './local-qa-server.mjs';

test('built maintenance gate blocks browser, webhook, cron, auth and mutation routes without acknowledging work',async t=>{
 const server=await startIsolatedQaServer({maintenanceMode:'paused'});t.after(()=>server.stop());
 const status=await fetch(server.base+'/api/launch-status');assert.equal(status.status,200);assert.equal((await status.json()).status,'maintenance');
 for(const [path,method] of [['/','GET'],['/jobs/fictional/apply','GET'],['/api/stripe/webhook','POST'],['/api/cron/expire-jobs','GET'],['/api/cron/check-subscriptions','GET'],['/api/auth/session','POST'],['/api/applications','POST'],['/api/profile','PATCH'],['/api/employer/jobs/fictional','DELETE'],['/api/hermes/v1/reports/billing-publishing','POST']]) {
  const r=await fetch(server.base+path,{method,redirect:'manual'});assert.equal(r.status,503,`${method} ${path}`);assert.equal(r.headers.get('retry-after'),'120');assert.equal(r.headers.get('cache-control'),'no-store');
 }
});
