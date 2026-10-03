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
/** How long a feed must stay empty before the jobs it listed are closed: most of a day. */
export const EMPTY_FEED_CONFIRMATION_MS = 20 * 60 * 60 * 1000;
/**
 * True when the feed's previous sync was also a clean empty result, at least most of a day
 * ago. Syncs can come closer together than daily (Vercel Cron and its GitHub backup, manual
 * syncs), and a feed that is only briefly empty must not close every job it lists.
 */
export function confirmsEmptyFeed(feed: Job, now = Date.now()): boolean {
  if (feed.lastSyncItemCount !== 0 || feed.lastSyncJobsFailed !== 0 || feed.lastSyncError) return false;
  const synced = feed.lastSyncedAt;
  const syncedAt = synced instanceof Date ? synced.getTime()
    : typeof synced === 'string' || typeof synced === 'number' ? new Date(synced).getTime()
    : typeof (synced as { toMillis?: unknown } | null)?.toMillis === 'function' ? (synced as { toMillis(): number }).toMillis()
    : NaN;
  return Number.isFinite(syncedAt) && now - syncedAt >= EMPTY_FEED_CONFIRMATION_MS;
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
