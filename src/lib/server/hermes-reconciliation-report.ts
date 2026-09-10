import { COLLECTIONS, type ReportSnapshot } from './hermes-reconciliation-api.ts';
import { getIncludedFeaturedJobSlots } from './featured-job-entitlements.ts';

const creditFields = ['standardPostCredits', 'featuredPostCredits', 'programPostCredits'];
function minorUnits(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return null;
  const rounded = Math.round(value * 100);
  return Number.isSafeInteger(rounded) && Math.abs(value * 100 - rounded) < 0.000001 ? rounded : null;
}
export function reconcileSnapshot(snapshot: ReportSnapshot) {
  for (const name of COLLECTIONS) {
    if (!Array.isArray(snapshot[name]) || snapshot[name].length > 1000) throw new Error('Report capacity exceeded');
    const ids = new Set<string>();
    for (const record of snapshot[name]) {
      if (!record || typeof record.id !== 'string' || !record.id || record.id.includes('/') || ids.has(record.id) ||
          !record.data || typeof record.data !== 'object' || Array.isArray(record.data)) throw new Error('Invalid snapshot');
      ids.add(record.id);
      const stringFields = name === 'subscriptions' ? ['orgId', 'employerId', 'stripeSessionId']
        : name === 'employers' ? ['plan', 'subscriptionTier']
        : name === 'organizations' ? ['employerId', 'plan', 'subscriptionTier']
        : name === 'stripeWebhookEvents' ? ['stripeSessionId', 'status']
        : ['employerId', 'orgId', 'authorId', 'status', ...(name === 'posts' ? ['type'] : [])];
      for (const field of stringFields) {
        const value = record.data[field];
        if (value === null && (field === 'status' || field === 'type')) throw new Error('Unsupported report discriminator');
        if (value !== undefined && value !== null && (typeof value !== 'string' || value.length > 256)) throw new Error('Unsupported report field');
      }
      if (name === 'jobs' || name === 'posts') {
        for (const field of ['active', 'featured', 'featuredCreditConsumed']) {
          if (record.data[field] !== undefined && typeof record.data[field] !== 'boolean') throw new Error('Unsupported report discriminator');
        }
      }
      if (name === 'employers' || name === 'organizations') {
        for (const field of ['plan', 'subscriptionTier']) {
          const value = record.data[field];
          if (value !== undefined && value !== null && (typeof value !== 'string' || !['free', 'standard', 'premium', 'school'].includes(value.toLowerCase()))) throw new Error('Unsupported plan');
        }
      }
    }
  }
  const employers = new Map(snapshot.employers.map(record => [record.id, record.data]));
  const organizationOwners = new Map<string, string | null>();
  for (const { id, data } of snapshot.organizations) {
    const candidates = new Set([id, data.employerId].filter((value): value is string => typeof value === 'string' && employers.has(value)));
    organizationOwners.set(id, candidates.size === 1 ? [...candidates][0] : null);
  }
  const resolveEmployer = (data: Record<string, unknown>): string | null => {
    const links = [data.employerId, data.orgId].filter(value => value !== undefined && value !== null && value !== '');
    if (!links.length && data.authorId) links.push(data.authorId);
    const resolved = links.map(value => typeof value === 'string' ? (employers.has(value) ? value : organizationOwners.get(value)) : null);
    return resolved.length && resolved.every(value => value && value === resolved[0]) ? resolved[0]! : null;
  };
  const plan = (data: Record<string, unknown>): string | null => {
    const value = data.subscriptionTier ?? data.plan ?? 'free';
    return typeof value === 'string' && ['free', 'standard', 'premium', 'school'].includes(value.toLowerCase()) ? value.toLowerCase() : null;
  };
  const potentialIssues = {
    duplicateReceiptSessionGroups: 0, receiptMoneyShapeOrTotalMismatch: 0,
    invalidEmployerCreditRecords: 0, incompleteWebhookRecords: 0,
    completedWebhookWithoutReceipt: 0, featuredListingsBeyondRecordedCoverage: 0,
    featuredListingsWithUnresolvedEmployer: 0, receiptsWithUnresolvedEmployer: 0,
    organizationPlanMirrorDifferences: 0,
  };
  const inventory = { nonStripeOrUnlinkedReceipts: 0, legacyReceiptIds: 0, canonicalJobMirrorsSuppressed: 0, markedActiveFeaturedListings: 0 };
  const receipts = new Map<string, number>();
  for (const { id, data } of snapshot.subscriptions) {
    if (!resolveEmployer(data)) potentialIssues.receiptsWithUnresolvedEmployer++;
    const amount = minorUnits(data.amount), gst = minorUnits(data.gstAmount), total = minorUnits(data.totalAmount);
    if (amount === null || gst === null || total === null || !Number.isSafeInteger(amount + gst) || amount + gst !== total) {
      potentialIssues.receiptMoneyShapeOrTotalMismatch++;
    }
    if (typeof data.stripeSessionId !== 'string' || !/^cs_[A-Za-z0-9_-]+$/.test(data.stripeSessionId)) {
      inventory.nonStripeOrUnlinkedReceipts++; continue;
    }
    const session = data.stripeSessionId;
    receipts.set(session, (receipts.get(session) ?? 0) + 1);
    if (id !== session) inventory.legacyReceiptIds++;
  }
  potentialIssues.duplicateReceiptSessionGroups = [...receipts.values()].filter(count => count > 1).length;
  for (const { data } of snapshot.employers) {
    if (creditFields.some(field => Object.hasOwn(data, field) && (!Number.isSafeInteger(data[field]) || Number(data[field]) < 0))) {
      potentialIssues.invalidEmployerCreditRecords++;
    }
  }
  for (const { data } of snapshot.stripeWebhookEvents) {
    if (data.status !== 'completed') potentialIssues.incompleteWebhookRecords++;
    else if (typeof data.stripeSessionId !== 'string' || !receipts.has(data.stripeSessionId)) potentialIssues.completedWebhookWithoutReceipt++;
  }
  for (const { id, data } of snapshot.organizations) {
    const owner = organizationOwners.get(id);
    if (owner && (data.plan !== undefined || data.subscriptionTier !== undefined)) {
      const employerPlan = plan(employers.get(owner)!);
      if (employerPlan && plan(data) && plan(data) !== employerPlan) potentialIssues.organizationPlanMirrorDifferences++;
    }
  }
  const jobs = new Map(snapshot.jobs.map(record => [record.id, record]));
  for (const record of snapshot.posts) {
    if (record.data.type !== 'job') continue;
    if (jobs.has(record.id)) { inventory.canonicalJobMirrorsSuppressed++; continue; }
    jobs.set(record.id, record);
  }
  const uncoveredByEmployer = new Map<string, number>();
  for (const { data } of jobs.values()) {
    const markedActive = data.active !== false && (data.status === 'active' || data.status === 'published' ||
      (data.status === undefined && data.active === true));
    if (!markedActive || data.featured !== true) continue;
    inventory.markedActiveFeaturedListings++;
    const owner = resolveEmployer(data);
    if (!owner || !plan(employers.get(owner)!)) { potentialIssues.featuredListingsWithUnresolvedEmployer++; continue; }
    if (data.featuredCreditConsumed === true) continue;
    uncoveredByEmployer.set(owner, (uncoveredByEmployer.get(owner) ?? 0) + 1);
  }
  for (const [owner, count] of uncoveredByEmployer) {
    potentialIssues.featuredListingsBeyondRecordedCoverage += Math.max(0, count - getIncludedFeaturedJobSlots(plan(employers.get(owner)!)));
  }
  return { inventory, potentialIssues, limitations: [
    'Potential issues overlap and require manual review; they are not findings of fraud.',
    'Recorded credit-consumption flags are not proof of payment.',
    'Remaining credits are not reconstructed from purchases; spent credits and complimentary grants are not debts.',
    'This is retained database evidence, not an immutable historical ledger or a Stripe settlement reconciliation.',
    'Featured coverage uses current plan and active markers, not expiry, historical plan, or provider verification.',
    'No currency totals or customer records are returned.',
  ] };
}
