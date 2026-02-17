import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  type QueryConstraint,
} from "firebase/firestore";
import { db } from "../firebase";

export interface Conversation {
  id: string;
  participants: string[]; // [uid1, uid2]
  lastMessage: string;
  lastMessageAt: unknown;
  lastSenderId: string;
  unreadBy?: string; // uid of user who hasn't read the latest message
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  createdAt: unknown;
}

const convCol = collection(db, "conversations");
const msgCol = collection(db, "messages");

// Get all conversations for a user
export async function getConversations(userId: string): Promise<Conversation[]> {
  const snap = await getDocs(
    query(
      convCol,
      where("participants", "array-contains", userId),
      orderBy("lastMessageAt", "desc")
    )
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Conversation);
}

// Get or create a conversation between two users
export async function getOrCreateConversation(
  uid1: string,
  uid2: string
): Promise<string> {
  // Deterministic ID: sorted uids
  const sorted = [uid1, uid2].sort();
  const convId = `${sorted[0]}_${sorted[1]}`;

  const snap = await getDoc(doc(db, "conversations", convId));
  if (snap.exists()) return convId;

  await setDoc(doc(db, "conversations", convId), {
    participants: sorted,
    lastMessage: "",
    lastMessageAt: serverTimestamp(),
    lastSenderId: "",
    unreadBy: "",
  });
  return convId;
}

// Get messages in a conversation
export async function getMessages(
  conversationId: string,
  max = 50
): Promise<Message[]> {
  const constraints: QueryConstraint[] = [
    where("conversationId", "==", conversationId),
    orderBy("createdAt", "asc"),
    limit(max),
  ];
  const snap = await getDocs(query(msgCol, ...constraints));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Message);
}

// Send a message
export async function sendMessage(
  conversationId: string,
  senderId: string,
  text: string,
  recipientId: string
): Promise<void> {
  const msgId = `${conversationId}_${Date.now()}`;
  await setDoc(doc(db, "messages", msgId), {
    conversationId,
    senderId,
    text,
    createdAt: serverTimestamp(),
  });
  // Update conversation metadata
  await updateDoc(doc(db, "conversations", conversationId), {
    lastMessage: text.length > 80 ? text.slice(0, 80) + "\u2026" : text,
    lastMessageAt: serverTimestamp(),
    lastSenderId: senderId,
    unreadBy: recipientId,
  });
}

// Mark conversation as read
export async function markConversationRead(
  conversationId: string
): Promise<void> {
  await updateDoc(doc(db, "conversations", conversationId), {
    unreadBy: "",
  });
}

// Count unread conversations for a user
export async function getUnreadConversationCount(
  userId: string
): Promise<number> {
  const snap = await getDocs(
    query(convCol, where("unreadBy", "==", userId))
  );
  return snap.size;
}
