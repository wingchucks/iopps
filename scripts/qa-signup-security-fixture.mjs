// Local serial demo-emulator fixture lifecycle; never imported by product code.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const hash=value=>createHash('sha256').update(value).digest('hex').slice(0,24);
const millis=value=>value instanceof Date?value.getTime():value?.toMillis?.();

// Only restore keys proven touched by this run's UID-scoped security events.
// Capture the baseline before starting the owned server; stop it before cleanup.
// Do not clear the collection: other suites may own pre-existing counters.
export async function restoreSignupSecurityLimits(db,before,events,env=process.env) {
  assert.equal(env.GCLOUD_PROJECT,'demo-iopps-preview');
  assert.equal(env.FIRESTORE_EMULATOR_HOST,'127.0.0.1:8080');
  const attempts=new Map();
  for(const event of events){
    const values={uid:event.uid,email:event.contactEmail?.trim().toLowerCase(),org:event.name?.trim().toLowerCase()};
    const ids=Object.entries(values).filter(([,value])=>value).map(([scope,value])=>`${scope}_${hash(value)}`);
    if(event.clientIpHash&&event.clientIpHash!==hash(''))ids.push(`ip_${event.clientIpHash}`);
    for(const id of ids)attempts.set(id,(attempts.get(id)||0)+1);
  }
  const targets=[];
  // Validate every counter before any mutation. Unexpected activity is a blocker,
  // not permission to erase another runner's rate-limit attempts.
  for(const [id,count] of attempts){
    const ref=db.collection('signup_security_limits').doc(id),snapshot=await ref.get();
    const original=before.get(id),current=snapshot.data();
    const sameWindow=original&&millis(original.windowStartedAt)===millis(current?.windowStartedAt);
    const expected=count+(sameWindow?Number(original.count)||0:0);
    assert.ok(snapshot.exists&&current.count===expected,`Unexpected signup counter activity: ${id}`);
    targets.push({ref,original});
  }
  for(const {ref,original} of targets){if(original)await ref.set(original);else await ref.delete();}
  const results=[];
  for(const {ref,original} of targets){
    const snapshot=await ref.get();
    if(original)assert.deepEqual(snapshot.data(),original);else assert.equal(snapshot.exists,false);
    results.push({path:ref.path,absent:!snapshot.exists,restoredBaseline:!!original,verified:true});
  }
  return results;
}
