import {
  onSnapshot,
  type DocumentData,
  type DocumentReference,
  type DocumentSnapshot,
  type Query,
  type QuerySnapshot,
  type SnapshotMetadata,
  type Unsubscribe,
} from "firebase/firestore";

// A one-shot server read whose actual SDK listener belongs to the caller.
// Dropping a getDoc/getDocs promise does not remove its internal listener.
function firstServerSnapshot<T extends { metadata: SnapshotMetadata }>(
  subscribe: (next: (snapshot: T) => void, error: (error: Error) => void) => Unsubscribe,
  signal: AbortSignal,
): Promise<T> {
  return new Promise((resolve, reject) => {
    let settled = false;
    let unsubscribe: Unsubscribe | undefined;
    if (signal.aborted) {
      reject(new DOMException("Read owner disposed", "AbortError"));
      return;
    }
    const finish = (snapshot?: T, error?: Error) => {
      if (settled) return;
      settled = true;
      signal.removeEventListener("abort", abort);
      if (timer) clearTimeout(timer);
      unsubscribe?.();
      if (error) reject(error);
      else resolve(snapshot!);
    };
    const abort = () => finish(undefined, new DOMException("Read owner disposed", "AbortError"));
    signal.addEventListener("abort", abort, { once: true });
    // Do not turn an offline cache miss into an authoritative empty account.
    const timer = setTimeout(() => finish(undefined, Object.assign(
      new Error("Server read did not complete"), { code: "unavailable" },
    )), 15000);
    try {
      unsubscribe = subscribe(snapshot => {
        if (!snapshot.metadata.fromCache) finish(snapshot);
      }, error => finish(undefined, error));
      // Also support an adapter that invokes its callback synchronously.
      if (settled) unsubscribe();
    } catch (error) {
      finish(undefined, error instanceof Error ? error : new Error(String(error)));
    }
  });
}

export function getDocCancellable<T extends DocumentData>(
  reference: DocumentReference<T>, signal: AbortSignal,
): Promise<DocumentSnapshot<T>> {
  return firstServerSnapshot((next, error) => onSnapshot(
    reference, { includeMetadataChanges: true }, next, error,
  ), signal);
}

export function getDocsCancellable<T extends DocumentData>(
  reference: Query<T>, signal: AbortSignal,
): Promise<QuerySnapshot<T>> {
  return firstServerSnapshot((next, error) => onSnapshot(
    reference, { includeMetadataChanges: true }, next, error,
  ), signal);
}
