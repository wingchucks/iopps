import type { DocumentReference, Firestore } from "firebase-admin/firestore";
import { matchesEditorialIdentity, REPAIR } from "./hermes-editorial-repair.ts";

export function guardedEditorialImportPatch(id: string, current: Record<string, unknown>, incoming: Record<string, unknown>,
  normalize: (text: string, format?: unknown) => string = text => text): Record<string, unknown> {
  if (id !== REPAIR.jobId || typeof incoming.description !== "string") return incoming;
  const marker = current.editorialCorrection;
  if (!marker || typeof marker !== "object" || Array.isArray(marker)) return incoming;
  const correction = marker as Record<string, unknown>;
  const merged = { ...current, ...incoming };
  if (correction.repairId === REPAIR.id && correction.kind === "user-approved-editorial" &&
    matchesEditorialIdentity(id, current) && matchesEditorialIdentity(id, merged) &&
    typeof correction.sourceUrl === "string" && REPAIR.urls.includes(correction.sourceUrl) &&
    current.description === correction.approvedDescription && typeof correction.originalDescription === "string" &&
    normalize(correction.originalDescription, current.descriptionFormat) === REPAIR.original &&
    normalize(String(current.description), current.descriptionFormat) === REPAIR.replacement &&
    normalize(incoming.description, merged.descriptionFormat) === REPAIR.original) {
    const patch: Record<string, unknown> = { ...incoming, description: current.description };
    // Keep existing source-quality provenance; do not label the editorial text as newly fetched source text.
    for (const field of ["descriptionFormat", "descriptionSource", "descriptionFetchedAt", "importContentQuality", "editorialCorrection"]) delete patch[field];
    return patch;
  }
  // An actually changed source is authoritative again. Retire the guard so it cannot resurrect old copy.
  return { ...incoming, editorialCorrection: null };
}

/** Read at write time, not the feed's stale snapshot: protects against concurrent apply/hydration. */
export async function updateImportedJobWithEditorialGuard(db: Firestore, ref: DocumentReference,
  incoming: Record<string, unknown>, normalize: (text: string, format?: unknown) => string): Promise<Record<string, unknown>> {
  if (ref.parent.id !== "jobs" || ref.id !== REPAIR.jobId) { await ref.update(incoming); return incoming; }
  return db.runTransaction(async tx => {
    const current = await tx.get(ref);
    if (!current.exists) throw new Error("Imported job disappeared");
    const patch = guardedEditorialImportPatch(ref.id, current.data()!, incoming, normalize);
    tx.update(ref, patch);
    return patch;
  });
}
