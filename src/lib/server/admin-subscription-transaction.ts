import {createHash} from 'node:crypto';
import {FieldValue, type Firestore, type DocumentSnapshot} from 'firebase-admin/firestore';
import {buildAdminSubscriptionOverrideArtifacts, type SubscriptionOverrideBody} from './admin-subscription-override';
import {publicationDate} from './paid-job-publication';

type Data=Record<string,unknown>;
export class SubscriptionOverrideError extends Error {
  status:number;
  constructor(status:number,message:string){super(message);this.status=status;}
}
function conflict(message:string):never {throw new SubscriptionOverrideError(409,message);}
function invalid(message:string):never {throw new SubscriptionOverrideError(400,message);}
const object=(value:unknown):Data=>value && typeof value==='object' && !Array.isArray(value)?value as Data:{};
const hash=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const planFor=(value:unknown)=>({standard:'tier1',premium:'tier2',school:'tier3',tier1:'tier1',tier2:'tier2',tier3:'tier3'} as Record<string,string>)[String(value)];
const date=(value:unknown)=>publicationDate(value)?.toISOString();


function projectionTerm(account:Data) {
  const nested=object(account.subscription);
  const starts=[nested.billingStartAt,account.billingStartAt,account.subscriptionStart].filter(v=>v!==undefined);
  const ends=[nested.subscriptionEnd,nested.expiresAt,account.subscriptionEnd].filter(v=>v!==undefined);
  const plans=[nested.tier,account.subscriptionTier,account.plan].filter(v=>v!==undefined);
  if(!starts.length && !ends.length && plans.every(v=>v==='free')) return null;
  if(starts.some(v=>!date(v) || date(v)!==date(starts[0])) || ends.some(v=>!date(v) || date(v)!==date(ends[0])) || plans.some(v=>!planFor(v) || planFor(v)!==planFor(plans[0]))) conflict('Contradictory current-term projection requires reconciliation.');
  if(!starts.length && !ends.length) return null;
  if(!starts.length || !ends.length || !plans.length) conflict('Incomplete current-term projection requires reconciliation.');
  const start=publicationDate(starts[0])!,end=publicationDate(ends[0])!;
  if(end<=start) conflict('Invalid current-term projection requires reconciliation.');
  return {plan:planFor(plans[0]),start,end};
}
function canonical(value:unknown):unknown {
  if(value instanceof Date)return value.toISOString();
  if(value && typeof value==='object' && typeof (value as {toDate?:unknown}).toDate==='function')return (value as {toDate:()=>Date}).toDate().toISOString();
  if(Array.isArray(value))return value.map(canonical);
  if(value && typeof value==='object')return Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([key,v])=>[key,canonical(v)]));
  return value;
}
function sameValue(a:unknown,b:unknown){return JSON.stringify(canonical(a))===JSON.stringify(canonical(b));}

