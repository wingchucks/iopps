import {decidePaidPublication, publicationDate, PublicationError, type PaidPublicationInput} from './paid-job-publication.ts';
import {resolvePaidPublicationTerm} from './paid-job-term.ts';
import {buildFeaturedJobSummary} from './featured-job-entitlements.ts';
import {STANDARD_ANNUAL_POSTINGS,type PublishingOption,type PublishingSummary} from '../job-publishing-summary.ts';
type Data=Record<string,unknown>;
type Document={id:string;data:Data;version?:string};
export interface PublicationReader {
  getDocument(collection:string,id:string):Promise<Document|null>;
  queryExact(collection:string,field:string,value:string,limit:number):Promise<Document[]>;
}
export interface PublicationRequest extends Omit<PaidPublicationInput,'employer'|'paidTerm'|'includedFeaturedUsed'> {
  employerId:string;organizationId:string;jobId:string;
}
const LIMIT=2001;
function safeId(value:string) {return typeof value==='string' && value.length>0 && value.length<=128 && !value.includes('/') && value!=='.' && value!=='..';}
export async function readPaidPublicationState(reader:PublicationReader,input:Pick<PublicationRequest,'employerId'|'organizationId'|'now'> & {jobId?:string}) {
  if(![input.employerId,input.organizationId,...(input.jobId===undefined?[]:[input.jobId])].every(safeId)) throw new PublicationError('invalid_identity','Publication identity requires review.');
  const employer=await reader.getDocument('employers',input.employerId);
  if(!employer) throw new PublicationError('missing_account','Employer account not found.');
  const ids=[...new Set([input.employerId,input.organizationId])];
  const receipts=new Map<string,Document>();
  for(const field of ['employerId','orgId']) {
    const docs=await reader.queryExact('subscriptions',field,input.employerId,LIMIT);
    if(docs.length>=LIMIT) throw new PublicationError('capacity','Payment history requires reconciliation.');
    for(const doc of docs) receipts.set(doc.id,doc);
  }
  const paidTerm=resolvePaidPublicationTerm({employerId:input.employerId,employer:employer.data,receipts:[...receipts.values()],now:input.now});
  const records=new Map<string,Document>();
  // Canonical identities override posts BEFORE filtering lifecycle or placement.
  for(const collection of ['posts','jobs']) for(const field of ['employerId','organizationId','orgId']) for(const id of ids) {
    const docs=await reader.queryExact(collection,field,id,LIMIT);
    if(docs.length>=LIMIT) throw new PublicationError('capacity','Job usage requires reconciliation.');
    for(const doc of docs) {
      if(collection==='posts' && doc.data.type!=='job') continue;
      for(const ownerField of ['employerId','organizationId','orgId']) {
        const owner=doc.data[ownerField];
        if(owner!==undefined && !ids.includes(String(owner))) throw new PublicationError('ownership_conflict','Conflicting job ownership requires reconciliation.');
      }
      records.set(doc.id,doc);
    }
  }
  const included=[...records.values()].filter(({id,data})=>{
    if(id===input.jobId || data.featured!==true || data.deletedAt || data.active===false || !['active','published'].includes(String(data.status ?? 'active'))) return false;
    for(const field of ['expiresAt','closingDate']) {
      if(data[field]===undefined || data[field]===null || data[field]==='') continue;
      const date=publicationDate(data[field]);
      // Unknown deadlines count conservatively, never manufacture a free slot.
      if(date && date<=input.now) return false;
    }
    const history=data.publication as Data|undefined;
    if(data.featuredEntitlement==='featured_credit' && history?.version===1 && history.funding==='featured_credit') return false;
    return true;
  });
  return {employer:employer.data,paidTerm,includedFeaturedUsed:included.length,
    binding:{employerVersion:employer.version ?? null,receipts:[...receipts.values()].map(doc=>[doc.id,doc.version ?? null]).sort(),included:included.map(doc=>[doc.id,doc.version ?? null]).sort()}};
}
type PublicationState=Awaited<ReturnType<typeof readPaidPublicationState>>;
function featuredSummaryFromState(state:PublicationState) {
  const credits=state.employer.featuredPostCredits;
  return buildFeaturedJobSummary({plan:state.paidTerm?.tier ?? 'free',featuredJobsUsed:state.includedFeaturedUsed,
    featuredPostCredits:typeof credits==='number' && Number.isSafeInteger(credits) && credits>=0 ? credits : 0});
}
/** Read-only UI projection uses the exact paid evidence and canonical usage of publication. */
export async function readPaidFeaturedSummary(reader:PublicationReader,input:Pick<PublicationRequest,'employerId'|'organizationId'|'now'>) {
  return featuredSummaryFromState(await readPaidPublicationState(reader,input));
}
/** Dry-runs the enforcing decision for a new standard and featured job, so the UI states exactly what Publish will use. */
export function publishingOptionsFromState(state:Pick<PublicationState,'employer'|'paidTerm'|'includedFeaturedUsed'>,now:Date):PublishingSummary {
  const option=(featured:boolean):PublishingOption=>{
    try {
      const {jobPatch,employerPatch}=decidePaidPublication({employer:state.employer,current:null,status:'active',featured,durationDays:30,now,
        includedFeaturedUsed:state.includedFeaturedUsed,paidTerm:state.paidTerm});
      const funding=String((jobPatch.publication as Data|undefined)?.funding ?? '');
      if(jobPatch.featuredEntitlement==='included_slot') {
        const summary=buildFeaturedJobSummary({plan:state.paidTerm?.tier ?? 'free',featuredJobsUsed:state.includedFeaturedUsed,featuredPostCredits:0});
        return {covered:true,funding:'included_slot',remainingAfter:Math.max(summary.featuredSlotsRemaining-1,0),reason:null};
      }
      if(funding==='featured_credit') return {covered:true,funding,remainingAfter:Number(employerPatch.featuredPostCredits),reason:null};
      if(funding==='standard_credit') return {covered:true,funding,remainingAfter:Number(employerPatch.standardPostCredits),reason:null};
      if(funding==='standard_subscription') {
        const used=Number((employerPatch.jobPostingUsage as Data|undefined)?.used);
        return {covered:true,funding,remainingAfter:Math.max(STANDARD_ANNUAL_POSTINGS-used,0),reason:null};
      }
      if(funding==='premium_subscription' || funding==='school_subscription') return {covered:true,funding,remainingAfter:null,reason:null};
      return {covered:false,funding:null,remainingAfter:null,reason:'reconciliation_required'};
    } catch(error) {
      if(error instanceof PublicationError) return {covered:false,funding:null,remainingAfter:null,reason:error.code};
      throw error;
    }
  };
  return {plan:state.paidTerm?.tier ?? 'free',standard:option(false),featured:option(true)};
}
/** One state read for the dashboard: featured capacity plus what Publish would use. */
export async function readPaidPublishingSummaries(reader:PublicationReader,input:Pick<PublicationRequest,'employerId'|'organizationId'|'now'>) {
  const state=await readPaidPublicationState(reader,input);
  return {featuredSummary:featuredSummaryFromState(state),publishingSummary:publishingOptionsFromState(state,input.now)};
}
export async function preparePaidPublication(reader:PublicationReader,input:PublicationRequest) {
  if(![input.employerId,input.organizationId,input.jobId].every(safeId)) throw new PublicationError('invalid_identity','Publication identity requires review.');
  // Closing/drafting must not require payment-history or usage reconciliation.
  if(input.status!=='active') {
    const employer=await reader.getDocument('employers',input.employerId);
    if(!employer) throw new PublicationError('missing_account','Employer account not found.');
    return {jobPatch:{},employerPatch:{},employer:employer.data,paidTerm:null,includedFeaturedUsed:0,binding:{employerVersion:employer.version ?? null,receipts:[],included:[]}};
  }
  const state=await readPaidPublicationState(reader,input);
  const decision=decidePaidPublication({...input,employer:state.employer,paidTerm:state.paidTerm,includedFeaturedUsed:state.includedFeaturedUsed});
  return {...decision,...state};
}
