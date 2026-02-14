import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import { Endorsement, EndorsementRelationship } from "../types";

function getDb() {
  if (!db) {
    throw new Error("Firestore is not initialized");
  }
  return db;
}

const COLLECTION = "endorsements";

export interface GiveEndorsementData {
  endorserId: string;
  endorseeId: string;
  skill: string;
  relationship: EndorsementRelationship;
  isElder: boolean;
  message?: string;
  endorserName: string;
  endorserPhotoURL?: string;
  endorserNation?: string;
}

export async function giveEndorsement(data: GiveEndorsementData): Promise<Endorsement> {
  const firestore = getDb();

  // Check for duplicate endorsement (same endorser + endorsee + skill)
  const duplicate = await hasEndorsed(data.endorserId, data.endorseeId, data.skill);
  if (duplicate) {
    throw new Error("You have already endorsed this person for this skill");
  }

  const endorsementsRef = collection(firestore, COLLECTION);
  const newRef = doc(endorsementsRef);

  const endorsement: Endorsement = {
    id: newRef.id,
    endorserId: data.endorserId,
    endorseeId: data.endorseeId,
    skill: data.skill,
    relationship: data.relationship,
    isElder: data.isElder,
    message: data.message || undefined,
    endorserName: data.endorserName,
    endorserPhotoURL: data.endorserPhotoURL || undefined,
    endorserNation: data.endorserNation || undefined,
    createdAt: serverTimestamp() as Timestamp,
    updatedAt: serverTimestamp() as Timestamp,
  };

  await setDoc(newRef, endorsement);
  return endorsement;
}

export async function getEndorsementsForUser(userId: string): Promise<Endorsement[]> {
  const firestore = getDb();
  const q = query(
    collection(firestore, COLLECTION),
    where("endorseeId", "==", userId),
    orderBy("createdAt", "desc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => d.data() as Endorsement);
}

export async function getEndorsementsGivenBy(userId: string): Promise<Endorsement[]> {
  const firestore = getDb();
  const q = query(
    collection(firestore, COLLECTION),
    where("endorserId", "==", userId),
    orderBy("createdAt", "desc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => d.data() as Endorsement);
}

export async function deleteEndorsement(endorsementId: string): Promise<void> {
  const firestore = getDb();
  await deleteDoc(doc(firestore, COLLECTION, endorsementId));
}

export async function hasEndorsed(
  endorserId: string,
  endorseeId: string,
  skill: string
): Promise<boolean> {
  const firestore = getDb();
  const q = query(
    collection(firestore, COLLECTION),
    where("endorserId", "==", endorserId),
    where("endorseeId", "==", endorseeId),
    where("skill", "==", skill)
  );
  const snapshot = await getDocs(q);
  return !snapshot.empty;
}

export async function getTopSkills(
  userId: string,
  maxSkills: number = 5
): Promise<{ skill: string; count: number }[]> {
  const endorsements = await getEndorsementsForUser(userId);

  const skillCounts = new Map<string, number>();
  for (const e of endorsements) {
    skillCounts.set(e.skill, (skillCounts.get(e.skill) || 0) + 1);
  }

  return Array.from(skillCounts.entries())
    .map(([skill, count]) => ({ skill, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, maxSkills);
}
