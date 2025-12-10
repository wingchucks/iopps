// Livestream-related Firestore operations
import {
  addDoc,
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  db,
  liveStreamsCollection,
  checkFirebase,
} from "./shared";
import type { LiveStreamEvent } from "@/lib/types";

type LiveStreamInput = Omit<
  LiveStreamEvent,
  "id" | "createdAt" | "active"
> & { active?: boolean };

export async function createLiveStream(
  input: LiveStreamInput
): Promise<string> {
  const ref = collection(db!, liveStreamsCollection);
  const docRef = await addDoc(ref, {
    ...input,
    active: input.active ?? true,
    createdAt: serverTimestamp(),
  });
  await updateDoc(doc(db!, liveStreamsCollection, docRef.id), {
    id: docRef.id,
  });
  return docRef.id;
}

export async function listLiveStreams(): Promise<LiveStreamEvent[]> {
  try {
    const firestore = checkFirebase();
    if (!firestore) {
      return [];
    }
    const ref = collection(firestore, liveStreamsCollection);
    const q = query(ref, orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map((docSnap) => docSnap.data() as LiveStreamEvent);
  } catch {
    return [];
  }
}

export async function updateLiveStream(
  id: string,
  data: Partial<LiveStreamEvent>
) {
  const ref = doc(db!, liveStreamsCollection, id);
  await updateDoc(ref, data);
}
