import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  increment,
  Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import type {
  JobPosting,
  SavedJob,
  JobAlert,
  JobApplication,
  Conference,
  Scholarship,
  VendorProfile,
  PowwowEvent,
  LiveStreamEvent,
  Conversation,
  Message,
  Notification,
  UserProfile,
} from "../types";

// ============ SAVED JOBS ============

export async function listSavedJobs(memberId: string): Promise<SavedJob[]> {
  const q = query(
    collection(db, "savedJobs"),
    where("memberId", "==", memberId),
    orderBy("createdAt", "desc")
  );
  const snapshot = await getDocs(q);
  const savedJobs: SavedJob[] = [];

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    const savedJob: SavedJob = {
      id: docSnap.id,
      jobId: data.jobId,
      memberId: data.memberId,
      createdAt: data.createdAt,
    };

    // Fetch the job details
    try {
      const jobDoc = await getDoc(doc(db, "jobs", data.jobId));
      if (jobDoc.exists()) {
        savedJob.job = { id: jobDoc.id, ...jobDoc.data() } as JobPosting;
      }
    } catch (err) {
      console.error("Error fetching job for saved job:", err);
    }

    savedJobs.push(savedJob);
  }

  return savedJobs;
}

export async function saveJob(memberId: string, jobId: string): Promise<string> {
  const docRef = await addDoc(collection(db, "savedJobs"), {
    memberId,
    jobId,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function unsaveJob(memberId: string, jobId: string): Promise<void> {
  const q = query(
    collection(db, "savedJobs"),
    where("memberId", "==", memberId),
    where("jobId", "==", jobId)
  );
  const snapshot = await getDocs(q);
  for (const docSnap of snapshot.docs) {
    await deleteDoc(doc(db, "savedJobs", docSnap.id));
  }
}

export async function isJobSaved(memberId: string, jobId: string): Promise<boolean> {
  const q = query(
    collection(db, "savedJobs"),
    where("memberId", "==", memberId),
    where("jobId", "==", jobId)
  );
  const snapshot = await getDocs(q);
  return !snapshot.empty;
}

// ============ JOB ALERTS ============

export async function getMemberJobAlerts(memberId: string): Promise<JobAlert[]> {
  const q = query(
    collection(db, "jobAlerts"),
    where("memberId", "==", memberId),
    orderBy("createdAt", "desc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  })) as JobAlert[];
}

export async function createJobAlert(alert: Omit<JobAlert, "id">): Promise<string> {
  const docRef = await addDoc(collection(db, "jobAlerts"), {
    ...alert,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function updateJobAlert(
  id: string,
  updates: Partial<JobAlert>
): Promise<void> {
  await updateDoc(doc(db, "jobAlerts", id), {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteJobAlert(id: string): Promise<void> {
  await deleteDoc(doc(db, "jobAlerts", id));
}

// ============ JOB APPLICATIONS ============

export async function getMemberApplications(
  memberId: string
): Promise<JobApplication[]> {
  const q = query(
    collection(db, "applications"),
    where("memberId", "==", memberId),
    orderBy("createdAt", "desc")
  );
  const snapshot = await getDocs(q);
  const applications: JobApplication[] = [];

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    const application: JobApplication = {
      id: docSnap.id,
      jobId: data.jobId,
      employerId: data.employerId,
      memberId: data.memberId,
      memberEmail: data.memberEmail,
      memberDisplayName: data.memberDisplayName,
      status: data.status,
      resumeUrl: data.resumeUrl,
      coverLetter: data.coverLetter,
      note: data.note,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };

    // Fetch job details for display
    try {
      const jobDoc = await getDoc(doc(db, "jobs", data.jobId));
      if (jobDoc.exists()) {
        const jobData = jobDoc.data();
        application.jobTitle = jobData.title;
        application.jobEmployerName = jobData.employerName;
        application.jobLocation = jobData.location;
      }
    } catch (err) {
      console.error("Error fetching job for application:", err);
    }

    applications.push(application);
  }

  return applications;
}

// ============ CONFERENCES ============

export async function listConferences(limitCount = 50): Promise<Conference[]> {
  const q = query(
    collection(db, "conferences"),
    where("active", "==", true),
    orderBy("startDate", "asc"),
    limit(limitCount)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  })) as Conference[];
}

export async function getConference(id: string): Promise<Conference | null> {
  const docSnap = await getDoc(doc(db, "conferences", id));
  if (!docSnap.exists()) return null;
  return { id: docSnap.id, ...docSnap.data() } as Conference;
}

// ============ SCHOLARSHIPS ============

export async function listScholarships(limitCount = 50): Promise<Scholarship[]> {
  const q = query(
    collection(db, "scholarships"),
    where("active", "==", true),
    orderBy("createdAt", "desc"),
    limit(limitCount)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  })) as Scholarship[];
}

export async function getScholarship(id: string): Promise<Scholarship | null> {
  const docSnap = await getDoc(doc(db, "scholarships", id));
  if (!docSnap.exists()) return null;
  return { id: docSnap.id, ...docSnap.data() } as Scholarship;
}

// ============ VENDORS / SHOP ============

export async function listVendors(limitCount = 50): Promise<VendorProfile[]> {
  const q = query(
    collection(db, "vendors"),
    where("active", "==", true),
    orderBy("createdAt", "desc"),
    limit(limitCount)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  })) as VendorProfile[];
}

export async function getVendor(id: string): Promise<VendorProfile | null> {
  const docSnap = await getDoc(doc(db, "vendors", id));
  if (!docSnap.exists()) return null;
  return { id: docSnap.id, ...docSnap.data() } as VendorProfile;
}

// ============ POW WOWS ============

export async function listPowwows(limitCount = 50): Promise<PowwowEvent[]> {
  const q = query(
    collection(db, "powwows"),
    where("active", "==", true),
    orderBy("startDate", "asc"),
    limit(limitCount)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  })) as PowwowEvent[];
}

export async function getPowwow(id: string): Promise<PowwowEvent | null> {
  const docSnap = await getDoc(doc(db, "powwows", id));
  if (!docSnap.exists()) return null;
  return { id: docSnap.id, ...docSnap.data() } as PowwowEvent;
}

// ============ LIVE STREAMS ============

export async function listLiveStreams(limitCount = 50): Promise<LiveStreamEvent[]> {
  const q = query(
    collection(db, "liveStreams"),
    where("active", "==", true),
    orderBy("createdAt", "desc"),
    limit(limitCount)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  })) as LiveStreamEvent[];
}

