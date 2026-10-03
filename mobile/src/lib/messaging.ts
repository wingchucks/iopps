import {
  collection,
  doc,
  getDocs,
  updateDoc,
  writeBatch,
  query,
  where,
  orderBy,
  limitToLast,
  onSnapshot,
  serverTimestamp,
  type DocumentData,
  type DocumentSnapshot,
  type FirestoreError,
  type Unsubscribe,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "./firebase";
import { API_BASE } from "./api";
import { notifyNewMessage, type MessageNotificationResult } from "./messageNotifications";
import type { Conversation, ConversationPeer, Message } from "../types";

// Private messaging uses the same records as the website (src/lib/firestore/messages.ts)
// under the participant-only rules in firestore.rules at the repository root.
// Conversations hold two participants and a preview; each message is its own
// document in the top-level messages collection. Starting conversations is retired.

// Keep aligned with validNewMessage/sendsOwnPreview in firestore.rules.
export const MESSAGE_TEXT_MAX = 5000;
export const MESSAGE_PAGE_SIZE = 50;
const PREVIEW_LENGTH = 80;
// The website shows this name until it can safely share a participant's identity.
export const UNKNOWN_PEER_NAME = "IOPPS member";

const text = (value: unknown) => (typeof value === "string" ? value : "");

function toConversation(id: string, data: DocumentData): Conversation {
  return {
    id,
    participants: Array.isArray(data.participants)
      ? data.participants.filter((participant: unknown): participant is string => typeof participant === "string")
      : [],
    lastMessage: text(data.lastMessage),
    lastMessageAt: data.lastMessageAt ?? null,
    lastSenderId: text(data.lastSenderId),
    unreadBy: text(data.unreadBy),
  };
}

function toMessage(snapshot: DocumentSnapshot): Message {
  // A just-sent message shows the device's estimate until the server time arrives.
  const data = snapshot.data({ serverTimestamps: "estimate" }) ?? {};
  return {
    id: snapshot.id,
    conversationId: text(data.conversationId),
    senderId: text(data.senderId),
    text: text(data.text),
    createdAt: data.createdAt ?? null,
  };
}

const conversationsFor = (userId: string) =>
  query(collection(db, "conversations"), where("participants", "array-contains", userId), orderBy("lastMessageAt", "desc"));

const unreadConversationsFor = (userId: string) =>
  query(collection(db, "conversations"), where("unreadBy", "==", userId), where("participants", "array-contains", userId));

// The member's conversations, newest first, kept up to date.
export function onConversations(
  userId: string,
  onChange: (conversations: Conversation[]) => void,
  onError: (error: FirestoreError) => void
): Unsubscribe {
  return onSnapshot(
    conversationsFor(userId),
    (snapshot) => onChange(snapshot.docs.map((d) => toConversation(d.id, d.data({ serverTimestamps: "estimate" })))),
    onError
  );
}

// One conversation the member takes part in. The rules deny missing and foreign
// conversations alike, so both arrive as a permission-denied error.
export function onConversation(
  conversationId: string,
  onChange: (conversation: Conversation | null) => void,
  onError: (error: FirestoreError) => void
): Unsubscribe {
  return onSnapshot(
    doc(db, "conversations", conversationId),
    (snapshot) => onChange(snapshot.exists() ? toConversation(snapshot.id, snapshot.data({ serverTimestamps: "estimate" })) : null),
    onError
  );
}

// The latest messages in a conversation, oldest first, kept up to date.
export function onMessages(
  conversationId: string,
  onChange: (messages: Message[]) => void,
  onError: (error: FirestoreError) => void
): Unsubscribe {
  return onSnapshot(
    query(
      collection(db, "messages"),
      where("conversationId", "==", conversationId),
      orderBy("createdAt", "asc"),
      limitToLast(MESSAGE_PAGE_SIZE)
    ),
    (snapshot) => onChange(snapshot.docs.map(toMessage)),
    onError
  );
}

// Conversations with a message the member has not read yet.
export function onUnreadConversationCount(
  userId: string,
  onChange: (count: number) => void,
  onError: (error: FirestoreError) => void
): Unsubscribe {
  return onSnapshot(unreadConversationsFor(userId), (snapshot) => onChange(snapshot.size), onError);
}

export async function getUnreadConversationCount(userId: string): Promise<number> {
  return (await getDocs(unreadConversationsFor(userId))).size;
}

// The rules accept 80 characters plus an ellipsis. Never cut an emoji in half.
export function messagePreview(message: string): string {
  if (message.length <= PREVIEW_LENGTH) return message;
  const lastUnit = message.charCodeAt(PREVIEW_LENGTH - 1);
  const end = lastUnit >= 0xd800 && lastUnit <= 0xdbff ? PREVIEW_LENGTH - 1 : PREVIEW_LENGTH;
  return message.slice(0, end) + "…";
}

// Saves the message and the conversation preview in one commit, then asks the
// website to email the recipient. A failed email never resends or undoes the message.
export async function sendMessage(
  conversationId: string,
  senderId: string,
  message: string,
  recipientId: string
): Promise<{ messageId: string; notification: Promise<MessageNotificationResult> }> {
  if (!message || message.length > MESSAGE_TEXT_MAX) throw new Error("Message must be 1 to 5,000 characters");
  // A random ID, so two members sending in the same millisecond never collide.
  const messageRef = doc(collection(db, "messages"));
  const messageId = messageRef.id;
  const batch = writeBatch(db);
  batch.set(messageRef, {
    conversationId,
    senderId,
    text: message,
    createdAt: serverTimestamp(),
  });
  batch.update(doc(db, "conversations", conversationId), {
    lastMessage: messagePreview(message),
    lastMessageAt: serverTimestamp(),
    lastSenderId: senderId,
    unreadBy: recipientId,
  });
  await batch.commit();

  const notification = notifyNewMessage(messageId, senderId, {
    endpoint: `${API_BASE}/api/messages/notify`,
    currentUser: () => auth.currentUser,
    subscribe: (listener) => onAuthStateChanged(auth, listener),
  }).catch((): MessageNotificationResult => ({ state: "failed" }));
  return { messageId, notification };
}

// Clears the member's own unread marker; the rules allow nothing else.
export async function markConversationRead(conversationId: string): Promise<void> {
  await updateDoc(doc(db, "conversations", conversationId), { unreadBy: "" });
}

// Participants never change, so each conversation's peer is looked up once.
const peers = new Map<string, Promise<ConversationPeer | null>>();

async function fetchConversationPeer(
  user: { getIdToken(): Promise<string> },
  conversationId: string
): Promise<ConversationPeer | null> {
  const response = await fetch(
    `${API_BASE}/api/messages/peer?conversationId=${encodeURIComponent(conversationId)}`,
    { headers: { Authorization: `Bearer ${await user.getIdToken()}` } }
  );
  if (!response.ok) throw new Error("Unable to load conversation participant");
  const peer = (await response.json())?.peer;
  if (!peer || typeof peer.uid !== "string" || typeof peer.displayName !== "string") return null;
  return typeof peer.photoURL === "string"
    ? { uid: peer.uid, displayName: peer.displayName, photoURL: peer.photoURL }
    : { uid: peer.uid, displayName: peer.displayName };
}

// The other participant's display identity, as the website chooses to share it.
// Resolves to null when it cannot be loaded; a later call tries again.
export function getConversationPeer(conversationId: string): Promise<ConversationPeer | null> {
  const user = auth.currentUser;
  if (!user) return Promise.resolve(null);
  const key = `${user.uid}/${conversationId}`;
  let peer = peers.get(key);
  if (!peer) {
    peer = fetchConversationPeer(user, conversationId).catch(() => {
      peers.delete(key);
      return null;
    });
    peers.set(key, peer);
  }
  return peer;
}
