import {
  collection,
  getDocs,
  getDocsFromServer,
  setDoc,
  deleteDoc,
  writeBatch,
  doc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import { loadSavedJobAliases } from "../saved-job-aliases";

export interface SavedItem {
  id: string;
  userId: string;
  postId: string;
  postTitle: string;
  postType: string;
  postOrgName?: string;
  savedAt: unknown;
}

const col = collection(db, "saved_items");

/** Never synthesize a save ID: authorize using current own-user server results. */
export async function removeOwnSavedRecords(userId: string, ids: string[]): Promise<void> {
  const own = await getDocsFromServer(query(col, where("userId", "==", userId)));
  const wanted = new Set(ids);
  const records = own.docs.filter(record => wanted.has(record.id));
  if (records.length !== wanted.size || records.length > 450) throw new Error("Saved item ownership changed or group too large");
  if (!records.length) return;
  const batch = writeBatch(db);
  for (const record of records) batch.delete(record.ref);
  await batch.commit();
}

export async function getEquivalentJobSaves(userId: string, postId: string) {
  const aliases = await loadSavedJobAliases([postId]);
  const canonicalId = aliases.find(alias => alias.originalId === postId)?.canonicalId || postId;
  const equivalent = new Set([postId, canonicalId, ...aliases.filter(alias => alias.canonicalId === canonicalId).map(alias => alias.originalId)]);
  const own = await getDocsFromServer(query(col, where("userId", "==", userId)));
  return { canonicalId, records: own.docs.filter(record => record.data().postType === "job" && equivalent.has(record.data().postId)).map(record => ({...record.data(), id: record.id}) as SavedItem) };
}
export async function isJobSaved(userId: string, postId: string): Promise<boolean> {
  return (await getEquivalentJobSaves(userId, postId)).records.length > 0;
}
export async function saveJob(userId: string, postId: string, title: string, org: string): Promise<void> {
  const state = await getEquivalentJobSaves(userId, postId);
  if (!state.records.length) await savePost(userId, state.canonicalId, title, "job", org);
}
export async function unsaveJob(userId: string, postId: string): Promise<void> {
  const state = await getEquivalentJobSaves(userId, postId);
  await removeOwnSavedRecords(userId, state.records.map(record => record.id));
}

export async function getSavedItems(userId: string): Promise<SavedItem[]> {
  const snap = await getDocs(
    query(col, where("userId", "==", userId), orderBy("savedAt", "desc"))
  );
  return snap.docs.map((d) => ({ ...d.data(), id: d.id }) as SavedItem);
}

export async function isPostSaved(
  userId: string,
  postId: string
): Promise<boolean> {
  const docId = `${userId}_${postId}`;
  const snap = await getDocs(
    query(col, where("userId", "==", userId), where("postId", "==", postId))
  );
  return !snap.empty;
}

export async function savePost(
  userId: string,
  postId: string,
  postTitle: string,
  postType: string,
  postOrgName?: string
): Promise<void> {
  const docId = `${userId}_${postId}`;
  // Own-user queries are permitted even when no document exists; direct reads
  // of missing documents are not. Rules deny updates to existing saved items.
  const savedQuery = query(col, where("userId", "==", userId), where("postId", "==", postId));
  if (!(await getDocsFromServer(savedQuery)).empty) return;
  try {
    await setDoc(doc(db, "saved_items", docId), {
      userId,
      postId,
      postTitle,
      postType,
      ...(postOrgName ? { postOrgName } : {}),
      savedAt: serverTimestamp(),
    });
  } catch (error) {
    // Another tab may have created the same save. Only server-confirmed own
    // data can acknowledge success; offline/cache state cannot consume intent.
    if (!(await getDocsFromServer(savedQuery)).empty) return;
    throw error;
  }
}

export async function unsavePost(
  userId: string,
  postId: string
): Promise<void> {
  const snap = await getDocsFromServer(query(col, where("userId", "==", userId), where("postId", "==", postId)));
  for (const record of snap.docs) await deleteDoc(record.ref);
}
