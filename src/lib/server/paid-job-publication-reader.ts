import {decidePaidPublication, publicationDate, PublicationError, type PaidPublicationInput} from './paid-job-publication.ts';
import {fundedAnnualTermIds, hasCurrentPaidAnnualReceipt, renewalChain, resolvePaidPublicationTerm, type PaidTerm, type PaidTermInput} from './paid-job-term.ts';
import {buildFeaturedJobSummary} from './featured-job-entitlements.ts';
import {isComplimentarySubscription} from './partner-subscription.ts';
import {isJobRecordExpired} from '../listing-freshness.ts';
import {annualPurchaseOptions, normalizePaidTier, type AnnualTermSummary, type BillingOverview} from '../pricing.ts';
import {STANDARD_ANNUAL_POSTINGS,type PublishingOption,type PublishingSummary} from '../job-publishing-summary.ts';
type Data=Record<string,unknown>;
type Document={id:string;data:Data;version?:string};
export interface PublicationReader {
  getDocument(collection:string,id:string):Promise<Document|null>;
  queryExact(collection:string,field:string,value:string,limit:number):Promise<Document[]>;
}
export interface PublicationRequest extends Omit<PaidPublicationInput,'employer'|'paidTerm'|'includedFeaturedUsed'|'fundedTermIds'> {
  employerId:string;organizationId:string;jobId:string;
  /**
   * Set only by callers that write `employerPatch` (and their `updatedAt` touch) to
   * `employers/{employerDocumentId}` from the result. Without it, an account whose billing
   * document is not `employers/{employerId}` is refused instead of being written to the
   * wrong (or a new, shadowing) employer document.
   */
  writesResolvedEmployerDocument?:boolean;
}
const LIMIT=2001;
function safeId(value:string) {return typeof value==='string' && value.length>0 && value.length<=128 && !value.includes('/') && value!=='.' && value!=='..';}
function record(value:unknown):Data {return value && typeof value==='object' && !Array.isArray(value) ? value as Data : {};}

export interface EmployerBillingDocument {
  /** Document every billing read and write for this account uses: employers/{id}. */
  id:string;
  document:Document|null;
  source:'employer'|'organization'|'missing';
}
/**
 * The employer billing document, resolved exactly as requireEmployerContext resolves the
 * employer: employers/{employerId}, else employers/{organizationId}. With neither, the
 * account has no credits or plan yet, and its first Stripe purchase (credited to the
 * owner's organization ID) creates employers/{organizationId}.
 */
export async function readEmployerBillingDocument(reader:PublicationReader,employerId:string,organizationId:string):Promise<EmployerBillingDocument> {
  if(![employerId,organizationId].every(safeId)) throw new PublicationError('invalid_identity','Publication identity requires review.');
  const primary=await reader.getDocument('employers',employerId);
  if(primary) return {id:employerId,document:primary,source:'employer'};
  if(organizationId!==employerId) {
    const fallback=await reader.getDocument('employers',organizationId);
    if(fallback) return {id:organizationId,document:fallback,source:'organization'};
  }
  return {id:organizationId,document:null,source:'missing'};
}
function requireWritableBillingDocument(billing:EmployerBillingDocument,input:Pick<PublicationRequest,'employerId'|'writesResolvedEmployerDocument'>) {
  if(!input.writesResolvedEmployerDocument && billing.id!==input.employerId) {
    throw new PublicationError('billing_account_mismatch','This organization’s billing account needs a quick review before jobs can be saved. Contact hello@iopps.ca.');
  }
}

/** Account projection, receipts and the paid annual term, read for the billing document. */
export async function readPaidTermState(reader:PublicationReader,input:{employerId:string;organizationId:string;now:Date},options:{billing?:EmployerBillingDocument}={}) {
  if(![input.employerId,input.organizationId].every(safeId)) throw new PublicationError('invalid_identity','Publication identity requires review.');
  const billing=options.billing ?? await readEmployerBillingDocument(reader,input.employerId,input.organizationId);
  const employer=billing.document?.data ?? {};
  const receipts=new Map<string,Document>();
  for(const field of ['employerId','orgId']) {
    const docs=await reader.queryExact('subscriptions',field,billing.id,LIMIT);
    if(docs.length>=LIMIT) throw new PublicationError('capacity','Payment history requires reconciliation.');
    for(const doc of docs) receipts.set(doc.id,doc);
  }
  const receiptList=[...receipts.values()];
  const termInput:PaidTermInput={employerId:billing.id,employer,receipts:receiptList,now:input.now};
  return {billing,employerDocumentId:billing.id,employer,receipts:receiptList,paidTerm:resolvePaidPublicationTerm(termInput),fundedTermIds:fundedAnnualTermIds(termInput)};
}

