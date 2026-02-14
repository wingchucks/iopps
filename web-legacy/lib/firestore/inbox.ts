// Unified Inbox Firestore operations
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  updateDoc,
  serverTimestamp,
  limit,
  checkFirebase,
  conversationsCollection,
  studentInquiriesCollection,
} from "./shared";
import type { UnifiedInboxItem, InboxItemType, Conversation, StudentInquiry } from "@/lib/types";

/**
 * Get unified inbox items for an organization
 * Aggregates messages, student inquiries, and shop inquiries
 */
export async function getUnifiedInbox(
  userId: string,
  filter?: InboxItemType,
  maxItems: number = 50
): Promise<UnifiedInboxItem[]> {
  const firestore = checkFirebase();
  if (!firestore) return [];

  const items: UnifiedInboxItem[] = [];

  try {
    // Get conversations (candidate messages)
    if (!filter || filter === 'candidate_message') {
      const conversationsQuery = query(
        collection(firestore, conversationsCollection),
        where("employerId", "==", userId),
        orderBy("lastMessageAt", "desc"),
        limit(maxItems)
      );

      const conversationsSnap = await getDocs(conversationsQuery);

      for (const docSnap of conversationsSnap.docs) {
        const conv = docSnap.data() as Conversation;
        items.push({
          id: `conv_${docSnap.id}`,
          type: 'candidate_message',
          sourceId: docSnap.id,
          senderName: conv.memberName || 'Unknown',
          senderEmail: conv.memberEmail,
          preview: conv.lastMessage || 'No messages yet',
          isRead: conv.employerUnreadCount === 0,
          status: conv.status === 'archived' ? 'archived' : (conv.employerUnreadCount > 0 ? 'new' : 'read'),
          relatedEntity: conv.jobId ? {
            type: 'job',
            id: conv.jobId,
            title: conv.jobTitle || 'Job Application',
          } : undefined,
          createdAt: conv.createdAt || null,
          lastActivityAt: conv.lastMessageAt || null,
        });
      }
    }

    // Get student inquiries
    if (!filter || filter === 'student_inquiry') {
      const studentInquiriesQuery = query(
        collection(firestore, studentInquiriesCollection),
        where("schoolId", "==", userId),
        orderBy("createdAt", "desc"),
        limit(maxItems)
      );

      try {
        const inquiriesSnap = await getDocs(studentInquiriesQuery);

        for (const docSnap of inquiriesSnap.docs) {
          const inquiry = docSnap.data() as StudentInquiry;
          items.push({
            id: `student_${docSnap.id}`,
            type: 'student_inquiry',
            sourceId: docSnap.id,
            senderName: inquiry.studentName || inquiry.memberName || 'Unknown Student',
            senderEmail: inquiry.studentEmail || inquiry.memberEmail,
            subject: inquiry.subject,
            preview: inquiry.message?.substring(0, 100) || 'No message',
            isRead: inquiry.status !== 'new',
            status: inquiry.status as 'new' | 'read' | 'replied' | 'archived',
            relatedEntity: inquiry.programId ? {
              type: 'program',
              id: inquiry.programId,
              title: 'Program Inquiry',
            } : undefined,
            createdAt: inquiry.createdAt || null,
            lastActivityAt: inquiry.updatedAt || inquiry.createdAt || null,
          });
        }
      } catch {
        // Collection may not exist or have different index
        // Collection may not exist or have different index
      }
    }

    // Get shop/vendor inquiries (customer inquiries)
    // These might be stored in a vendor_inquiries collection or similar
    if (!filter || filter === 'customer_inquiry') {
      // Check for vendor inquiries - they might be in conversations with a different context
      // or in a dedicated collection. For now, we'll use conversations without a jobId
      // as potential customer inquiries if the org has a vendor profile
      const vendorConversationsQuery = query(
        collection(firestore, conversationsCollection),
        where("employerId", "==", userId),
        orderBy("lastMessageAt", "desc"),
        limit(maxItems)
      );

      const vendorConvSnap = await getDocs(vendorConversationsQuery);

      for (const docSnap of vendorConvSnap.docs) {
        const conv = docSnap.data() as Conversation;
        // If there's no jobId, this could be a general inquiry (customer inquiry)
        if (!conv.jobId && !conv.applicationId) {
          // Avoid duplicates - check if we already added this
          const existingId = `conv_${docSnap.id}`;
          if (!items.some(item => item.id === existingId)) {
            items.push({
              id: `customer_${docSnap.id}`,
              type: 'customer_inquiry',
              sourceId: docSnap.id,
              senderName: conv.memberName || 'Customer',
              senderEmail: conv.memberEmail,
              preview: conv.lastMessage || 'No messages yet',
              isRead: conv.employerUnreadCount === 0,
              status: conv.status === 'archived' ? 'archived' : (conv.employerUnreadCount > 0 ? 'new' : 'read'),
              createdAt: conv.createdAt || null,
              lastActivityAt: conv.lastMessageAt || null,
            });
          }
        }
      }
    }

    // Sort all items by lastActivityAt or createdAt
    items.sort((a, b) => {
      const aTime = a.lastActivityAt || a.createdAt;
      const bTime = b.lastActivityAt || b.createdAt;
      if (!aTime && !bTime) return 0;
      if (!aTime) return 1;
      if (!bTime) return -1;
      const aDate = aTime instanceof Date ? aTime : aTime.toDate();
      const bDate = bTime instanceof Date ? bTime : bTime.toDate();
      return bDate.getTime() - aDate.getTime();
    });

    return items.slice(0, maxItems);
  } catch (error) {
    console.error("Error getting unified inbox:", error);
    return [];
  }
}

