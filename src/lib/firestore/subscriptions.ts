import {
  collection,
  doc,
  addDoc,

  getDocs,
  query,
  where,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import { getDocsCancellable } from "./cancellable-read";

export interface Subscription {
  id: string;
  orgId: string;
  plan: string;
  status: "pending" | "active" | "cancelled";
  amount: number;
  gstAmount: number;
  totalAmount: number;
  billingCycle: "monthly" | "annual" | "one-time";
  createdAt: unknown;
  expiresAt: unknown;
}

export async function createSubscription(
  data: Omit<Subscription, "id" | "createdAt">
): Promise<string> {
  const docRef = await addDoc(collection(db, "subscriptions"), {
    ...data,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function getOrgSubscriptions(
  orgId: string,
  signal?: AbortSignal,
): Promise<Subscription[]> {
  const q = query(
    collection(db, "subscriptions"),
    where("orgId", "==", orgId)
  );
  const snap = await (signal ? getDocsCancellable(q, signal) : getDocs(q));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Subscription);
}

export async function updateSubscriptionStatus(
  subId: string,
  status: Subscription["status"]
): Promise<void> {
  await updateDoc(doc(db, "subscriptions", subId), { status });
}