/**
 * Pre-release Standard buyers and renewals that just took over have no usage counter for the
 * current receipt-backed term. Count what that term already funded instead of refusing:
 * listings whose publication history names the term, plus pre-policy listings (no history,
 * not credit-funded) first published inside it. Soft-deleted and closed listings still count.
 */
function receiptTermStandardUsage(records:Document[],term:PaidTerm,now:Date):number {
  let used=0;
  for(const {data} of records) {
    if(Object.hasOwn(data,'publication')) {
      const history=record(data.publication);
      if(history.funding==='standard_subscription' && history.termId===term.id) used++;
      continue;
    }
    if(data.standardCreditConsumed===true || data.featuredCreditConsumed===true) continue;
    const live=data.active===true || data.status==='active' || data.status==='published';
    const published=publicationDate(data.postedAt) ?? publicationDate(data.publishedAt) ?? (live ? publicationDate(data.createdAt) : null);
    if(published && published>=term.startsAt && published<=now) used++;
  }
  return used;
}

export async function readPaidPublicationState(reader:PublicationReader,input:Pick<PublicationRequest,'employerId'|'organizationId'|'now'> & {jobId?:string},options:{billing?:EmployerBillingDocument}={}) {
  if(![input.employerId,input.organizationId,...(input.jobId===undefined?[]:[input.jobId])].every(safeId)) throw new PublicationError('invalid_identity','Publication identity requires review.');
  const term=await readPaidTermState(reader,input,options);
  const ids=[...new Set([input.employerId,input.organizationId])];
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
    // Same rule as public listing freshness and the expiry job: a date-only closing date keeps
    // the listing (and its slot) through that Saskatchewan calendar day. Unknown deadlines
    // count conservatively, never manufacturing a free slot.
    if(isJobRecordExpired(data,input.now)) return false;
    const history=data.publication as Data|undefined;
    if(data.featuredEntitlement==='featured_credit' && history?.version===1 && history.funding==='featured_credit') return false;
    return true;
  });
  let employer=term.employer;
  const paidTerm=term.paidTerm;
  const usage=record(employer.jobPostingUsage);
  if(paidTerm?.tier==='standard' && !paidTerm.id.startsWith('manual:') && usage.termId!==paidTerm.id) {
    employer={...employer,jobPostingUsage:{termId:paidTerm.id,used:receiptTermStandardUsage([...records.values()],paidTerm,input.now)}};
  }
  return {employer,paidTerm,includedFeaturedUsed:included.length,employerDocumentId:term.employerDocumentId,
    fundedTermIds:term.fundedTermIds,receipts:term.receipts,
    binding:{employerVersion:term.billing.document?.version ?? null,receipts:term.receipts.map(doc=>[doc.id,doc.version ?? null]).sort(),included:included.map(doc=>[doc.id,doc.version ?? null]).sort()}};
}
type PublicationState=Awaited<ReturnType<typeof readPaidPublicationState>>;
function featuredSummaryFromState(state:Pick<PublicationState,'employer'|'paidTerm'|'includedFeaturedUsed'>) {
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

function termSummary(term:{id:string;tier:'standard'|'premium'|'school';startsAt:Date;endsAt:Date}):AnnualTermSummary {
  return {id:term.id,tier:term.tier,startsAt:term.startsAt.toISOString(),endsAt:term.endsAt.toISOString()};
}
/** Current complimentary ($0) access from the projection, which never funds postings. */
function complimentaryAccess(employer:Data,now:Date):BillingOverview['complimentary'] {
  const nested=record(employer.subscription);
  const tier=normalizePaidTier(nested.tier ?? employer.subscriptionTier ?? employer.plan);
  const status=nested.status ?? employer.subscriptionStatus;
  if(!tier || status!=='active' || !isComplimentarySubscription(employer)) return null;
  const end=publicationDate(nested.subscriptionEnd ?? employer.subscriptionEnd);
  if(end && end<=now) return null;
  return {tier,endsAt:end?.toISOString() ?? null};
}
/**
 * What the account has paid for and what an annual purchase would do now. Shared by the
 * dashboard (billing page), the plan picker and checkout, so the UI never offers a purchase
 * checkout refuses. Ambiguous paid evidence blocks annual purchases pending review.
 */
export function billingOverviewFromState(state:{employer:Data;receipts:Document[];employerDocumentId:string;paidTerm:PaidTerm|null}|null,now:Date,options:{canPurchase:boolean}):BillingOverview {
  if(!state) {
    const purchase={paidTerm:null,renewal:null,reviewRequired:true};
    return {...purchase,plan:'free',complimentary:null,annualPlans:annualPurchaseOptions(purchase,now),canPurchase:options.canPurchase};
  }
  const termInput:PaidTermInput={employerId:state.employerDocumentId,employer:state.employer,receipts:state.receipts,now};
  let renewal:AnnualTermSummary|null=null;
  let reviewRequired=false;
  if(state.paidTerm) {
    try {
      const chain=renewalChain(termInput,state.paidTerm);
      if(chain.length) renewal=termSummary(chain[0]);
    } catch(error) {
      if(!(error instanceof PublicationError)) throw error;
      reviewRequired=true;
    }
  } else reviewRequired=hasCurrentPaidAnnualReceipt(termInput);
  const purchase={paidTerm:state.paidTerm ? termSummary(state.paidTerm) : null,renewal,reviewRequired};
  return {...purchase,plan:state.paidTerm?.tier ?? 'free',complimentary:state.paidTerm ? null : complimentaryAccess(state.employer,now),
    annualPlans:annualPurchaseOptions(purchase,now),canPurchase:options.canPurchase};
}
/**
 * Billing overview without reading jobs; any reconciliation error becomes a review state.
 * `employerDocumentId` is the document Stripe fulfillment must credit for this account.
 */
export async function readBillingOverview(reader:PublicationReader,input:{employerId:string;organizationId:string;now:Date},options:{canPurchase:boolean}):Promise<{employerDocumentId:string|null;overview:BillingOverview}> {
  let billing:EmployerBillingDocument|null=null;
  try {
    billing=await readEmployerBillingDocument(reader,input.employerId,input.organizationId);
    return {employerDocumentId:billing.id,overview:billingOverviewFromState(await readPaidTermState(reader,input,{billing}),input.now,options)};
  } catch(error) {
    if(!(error instanceof PublicationError)) throw error;
    return {employerDocumentId:billing?.id ?? null,overview:billingOverviewFromState(null,input.now,options)};
  }
}

/** One state read for the dashboard: featured capacity, what Publish would use, and billing. */
export async function readPaidPublishingSummaries(reader:PublicationReader,input:Pick<PublicationRequest,'employerId'|'organizationId'|'now'>,options:{canPurchase?:boolean}={}) {
  const state=await readPaidPublicationState(reader,input);
  return {featuredSummary:featuredSummaryFromState(state),publishingSummary:publishingOptionsFromState(state,input.now),
    billing:billingOverviewFromState(state,input.now,{canPurchase:options.canPurchase ?? false})};
}
export async function preparePaidPublication(reader:PublicationReader,input:PublicationRequest) {
  if(![input.employerId,input.organizationId,input.jobId].every(safeId)) throw new PublicationError('invalid_identity','Publication identity requires review.');
  const billing=await readEmployerBillingDocument(reader,input.employerId,input.organizationId);
  requireWritableBillingDocument(billing,input);
  if(input.status!=='active') {
    // Closing/drafting never waits on payment-history or usage reconciliation. The returned
    // plan and featured usage are still the real ones (so the saved response does not report
    // a paying employer as Free), but a reconciliation problem only degrades that summary.
    let state:PublicationState|null=null;
    try { state=await readPaidPublicationState(reader,input,{billing}); }
    catch(error) { if(!(error instanceof PublicationError)) throw error; }
    return {jobPatch:{},employerPatch:{},employer:state?.employer ?? billing.document?.data ?? {},paidTerm:state?.paidTerm ?? null,
      includedFeaturedUsed:state?.includedFeaturedUsed ?? 0,employerDocumentId:billing.id,fundedTermIds:state?.fundedTermIds ?? [],receipts:state?.receipts ?? [],
      binding:state?.binding ?? {employerVersion:billing.document?.version ?? null,receipts:[],included:[]}};
  }
  const state=await readPaidPublicationState(reader,input,{billing});
  const decision=decidePaidPublication({...input,employer:state.employer,paidTerm:state.paidTerm,includedFeaturedUsed:state.includedFeaturedUsed,fundedTermIds:state.fundedTermIds});
  return {...decision,...state};
}
