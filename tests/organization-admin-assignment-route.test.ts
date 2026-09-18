import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { handleAssignmentRequest } from '../src/lib/server/organization-admin-assignment-request.ts';
const body = {action:'review',email:'Pete.Rojaiye@batc.ca',orgId:'batc',role:'admin',enable:false};
const request = (data=body) => new Request('http://localhost/api/admin/employers/batc/administrator',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(data)});
test('API requires existing superadmin authorization before body parsing or adapter access and every error is no-store',async()=>{
  for (const status of [401,403]) {
    const result = await handleAssignmentRequest(request(),'batc',{authorize:async()=>({response:Response.json({error:'Forbidden'},{status})}),getStore:()=>{throw Error('must not access');},getSecret:()=>{throw Error('must not access');}});
    assert.equal(result.status,status); assert.equal(result.headers.get('cache-control'),'no-store');
  }
  const route = readFileSync('src/app/api/admin/employers/[orgId]/administrator/route.ts','utf8');
  assert.match(route,/verifySuperAdminToken\(request\)/);
});
test('API rejects malformed request and unavailable secret, sanitizes adapter failures',async()=>{
  for(const [data,secret,error,expected] of [[{...body,role:'owner'},'s'.repeat(32),'private secret',400],[body,'','private secret',503],[body,'s'.repeat(32),'private secret',500]] as const){
    const response = await handleAssignmentRequest(request(data as typeof body),'batc',{authorize:async()=>({actor:'admin'}),getSecret:()=>secret,getStore:()=>{throw Error(error);}});
    assert.equal(response.status,expected); assert.equal(response.headers.get('cache-control'),'no-store'); assert.equal((await response.text()).includes('private secret'),false);
  }
});
