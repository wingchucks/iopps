// Actual route/CSRF/AppCheck/rate/mail source, real emulator Auth + Firestore.
// Only attestation issuer and Resend transport are fictional. No outbound delivery.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {sourceModule} from './security-fixtures.mjs';
export function mailApiHarness({auth,db,app,base,prefix}) {
  const deliveries=[], paths=new Set(), diagnostics=[], audit=[];
  const transactionDb={collection:name=>db.collection(name),runTransaction:fn=>db.runTransaction(async tx=>await fn(tx))};
  class MemoryResend {
    emails={send:async mail=>{
      assert.match(mail.to,/@example\.invalid$/);
      deliveries.push(mail);
      return {data:{id:'memory-not-provider'}};
    }};
  }
  const options={
    globals:{Date,process:{env:{NODE_ENV:'production',NEXT_PUBLIC_FIREBASE_APP_CHECK_ENABLED:'true',NEXT_PUBLIC_FIREBASE_APP_CHECK_SITE_KEY:'fictional-site',RESEND_API_KEY:'fictional-memory-only',NEXT_PUBLIC_SITE_URL:base}},console:{log(){},warn(){},error:(...a)=>diagnostics.push(a.map(String).join(' '))}},
    mocks:{
      '@/lib/firebase-admin':{getAdminAuth:()=>auth,getAdminDb:()=>transactionDb,getAdminApp:()=>app},
      'firebase-admin/app-check':{getAppCheck:()=>({verifyToken:async token=>{assert.equal(token,'fictional-attestation');return {appId:'fictional'};}})},
      'next/server':{NextResponse:{json:Response.json}},
      resend:{Resend:MemoryResend},
    },
  };
  const routes={verify:sourceModule('src/app/api/auth/verification-email/route.ts',options),reset:sourceModule('src/app/api/auth/password-reset/route.ts',options)};
  const digest=s=>createHash('sha256').update(s).digest('hex');
  async function exercise({email,uid,password,reset=false}) {
    const kind=reset?'reset':'verify', ip=prefix+'-'+kind+'-'+uid;
    const collection=reset?'password_reset_limits':'verification_email_limits';
    const owned=[[reset?'email':'uid',reset?email:uid],['ip',ip]].map(([k,v])=>collection+'/'+k+'-'+digest(v));
    for(const target of owned)paths.add(target);
    const response=await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fictional-emulator-key',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email,password,returnSecureToken:true})});
    assert.equal(response.status,200);const token=(await response.json()).idToken;
    const post=async(label,overrides={})=>{
      const result=await routes[kind].POST(new Request(base+'/api/auth/'+(reset?'password-reset':'verification-email'),{method:'POST',headers:{host:new URL(base).host,origin:base,'content-type':'application/json','x-forwarded-for':ip,authorization:'Bearer '+token,'X-Firebase-AppCheck':'fictional-attestation',...overrides},body:JSON.stringify(reset?{email}:{nextPath:'/setup'})}));
      audit.push({uid,kind,label,status:result.status,deliveries:deliveries.length});return result;
    };
    const before=deliveries.length;
    for(const [label,headers] of [['missing-attestation',{'X-Firebase-AppCheck':''}],['invalid-attestation',{'X-Firebase-AppCheck':'invalid'}],['foreign-origin',{origin:'https://foreign.invalid'}]])assert.equal((await post(label,headers)).status,403);
    if(!reset)assert.equal((await post('missing-auth',{authorization:''})).status,401);
    assert.equal(deliveries.length,before);
    for(const target of owned)assert.equal((await db.doc(target).get()).exists,false,'denials must not consume reservations');
    for(let i=0;i<3;i++) {
      const res=await post('accepted-'+i);assert.equal(res.status,200);
      assert.equal((await res.json())[reset?'accepted':'sent'],true);
    }
    assert.equal(deliveries.length,before+3);
    assert.equal((await post('rate-denial')).status,429);assert.equal(deliveries.length,before+3);
    for(const target of owned)assert.equal((await db.doc(target).get()).data().count,3);
    const mail=deliveries.at(-1);assert.equal(mail.to,email);assert.deepEqual(diagnostics,[]);
    audit.push({uid,kind,label:'readback',counterValues:[3,3],deliveredToTransport:3,realProvider:false});
    return mail;
  }
  return {exercise,diagnostics,audit,async cleanup(){
    const result=[];
    for(const target of paths){const ref=db.doc(target);await ref.delete();result.push({path:target,absent:!(await ref.get()).exists});}
    assert.ok(result.every(r=>r.absent));return result;
  }};
}
