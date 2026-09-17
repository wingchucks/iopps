import test from 'node:test';
import assert from 'node:assert/strict';
import { isOrganizationPubliclyVisible, normalizeOrganizationRecord } from '../src/lib/organization-profile.ts';
import { isSchoolPubliclyVisible } from '../src/lib/school-visibility.ts';
import { readFileSync } from 'node:fs';
import { reviewAssignment, applyAssignment, parseAssignmentRequest, type AssignmentState, type AssignmentStore } from '../src/lib/server/organization-admin-assignment.ts';

const desired = { email: 'Pete.Rojaiye@batc.ca', orgId: 'batc', role: 'admin' as const, enable: true };
function fixture() {
  const state: AssignmentState = {
    auth: { uid: 'pete', email: desired.email, disabled: false, customClaims: { role: 'community' } },
    user: { version: '1', data: { email: desired.email, role: 'community', displayName: 'Pete' } },
    member: { version: '1', data: { role: 'community', bio: 'Keep' } },
    employer: { version: '1', data: { disabled: true, status: 'disabled', ownerId: 'original', plan: 'free' } },
    organization: { version: '1', data: { disabled: true, status: 'disabled', uid: 'original', name: 'BATC' } },
    identityIds: ['pete'], mirrorIds: ['batc'],
  };
  let receipt: unknown = null;
  let writes = 0;
  const store: AssignmentStore = {
    read: async () => structuredClone(state),
    readReceipt: async () => receipt,
    transact: async (_id, fn) => fn(structuredClone(state), receipt, async (patches, nextReceipt) => {
      writes++;
      for (const key of ['user', 'member', 'employer', 'organization'] as const) {
        if (patches[key]) state[key] = { version: String(writes + 1), data: { ...state[key]?.data, ...patches[key] } };
      }
      receipt = nextReceipt;
    }),
  };
  return { store, state: () => state, mutate: (fn: (s: AssignmentState) => void) => fn(state), writes: () => writes,
    dropWrites: () => { store.transact = async (_id, fn) => fn(structuredClone(state), receipt, async (_p, r) => { receipt = r; }); } };
}
const options = { actor: 'superadmin', secret: 's'.repeat(32), now: 100000 };
test('vertical review/apply/readback adds admin links, preserves roles/owners/billing and retries once', async () => {
  const f = fixture();
  const review = await reviewAssignment(desired, f.store, options);
  assert.equal(f.writes(), 0);
  assert.match(review.token, /^v1\./);
  const request = { ...desired, token: review.token, confirmation: review.confirmation };
  const result = await applyAssignment(request, f.store, options);
  assert.equal(result.verified, true);
  assert.equal(f.state().user.data.employerId, 'batc');
  assert.equal(f.state().member?.data.orgRole, 'admin');
  assert.equal(f.state().member?.data.role, 'community');
  assert.equal(f.state().employer.data.ownerId, 'original');
  assert.equal(f.state().employer.data.plan, 'free');
  assert.equal(f.state().organization.data.uid, 'original');
  assert.equal(f.state().employer.data.disabled, false);
  assert.equal((await applyAssignment(request, f.store, options)).replayed, true);
  assert.equal(f.writes(), 1);
});
test('fails closed on stale state, wrong confirmation, changed desired state, actor, expiry, and dropped writes', async () => {
  for (const mode of ['stale', 'confirmation', 'desired', 'actor', 'expired', 'dropped']) {
    const f = fixture(); const r = await reviewAssignment(desired, f.store, options);
    const req = { ...desired, token: r.token, confirmation: r.confirmation };
    const opts = { ...options };
    if (mode === 'stale') f.mutate(s => { s.user.version = '2'; });
    if (mode === 'confirmation') req.confirmation += ' ';
    if (mode === 'desired') req.enable = false;
    if (mode === 'actor') opts.actor = 'other';
    if (mode === 'expired') opts.now += 600001;
    if (mode === 'dropped') f.dropWrites();
    await assert.rejects(applyAssignment(req, f.store, opts), mode);
  }
});
test('rejects unsafe identities, lifecycles, mirrors, affiliations and owner downgrade', async () => {
  const mutations = [
    (s: AssignmentState) => { s.identityIds.push('duplicate'); },
    (s: AssignmentState) => { s.auth.disabled = true; },
    (s: AssignmentState) => { s.user.data.status = 'deleted'; },
    (s: AssignmentState) => { s.member!.data.disabled = true; },
    (s: AssignmentState) => { s.organization.data.deletedAt = 'yesterday'; },
    (s: AssignmentState) => { s.employer.data.status = 'archived'; },
    (s: AssignmentState) => { s.user.data.employerId = 'other'; },
    (s: AssignmentState) => { s.auth.customClaims.orgId = 'other'; },
    (s: AssignmentState) => { s.member!.data.orgRole = 'owner'; },
    (s: AssignmentState) => { s.mirrorIds.push('other'); },
    (s: AssignmentState) => { s.organization.data.employerId = 'other'; },
  ];
  for (const mutate of mutations) { const f = fixture(); f.mutate(mutate); await assert.rejects(reviewAssignment(desired, f.store, options)); assert.equal(f.writes(), 0); }
});
test('strict flat bounded schema rejects duplicate escaped keys and arbitrary fields', async () => {
  for (const body of ['{"email":"a","email":"b"}', '{"email":"a","em\\u0061il":"b"}', JSON.stringify({...desired, ownerId:'pete', action:'review'}), JSON.stringify({...desired, enable:'true', action:'review'}), ' '.repeat(9000)]) {
    await assert.rejects(parseAssignmentRequest(new Request('http://localhost', {method:'POST', headers:{'content-type':'application/json'}, body}), 'batc'));
  }
  assert.deepEqual(await parseAssignmentRequest(new Request('http://localhost', {method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({...desired,action:'review'})}), 'batc'), {...desired,action:'review'});
});
test('independent readback must verify durable audit receipt as well as membership', async () => {
  const f = fixture(); const r = await reviewAssignment(desired,f.store,options);
  f.store.readReceipt = async () => null;
  await assert.rejects(applyAssignment({...desired,token:r.token,confirmation:r.confirmation},f.store,options), /receipt/);
});
test('enable false on an active organization preserves platform privileges and all other data',async()=>{
  const f=fixture(); f.mutate(s=>{s.employer.data.disabled=false;s.employer.data.status='incomplete';s.organization.data.disabled=false;s.organization.data.status='incomplete';s.user.data.role='admin';s.member!.data.role='moderator';s.auth.customClaims={admin:true,role:'admin'};});
  const input={...desired,enable:false}; const before=structuredClone(f.state());
  const r=await reviewAssignment(input,f.store,options);
  await applyAssignment({...input,token:r.token,confirmation:r.confirmation},f.store,options);
  assert.deepEqual(f.state().employer,before.employer);assert.deepEqual(f.state().organization,before.organization);assert.deepEqual(f.state().auth,before.auth);
  assert.deepEqual(f.state().user.data,{...before.user.data,orgId:'batc',employerId:'batc',orgRole:'admin'});
  assert.deepEqual(f.state().member!.data,{...before.member!.data,orgId:'batc',orgRole:'admin'});
});
test('disabled target cannot acquire manager privileges without explicit enabling',async()=>{
  const f=fixture();await assert.rejects(reviewAssignment({...desired,enable:false},f.store,options),/explicit.*enable/i);assert.equal(f.writes(),0);
});
test('unsupported organization lifecycles reject review and transactional apply without grants',async()=>{
  for(const key of ['employer','organization'] as const) for(const status of ['suspended','rejected','inactive','unavailable','unknown',42]) {
    const f=fixture(); const r=await reviewAssignment(desired,f.store,options);
    f.mutate(s=>{s[key].data.status=status;});
    await assert.rejects(reviewAssignment(desired,f.store,options),/organization/i);
    await assert.rejects(applyAssignment({...desired,token:r.token,confirmation:r.confirmation},f.store,options),/organization/i);
    assert.equal(f.writes(),0); assert.equal(f.state().member?.data.orgRole,undefined);
  }
});

