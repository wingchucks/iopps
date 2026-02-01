// Messaging-related Firestore operations
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
  db,
  conversationsCollection,
  messagesCollection,
  checkFirebase,
} from "./shared";
import type { Conversation, Message } from "@/lib/types";

// Create or get existing conversation between employer and member
export async function getOrCreateConversation(params: {
  employerId: string;
  memberId: string;
  jobId?: string;
  applicationId?: string;
  employerName?: string;
  memberName?: string;
  memberEmail?: string;
  jobTitle?: string;
}): Promise<Conversation> {
  checkFirebase();

  const q = query(
    collection(db!, conversationsCollection),
    where("employerId", "==", params.employerId),
    where("memberId", "==", params.memberId),
    where("status", "==", "active")
  );

  const snapshot = await getDocs(q);

  if (!snapshot.empty) {
    const existingDoc = snapshot.docs[0];
    return { id: existingDoc.id, ...existingDoc.data() } as Conversation;
  }

  const conversationData: Omit<Conversation, "id"> = {
    employerId: params.employerId,
    memberId: params.memberId,
    jobId: params.jobId,
    applicationId: params.applicationId,
    employerName: params.employerName,
    memberName: params.memberName,
    memberEmail: params.memberEmail,
    jobTitle: params.jobTitle,
    employerUnreadCount: 0,
    memberUnreadCount: 0,
    status: "active",
    createdAt: serverTimestamp() as Timestamp,
    updatedAt: serverTimestamp() as Timestamp,
  };

  const docRef = await addDoc(collection(db!, conversationsCollection), conversationData);
  return { id: docRef.id, ...conversationData };
}

export async function getEmployerConversations(employerId: string): Promise<Conversation[]> {
  checkFirebase();

  const q = query(
    collection(db!, conversationsCollection),
    where("employerId", "==", employerId),
    where("status", "==", "active"),
    orderBy("lastMessageAt", "desc")
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Conversation));
}

export async function getMemberConversations(memberId: string): Promise<Conversation[]> {
  checkFirebase();

  const q = query(
    collection(db!, conversationsCollection),
    where("memberId", "==", memberId),
    where("status", "==", "active"),
    orderBy("lastMessageAt", "desc")
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Conversation));
}

export async function getConversation(conversationId: string): Promise<Conversation | null> {
  checkFirebase();

  const docRef = doc(db!, conversationsCollection, conversationId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) return null;
  return { id: docSnap.id, ...docSnap.data() } as Conversation;
}

export async function sendMessage(params: {
  conversationId: string;
  senderId: string;
  senderType: "employer" | "member";
  content: string;
}): Promise<Message> {
  checkFirebase();

  const messageData = {
    conversationId: params.conversationId,
    senderId: params.senderId,
    senderType: params.senderType,
    content: params.content,
    read: false,
    createdAt: serverTimestamp(),
  };

  const messageRef = await addDoc(collection(db!, messagesCollection), messageData);

  const conversationRef = doc(db!, conversationsCollection, params.conversationId);
  const unreadField = params.senderType === "employer" ? "memberUnreadCount" : "employerUnreadCount";

  await updateDoc(conversationRef, {
    lastMessage: params.content.slice(0, 100),
    lastMessageAt: serverTimestamp(),
    lastMessageBy: params.senderId,
    [unreadField]: increment(1),
    updatedAt: serverTimestamp(),
  });

  return { id: messageRef.id, ...messageData } as Message;
}

export async function getConversationMessages(
  conversationId: string,
  limitCount: number = 50
): Promise<Message[]> {
  checkFirebase();

  const q = query(
    collection(db!, messagesCollection),
    where("conversationId", "==", conversationId),
    orderBy("createdAt", "asc")
  );

  const snapshot = await getDocs(q);
  const messages = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Message));

  return messages.slice(-limitCount);
}

export async function markMessagesAsRead(
  conversationId: string,
  userId: string,
  userType: "employer" | "member"
): Promise<void> {
  checkFirebase();

  const q = query(
    collection(db!, messagesCollection),
    where("conversationId", "==", conversationId),
    where("senderId", "!=", userId),
    where("read", "==", false)
  );

  const snapshot = await getDocs(q);

  const updates = snapshot.docs.map((msgDoc) =>
    updateDoc(doc(db!, messagesCollection, msgDoc.id), { read: true })
  );

  await Promise.all(updates);

  const conversationRef = doc(db!, conversationsCollection, conversationId);
  const unreadField = userType === "employer" ? "employerUnreadCount" : "memberUnreadCount";

  await updateDoc(conversationRef, {
    [unreadField]: 0,
  });
}

