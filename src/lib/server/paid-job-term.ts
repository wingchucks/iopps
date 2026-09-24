import { PublicationError, publicationDate, type PaidPublicationInput } from './paid-job-publication.ts';
type Data = Record<string, unknown>;
export interface PaidTermInput {employerId: string; employer: Data; receipts: {id:string;data:Data}[]; now:Date}
function tier(value:unknown): 'standard'|'premium'|'school'|null {
  if (value === 'standard' || value === 'tier1' || value === 'essential') return 'standard';
  if (value === 'premium' || value === 'tier2' || value === 'professional') return 'premium';
  if (value === 'school' || value === 'tier3') return 'school';
  return null;
}
function data(value:unknown):Data {return value && typeof value === 'object' && !Array.isArray(value) ? value as Data : {};}
function positive(value:unknown):boolean {return typeof value === 'number' && Number.isFinite(value) && value > 0;}
export function resolvePaidPublicationTerm(input:PaidTermInput):PaidPublicationInput['paidTerm'] {
  const {employer,employerId,receipts,now}=input;
  const nested=data(employer.subscription);
  const selected=tier(nested.tier ?? employer.subscriptionTier ?? employer.plan);
  if (!selected || !publicationDate(now)) return null;
  const statuses=[nested.status,employer.subscriptionStatus].filter(value=>value !== undefined);
  if (!statuses.length || statuses.some(value=>value !== 'active')) return null;
  for(const value of [nested.tier,employer.subscriptionTier,employer.plan]) {
    if(value !== undefined && tier(value) !== selected) return null;
  }
  const startsAt=publicationDate(nested.billingStartAt ?? employer.billingStartAt ?? employer.subscriptionStart);
  const endsAt=publicationDate(nested.subscriptionEnd ?? employer.subscriptionEnd);
  if (!startsAt || !endsAt || endsAt <= startsAt || endsAt <= now) return null;
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
  if (typeof nested.paymentId === 'string' && nested.paymentId.startsWith('admin-grant-')) return null;
  const matches=receipts.filter(({data:r})=>{
    const owner=r.employerId ?? r.orgId;
    if(owner !== employerId || (r.employerId !== undefined && r.orgId !== undefined && r.employerId !== r.orgId)) return false;
    const start=publicationDate(r.startsAt ?? r.createdAt);
    const end=publicationDate(r.expiresAt);
    return r.status === 'active' && tier(r.plan) === selected && r.billingCycle === 'annual' && positive(r.amount)
      && start?.getTime() === startsAt.getTime() && end?.getTime() === endsAt.getTime();
  });
  if(matches.length > 1) throw new PublicationError('receipt_reconciliation','Overlapping annual receipts require reconciliation.');
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