test('enabling preserves nonpublic eligibility with minimal reviewed blocks on both mirrors',async()=>{
  for(const key of ['employer','organization','merged'] as const) {
    const f=fixture(); f.mutate(s=>{
      if(key==='merged') {Object.assign(s.employer.data,{onboardingComplete:true,logo:'/fixture.png'});Object.assign(s.organization.data,{description:'Fixture',contactEmail:'fixture@example.test'});}
      else Object.assign(s[key].data,{onboardingComplete:true,logo:'/fixture.png',description:'Fixture',contactEmail:'fixture@example.test',isPublished:true,publicationStatus:'PUBLISHED',publicVisibility:'public'});
    });
    const before=structuredClone(f.state());
    const r=await reviewAssignment(desired,f.store,options);
    for(const mirror of ['employer','organization'] as const) assert.deepEqual(r.changes[mirror],{disabled:false,status:'incomplete',publicVisibility:'hidden'});
    await applyAssignment({...desired,token:r.token,confirmation:r.confirmation},f.store,options);
    for(const mirror of ['employer','organization'] as const) assert.deepEqual(f.state()[mirror].data,{...before[mirror].data,disabled:false,status:'incomplete',publicVisibility:'hidden'});
    const e=f.state().employer.data,o=f.state().organization.data;
    for(const data of [e,o,{...e,...o},{...o,...e}]) {
      const normalized=normalizeOrganizationRecord(data);
      assert.equal(isOrganizationPubliclyVisible(normalized),false);
      assert.equal(isSchoolPubliclyVisible({...normalized,type:'school'}),false);
    }
    assert.deepEqual(f.state().auth,before.auth);
  }
});

