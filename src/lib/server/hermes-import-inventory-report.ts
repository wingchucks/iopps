import { createHash } from 'node:crypto';
export const INVENTORY_COLLECTIONS = ['rssFeeds','feedImportIdentities','jobCleanupGuards','jobCleanupSources','jobs','posts'] as const;
export type InventoryCollection = typeof INVENTORY_COLLECTIONS[number];
export interface InventoryRecord { id: string; data: Record<string, unknown>; membership?: string[] }
export type InventorySnapshot = Record<InventoryCollection, InventoryRecord[]>;
export const INVENTORY_FIELDS: Record<InventoryCollection, string[]> = {
  rssFeeds: ['employerId','active','feedType','syncFrequency','updateExistingJobs','lastSyncedAt','lastSyncItemCount','lastSyncJobsUpdated','lastSyncJobsExpired','lastSyncJobsFailed','totalJobsImported'],
  feedImportIdentities: ['version','jobId','feedId','employerId'],
  jobCleanupGuards: ['schemaVersion','active','kind','originalId','canonicalId','sourceKey','auditId'],
  jobCleanupSources: ['schemaVersion','active','sourceKey','canonicalId','blockedEmployerIds','auditId'],
  jobs: ['type','source','feedId','importedFrom','importIdentity','employerId','status','active'],
  posts: ['type','source','feedId','importedFrom','importIdentity','employerId','status','active'],
};
export const INVENTORY_MAX_BYTES = 16 * 1024 * 1024;
/** Preserve accepted IDs exactly; decoding is used only to reject disguised URLs/contact data. */
export function safeInventoryIdentifier(value: unknown): value is string {
  if (typeof value !== 'string' || !value || Buffer.byteLength(value,'utf8') > 512) return false;
  let probe = value;
  for (let i = 0; i < 4; i++) {
    if (/[\u0000-\u001f\u007f/@?#\\]/u.test(probe)) return false;
    // Colon-bearing source namespaces are legitimate; reject known URI schemes
    // rather than normalizing IDs or banning colons outright.
    if (/^\s*(?:https?|ftp|sftp|file|data|javascript|vbscript|tel|sms|smsto|mms|fax|mailto|sip|sips|callto|skype|whatsapp|geo|intent):/iu.test(probe)) return false;
    let decoded: string;
    try { decoded = decodeURIComponent(probe); } catch { return false; }
    if (decoded === probe) return true;
    probe = decoded;
  }
  return false;
}
const digest = (value: string) => createHash('sha256').update(value,'utf8').digest('hex');
const enums: Record<string, readonly string[]> = {
  type: ['job'], source: ['feed','google-alerts','rss-import','employer','manual','admin','import'],
  status: ['active','published','draft','pending','approved','rejected','closed','expired','deleted','inactive','archived'],
  feedType: ['xml','rss','atom','json','dayforce','adp'], syncFrequency: ['hourly','daily','weekly','manual'], kind: ['duplicate','stale'],
};
const ids = new Set(['employerId','jobId','feedId','importedFrom','importIdentity','originalId','canonicalId','sourceKey','auditId']);
const booleans = new Set(['active','updateExistingJobs']);
const counters = new Set(['version','schemaVersion','lastSyncItemCount','lastSyncJobsUpdated','lastSyncJobsExpired','lastSyncJobsFailed','totalJobsImported']);
interface Anomaly { collection: InventoryCollection; recordDigest: string; code: string; field?: string }
interface ProjectedRecord { id: string | null; idDigest: string; data: Record<string, unknown>; membership: string[] }
export function projectImportInventory(snapshot: InventorySnapshot, work: { queryCalls: number; occurrences: number }) {
  const anomalies: Anomaly[] = [];
  const records = Object.fromEntries(INVENTORY_COLLECTIONS.map(c=>[c,[]])) as unknown as Record<InventoryCollection, ProjectedRecord[]>;
  for (const collection of INVENTORY_COLLECTIONS) {
    for (const row of snapshot[collection]) {
      const idDigest = digest(row.id);
      const note = (code: string, field?: string) => anomalies.push({collection,recordDigest:idDigest,code,...(field?{field}:{})});
      const id = safeInventoryIdentifier(row.id) ? row.id : null;
      if (id === null) note('redacted-unsafe-identifier','id');
      const data: Record<string, unknown> = {};
      for (const field of INVENTORY_FIELDS[collection]) {
        if (!Object.hasOwn(row.data,field)) continue;
        const value = row.data[field];
        if (ids.has(field)) {
          if (field === 'canonicalId' && value === null) data[field] = null;
          else if (safeInventoryIdentifier(value)) data[field] = value;
          else note('redacted-unsafe-identifier',field);
        } else if (booleans.has(field)) {
          if (typeof value === 'boolean') data[field] = value; else note('invalid-field',field);
        } else if (counters.has(field)) {
          if (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0) data[field] = value; else note('invalid-field',field);
        } else if (enums[field]) {
          if (typeof value === 'string' && enums[field].includes(value)) data[field] = value; else note('invalid-field',field);
        } else if (field === 'blockedEmployerIds') {
          if (Array.isArray(value) && value.length <= 200 && value.every(safeInventoryIdentifier)) data[field] = [...value]; else note('invalid-field',field);
        } else if (field === 'lastSyncedAt') {
          let instant: unknown = value;
          if (value && typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') instant = value.toDate();
          if (instant instanceof Date && Number.isFinite(instant.getTime())) data[field] = instant.toISOString(); else note('invalid-field',field);
        }
      }
      if (data.active === true && ['deleted','closed','expired','inactive','archived'].includes(String(data.status))) note('lifecycle-conflict');
      const membership = [...new Set(row.membership ?? [])];
      if (membership.some(l=>!['source','feedId','importedFrom','importIdentity'].includes(l))) throw new Error('Invalid membership');
      records[collection].push({id,idDigest,data,membership});
    }
  }
  const jobs = new Map(records.jobs.filter(r=>r.id!==null).map(r=>[r.id!,r]));
  const feeds = new Set(records.rssFeeds.map(r=>r.id).filter(Boolean));
  for (const row of records.feedImportIdentities) {
    const note = (code: string) => anomalies.push({collection:'feedImportIdentities',recordDigest:row.idDigest,code});
    const target = typeof row.data.jobId === 'string' ? jobs.get(row.data.jobId) : undefined;
    if (!target) note('reservation-target-unobserved');
    // V1 reservations contain no provider-source evidence; never invert their hash.
    note('source-unknown-reservation');
    if (target && target.data.importIdentity !== row.id) note('reservation-identity-mismatch');
    if (target && target.data.employerId !== row.data.employerId) note('reservation-owner-mismatch');
    if (typeof row.data.feedId === 'string' && !feeds.has(row.data.feedId) && !row.data.feedId.startsWith('google-alerts:')) note('feed-reference-unobserved');
  }
  for (const collection of ['jobCleanupGuards','jobCleanupSources'] as const) for (const row of records[collection]) {
    const note = (code: string) => anomalies.push({collection,recordDigest:row.idDigest,code});
    if (row.data.schemaVersion !== 1 || typeof row.data.active !== 'boolean' || !row.data.sourceKey || !row.data.auditId ||
        !Object.hasOwn(row.data,'canonicalId') || (collection === 'jobCleanupGuards' ? !row.data.originalId || !row.data.kind : !Array.isArray(row.data.blockedEmployerIds))) note(collection==='jobCleanupGuards'?'invalid-guard-schema':'invalid-source-schema');
    if (collection==='jobCleanupGuards' && !jobs.has(String(row.data.originalId))) note('guard-original-unobserved');
    if (typeof row.data.canonicalId==='string' && !jobs.has(row.data.canonicalId)) note('canonical-target-unobserved');
    if (collection==='jobCleanupSources' && typeof row.data.sourceKey==='string' && row.id!==digest(row.data.sourceKey)) note('source-document-id-mismatch');
  }
  const report = {snapshotComplete:true,coverage:'fixed-import-membership-projected-snapshot-v1',historicalCoverage:'not-established',providerVerified:false,
    limitations:['Markerless legacy imports and orphaned legacy feed memberships may be outside the approved query population.','Unobserved references do not establish deletion.','Stored feed counters are not verified inventory totals.'],
    counts:Object.fromEntries(INVENTORY_COLLECTIONS.map(c=>[c,records[c].length])),work,records,anomalies};
  if (Buffer.byteLength(JSON.stringify({ok:true,report}),'utf8') > INVENTORY_MAX_BYTES) throw new Error('Report response capacity exceeded');
  return report;
}