// ============ MESSAGING ============

export async function getMemberConversations(
  memberId: string
): Promise<Conversation[]> {
  const q = query(
    collection(db, "conversations"),
    where("memberId", "==", memberId),
    where("status", "==", "active"),
    orderBy("lastMessageAt", "desc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  })) as Conversation[];
}

export async function getConversationMessages(
  conversationId: string,
  limitCount = 50
): Promise<Message[]> {
  const q = query(
    collection(db, "conversations", conversationId, "messages"),
    orderBy("createdAt", "asc"),
    limit(limitCount)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  })) as Message[];
}

export async function sendMessage(
  conversationId: string,
  senderId: string,
  content: string
): Promise<string> {
  // Add message to subcollection
  const msgRef = await addDoc(
    collection(db, "conversations", conversationId, "messages"),
    {
      conversationId,
      senderId,
      senderType: "member",
      content,
      read: false,
      createdAt: serverTimestamp(),
    }
  );

  // Update conversation
  await updateDoc(doc(db, "conversations", conversationId), {
    lastMessage: content.substring(0, 100),
    lastMessageAt: serverTimestamp(),
    lastMessageBy: senderId,
    employerUnreadCount: increment(1),
    updatedAt: serverTimestamp(),
  });

  return msgRef.id;
}

export async function markConversationAsRead(
  conversationId: string,
  userType: "member" | "employer"
): Promise<void> {
  const field =
    userType === "member" ? "memberUnreadCount" : "employerUnreadCount";
  await updateDoc(doc(db, "conversations", conversationId), {
    [field]: 0,
  });
}

// ============ NOTIFICATIONS ============

export async function getMemberNotifications(
  userId: string,
  limitCount = 50
): Promise<Notification[]> {
  const q = query(
    collection(db, "notifications"),
    where("userId", "==", userId),
    orderBy("createdAt", "desc"),
    limit(limitCount)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  })) as Notification[];
}

export async function markNotificationAsRead(id: string): Promise<void> {
  await updateDoc(doc(db, "notifications", id), {
    read: true,
  });
}

export async function markAllNotificationsAsRead(userId: string): Promise<void> {
  const q = query(
    collection(db, "notifications"),
    where("userId", "==", userId),
    where("read", "==", false)
  );
  const snapshot = await getDocs(q);
  const updates = snapshot.docs.map((docSnap) =>
    updateDoc(doc(db, "notifications", docSnap.id), { read: true })
  );
  await Promise.all(updates);
}

export async function getUnreadNotificationCount(userId: string): Promise<number> {
  const q = query(
    collection(db, "notifications"),
    where("userId", "==", userId),
    where("read", "==", false)
  );
  const snapshot = await getDocs(q);
  return snapshot.size;
}

// ============ HELPERS ============

export function formatTimestamp(timestamp: any): string {
  if (!timestamp) return "";
  const date =
    timestamp instanceof Timestamp ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(timestamp: any): string {
  if (!timestamp) return "";
  const date =
    timestamp instanceof Timestamp ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ============ USER PROFILE ============

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const docSnap = await getDoc(doc(db, "users", userId));
  if (!docSnap.exists()) return null;
  return { uid: docSnap.id, ...docSnap.data() } as UserProfile;
}

export async function updateUserProfile(
  userId: string,
  updates: Partial<Omit<UserProfile, "uid" | "email" | "role" | "createdAt">>
): Promise<void> {
  await updateDoc(doc(db, "users", userId), {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

export async function createUserProfile(
  userId: string,
  email: string,
  displayName?: string
): Promise<void> {
  const { setDoc } = await import("firebase/firestore");
  await setDoc(doc(db, "users", userId), {
    email,
    displayName: displayName || "",
    role: "user",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}
