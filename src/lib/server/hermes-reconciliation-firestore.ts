import { createHash } from 'node:crypto';
import { FieldPath, type Firestore } from 'firebase-admin/firestore';
import { COLLECTIONS, type ReportCollection, type ReportSnapshot } from './hermes-reconciliation-api.ts';

// No names, email, customer, card, document URLs, descriptions or raw provider objects.
const fields: Record<ReportCollection, string[]> = {
  subscriptions: ['stripeSessionId', 'orgId', 'employerId', 'amount', 'gstAmount', 'totalAmount'],
  employers: ['plan', 'subscriptionTier', 'standardPostCredits', 'featuredPostCredits', 'programPostCredits'],
  organizations: ['employerId', 'plan', 'subscriptionTier'],
  jobs: ['employerId', 'orgId', 'authorId', 'status', 'active', 'featured', 'featuredCreditConsumed'],
  posts: ['type', 'employerId', 'orgId', 'authorId', 'status', 'active', 'featured', 'featuredCreditConsumed'],
  stripeWebhookEvents: ['stripeSessionId', 'status'],
};
export function createReconciliationAdapter(db: Firestore, now: () => number = Date.now) {
  return {
    async consumeReportBudget(keyId: string): Promise<boolean> {
      if (!/^[A-Za-z0-9_-]{1,64}$/.test(keyId)) return false;
      const id = createHash('sha256').update(`iopps-reconciliation-budget-v1\0${keyId}`).digest('hex');
      const ref = db.collection('hermesReconciliationRateLimits').doc(id);
      return db.runTransaction(async tx => {
        const snapshot = await tx.get(ref);
        const current = now();
        if (snapshot.exists) {
          const next = snapshot.data()?.nextAllowedAt;
          if (!Number.isSafeInteger(next) || next > current) return false;
        }
        tx.set(ref, { nextAllowedAt: current + 60000 });
        return true;
      });
    },
    async readSnapshot(): Promise<ReportSnapshot> {
      // One read-only transaction gives every page/collection the same database snapshot.
      return db.runTransaction(async tx => {
        const snapshot = Object.fromEntries(COLLECTIONS.map(name => [name, []])) as unknown as ReportSnapshot;
        let retainedBytes = 0;
        for (const collection of COLLECTIONS) {
          let last: string | undefined;
          for (let page = 0; page < 6; page++) {
            const remaining = 1000 - snapshot[collection].length;
            let query = db.collection(collection).select(...fields[collection]).orderBy(FieldPath.documentId()).limit(Math.min(200, remaining + 1));
            if (last !== undefined) query = query.startAfter(last);
            const result = await tx.get(query);
            if (result.docs.length > remaining) throw new Error('Report capacity exceeded');
            for (const document of result.docs) {
              if (last !== undefined && Buffer.compare(Buffer.from(document.id, 'utf8'), Buffer.from(last, 'utf8')) <= 0) throw new Error('Invalid report pagination');
              const record = { id: document.id, data: document.data() };
              retainedBytes += Buffer.byteLength(JSON.stringify(record), 'utf8');
              if (retainedBytes > 2 * 1024 * 1024) throw new Error('Report byte capacity exceeded');
              snapshot[collection].push(record);
              last = document.id;
            }
            if (result.size < Math.min(200, remaining + 1)) break;
            if (page === 5) throw new Error('Report capacity exceeded');
          }
        }
        return snapshot;
      }, { readOnly: true });
    },
  };
}
