import { feedJobKey, type FeedItem } from './feed-source';
type Job = Record<string, unknown>;
export function hasJobExpired(value: unknown, now = new Date()): boolean {
  if (!value) return false;
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const day = new Intl.DateTimeFormat('en-CA', {timeZone:'America/Regina',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
    return Number.isFinite(Date.parse(value)) && value < day;
  }
  let date: Date;
  if (value instanceof Date) date = value;
  else if (typeof value === 'object' && value !== null && 'toDate' in value && typeof value.toDate === 'function') date = value.toDate();
  else if (typeof value === 'string') date = new Date(value);
  else return false;
  return Number.isFinite(date.getTime()) && date.getTime() <= now.getTime();
}
export function expirationPatch(reason: 'closing_date' | 'removed_from_source', now = new Date()) {
  return { active:false, status:'expired', expiredAt:now, expirationReason:reason, updatedAt:now };
}
export function sourceLifecyclePatch(item: FeedItem, existing: Job = {}, now = new Date()): Job {
  const patch: Job = {};
  if ('closingDate' in item) patch.closingDate = item.closingDate || null;
  if (['deleted','archived','draft','closed','inactive'].includes(String(existing.status))) return patch;
  if (hasJobExpired(item.closingDate, now)) return {...patch,...expirationPatch('closing_date',now)};
  if (existing.expirationReason === 'removed_from_source' || (existing.expirationReason === 'closing_date' && 'closingDate' in item)) {
    if (existing.status === 'expired') Object.assign(patch,{active:true,status:'active',expiredAt:null,expirationReason:null});
  }
  return patch;
}
/** Only complete enumerations (empty sources require confirmation) may close jobs absent from their own source. */
export function missingSourceJobIds(jobs: Array<Job & {id:string}>, items: FeedItem[], feed: {id:string;employerId:string;feedType:string;feedUrl:string}, failed: number, confirmedEmpty = false): string[] {
  if (failed || (!items.length && !confirmedEmpty) || !['dayforce','oracle-hcm','adp'].includes(feed.feedType)) return [];
  const ids = new Set(items.map(i=>i.guid));
  const keys = new Set(items.map(i=>feedJobKey(i.link)));
  const board = feed.feedType === 'dayforce' ? feedJobKey(feed.feedUrl.replace(/\/$/,'')+'/jobs/0').replace(/:0$/,'')+':' : '';
  return jobs.filter(j=>{
    if (j.employerId !== feed.employerId || (j.active !== true && j.status !== 'active')) return false;
    if (j.feedId && j.feedId !== feed.id) return false;
    const links = [j.externalUrl,j.applyUrl,j.applicationUrl].map(feedJobKey).filter(Boolean);
    const sameSource = j.feedId === feed.id || (board && links.some(k=>k.startsWith(board)));
    if (!sameSource || (!j.externalId && !links.length)) return false;
    return !(j.externalId && ids.has(String(j.externalId))) && !links.some(k=>keys.has(k));
  }).map(j=>j.id);
}
