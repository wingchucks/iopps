import type { DocumentReference, Firestore, Transaction } from "firebase-admin/firestore";
import { parseCleanupSourceKey, cleanupSourceDocId } from "./job-cleanup-contract.ts";
import { guardedEditorialImportPatch } from "./editorial-import-guard.ts";

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
  return db.runTransaction(async tx => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new Error("Imported job disappeared");
    const current = snap.data()!;
    if (!await cleanupWriteAllowed(db, tx, ref.id, current, incoming)) return {};
    const patch = guardedEditorialImportPatch(ref.id, current, incoming, normalize);
    tx.update(ref, patch);
    return patch;
  });
}
