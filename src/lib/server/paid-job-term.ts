import { PublicationError, publicationDate, type PaidPublicationInput } from './paid-job-publication.ts';
type Data = Record<string, unknown>;
type Tier = 'standard'|'premium'|'school';
export type PaidTerm = NonNullable<PaidPublicationInput['paidTerm']>;
export interface PaidTermInput {employerId: string; employer: Data; receipts: {id:string;data:Data}[]; now:Date}
function tier(value:unknown): Tier|null {
  if (value === 'standard' || value === 'tier1' || value === 'essential') return 'standard';
  if (value === 'premium' || value === 'tier2' || value === 'professional') return 'premium';
  if (value === 'school' || value === 'tier3') return 'school';
  return null;
}
function data(value:unknown):Data {return value && typeof value === 'object' && !Array.isArray(value) ? value as Data : {};}
function positive(value:unknown):boolean {return typeof value === 'number' && Number.isFinite(value) && value > 0;}
function ownedBy(r:Data, employerId:string):boolean {
  const owner=r.employerId ?? r.orgId;
  return owner === employerId && !(r.employerId !== undefined && r.orgId !== undefined && r.employerId !== r.orgId);
}

/** Receipt statuses that still prove a paid annual term existed (refunded/disputed ones do not). */
export const FUNDING_RECEIPT_STATUSES: readonly string[] = ['active','expired'];

export interface AnnualReceiptTerm {id:string; tier:Tier; startsAt:Date; endsAt:Date; status:unknown; stripe:boolean; renewalOf:string|null}
/** A positive-amount annual receipt's own term, whatever its status, or null. */
export function annualReceiptTerm(receipt:{id:string;data:Data}, employerId:string):AnnualReceiptTerm|null {
  const r=receipt.data;
  if (!ownedBy(r,employerId) || r.billingCycle !== 'annual' || !positive(r.amount)) return null;
  const selected=tier(r.plan), startsAt=publicationDate(r.startsAt ?? r.createdAt), endsAt=publicationDate(r.expiresAt);
  if (!selected || !startsAt || !endsAt || endsAt <= startsAt) return null;
  return {id:receipt.id, tier:selected, startsAt, endsAt, status:r.status,
    stripe: typeof r.stripeSessionId === 'string' && /^cs_[A-Za-z0-9_-]+$/.test(r.stripeSessionId),
    renewalOf: typeof r.renewalOf === 'string' && r.renewalOf ? r.renewalOf : null};
}

/** The term exactly as the account projection and its receipt agree on it (it may have ended). */
function projectedTerm(input:PaidTermInput):PaidTerm|null {
  const {employer,employerId,receipts,now}=input;
  const nested=data(employer.subscription);
  const selected=tier(nested.tier ?? employer.subscriptionTier ?? employer.plan);
  if (!selected) return null;
  const statuses=[nested.status,employer.subscriptionStatus].filter(value=>value !== undefined);
  if (!statuses.length || statuses.some(value=>value !== 'active')) return null;
  for(const value of [nested.tier,employer.subscriptionTier,employer.plan]) {
    if(value !== undefined && tier(value) !== selected) return null;
  }
  const startsAt=publicationDate(nested.billingStartAt ?? employer.billingStartAt ?? employer.subscriptionStart);
  const endsAt=publicationDate(nested.subscriptionEnd ?? employer.subscriptionEnd);
  if (!startsAt || !endsAt || endsAt <= startsAt) return null;
  // Contradictory projections must not silently pick the most generous dates.
  for(const value of [nested.billingStartAt,employer.billingStartAt,employer.subscriptionStart]) {
    if(value !== undefined && publicationDate(value)?.getTime() !== startsAt.getTime()) return null;
  }
  for(const value of [nested.subscriptionEnd,employer.subscriptionEnd]) {
    if(value !== undefined && publicationDate(value)?.getTime() !== endsAt.getTime()) return null;
  }
  const bonusStart=publicationDate(nested.bonusAccessGrantedAt ?? employer.bonusAccessGrantedAt);
  const bonusEnd=publicationDate(nested.bonusAccessEndsAt ?? employer.bonusAccessEndsAt);
  const early=startsAt > now;
  if (early && (!bonusStart || !bonusEnd || bonusStart > now || bonusEnd <= now || bonusEnd.getTime() !== startsAt.getTime())) return null;
  // Complimentary ($0 admin or Hermes) access deliberately never funds paid job postings.
  if (typeof nested.paymentId === 'string' && nested.paymentId.startsWith('admin-grant-')) return null;
  const matches=receipts.filter(({data:r})=>{
    if(!ownedBy(r,employerId)) return false;
    const start=publicationDate(r.startsAt ?? r.createdAt);
    const end=publicationDate(r.expiresAt);
    return r.status === 'active' && tier(r.plan) === selected && r.billingCycle === 'annual' && positive(r.amount)
      && start?.getTime() === startsAt.getTime() && end?.getTime() === endsAt.getTime();
  });
  if(matches.length > 1) {
    // Ambiguous history of an ended term cannot fund anything, but must not block buying a new term.
    if(endsAt <= now) return null;
    throw new PublicationError('receipt_reconciliation','Overlapping annual receipts require reconciliation.');
  }
  const id=matches[0]?.id;
  if(typeof nested.termId === 'string' && (!id || nested.termId !== id)) return null;
  if(id) return {id,tier:selected,startsAt:early ? bonusStart! : startsAt,endsAt};
  // Existing explicitly paid manual administration may predate receipt creation.
  // Keep its stable paid-term identity; never accept plan labels or bonus reasons alone.
  const expected=selected === 'standard' ? 'tier1' : selected === 'premium' ? 'tier2' : 'tier3';
  const contradictoryReceipt=receipts.some(({data:r}) => (r.employerId ?? r.orgId) === employerId && tier(r.plan) === selected
    && publicationDate(r.startsAt ?? r.createdAt)?.getTime() === startsAt.getTime());
  if (contradictoryReceipt) return null;
  if(nested.paymentId === `admin-manual-${expected}` && positive(nested.amountPaid)) {
    return {id:`manual:${employerId}:${expected}:${startsAt.toISOString()}:${endsAt.toISOString()}`,tier:selected,startsAt:early ? bonusStart! : startsAt,endsAt};
  }
  return null;
}