export async function getUnreadMessageCount(
  userId: string,
  userType: "employer" | "member"
): Promise<number> {
  checkFirebase();

  const userField = userType === "employer" ? "employerId" : "memberId";
  const countField = userType === "employer" ? "employerUnreadCount" : "memberUnreadCount";

  const q = query(
    collection(db!, conversationsCollection),
    where(userField, "==", userId),
    where("status", "==", "active")
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.reduce((total, doc) => {
    const data = doc.data();
    return total + (data[countField] || 0);
  }, 0);
}

export async function archiveConversation(conversationId: string): Promise<void> {
  checkFirebase();

  const conversationRef = doc(db!, conversationsCollection, conversationId);
  await updateDoc(conversationRef, {
    status: "archived",
    updatedAt: serverTimestamp(),
  });
}
export function getUnreadMessagesQuery(userId: string, userType: "employer" | "member") {
  const userField = userType === "employer" ? "employerId" : "memberId";
  return query(
    collection(db!, conversationsCollection),
    where(userField, "==", userId),
    where("status", "==", "active")
  );
}

// ============================================
// PEER-TO-PEER MESSAGING
// ============================================

export interface PeerConversation {
  id: string;
  type: "peer";
  participant1Id: string;
  participant1Name?: string;
  participant1Avatar?: string;
  participant2Id: string;
  participant2Name?: string;
  participant2Avatar?: string;
  participant1UnreadCount: number;
  participant2UnreadCount: number;
  lastMessage?: string;
  lastMessageAt?: Timestamp;
  lastMessageBy?: string;
  status: "active" | "archived" | "blocked";
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Get or create a peer-to-peer conversation between two members
 */
export async function getOrCreatePeerConversation(params: {
  userId1: string;
  userId2: string;
  user1Name?: string;
  user1Avatar?: string;
  user2Name?: string;
  user2Avatar?: string;
}): Promise<PeerConversation> {
  checkFirebase();

  // Sort IDs to ensure consistent lookup regardless of who initiates
  const [participant1Id, participant2Id] = [params.userId1, params.userId2].sort();

  // Check for existing conversation
  const q = query(
    collection(db!, conversationsCollection),
    where("type", "==", "peer"),
    where("participant1Id", "==", participant1Id),
    where("participant2Id", "==", participant2Id),
    where("status", "==", "active")
  );

  const snapshot = await getDocs(q);

  if (!snapshot.empty) {
    const existingDoc = snapshot.docs[0];
    return { id: existingDoc.id, ...existingDoc.data() } as PeerConversation;
  }

  // Determine which user info goes where based on sorted order
  const user1IsFirst = params.userId1 === participant1Id;

  // Build conversation data, excluding undefined values (Firestore doesn't accept undefined)
  const conversationData: Record<string, unknown> = {
    type: "peer",
    participant1Id,
    participant2Id,
    participant1UnreadCount: 0,
    participant2UnreadCount: 0,
    status: "active",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  // Only add optional fields if they have values
  const p1Name = user1IsFirst ? params.user1Name : params.user2Name;
  const p1Avatar = user1IsFirst ? params.user1Avatar : params.user2Avatar;
  const p2Name = user1IsFirst ? params.user2Name : params.user1Name;
  const p2Avatar = user1IsFirst ? params.user2Avatar : params.user1Avatar;

  if (p1Name) conversationData.participant1Name = p1Name;
  if (p1Avatar) conversationData.participant1Avatar = p1Avatar;
  if (p2Name) conversationData.participant2Name = p2Name;
  if (p2Avatar) conversationData.participant2Avatar = p2Avatar;

  const docRef = await addDoc(collection(db!, conversationsCollection), conversationData);
  return { id: docRef.id, ...conversationData };
}

/**
 * Get all peer conversations for a user
 */
export async function getPeerConversations(userId: string): Promise<PeerConversation[]> {
  checkFirebase();

  // Query for conversations where user is participant1
  const q1 = query(
    collection(db!, conversationsCollection),
    where("type", "==", "peer"),
    where("participant1Id", "==", userId),
    where("status", "==", "active")
  );

  // Query for conversations where user is participant2
  const q2 = query(
    collection(db!, conversationsCollection),
    where("type", "==", "peer"),
    where("participant2Id", "==", userId),
    where("status", "==", "active")
  );

  const [snapshot1, snapshot2] = await Promise.all([getDocs(q1), getDocs(q2)]);

  const conversations = [
    ...snapshot1.docs.map((doc) => ({ id: doc.id, ...doc.data() } as PeerConversation)),
    ...snapshot2.docs.map((doc) => ({ id: doc.id, ...doc.data() } as PeerConversation)),
  ];

  // Sort by last message time
  return conversations.sort((a, b) => {
    const timeA = a.lastMessageAt?.toMillis() || 0;
    const timeB = b.lastMessageAt?.toMillis() || 0;
    return timeB - timeA;
  });
}

/**
 * Send a message in a peer conversation
 */
export async function sendPeerMessage(params: {
  conversationId: string;
  senderId: string;
  content: string;
}): Promise<Message> {
  checkFirebase();

  // Get conversation to determine which participant is sending
  const conversationRef = doc(db!, conversationsCollection, params.conversationId);
  const conversationSnap = await getDoc(conversationRef);

  if (!conversationSnap.exists()) {
    throw new Error("Conversation not found");
  }

  const conversation = conversationSnap.data() as PeerConversation;
  const isParticipant1 = conversation.participant1Id === params.senderId;

  const messageData = {
    conversationId: params.conversationId,
    senderId: params.senderId,
    senderType: "member" as const,
    content: params.content,
    read: false,
    createdAt: serverTimestamp(),
  };

  const messageRef = await addDoc(collection(db!, messagesCollection), messageData);

  // Update the other participant's unread count
  const unreadField = isParticipant1 ? "participant2UnreadCount" : "participant1UnreadCount";

  await updateDoc(conversationRef, {
    lastMessage: params.content.slice(0, 100),
    lastMessageAt: serverTimestamp(),
    lastMessageBy: params.senderId,
    [unreadField]: increment(1),
    updatedAt: serverTimestamp(),
  });

  return { id: messageRef.id, ...messageData } as Message;
}

/**
 * Mark peer messages as read
 */
export async function markPeerMessagesAsRead(
  conversationId: string,
  userId: string
): Promise<void> {
  checkFirebase();

  // Get conversation to determine which participant is reading
  const conversationRef = doc(db!, conversationsCollection, conversationId);
  const conversationSnap = await getDoc(conversationRef);

  if (!conversationSnap.exists()) return;

  const conversation = conversationSnap.data() as PeerConversation;
  const isParticipant1 = conversation.participant1Id === userId;

  // Mark messages as read
  const q = query(
    collection(db!, messagesCollection),
    where("conversationId", "==", conversationId),
    where("senderId", "!=", userId),
    where("read", "==", false)
  );

  const snapshot = await getDocs(q);

  const updates = snapshot.docs.map((msgDoc) =>
    updateDoc(doc(db!, messagesCollection, msgDoc.id), { read: true })
  );

  await Promise.all(updates);

  // Reset unread count
  const unreadField = isParticipant1 ? "participant1UnreadCount" : "participant2UnreadCount";

  await updateDoc(conversationRef, {
    [unreadField]: 0,
  });
}

/**
 * Get unread peer message count for a user
 */
export async function getUnreadPeerMessageCount(userId: string): Promise<number> {
  checkFirebase();

  const conversations = await getPeerConversations(userId);

  return conversations.reduce((total, conv) => {
    const isParticipant1 = conv.participant1Id === userId;
    const unreadCount = isParticipant1
      ? conv.participant1UnreadCount
      : conv.participant2UnreadCount;
    return total + (unreadCount || 0);
  }, 0);
}

/**
 * Get the other participant's info from a peer conversation
 */
export function getOtherParticipant(conversation: PeerConversation, currentUserId: string) {
  const isParticipant1 = conversation.participant1Id === currentUserId;
  return {
    id: isParticipant1 ? conversation.participant2Id : conversation.participant1Id,
    name: isParticipant1 ? conversation.participant2Name : conversation.participant1Name,
    avatar: isParticipant1 ? conversation.participant2Avatar : conversation.participant1Avatar,
  };
}
