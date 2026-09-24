import type { DocumentReference, Firestore, Transaction } from "firebase-admin/firestore";
import { parseCleanupSourceKey, cleanupSourceDocId } from "./job-cleanup-contract.ts";
import { guardedEditorialImportPatch } from "./editorial-import-guard.ts";
import {preparePaidPublication} from './paid-job-publication-reader';
import {firestorePublicationReader} from './paid-job-publication-firestore';
import {publicationDate,PublicationError} from './paid-job-publication';
import {isJobRecordExpired} from '../listing-freshness';
import {expirationPatch} from './job-expiration';

type Data = Record<string, unknown>;
const fields = ["externalUrl", "externalApplyUrl", "applicationUrl", "applyUrl", "sourceUrl"];
/** Read every supported source, not just a changed title/date or preferred URL. */
export function cleanupSourceKeys(data: Data): string[] {
  return [...new Set(fields.map(field => parseCleanupSourceKey(data[field])).filter((key): key is string => key !== null))];
}
export async function cleanupWriteAllowed(db: Firestore, tx: Transaction, id: string, current: Data, incoming: Data): Promise<boolean> {
  const guard = await tx.get(db.collection("jobCleanupGuards").doc(id));
  if (guard.exists) {
    const g = guard.data()!;
    if (g.schemaVersion !== 1 || g.active !== false || g.originalId !== id ||
      !["duplicate", "stale"].includes(g.kind) || typeof g.sourceKey !== "string" || !g.sourceKey || typeof g.auditId !== "string" || !g.auditId ||
      !(g.kind === "stale" ? g.canonicalId === null : typeof g.canonicalId === "string" && g.canonicalId !== id && !!g.canonicalId)) return false;
  }
  const keys = new Set([...cleanupSourceKeys(current), ...cleanupSourceKeys(incoming)]);
  for (const key of keys) {
    const snap = await tx.get(db.collection("jobCleanupSources").doc(cleanupSourceDocId(key)));
    if (!snap.exists) continue;
    const source = snap.data()!;
    if (source.schemaVersion !== 1 || typeof source.active !== "boolean" || source.sourceKey !== key ||
      !Array.isArray(source.blockedEmployerIds) || !source.blockedEmployerIds.every((v: unknown) => typeof v === "string") ||
      typeof source.auditId !== "string" || !(source.canonicalId === null || typeof source.canonicalId === "string")) return false;
    if (!source.active) continue;
    const employers = [current.employerId, incoming.employerId].filter(v => typeof v === "string" && v);
    // Unknown ownership of a registered source is never a safe lane.
    if (!employers.length || employers.some(id => source.blockedEmployerIds.includes(id))) return false;
  }
  return true;
}
/** Cleanup suppression is checked before editorial normalization, in the same transaction. */
export async function updateImportedJobWithEditorialGuard(db: Firestore, ref: DocumentReference, incoming: Data,
  normalize: (text: string, format?: unknown) => string): Promise<Data> {
  const publicationNow=new Date();
  return db.runTransaction(async tx => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new Error("Imported job disappeared");
    const current = snap.data()!;
    if (!await cleanupWriteAllowed(db, tx, ref.id, current, incoming)) return {};
    if(current.status==='deleted' || current.deletedAt)return {};
    const patch = guardedEditorialImportPatch(ref.id, current, incoming, normalize);
    delete patch.publicationPolicyVersion;
    if(Object.hasOwn(current,'publicationPolicyVersion') && !Object.hasOwn(current,'publication') &&
      ((patch.active ?? current.active)===true || ['active','published'].includes(String(patch.status ?? current.status)))) {
      throw new PublicationError('payment_required','New import publication requires a paid approval.');
    }
    for(const field of ['publication','featuredEntitlement','featuredCreditConsumed','featuredCreditConsumedAt','standardCreditConsumed','standardCreditConsumedAt','listingDurationDays','employerId','orgId','organizationId']) delete patch[field];
    if(Object.hasOwn(current,'publication')) {
      for(const field of ['expiresAt','postedAt','featured'])delete patch[field];
      const history=current.publication as Data;
      const paidEnd=publicationDate(history?.expiresAt);
      if(!paidEnd)throw new PublicationError('reconciliation_required','Imported publication expiry requires reconciliation.');
      if(['draft','closed','archived','inactive'].includes(String(current.status))) {
        Object.assign(patch,{active:false,status:current.status});
      } else if(paidEnd<=publicationNow) {
        Object.assign(patch,{active:false,status:'expired',expiresAt:paidEnd,expirationReason:'paid_listing',expiredAt:publicationNow});
      } else if(isJobRecordExpired({...current,...patch},publicationNow)) {
        Object.assign(patch,expirationPatch('closing_date',publicationNow));
      } else if((patch.active ?? current.active)===true || (patch.status ?? current.status)==='active') {
        const owner=String(current.employerId ?? '');
        const paid=await preparePaidPublication(firestorePublicationReader(db,tx),{
          employerId:owner,organizationId:String(current.orgId ?? current.organizationId ?? owner),jobId:ref.id,
          current,status:'active',featured:current.featured===true,now:publicationNow,
        });
        // A refresh must never fund a second publication.
        if(Object.keys(paid.employerPatch).length)throw new PublicationError('reconciliation_required','Import refresh cannot consume a new posting entitlement.');
        tx.set(db.collection('employers').doc(owner),{updatedAt:publicationNow},{merge:true});
        Object.assign(patch,paid.jobPatch);
      }
    }
    tx.update(ref, patch);
    return patch;
  });
}
