import {
  collection, doc, getDocs, addDoc, updateDoc, query, where, orderBy, limit,
  Timestamp, onSnapshot, type Unsubscribe, setDoc
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Conversation, Message } from "@/lib/types";

const convCol = () => collection(db!, "conversations");
const msgCol = (conversationId: string) => collection(db!, "conversations", conversationId, "messages");

export async function createConversation(
  participants: string[],
  orgId: string | null,
  postId?: string
): Promise<string> {
  const now = Timestamp.now();
  const ref = await addDoc(convCol(), {
    participants,
    orgId,
    postId: postId ?? null,
    lastMessage: "",
    lastMessageAt: now,
    createdAt: now,
  });
  return ref.id;
}

export async function getConversations(uid: string): Promise<Conversation[]> {
  const snap = await getDocs(
    query(convCol(), where("participants", "array-contains", uid), orderBy("lastMessageAt", "desc"))
  );
  return snap.docs.map(d => ({ ...d.data(), id: d.id } as Conversation));
}

export async function sendMessage(
  conversationId: string,
  senderUid: string,
  text: string,
  attachments: string[] = []
): Promise<string> {
  const now = Timestamp.now();
  const ref = await addDoc(msgCol(conversationId), {
    conversationId,
    senderUid,
    text,
    attachments,
    readBy: [senderUid],
    createdAt: now,
  });
  await updateDoc(doc(db!, "conversations", conversationId), {
    lastMessage: text.slice(0, 100),
    lastMessageAt: now,
  });
  return ref.id;
}

export function getMessages(
  conversationId: string,
  callback: (messages: Message[]) => void,
  limitCount = 50
): Unsubscribe {
  return onSnapshot(
    query(msgCol(conversationId), orderBy("createdAt", "asc"), limit(limitCount)),
    snap => {
      callback(snap.docs.map(d => ({ ...d.data(), id: d.id } as Message)));
    }
  );
}

export async function markAsRead(conversationId: string, uid: string): Promise<void> {
  const snap = await getDocs(
    query(msgCol(conversationId), where("readBy", "not-in", [[uid]]))
  );
  // Simpler approach: get unread messages and update them
  const allSnap = await getDocs(query(msgCol(conversationId), orderBy("createdAt", "desc"), limit(50)));
  for (const d of allSnap.docs) {
    const data = d.data();
    if (!data.readBy?.includes(uid)) {
      await updateDoc(d.ref, { readBy: [...(data.readBy ?? []), uid] });
    }
  }
}

export async function blockUser(uid: string, blockedUid: string): Promise<void> {
  await setDoc(doc(db!, "users", uid, "blocked", blockedUid), { blockedAt: Timestamp.now() });
}