/**
 * Payments made before the 2026-09-24 release merged into the nested projection, so stale
 * grant/manual payment ids, bonus fields or a stale top-level billingStartAt can sit beside
 * the paid term. Trust exactly one active Stripe receipt when a whole projection group
 * (nested map or top-level fields) states its tier, active status and exact dates, and no
 * group states those dates with another tier or a non-active status.
 */
function corroboratedStripeTerm(input:PaidTermInput):PaidTerm|null {
  const {employer,employerId,receipts,now}=input;
  const nested=data(employer.subscription);
  const groups=[
    {tiers:[nested.tier],status:nested.status,starts:[nested.billingStartAt],end:nested.subscriptionEnd},
    {tiers:[employer.subscriptionTier,employer.plan],status:employer.subscriptionStatus,starts:[employer.billingStartAt,employer.subscriptionStart],end:employer.subscriptionEnd},
  ];
  const sameDates=(group:typeof groups[number],term:AnnualReceiptTerm)=>publicationDate(group.end)?.getTime() === term.endsAt.getTime()
    && group.starts.some(value=>publicationDate(value)?.getTime() === term.startsAt.getTime());
  const sameTier=(group:typeof groups[number],term:AnnualReceiptTerm)=>{
    const tiers=group.tiers.filter(value=>value !== undefined && value !== null);
    return tiers.length > 0 && tiers.every(value=>tier(value) === term.tier);
  };
  const trusted=receipts.map(receipt=>annualReceiptTerm(receipt,employerId)).filter((term):term is AnnualReceiptTerm=>Boolean(
    term && term.stripe && term.status === 'active' && term.startsAt <= now
    && (typeof nested.termId !== 'string' || nested.termId === term.id)
    && groups.some(group=>sameDates(group,term) && sameTier(group,term) && group.status === 'active')
    && !groups.some(group=>sameDates(group,term) && (!sameTier(group,term) || group.status !== 'active'))));
  if(trusted.length > 1) {
    if(trusted.every(term=>term.endsAt <= now)) return null;
    throw new PublicationError('receipt_reconciliation','Overlapping annual receipts require reconciliation.');
  }
  const term=trusted[0];
  return term ? {id:term.id,tier:term.tier,startsAt:term.startsAt,endsAt:term.endsAt} : null;
}

/** Active paid renewals that continue `from` back to back, in order. */
export function renewalChain(input:PaidTermInput, from:{id:string;endsAt:Date}):AnnualReceiptTerm[] {
  const renewals=input.receipts.map(receipt=>annualReceiptTerm(receipt,input.employerId))
    .filter((term):term is AnnualReceiptTerm=>Boolean(term && term.status === 'active' && term.renewalOf));
  const chain:AnnualReceiptTerm[]=[];
  let previous=from;
  for(let hop=0; hop<renewals.length; hop++) {
    const next=renewals.filter(term=>term.renewalOf === previous.id && term.startsAt.getTime() === previous.endsAt.getTime());
    if(next.length > 1) throw new PublicationError('receipt_reconciliation','Overlapping annual renewals require reconciliation.');
    if(!next.length) break;
    chain.push(next[0]);
    previous=next[0];
  }
  return chain;
}

/** The paid annual term funding publication now, or null. Throws when paid evidence is ambiguous. */
export function resolvePaidPublicationTerm(input:PaidTermInput):PaidPublicationInput['paidTerm'] {
  if (!publicationDate(input.now)) return null;
  const projected=projectedTerm(input) ?? corroboratedStripeTerm(input);
  if (!projected || projected.endsAt > input.now) return projected;
  // A renewal bought before the term ended starts exactly at its end; it takes over at
  // that instant even before the daily subscription check rewrites the projection.
  const next=renewalChain(input,projected).find(term=>term.startsAt <= input.now && term.endsAt > input.now);
  return next ? {id:next.id,tier:next.tier,startsAt:next.startsAt,endsAt:next.endsAt} : null;
}

/** Paid terms (any tier) whose receipts still stand; jobs they funded stay editable until their own expiry. */
export function fundedAnnualTermIds(input:Pick<PaidTermInput,'employerId'|'receipts'>):string[] {
  return input.receipts.map(receipt=>annualReceiptTerm(receipt,input.employerId))
    .filter((term):term is AnnualReceiptTerm=>Boolean(term && FUNDING_RECEIPT_STATUSES.includes(String(term.status))))
    .map(term=>term.id).sort();
}

/** An active, paid annual receipt covers now: evidence that review is needed if nothing resolves. */
export function hasCurrentPaidAnnualReceipt(input:PaidTermInput):boolean {
  return input.receipts.some(receipt=>{
    const term=annualReceiptTerm(receipt,input.employerId);
    return Boolean(term && term.status === 'active' && term.startsAt <= input.now && term.endsAt > input.now);
  });
}
