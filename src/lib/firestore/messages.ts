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
  onSnapshot,
  type QueryConstraint,
} from "firebase/firestore";
import { db } from "../firebase";
import { queueEmail } from "./emailQueue";
import { newMessageEmail } from "../email-templates";

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

  // Queue email notification for the recipient
  try {
    const [recipientSnap, senderSnap] = await Promise.all([
      getDoc(doc(db, "members", recipientId)),
      getDoc(doc(db, "members", senderId)),
    ]);
    if (recipientSnap.exists()) {
      const recipient = recipientSnap.data();
      const recipientEmail = recipient.email as string | undefined;
      const recipientName = (recipient.displayName || recipient.name || "Member") as string;
      const senderName = senderSnap.exists()
        ? ((senderSnap.data().displayName || senderSnap.data().name || "Someone") as string)
        : "Someone";

      // Only queue if recipient has an email on file
      if (recipientEmail) {
        const html = newMessageEmail(recipientName, senderName);
        await queueEmail(recipientEmail, `New message from ${senderName}`, html);
      }
    }
  } catch (err) {
    console.error("Failed to queue message notification email:", err);
  }
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

// --- Real-time listeners (return unsubscribe functions) ---

// Listen to conversations for a user in real time
export function onConversations(
  userId: string,
  callback: (convs: Conversation[]) => void
): () => void {
  const q = query(
    convCol,
    where("participants", "array-contains", userId),
    orderBy("lastMessageAt", "desc")
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Conversation));
  });
}

// Listen to messages in a conversation in real time
export function onMessages(
  conversationId: string,
  callback: (msgs: Message[]) => void
): () => void {
  const q = query(
    msgCol,
    where("conversationId", "==", conversationId),
    orderBy("createdAt", "asc"),
    limit(50)
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Message));
  });
}

// Listen to unread conversation count in real time
export function onUnreadCount(
  userId: string,
  callback: (count: number) => void
): () => void {
  const q = query(convCol, where("unreadBy", "==", userId));
  return onSnapshot(q, (snap) => {
    callback(snap.size);
  });
}