/** This endpoint records reviewed manual payments, not historical usage reconciliation. */
export async function applyAdminSubscriptionOverride(db:Firestore,orgId:string,body:SubscriptionOverrideBody,adminId:string,now=new Date()) {
  if(!body || typeof body!=='object' || Array.isArray(body)) invalid('An override object is required.');
  const plan=planFor(body.planId ?? body.subscriptionTier);
  if(!plan || (body.planId!==undefined && !['tier1','tier2','tier3'].includes(body.planId)) ||
     (body.subscriptionTier!==undefined && !['standard','premium','school'].includes(body.subscriptionTier)) ||
     (body.planId!==undefined && body.subscriptionTier!==undefined && body.planId!==planFor(body.subscriptionTier))) invalid('A consistent paid plan tier is required.');
  if(body.billingCycle!==undefined && body.billingCycle!=='annual') invalid('Manual plan overrides require an annual billing cycle.');
  for(const field of ['subscriptionStart','billingStartAt','subscriptionEnd','bonusAccessGrantedAt','bonusAccessEndsAt'] as const) {
    if(body[field]!==undefined && (typeof body[field]!=='string' || !date(body[field]))) invalid(`Invalid ${field}.`);
  }
  if(body.subscriptionStart && body.billingStartAt && date(body.subscriptionStart)!==date(body.billingStartAt)) invalid('Conflicting subscription start dates.');
  const artifacts=buildAdminSubscriptionOverrideArtifacts(body,{orgId,now});
  if('error' in artifacts) invalid(artifacts.error!);
  if('error' in artifacts) throw new Error('Unreachable');
  const start=new Date(artifacts.subscriptionStartIso),end=new Date(artifacts.subscriptionEndIso);
  if(end<=start || end<=now) invalid('The annual term must have a future end after its start.');
  for(const field of ['amount','gstAmount','totalAmount'] as const) {
    if(body[field]!==undefined && typeof body[field]!=='number') invalid(`Invalid ${field}.`);
    if(!Number.isFinite(artifacts[field]) || artifacts[field]<0) invalid(`Invalid ${field}.`);
  }
  if(Math.round((artifacts.amount+artifacts.gstAmount)*100)!==Math.round(artifacts.totalAmount*100)) invalid('Payment totals do not match.');
  const bonusStart=body.bonusAccessGrantedAt?new Date(body.bonusAccessGrantedAt):null;
  const bonusEnd=body.bonusAccessEndsAt?new Date(body.bonusAccessEndsAt):null;
  if(Boolean(bonusStart)!==Boolean(bonusEnd) || (bonusStart && bonusEnd && (bonusStart>=bonusEnd || bonusEnd.getTime()!==start.getTime()))) invalid('An explicit bonus window must end at the paid term start.');
  if(start>now && (!bonusStart || bonusStart>now || !bonusEnd || bonusEnd<=now)) invalid('Future terms require an explicit current early-access window.');
  const identity=[orgId,plan,'annual',start.toISOString(),end.toISOString()];
  const deterministicId=`admin-term-${hash(identity)}`;
  const manualId=`manual:${orgId}:${plan}:${start.toISOString()}:${end.toISOString()}`;
  const payloadHash=hash([...identity,artifacts.amount,artifacts.gstAmount,artifacts.totalAmount,bonusStart?.toISOString()??null,bonusEnd?.toISOString()??null,body.bonusAccessReason??null]);
  const employerRef=db.collection('employers').doc(orgId);
  const auditRef=employerRef.collection('actionHistory').doc(`subscription-${hash(identity)}`);
  return db.runTransaction(async tx=>{
    const employerSnap=await tx.get(employerRef);
    if(!employerSnap.exists) throw new SubscriptionOverrideError(404,'Organization not found.');
    const employer=employerSnap.data()!;
    const direct=await tx.get(db.collection('organizations').doc(orgId));
    const linked=await tx.get(db.collection('organizations').where('employerId','==',orgId).limit(3));
    const targets=new Map<string,DocumentSnapshot>(linked.docs.map(doc=>[doc.id,doc]));
    if(direct.exists){
      if(direct.data()?.employerId!==undefined && direct.data()?.employerId!==orgId) conflict('Conflicting organization ownership requires reconciliation.');
      targets.set(direct.id,direct);
    }
    if(targets.size!==1) conflict('Exactly one authoritative organization mapping is required.');
    const target=[...targets.values()][0];
    const receipts=new Map<string,Data>();
    for(const field of ['orgId','employerId']){
      const snapshot=await tx.get(db.collection('subscriptions').where(field,'==',orgId).limit(2001));
      if(snapshot.size>=2001) conflict('Payment history requires reconciliation.');
      for(const doc of snapshot.docs) receipts.set(doc.id,doc.data());
    }
    const audit=await tx.get(auditRef);
    const reserved=await tx.get(db.collection('subscriptions').doc(deterministicId));
    if(reserved.exists && !receipts.has(reserved.id)) conflict('Conflicting receipt identity.');
    const matches:[string,Data][]=[];
    for(const [id,r] of receipts){
      if((r.employerId!==undefined && r.employerId!==orgId) || (r.orgId!==undefined && r.orgId!==orgId)) conflict('Conflicting receipt ownership.');
      const rs=publicationDate(r.startsAt??r.createdAt),re=publicationDate(r.expiresAt);
      if(!planFor(r.plan) || r.billingCycle!=='annual') continue;
      if(!rs || !re || re<=rs) conflict('Malformed annual history requires reconciliation.');
      if(planFor(r.plan)===plan && rs.getTime()===start.getTime() && re.getTime()===end.getTime()) matches.push([id,r]);
      else if(start<re && end>rs && typeof r.amount==='number' && r.amount>0) conflict('Overlapping paid terms require reconciliation.');
    }
    if(matches.length>1) conflict('Duplicate annual receipts require reconciliation.');
    const matched=matches[0];
    if(matched?.[1].organizationId!==undefined && matched[1].organizationId!==target.id) conflict('Receipt organization identity requires reconciliation.');
    if(matched && (matched[1].status!=='active' || matched[1].amount!==artifacts.amount || matched[1].gstAmount!==artifacts.gstAmount || matched[1].totalAmount!==artifacts.totalAmount)) conflict('Existing receipt financial facts are immutable.');
    const current=object(employer.subscription);
    const organization=target.data()!;
    const employerTerm=projectionTerm(employer),organizationTerm=projectionTerm(organization);
    if(organizationTerm && (!employerTerm || !sameValue(employerTerm,organizationTerm))) conflict('Account and organization current terms require reconciliation.');
    if(organizationTerm) {
      const orgSubscription=object(organization.subscription);
      for(const key of ['paymentId','amountPaid','gstAmount','totalAmount','termId']) if(!sameValue(current[key],orgSubscription[key])) conflict('Account and organization financial evidence requires reconciliation.');
    }
    const sameCurrent=employerTerm?.plan===plan && employerTerm.start.getTime()===start.getTime() && employerTerm.end.getTime()===end.getTime();
    const currentManual=current.paymentId===`admin-manual-${plan}` && typeof current.amountPaid==='number' && current.amountPaid>0;
    const currentGrant=current.paymentId===`admin-grant-${plan}` && current.amountPaid===0;
    for(const prior of [employerTerm,organizationTerm]) if(prior && !(prior.plan===plan && prior.start.getTime()===start.getTime() && prior.end.getTime()===end.getTime())){
      if(start<prior.start || end<=prior.end) conflict('An older request cannot replace the current term.');
      if(prior.end>now && start>now) conflict('Scheduling a future replacement is not supported.');
      if(start<prior.end && end>prior.start) conflict('Overlapping current terms require reconciliation.');
    }
    if(sameCurrent && (currentManual || currentGrant) && (current.paymentId!==artifacts.subscriptionPayload.paymentId || current.amountPaid!==artifacts.amount || current.gstAmount!==artifacts.gstAmount || current.totalAmount!==artifacts.totalAmount)) conflict('Receipt-less payment facts require explicit reconciliation.');
    const receiptlessExisting=sameCurrent && currentManual && !matched;
    if(receiptlessExisting && body.createSubscriptionRecord!==false) conflict('Receipt-less term conversion requires explicit reconciliation.');
    const createReceipt=!matched && !receiptlessExisting && body.createSubscriptionRecord!==false;
    const termId=matched?.[0] ?? (createReceipt?deterministicId:manualId);
    const existing=Boolean(matched || sameCurrent || audit.exists);
    if(plan==='tier3' && !(matched || (sameCurrent && (currentManual || currentGrant)))) conflict('School plans are retired; only existing historical terms may be maintained.');
    let usage:Data|undefined;
    if(plan==='tier1' && artifacts.amount>0){
      if(existing){
        const saved=object(employer.jobPostingUsage);
        if(saved.termId!==termId || !Number.isSafeInteger(saved.used) || Number(saved.used)<0) conflict('Existing Standard usage requires explicit reconciliation.');
        usage=saved;
      }else usage={termId,used:0};
    }
    const subscription:Data={tier:artifacts.tier,status:'active',billingStartAt:start.toISOString(),subscriptionEnd:end.toISOString(),expiresAt:end.toISOString(),paymentId:artifacts.subscriptionPayload.paymentId,amountPaid:artifacts.amount,gstAmount:artifacts.gstAmount,totalAmount:artifacts.totalAmount,
      ...(matched || createReceipt?{termId}:{}),...(bonusStart && bonusEnd?{bonusAccessGrantedAt:bonusStart.toISOString(),bonusAccessEndsAt:bonusEnd.toISOString(),bonusAccessReason:body.bonusAccessReason??'Bonus early access before paid term begins'}:{})};
    if(audit.exists){
      const expected:Data={plan:artifacts.tier,subscriptionTier:artifacts.tier,subscriptionStatus:'active',subscriptionStart:start.toISOString(),billingStartAt:start.toISOString(),subscriptionEnd:end.toISOString(),subscription,
        bonusAccessGrantedAt:bonusStart?.toISOString(),bonusAccessEndsAt:bonusEnd?.toISOString(),bonusAccessReason:bonusEnd?(body.bonusAccessReason??'Bonus early access before paid term begins'):undefined};
      if(audit.data()?.payloadHash!==payloadHash || audit.data()?.termId!==termId || audit.data()?.organizationId!==target.id || !sameCurrent) conflict('Override replay identity does not match the current term.');
      for(const account of [employer,organization]) for(const [key,value] of Object.entries(expected)) if(!sameValue(account[key],value)) conflict('Override replay detected entitlement projection drift.');
      if(organization.employerId!==orgId || organization.tier!==artifacts.tier) conflict('Override replay detected organization projection drift.');
      return {success:true,orgId,planId:plan,tier:artifacts.tier,subscriptionStart:start.toISOString(),subscriptionEnd:end.toISOString(),duplicate:true};
    }
    const update:Data={plan:artifacts.tier,subscriptionTier:artifacts.tier,subscriptionStatus:'active',subscriptionStart:start.toISOString(),billingStartAt:start.toISOString(),subscriptionEnd:end.toISOString(),subscription,
      bonusAccessGrantedAt:bonusStart?.toISOString()??FieldValue.delete(),bonusAccessEndsAt:bonusEnd?.toISOString()??FieldValue.delete(),bonusAccessReason:bonusEnd?(body.bonusAccessReason??'Bonus early access before paid term begins'):FieldValue.delete(),updatedAt:now.toISOString(),...(usage?{jobPostingUsage:usage}:{})};
    if(createReceipt) tx.create(db.collection('subscriptions').doc(termId),{...artifacts.subscriptionRecordPayload,employerId:orgId,organizationId:target.id,createdAt:now,updatedAt:now});
    tx.set(employerRef,update,{mergeFields:Object.keys(update)});
    const orgUpdate={...update,employerId:orgId,tier:artifacts.tier};
    tx.set(target.ref,orgUpdate,{mergeFields:Object.keys(orgUpdate)});
    tx.create(auditRef,{action:'subscription_override',adminId,timestamp:now.toISOString(),payloadHash,termId,organizationId:target.id,details:artifacts.actionHistoryDetails});
    return {success:true,orgId,planId:plan,tier:artifacts.tier,subscriptionStart:start.toISOString(),subscriptionEnd:end.toISOString(),duplicate:false};
  });
}
