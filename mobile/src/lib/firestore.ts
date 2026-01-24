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
import { apiLogger } from "./logger";
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
  ScheduledInterview,
  ScheduledInterviewStatus,
  TalentSearchFilters,
  TalentSearchResult,
  SavedTalent,
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
      apiLogger.error("Error fetching job for saved job", err);
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
      apiLogger.error("Error fetching job for application", err);
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

// ============ EMPLOYER DASHBOARD ============

export async function getEmployerProfile(employerId: string): Promise<any | null> {
  const docSnap = await getDoc(doc(db, "employers", employerId));
  if (!docSnap.exists()) return null;
  return { id: docSnap.id, ...docSnap.data() };
}

export async function getEmployerJobs(employerId: string): Promise<JobPosting[]> {
  const q = query(
    collection(db, "jobs"),
    where("employerId", "==", employerId),
    orderBy("createdAt", "desc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  })) as JobPosting[];
}

export async function getEmployerApplications(employerId: string): Promise<JobApplication[]> {
  const q = query(
    collection(db, "applications"),
    where("employerId", "==", employerId),
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
      apiLogger.error("Error fetching job for employer application", err);
    }

    applications.push(application);
  }

  return applications;
}

export async function updateApplicationStatus(
  applicationId: string,
  status: JobApplication["status"],
  note?: string
): Promise<void> {
  const updates: any = {
    status,
    updatedAt: serverTimestamp(),
  };
  if (note !== undefined) {
    updates.note = note;
  }
  await updateDoc(doc(db, "applications", applicationId), updates);
}

export async function getEmployerConversations(
  employerId: string
): Promise<Conversation[]> {
  const q = query(
    collection(db, "conversations"),
    where("employerId", "==", employerId),
    where("status", "==", "active"),
    orderBy("lastMessageAt", "desc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  })) as Conversation[];
}

export async function getEmployerStats(employerId: string): Promise<{
  totalJobs: number;
  activeJobs: number;
  totalApplications: number;
  pendingApplications: number;
  unreadMessages: number;
}> {
  // Get jobs count
  const jobsQuery = query(
    collection(db, "jobs"),
    where("employerId", "==", employerId)
  );
  const jobsSnapshot = await getDocs(jobsQuery);
  const totalJobs = jobsSnapshot.size;
  const activeJobs = jobsSnapshot.docs.filter(d => d.data().active === true).length;

  // Get applications count
  const appsQuery = query(
    collection(db, "applications"),
    where("employerId", "==", employerId)
  );
  const appsSnapshot = await getDocs(appsQuery);
  const totalApplications = appsSnapshot.size;
  const pendingApplications = appsSnapshot.docs.filter(
    d => d.data().status === "submitted" || d.data().status === "reviewed"
  ).length;

  // Get unread messages
  const convQuery = query(
    collection(db, "conversations"),
    where("employerId", "==", employerId),
    where("status", "==", "active")
  );
  const convSnapshot = await getDocs(convQuery);
  const unreadMessages = convSnapshot.docs.reduce(
    (sum, d) => sum + (d.data().employerUnreadCount || 0),
    0
  );

  return {
    totalJobs,
    activeJobs,
    totalApplications,
    pendingApplications,
    unreadMessages,
  };
}

// ============ VENDOR DASHBOARD ============

export async function getVendorByUserId(userId: string): Promise<VendorProfile | null> {
  const q = query(
    collection(db, "vendors"),
    where("ownerUserId", "==", userId),
    limit(1)
  );
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  const docSnap = snapshot.docs[0];
  return { id: docSnap.id, ...docSnap.data() } as VendorProfile;
}

export async function updateVendorProfile(
  vendorId: string,
  updates: Partial<Omit<VendorProfile, "id" | "ownerUserId" | "createdAt">>
): Promise<void> {
  await updateDoc(doc(db, "vendors", vendorId), {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

export async function getVendorStats(vendorId: string): Promise<{
  viewCount: number;
  productsCount: number;
}> {
  const vendorDoc = await getDoc(doc(db, "vendors", vendorId));
  const viewCount = vendorDoc.exists() ? (vendorDoc.data().viewCount || 0) : 0;

  // Count products
  const productsQuery = query(
    collection(db, "vendors", vendorId, "products")
  );
  const productsSnapshot = await getDocs(productsQuery);
  const productsCount = productsSnapshot.size;

  return { viewCount, productsCount };
}

// ============ INTERVIEWS ============

export async function getEmployerInterviews(
  employerId: string
): Promise<ScheduledInterview[]> {
  const q = query(
    collection(db, "interviews"),
    where("employerId", "==", employerId),
    orderBy("scheduledAt", "desc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  })) as ScheduledInterview[];
}

export async function getCandidateInterviews(
  candidateId: string
): Promise<ScheduledInterview[]> {
  const q = query(
    collection(db, "interviews"),
    where("candidateId", "==", candidateId),
    orderBy("scheduledAt", "desc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  })) as ScheduledInterview[];
}

export async function getInterview(
  interviewId: string
): Promise<ScheduledInterview | null> {
  const docSnap = await getDoc(doc(db, "interviews", interviewId));
  if (!docSnap.exists()) return null;
  return { id: docSnap.id, ...docSnap.data() } as ScheduledInterview;
}

export async function updateInterviewStatus(
  interviewId: string,
  status: ScheduledInterviewStatus,
  cancelReason?: string
): Promise<void> {
  const updates: any = {
    status,
    updatedAt: serverTimestamp(),
  };
  if (cancelReason) {
    updates.cancelReason = cancelReason;
  }
  await updateDoc(doc(db, "interviews", interviewId), updates);
}

// ============ TALENT SEARCH ============

export async function searchTalent(
  filters: TalentSearchFilters,
  limitCount = 20
): Promise<TalentSearchResult[]> {
  // Build query for members who are open to opportunities
  const constraints: any[] = [
    where("profileComplete", "==", true),
    where("availableForInterviews", "in", ["yes", "maybe"]),
    orderBy("updatedAt", "desc"),
    limit(limitCount),
  ];

  // Skills filter (Firestore limitation: can only use array-contains-any)
  if (filters.skills && filters.skills.length > 0) {
    constraints.push(where("skills", "array-contains-any", filters.skills.slice(0, 10)));
  }

  const q = query(collection(db, "members"), ...constraints);
  const snapshot = await getDocs(q);

  let members = snapshot.docs.map((docSnap) => ({
    uid: docSnap.id,
    ...docSnap.data(),
  })) as UserProfile[];

  // Client-side filtering
  if (filters.query) {
    const searchLower = filters.query.toLowerCase();
    members = members.filter(
      (m) =>
        m.displayName?.toLowerCase().includes(searchLower) ||
        m.bio?.toLowerCase().includes(searchLower)
    );
  }

  if (filters.location) {
    const locationLower = filters.location.toLowerCase();
    members = members.filter((m) =>
      m.location?.toLowerCase().includes(locationLower)
    );
  }

  if (filters.hasResume) {
    members = members.filter((m) => m.resumeUrl && m.resumeUrl.length > 0);
  }

  // Calculate match scores
  const results: TalentSearchResult[] = members.map((member) => {
    const matchReasons: string[] = [];
    let matchScore = 50;

    if (filters.location && member.location?.toLowerCase().includes(filters.location.toLowerCase())) {
      matchScore += 15;
      matchReasons.push("Location match");
    }

    if (member.resumeUrl) {
      matchScore += 5;
    }

    matchScore = Math.min(100, matchScore);

    return { member, matchScore, matchReasons };
  });

  results.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));

  return results;
}

export async function saveTalent(
  employerId: string,
  memberId: string,
  memberName: string,
  memberAvatar?: string,
  notes?: string,
  tags?: string[]
): Promise<string> {
  const docRef = await addDoc(collection(db, "savedTalent"), {
    employerId,
    memberId,
    memberName,
    memberAvatar: memberAvatar || null,
    notes: notes || null,
    tags: tags || [],
    savedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function unsaveTalent(
  employerId: string,
  memberId: string
): Promise<void> {
  const q = query(
    collection(db, "savedTalent"),
    where("employerId", "==", employerId),
    where("memberId", "==", memberId)
  );
  const snapshot = await getDocs(q);
  for (const docSnap of snapshot.docs) {
    await deleteDoc(doc(db, "savedTalent", docSnap.id));
  }
}

export async function getSavedTalent(employerId: string): Promise<SavedTalent[]> {
  const q = query(
    collection(db, "savedTalent"),
    where("employerId", "==", employerId),
    orderBy("savedAt", "desc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  })) as SavedTalent[];
}

export async function isTalentSaved(
  employerId: string,
  memberId: string
): Promise<boolean> {
  const q = query(
    collection(db, "savedTalent"),
    where("employerId", "==", employerId),
    where("memberId", "==", memberId),
    limit(1)
  );
  const snapshot = await getDocs(q);
  return !snapshot.empty;
}