/**
 * Get total unread count across all inbox item types
 */
export async function getUnifiedUnreadCount(userId: string): Promise<number> {
  const firestore = checkFirebase();
  if (!firestore) return 0;

  let count = 0;

  try {
    // Count unread conversations
    const conversationsQuery = query(
      collection(firestore, conversationsCollection),
      where("employerId", "==", userId),
      where("employerUnreadCount", ">", 0)
    );
    const conversationsSnap = await getDocs(conversationsQuery);
    count += conversationsSnap.size;

    // Count new student inquiries
    try {
      const studentInquiriesQuery = query(
        collection(firestore, studentInquiriesCollection),
        where("schoolId", "==", userId),
        where("status", "==", "new")
      );
      const inquiriesSnap = await getDocs(studentInquiriesQuery);
      count += inquiriesSnap.size;
    } catch {
      // Collection may not exist
    }

    return count;
  } catch (error) {
    console.error("Error getting unified unread count:", error);
    return 0;
  }
}

/**
 * Mark an inbox item as read
 */
export async function markInboxItemRead(
  itemId: string,
  type: InboxItemType
): Promise<void> {
  const firestore = checkFirebase();
  if (!firestore) return;

  try {
    // Extract the actual document ID from our prefixed ID
    const docId = itemId.replace(/^(conv_|student_|customer_)/, '');

    if (type === 'candidate_message' || type === 'customer_inquiry') {
      const ref = doc(firestore, conversationsCollection, docId);
      await updateDoc(ref, {
        employerUnreadCount: 0,
        updatedAt: serverTimestamp(),
      });
    } else if (type === 'student_inquiry') {
      const ref = doc(firestore, studentInquiriesCollection, docId);
      await updateDoc(ref, {
        status: 'read',
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    console.error("Error marking inbox item as read:", error);
    throw error;
  }
}

/**
 * Archive an inbox item
 */
export async function archiveInboxItem(
  itemId: string,
  type: InboxItemType
): Promise<void> {
  const firestore = checkFirebase();
  if (!firestore) return;

  try {
    const docId = itemId.replace(/^(conv_|student_|customer_)/, '');

    if (type === 'candidate_message' || type === 'customer_inquiry') {
      const ref = doc(firestore, conversationsCollection, docId);
      await updateDoc(ref, {
        status: 'archived',
        updatedAt: serverTimestamp(),
      });
    } else if (type === 'student_inquiry') {
      const ref = doc(firestore, studentInquiriesCollection, docId);
      await updateDoc(ref, {
        status: 'archived',
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    console.error("Error archiving inbox item:", error);
    throw error;
  }
}

/**
 * Get inbox item counts by type
 */
export async function getInboxCounts(userId: string): Promise<Record<InboxItemType | 'all', number>> {
  const firestore = checkFirebase();
  if (!firestore) {
    return { all: 0, candidate_message: 0, customer_inquiry: 0, student_inquiry: 0, system: 0 };
  }

  const counts: Record<InboxItemType | 'all', number> = {
    all: 0,
    candidate_message: 0,
    customer_inquiry: 0,
    student_inquiry: 0,
    system: 0,
  };

  try {
    // Count conversations with job context (candidate messages)
    const candidateQuery = query(
      collection(firestore, conversationsCollection),
      where("employerId", "==", userId)
    );
    const candidateSnap = await getDocs(candidateQuery);

    for (const docSnap of candidateSnap.docs) {
      const conv = docSnap.data() as Conversation;
      if (conv.jobId || conv.applicationId) {
        counts.candidate_message++;
      } else {
        counts.customer_inquiry++;
      }
    }

    // Count student inquiries
    try {
      const studentQuery = query(
        collection(firestore, studentInquiriesCollection),
        where("schoolId", "==", userId)
      );
      const studentSnap = await getDocs(studentQuery);
      counts.student_inquiry = studentSnap.size;
    } catch {
      // Collection may not exist
    }

    counts.all = counts.candidate_message + counts.customer_inquiry + counts.student_inquiry + counts.system;

    return counts;
  } catch (error) {
    console.error("Error getting inbox counts:", error);
    return counts;
  }
}
