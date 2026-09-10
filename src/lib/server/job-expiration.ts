import { feedJobKey, type FeedItem } from './feed-source';
type Job = Record<string, unknown>;

export { hasJobExpired, isJobRecordExpired, descriptionApplicationDeadline } from '../listing-freshness';
import { isJobRecordExpired } from '../listing-freshness';
export function expirationPatch(reason: 'closing_date' | 'removed_from_source', now = new Date()) {
  return { active:false, status:'expired', expiredAt:now, expirationReason:reason, updatedAt:now };
}
export function sourceLifecyclePatch(item: FeedItem, existing: Job = {}, now = new Date()): Job {
  const patch: Job = {};
  if ('closingDate' in item) patch.closingDate = item.closingDate || null;
  if (['deleted','archived','draft','closed','inactive'].includes(String(existing.status))) return patch;
  if (isJobRecordExpired({...existing, ...item, ...patch}, now)) return {...patch,...expirationPatch('closing_date',now)};
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
