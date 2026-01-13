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