test('existing visibility blocks and already public active profiles are preserved exactly',async()=>{
  for(const mode of ['hidden','active']) {
    const f=fixture();f.mutate(s=>{for(const key of ['employer','organization'] as const) Object.assign(s[key].data,{disabled:mode!=='active',status:mode==='active'?'approved':'disabled',onboardingComplete:true,logo:'/fixture.png',description:'Fixture',contactEmail:'fixture@example.test',publicVisibility:mode==='active'?'public':'private'});});
    const r=await reviewAssignment(desired,f.store,options);
    assert.equal(r.changes.employer?.publicVisibility,undefined);assert.equal(r.changes.organization?.publicVisibility,undefined);
    await applyAssignment({...desired,token:r.token,confirmation:r.confirmation},f.store,options);
    assert.equal(isOrganizationPubliclyVisible(normalizeOrganizationRecord(f.state().organization.data)),mode==='active');
  }
});

test('tampered token cannot write; post-apply drift cannot be repaired by retry',async()=>{
  const f=fixture();const r=await reviewAssignment(desired,f.store,options);
  await assert.rejects(applyAssignment({...desired,token:r.token.slice(0,-1)+(r.token.endsWith('a')?'b':'a'),confirmation:r.confirmation},f.store,options));
  assert.equal(f.writes(),0);
  const input={...desired,token:r.token,confirmation:r.confirmation};await applyAssignment(input,f.store,options);
  f.mutate(s=>{s.member!.data.orgRole='member';});await assert.rejects(applyAssignment(input,f.store,options),/drift/);assert.equal(f.writes(),1);
});
test('BATC branch cannot auto deploy and existing deployment/crons settings remain exact', () => {
  const config = JSON.parse(readFileSync('vercel.json','utf8'));
  assert.equal(config.git.deploymentEnabled['fix/batc-pete-admin'], false);
  delete config.git.deploymentEnabled['fix/batc-pete-admin'];
  assert.deepEqual(config, {git:{deploymentEnabled:{'codex/job-flow-reliability-20260908':false,'codex/security-remediation-20260917':false}}, crons:[{path:'/api/cron/sync-feeds',schedule:'0 8 * * *'},{path:'/api/cron/check-subscriptions',schedule:'0 6 * * *'},{path:'/api/cron/expire-jobs',schedule:'0 7 * * *'},{path:'/api/cron/expire-events',schedule:'15 7 * * *'}]});
});
