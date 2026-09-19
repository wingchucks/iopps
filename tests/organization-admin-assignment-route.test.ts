import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { handleAssignmentRequest } from '../src/lib/server/organization-admin-assignment-request.ts';
import { getOrganizationAdminReviewSecret } from '../src/lib/server/organization-admin-review-secret.ts';
import { deriveHermesAdminReviewSecret } from '../src/lib/server/hermes-admin-request.ts';
import { AssignmentError, type AssignmentState, type AssignmentStore } from '../src/lib/server/organization-admin-assignment.ts';
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

test('assignment review keys preserve explicit values and separate Firebase fallbacks from Hermes', () => {
  const material = 'fictional-private-key-material-'.repeat(3);
  const expected = getOrganizationAdminReviewSecret({ FIREBASE_PRIVATE_KEY: material });
  assert.match(expected, /^[A-Za-z0-9_-]{43}$/);
  assert.notEqual(expected, deriveHermesAdminReviewSecret({ FIREBASE_PRIVATE_KEY: material }));
  assert.equal(getOrganizationAdminReviewSecret({ ORGANIZATION_ADMIN_REVIEW_SECRET: material, FIREBASE_PRIVATE_KEY: 'other' }), material);
  for (const field of ['private_key', 'privateKey']) {
    const encoded = Buffer.from(JSON.stringify({ [field]: material })).toString('base64');
    assert.equal(getOrganizationAdminReviewSecret({ FIREBASE_SERVICE_ACCOUNT_BASE64: encoded }), expected);
  }
  assert.equal(getOrganizationAdminReviewSecret({ FIREBASE_PRIVATE_KEY: material, HERMES_ADMIN_REVIEW_SECRET: 'unrelated'.repeat(5) }), expected);
  assert.notEqual(getOrganizationAdminReviewSecret({ FIREBASE_PRIVATE_KEY: material + 'rotation' }), expected);
});

test('assignment review fails closed on unavailable or short configured secret material', async () => {
  for (const env of [{}, { FIREBASE_SERVICE_ACCOUNT_BASE64: 'invalid-json' }, { ORGANIZATION_ADMIN_REVIEW_SECRET: 'short', FIREBASE_PRIVATE_KEY: 'fallback'.repeat(10) }]) {
    assert.throws(() => getOrganizationAdminReviewSecret(env), error => error instanceof AssignmentError && error.status === 503);
    const response = await handleAssignmentRequest(request(), 'batc', {
      authorize: async () => ({ actor: 'superadmin' }), getSecret: () => getOrganizationAdminReviewSecret(env),
      getStore: () => { throw Error('Must not access records without a signing key'); },
    });
    assert.equal(response.status, 503);
    assert.equal((await response.text()).includes('fallback'), false);
  }
});

test('Admin-configured deployments can review an assignment without an extra secret or any writes', async () => {
  const state: AssignmentState = {
    auth: { uid: 'fixture', email: body.email, disabled: false, customClaims: { role: 'community' } },
    user: { version: '1', data: { email: body.email, role: 'community' } }, member: null,
    employer: { version: '1', data: { status: 'approved', ownerId: 'other-owner' } },
    organization: { version: '1', data: { status: 'approved', name: 'Fictional Organization' } },
    identityIds: ['fixture'], mirrorIds: ['batc'],
  };
  const store: AssignmentStore = {
    read: async () => state, readReceipt: async () => { throw Error('No receipt reads on review'); },
    transact: async () => { throw Error('No writes on review'); },
  };
  const response = await handleAssignmentRequest(request(), 'batc', {
    authorize: async () => ({ actor: 'superadmin' }), getStore: () => store,
    getSecret: () => getOrganizationAdminReviewSecret({ FIREBASE_PRIVATE_KEY: 'fictional-private-key-'.repeat(3) }),
  });
  assert.equal(response.status, 200);
  const review = await response.json();
  assert.match(review.token, /^v1\./);
  assert.equal(review.uid, 'fixture');
  assert.equal(state.user.data.orgRole, undefined);
});
