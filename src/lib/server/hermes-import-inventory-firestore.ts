import { FieldPath, type Firestore, type Query } from 'firebase-admin/firestore';
import { INVENTORY_COLLECTIONS, INVENTORY_FIELDS, INVENTORY_MAX_BYTES, projectImportInventory, safeInventoryIdentifier,
  type InventoryCollection, type InventoryRecord, type InventorySnapshot } from './hermes-import-inventory-report.ts';
interface Limits { pageSize?: number; maxRecords?: number; maxOccurrences?: number; maxQueries?: number; maxBytes?: number; deadlineMs?: number; now?: () => number }
/** Internal limits may be lowered for tests; request input never reaches this factory. */
export function createImportInventoryAdapter(db: Firestore, limits: Limits = {}) {
  const bounded = (value: number | undefined, ceiling: number) => {
    const result = value ?? ceiling;
    if (!Number.isSafeInteger(result) || result < 1 || result > ceiling) throw new Error('Invalid inventory limit');
    return result;
  };
  const pageSize = bounded(limits.pageSize,200), maxRecords = bounded(limits.maxRecords,10000), maxOccurrences = bounded(limits.maxOccurrences,100000);
  const maxQueries = bounded(limits.maxQueries,2000), maxBytes = bounded(limits.maxBytes,INVENTORY_MAX_BYTES), deadlineMs = bounded(limits.deadlineMs,45000);
  const now = limits.now ?? Date.now;
  return {
    async readInventory() {
      const started = now();
      let expired = false;
      const deadline = () => { if (expired || now() - started >= deadlineMs) { expired = true; throw new Error('Inventory deadline exceeded'); } };
      // SDK promises are not cancellable here. Timeout rejects the request and the
      // shared latch prevents any subsequent query after a late SDK completion.
      async function withinDeadline<T>(operation: () => Promise<T>): Promise<T> {
        deadline();
        let timer: ReturnType<typeof setTimeout> | undefined;
        const timeout = new Promise<never>((_, reject) => {
          timer = setTimeout(() => { expired = true; reject(new Error('Inventory deadline exceeded')); }, Math.max(1, deadlineMs - (now() - started)));
        });
        try {
          const result = await Promise.race([operation(), timeout]);
          deadline();
          return result;
        } finally { clearTimeout(timer); }
      }
      return withinDeadline(() => db.runTransaction(async tx => {
        const buckets = Object.fromEntries(INVENTORY_COLLECTIONS.map(c=>[c,new Map<string,InventoryRecord>()])) as Record<InventoryCollection,Map<string,InventoryRecord>>;
        let queryCalls = 0, occurrences = 0, retainedBytes = 0;
        async function lane(collection: InventoryCollection, base: Query, membership?: string) {
          let last: string | undefined;
          for (;;) {
            deadline();
            if (++queryCalls > maxQueries) throw new Error('Inventory query capacity exceeded');
            // Probe beyond an exactly full unique-record cap; duplicate lanes still consume work.
            const cap = Math.min(pageSize,maxRecords - buckets[collection].size + 1);
            let query = base.select(...INVENTORY_FIELDS[collection]).orderBy(FieldPath.documentId()).limit(cap);
            if (last !== undefined) query = query.startAfter(last);
            const page = await withinDeadline(() => tx.get(query)); deadline();
            occurrences += page.docs.length;
            if (occurrences > maxOccurrences || page.docs.length > cap || page.size !== page.docs.length) throw new Error('Inventory occurrence capacity exceeded');
            for (const doc of page.docs) {
              if (last !== undefined && Buffer.compare(Buffer.from(doc.id,'utf8'),Buffer.from(last,'utf8')) <= 0) throw new Error('Invalid inventory pagination');
              last = doc.id;
              const existing = buckets[collection].get(doc.id);
              if (existing) {
                if (membership && !existing.membership!.includes(membership)) { existing.membership!.push(membership); retainedBytes += Buffer.byteLength(membership,'utf8') + 4; }
              } else {
                if (buckets[collection].size >= maxRecords) throw new Error('Inventory record capacity exceeded');
                const row: InventoryRecord = {id:doc.id,data:doc.data(),membership:membership?[membership]:[]};
                retainedBytes += Buffer.byteLength(JSON.stringify(row),'utf8');
                buckets[collection].set(doc.id,row);
              }
              if (retainedBytes > maxBytes) throw new Error('Inventory byte capacity exceeded');
            }
            if (page.size < cap) break;
          }
        }
        for (const collection of ['rssFeeds','feedImportIdentities','jobCleanupGuards','jobCleanupSources'] as const) await lane(collection,db.collection(collection));
        const feedIds = new Set<string>();
        for (const row of buckets.rssFeeds.values()) if (safeInventoryIdentifier(row.id)) feedIds.add(row.id);
        for (const row of buckets.feedImportIdentities.values()) if (safeInventoryIdentifier(row.data.feedId)) feedIds.add(row.data.feedId);
        const identities = [...buckets.feedImportIdentities.values()].filter(row=>/^[a-f0-9]{64}$/.test(row.id) && row.data.version===1 && safeInventoryIdentifier(row.data.feedId) && safeInventoryIdentifier(row.data.jobId) && safeInventoryIdentifier(row.data.employerId)).map(row=>row.id);
        for (const collection of ['jobs','posts'] as const) {
          const base: Query = collection==='posts' ? db.collection(collection).where('type','==','job') : db.collection(collection);
          await lane(collection,base.where('source','in',['feed','google-alerts','rss-import']),'source');
          for (const id of feedIds) {
            await lane(collection,base.where('feedId','==',id),'feedId');
            await lane(collection,base.where('importedFrom','==',id),'importedFrom');
          }
          for (const identity of identities) await lane(collection,base.where('importIdentity','==',identity),'importIdentity');
        }
        deadline();
        const snapshot = Object.fromEntries(INVENTORY_COLLECTIONS.map(c=>[c,[...buckets[c].values()].sort((a,b)=>Buffer.compare(Buffer.from(a.id,'utf8'),Buffer.from(b.id,'utf8')))])) as InventorySnapshot;
        const result = projectImportInventory(snapshot,{queryCalls,occurrences});
        deadline();
        return result;
      },{readOnly:true}));
    },
  };
}
