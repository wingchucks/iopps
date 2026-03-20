import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  getCountFromServer,
} from "firebase/firestore";
import { db } from "../firebase";

export interface Endorsement {
  id: string;
  targetUserId: string;
  endorserId: string;
  endorserName: string;
  endorserTitle: string;
  endorserOrg: string;
  endorserAvatar: string;
  type: "skill" | "character" | "work";
  message: string;
  skills: string[];
  createdAt: unknown;
}

const col = collection(db, "endorsements");

export async function getEndorsements(userId: string): Promise<Endorsement[]> {
  const q = query(
    col,
    where("targetUserId", "==", userId),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Endorsement);
}

export async function addEndorsement(
  data: Omit<Endorsement, "id" | "createdAt">
): Promise<string> {
  if (data.endorserId === data.targetUserId) {
    throw new Error("You cannot endorse yourself.");
  }
  const docRef = await addDoc(col, {
    ...data,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function getEndorsementCount(userId: string): Promise<number> {
  const q = query(col, where("targetUserId", "==", userId));
  const snap = await getCountFromServer(q);
  return snap.data().count;
}

export async function calculateTrustScore(userId: string): Promise<number> {
  const endorsements = await getEndorsements(userId);
  const count = endorsements.length;

  if (count === 0) return 0;

  // Endorser diversity: count unique orgs
  const uniqueOrgs = new Set(
    endorsements.map((e) => e.endorserOrg).filter(Boolean)
  );
  const orgDiversity = uniqueOrgs.size;

  // Type variety: count unique endorsement types
  const uniqueTypes = new Set(endorsements.map((e) => e.type));
  const typeVariety = uniqueTypes.size;

  // Formula: base 3.0 + count bonus + org diversity bonus + type variety bonus
  const countBonus = Math.min(count * 0.1, 1.0);
  const orgBonus = Math.min(orgDiversity * 0.2, 0.5);
  const typeBonus = Math.min(typeVariety * 0.25, 0.5);

  const score = 3.0 + countBonus + orgBonus + typeBonus;
  return Math.min(Math.round(score * 10) / 10, 5.0);
}
