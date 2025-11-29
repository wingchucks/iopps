import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import type {
  EmployerProfile,
  Interview,
  JobPosting,
  MemberProfile,
  JobApplication,
  ApplicationStatus,
  SavedJob,
  Conference,
  Scholarship,
  ScholarshipApplication,
  ShopListing,
  PowwowEvent,
  LiveStreamEvent,
  VendorProfile,
  PowwowRegistration,
  ProductServiceListing,
  ContactSubmission,
  PlatformSettings,
  RSSFeed,
  JobAlert,
  EmployerStatus,
  Conversation,
  Message,
  Notification,
  NotificationType,
} from "@/lib/types";

const employerCollection = "employers";
const memberCollection = "memberProfiles";
const jobsCollection = "jobs";
const applicationsCollection = "applications";
const savedJobsCollection = "savedJobs";
const jobAlertsCollection = "jobAlerts";
const conferencesCollection = "conferences";
const scholarshipsCollection = "scholarships";
const scholarshipApplicationsCollection = "scholarshipApplications";
const shopCollection = "shopListings";
const powwowsCollection = "powwows";
const liveStreamsCollection = "liveStreams";
const vendorsCollection = "vendors";
const powwowRegistrationsCollection = "powwowRegistrations";
const productServiceListingsCollection = "productServiceListings";
const contactSubmissionsCollection = "contactSubmissions";
const conversationsCollection = "conversations";
const messagesCollection = "messages";
const notificationsCollection = "notifications";

// Helper to check if Firebase is available
function checkFirebase() {
  if (!db) {
    // During build time or if config is missing, this might be null.
    // We throw here to ensure type safety for the return type (Firestore),
    // but we need to handle this gracefully in the calling functions if possible,
    // or ensure this is only called when Firebase is initialized.
    // For static generation, we might want to return a mock or null and handle it.
    // But to fix the immediate build error which is likely due to missing env vars:
    if (process.env.NODE_ENV === 'production' && !process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
      console.warn("Firebase not initialized during build.");
      // We can't return null here because the return type is inferred as Firestore.
      // We'll throw, but we should catch this in getStaticProps/generateStaticParams if used.
    }
    throw new Error("Firebase not initialized");
  }
  return db;
}

export async function getEmployerProfile(
  userId: string
): Promise<EmployerProfile | null> {
  try {
    const firestore = checkFirebase();
    const ref = doc(firestore, employerCollection, userId);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      return null;
    }
    return snap.data() as EmployerProfile;
  } catch {
    return null;
  }
}

export async function updateEmployerLogo(userId: string, logoUrl: string) {
  const ref = doc(db!, employerCollection, userId);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    await updateDoc(ref, {
      logoUrl,
      updatedAt: serverTimestamp(),
    });
  } else {
    await setDoc(ref, {
      id: userId,
      userId,
      organizationName: "",
      description: "",
      website: "",
      location: "",
      logoUrl,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
}

export async function upsertEmployerProfile(
  userId: string,
  data: Omit<EmployerProfile, "id" | "userId" | "createdAt" | "updatedAt">
) {
  const ref = doc(db!, employerCollection, userId);
  const base = {
    organizationName: data.organizationName,
    description: data.description ?? "",
    website: data.website ?? "",
    location: data.location ?? "",
    logoUrl: data.logoUrl ?? "",
  };

  const snap = await getDoc(ref);
  if (snap.exists()) {
    await updateDoc(ref, {
      ...base,
      updatedAt: serverTimestamp(),
    });
  } else {
    await setDoc(ref, {
      id: userId,
      userId,
      ...base,
      status: "pending",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
}

export async function listEmployers(status?: EmployerStatus): Promise<EmployerProfile[]> {
  console.log("[listEmployers] Called with status:", status);
  try {
    const firestore = checkFirebase();
    console.log("[listEmployers] Firestore initialized:", !!firestore);
    const ref = collection(firestore, employerCollection);
    let q;

    if (status) {
      q = query(ref, where("status", "==", status), orderBy("createdAt", "desc"));
    } else {
      q = query(ref, orderBy("createdAt", "desc"));
    }

    console.log("[listEmployers] Executing query...");
    const snap = await getDocs(q);
    console.log("[listEmployers] Query returned", snap.size, "documents");
    const results = snap.docs.map((docSnapshot) => ({
      id: docSnapshot.id,
      ...docSnapshot.data()
    } as EmployerProfile));
    console.log("[listEmployers] Returning", results.length, "employers");
    return results;
  } catch (error) {
    console.error("[listEmployers] Error:", error);
    return [];
  }
}

export async function updateEmployerStatus(
  userId: string,
  status: EmployerStatus,
  approvedBy?: string,
  rejectionReason?: string
) {
  console.log("[updateEmployerStatus] Starting update for:", userId, "to status:", status);
  const ref = doc(db!, employerCollection, userId);
  const updates: any = {
    status,
    updatedAt: serverTimestamp(),
  };

  if (status === "approved") {
    updates.approvedAt = serverTimestamp();
    updates.approvedBy = approvedBy;
  }

  if (status === "rejected" && rejectionReason) {
    updates.rejectionReason = rejectionReason;
  }

  try {
    await updateDoc(ref, updates);
    console.log("[updateEmployerStatus] Success!");
  } catch (error) {
    console.error("[updateEmployerStatus] Failed:", error);
    throw error;
  }
}

export async function addEmployerInterview(
  userId: string,
  interview: Omit<Interview, "id" | "createdAt">
) {
  const ref = doc(db!, employerCollection, userId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Employer profile not found");

  const profile = snap.data() as EmployerProfile;
  const interviews = profile.interviews || [];

  const newInterview: Interview = {
    ...interview,
    id: Date.now().toString() + Math.random().toString(36).substring(7),
    createdAt: serverTimestamp() as Timestamp,
  };

  await updateDoc(ref, {
    interviews: [...interviews, newInterview],
    updatedAt: serverTimestamp(),
  });

  return newInterview.id;
}

export async function updateEmployerInterview(
  userId: string,
  interviewId: string,
  updates: Partial<Omit<Interview, "id" | "createdAt">>
) {
  const ref = doc(db!, employerCollection, userId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Employer profile not found");

  const profile = snap.data() as EmployerProfile;
  const interviews = profile.interviews || [];

  const updatedInterviews = interviews.map(interview =>
    interview.id === interviewId
      ? { ...interview, ...updates }
      : interview
  );

  await updateDoc(ref, {
    interviews: updatedInterviews,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteEmployerInterview(
  userId: string,
  interviewId: string
) {
  const ref = doc(db!, employerCollection, userId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Employer profile not found");

  const profile = snap.data() as EmployerProfile;
  const interviews = profile.interviews || [];

  const filteredInterviews = interviews.filter(
    interview => interview.id !== interviewId
  );

  await updateDoc(ref, {
    interviews: filteredInterviews,
    updatedAt: serverTimestamp(),
  });
}

export async function trackInterviewView(
  employerId: string,
  interviewId: string
) {
  if (!db) return;
  try {
    const ref = doc(db!, employerCollection, employerId);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const profile = snap.data() as EmployerProfile;
      const interviews = profile.interviews || [];

      const updatedInterviews = interviews.map(interview =>
        interview.id === interviewId
          ? { ...interview, viewsCount: (interview.viewsCount || 0) + 1 }
          : interview
      );

      await updateDoc(ref, {
        interviews: updatedInterviews,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (err) {
    console.error("Failed to track interview view:", err);
    // Don't throw - analytics failures shouldn't break the app
  }
}

export async function getMemberProfile(
  userId: string
): Promise<MemberProfile | null> {
  const ref = doc(db!, memberCollection, userId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return snap.data() as MemberProfile;
}

export async function upsertMemberProfile(
  userId: string,
  data: Omit<MemberProfile, "id" | "userId" | "createdAt" | "updatedAt">
) {
  const ref = doc(db!, memberCollection, userId);
  const base = {
    displayName: data.displayName ?? "",
    location: data.location ?? "",
    skills: data.skills ?? [],
    experience: data.experience ?? "",
    education: data.education ?? "",
    resumeUrl: data.resumeUrl ?? "",
    coverLetterTemplate: data.coverLetterTemplate ?? "",
    indigenousAffiliation: data.indigenousAffiliation ?? "",
    availableForInterviews: data.availableForInterviews ?? "",
    messagingHandle: data.messagingHandle ?? "",
  };

  const snap = await getDoc(ref);
  if (snap.exists()) {
    await updateDoc(ref, {
      ...base,
      updatedAt: serverTimestamp(),
    });
  } else {
    await setDoc(ref, {
      id: userId,
      userId,
      ...base,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
}

type JobInput = Omit<
  JobPosting,
  "id" | "createdAt" | "active" | "employerId"
> & { employerId: string; active?: boolean };

export async function createJobPosting(data: JobInput): Promise<string> {
  const ref = collection(db!, jobsCollection);
  const docRef = doc(ref);

  await setDoc(docRef, {
    ...data,
    id: docRef.id,
    active: data.active ?? true,
    viewsCount: 0,
    applicationsCount: 0,
    createdAt: serverTimestamp(),
  });

  return docRef.id;
}

type JobFilters = {
  employmentType?: string;
  remoteOnly?: boolean;
  indigenousOnly?: boolean;
  activeOnly?: boolean;
  status?: "active" | "paused" | "all";
};

export async function listJobPostings(
  filters: JobFilters = {}
): Promise<JobPosting[]> {
  try {
    const firestore = checkFirebase();
    const ref = collection(firestore, jobsCollection);
    const constraints = [];
    if (filters.activeOnly !== false) {
      constraints.push(where("active", "==", true));
    }
    if (filters.employmentType) {
      constraints.push(where("employmentType", "==", filters.employmentType));
    }
    if (filters.remoteOnly) {
      constraints.push(where("remoteFlag", "==", true));
    }
    if (filters.indigenousOnly) {
      constraints.push(where("indigenousPreference", "==", true));
    }
    if (filters.status && filters.status !== "all") {
      const value = filters.status === "active";
      constraints.push(where("active", "==", value));
    }
    constraints.push(orderBy("createdAt", "desc"));
    const q = query(ref, ...constraints);
    const snap = await getDocs(q);
    return snap.docs.map((docSnapshot) => {
      const data = docSnapshot.data() as JobPosting;
      return {
        ...data,
        id: docSnapshot.id,
      };
    });
  } catch {
    return [];
  }
}

export async function getJobPosting(jobId: string): Promise<JobPosting | null> {
  const ref = doc(db!, jobsCollection, jobId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const data = snap.data() as JobPosting;
  return {
    ...data,
    id: jobId,
  };
}

export async function listEmployerJobs(
  employerId: string
): Promise<JobPosting[]> {
  const ref = collection(db!, jobsCollection);
  const q = query(
    ref,
    where("employerId", "==", employerId),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((docSnapshot) => {
    const data = docSnapshot.data() as JobPosting;
    return {
      ...data,
      id: docSnapshot.id,
    };
  });
}

export async function updateJobStatus(jobId: string, active: boolean) {
  const ref = doc(db!, jobsCollection, jobId);
  await updateDoc(ref, {
    active,
    updatedAt: serverTimestamp(),
  });
}

export async function updateJobPosting(
  jobId: string,
  data: Partial<Omit<JobPosting, "id" | "createdAt" | "employerId">>
) {
  const ref = doc(db!, jobsCollection, jobId);
  await updateDoc(ref, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function incrementJobViews(jobId: string) {
  const ref = doc(db!, jobsCollection, jobId);
  await updateDoc(ref, {
    viewsCount: increment(1),
  });
}

type ApplicationInput = {
  jobId: string;
  employerId: string;
  memberId: string;
  memberEmail?: string;
  memberDisplayName?: string;
  resumeUrl?: string;
  coverLetter?: string;
  note?: string;
};

export async function createJobApplication(
  input: ApplicationInput
): Promise<string> {
  const ref = collection(db!, applicationsCollection);
  const docRef = await addDoc(ref, {
    ...input,
    status: "submitted" as ApplicationStatus,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // Increment count on the job
  const jobRef = doc(db!, jobsCollection, input.jobId);
  await updateDoc(jobRef, {
    applicationsCount: increment(1),
  });

  // Send notification to employer (fire and forget - don't block on failure)
  try {
    const jobSnap = await getDoc(jobRef);
    const jobData = jobSnap.data();
    const jobTitle = jobData?.title || "your job posting";
    const applicantName = input.memberEmail || "A candidate";

    await createNotification({
      userId: input.employerId,
      type: "new_application",
      title: "New Application Received",
      message: `${applicantName} applied to "${jobTitle}"`,
      link: `/employer/jobs/${input.jobId}/applications`,
      relatedJobId: input.jobId,
      relatedApplicationId: docRef.id,
    });
  } catch (error) {
    console.error("Failed to send application notification:", error);
    // Don't throw - notification failure shouldn't block the application
  }

  return docRef.id;
}

export async function listMemberApplications(
  memberId: string
): Promise<JobApplication[]> {
  const ref = collection(db!, applicationsCollection);
  const q = query(
    ref,
    where("memberId", "==", memberId),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((docSnapshot) => {
    const data = docSnapshot.data() as JobApplication;
    return { ...data, id: docSnapshot.id };
  });
}

export async function listJobApplications(
  jobId: string
): Promise<JobApplication[]> {
  const ref = collection(db!, applicationsCollection);
  const q = query(
    ref,
    where("jobId", "==", jobId),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((docSnapshot) => {
    const data = docSnapshot.data() as JobApplication;
    return { ...data, id: docSnapshot.id };
  });
}

export async function listEmployerApplications(
  employerId: string
): Promise<JobApplication[]> {
  const ref = collection(db!, applicationsCollection);
  const q = query(
    ref,
    where("employerId", "==", employerId),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((docSnapshot) => {
    const data = docSnapshot.data() as JobApplication;
    return { ...data, id: docSnapshot.id };
  });
}

export async function updateApplicationStatus(
  applicationId: string,
  status: ApplicationStatus
) {
  const ref = doc(db!, applicationsCollection, applicationId);

  // Get the application to find the member and job details
  const appSnap = await getDoc(ref);
  const appData = appSnap.data();

  await updateDoc(ref, {
    status,
    updatedAt: serverTimestamp(),
  });

  // Send notification to member about status change (fire and forget)
  if (appData && appData.memberId) {
    try {
      // Get job title for better notification message
      let jobTitle = "your application";
      if (appData.jobId) {
        const jobSnap = await getDoc(doc(db!, jobsCollection, appData.jobId));
        const jobData = jobSnap.data();
        if (jobData?.title) {
          jobTitle = jobData.title;
        }
      }

      const statusMessages: Record<ApplicationStatus, string> = {
        submitted: "has been submitted",
        reviewed: "is being reviewed",
        shortlisted: "has been shortlisted!",
        rejected: "was not selected to move forward",
        hired: "was successful - Congratulations!",
        withdrawn: "has been withdrawn",
      };

      const message = statusMessages[status] || `status changed to ${status}`;

      await createNotification({
        userId: appData.memberId,
        type: "application_status",
        title: "Application Update",
        message: `Your application for "${jobTitle}" ${message}`,
        link: "/member/applications",
        relatedJobId: appData.jobId,
        relatedApplicationId: applicationId,
      });
    } catch (error) {
      console.error("Failed to send status notification:", error);
    }
  }
}

export async function withdrawJobApplication(applicationId: string) {
  const ref = doc(db!, applicationsCollection, applicationId);
  await updateDoc(ref, {
    status: "withdrawn" as ApplicationStatus,
    updatedAt: serverTimestamp(),
  });
}

export async function toggleSavedJob(
  memberId: string,
  jobId: string,
  shouldSave: boolean
) {
  const snapshot = await getDocs(
    query(
      collection(db!, savedJobsCollection),
      where("memberId", "==", memberId),
      where("jobId", "==", jobId)
    )
  );

  if (shouldSave) {
    if (snapshot.empty) {
      await addDoc(collection(db!, savedJobsCollection), {
        memberId,
        jobId,
        createdAt: serverTimestamp(),
      });
    }
  } else {
    await Promise.all(snapshot.docs.map((docSnap) => deleteDoc(docSnap.ref)));
  }
}

export async function listSavedJobs(
  memberId: string
): Promise<SavedJob[]> {
  const ref = collection(db!, savedJobsCollection);
  const q = query(
    ref,
    where("memberId", "==", memberId),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);

  const results: SavedJob[] = [];
  for (const docSnap of snap.docs) {
    const data = docSnap.data() as SavedJob;
    const job = await getJobPosting(data.jobId);
    results.push({
      ...data,
      id: docSnap.id,
      job,
    });
  }
  return results;
}

export async function listSavedJobIds(memberId: string): Promise<string[]> {
  const ref = collection(db!, savedJobsCollection);
  const q = query(ref, where("memberId", "==", memberId));
  const snap = await getDocs(q);
  return snap.docs.map((docSnap) => {
    const data = docSnap.data() as SavedJob;
    return data.jobId;
  });
}

type ConferenceInput = Omit<
  Conference,
  "id" | "createdAt" | "active" | "employerId"
> & { employerId: string; active?: boolean };

export async function createConference(input: ConferenceInput): Promise<string> {
  const ref = collection(db!, conferencesCollection);
  const docRef = await addDoc(ref, {
    ...input,
    active: input.active ?? true,
    createdAt: serverTimestamp(),
  });
  await updateDoc(doc(db!, conferencesCollection, docRef.id), {
    id: docRef.id,
  });
  return docRef.id;
}

export async function listConferences(): Promise<Conference[]> {
  try {
    const firestore = checkFirebase();
    const ref = collection(firestore, conferencesCollection);
    const q = query(ref, orderBy("startDate", "asc"));
    const snap = await getDocs(q);
    return snap.docs.map((docSnap) => docSnap.data() as Conference);
  } catch {
    return [];
  }
}

export async function listEmployerConferences(
  employerId: string
): Promise<Conference[]> {
  const ref = collection(db!, conferencesCollection);
  const q = query(
    ref,
    where("employerId", "==", employerId),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((docSnap) => docSnap.data() as Conference);
}

export async function getConference(id: string): Promise<Conference | null> {
  const ref = doc(db!, conferencesCollection, id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return snap.data() as Conference;
}

export async function updateConference(
  id: string,
  data: Partial<Conference>
) {
  const ref = doc(db!, conferencesCollection, id);
  await updateDoc(ref, data);
}

export async function deleteConference(id: string) {
  const ref = doc(db!, conferencesCollection, id);
  await deleteDoc(ref);
}

export async function deleteJobPosting(id: string) {
  const ref = doc(db!, jobsCollection, id);
  await deleteDoc(ref);
}

type ScholarshipInput = Omit<
  Scholarship,
  "id" | "createdAt" | "active"
> & { active?: boolean };

export async function createScholarship(
  input: ScholarshipInput
): Promise<string> {
  const ref = collection(db!, scholarshipsCollection);
  const docRef = await addDoc(ref, {
    ...input,
    active: input.active ?? true,
    createdAt: serverTimestamp(),
  });
  await updateDoc(doc(db!, scholarshipsCollection, docRef.id), {
    id: docRef.id,
  });
  return docRef.id;
}

export async function listScholarships(): Promise<Scholarship[]> {
  try {
    const firestore = checkFirebase();
    const ref = collection(firestore, scholarshipsCollection);
    const q = query(ref, orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map((docSnap) => docSnap.data() as Scholarship);
  } catch {
    return [];
  }
}

export async function updateScholarship(
  id: string,
  data: Partial<Scholarship>
) {
  const ref = doc(db!, scholarshipsCollection, id);
  await updateDoc(ref, data);
}

type ShopListingInput = Omit<
  ShopListing,
  "id" | "createdAt" | "active"
> & { active?: boolean };

export async function createShopListing(
  input: ShopListingInput
): Promise<string> {
  const ref = collection(db!, shopCollection);
  const docRef = await addDoc(ref, {
    ...input,
    active: input.active ?? true,
    createdAt: serverTimestamp(),
  });
  await updateDoc(doc(db!, shopCollection, docRef.id), {
    id: docRef.id,
  });
  return docRef.id;
}

export async function listShopListings(): Promise<ShopListing[]> {
  try {
    const firestore = checkFirebase();
    const ref = collection(firestore, shopCollection);
    const q = query(ref, orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map((docSnap) => docSnap.data() as ShopListing);
  } catch {
    return [];
  }
}

export async function updateShopListing(
  id: string,
  data: Partial<ShopListing>
) {
  const ref = doc(db!, shopCollection, id);
  await updateDoc(ref, data);
}

type PowwowInput = Omit<
  PowwowEvent,
  "id" | "createdAt" | "active"
> & { active?: boolean };

export async function createPowwowEvent(
  input: PowwowInput
): Promise<string> {
  const ref = collection(db!, powwowsCollection);
  const docRef = await addDoc(ref, {
    ...input,
    active: input.active ?? true,
    createdAt: serverTimestamp(),
  });
  await updateDoc(doc(db!, powwowsCollection, docRef.id), {
    id: docRef.id,
  });
  return docRef.id;
}

export async function listPowwowEvents(): Promise<PowwowEvent[]> {
  try {
    const firestore = checkFirebase();
    const ref = collection(firestore, powwowsCollection);
    const q = query(ref, orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map((docSnap) => docSnap.data() as PowwowEvent);
  } catch {
    return [];
  }
}

export async function updatePowwowEvent(
  id: string,
  data: Partial<PowwowEvent>
) {
  const ref = doc(db!, powwowsCollection, id);
  await updateDoc(ref, data);
}

type LiveStreamInput = Omit<
  LiveStreamEvent,
  "id" | "createdAt" | "active"
> & { active?: boolean };

export async function createLiveStream(
  input: LiveStreamInput
): Promise<string> {
  const ref = collection(db!, liveStreamsCollection);
  const docRef = await addDoc(ref, {
    ...input,
    active: input.active ?? true,
    createdAt: serverTimestamp(),
  });
  await updateDoc(doc(db!, liveStreamsCollection, docRef.id), {
    id: docRef.id,
  });
  return docRef.id;
}

export async function listLiveStreams(): Promise<LiveStreamEvent[]> {
  try {
    const firestore = checkFirebase();
    const ref = collection(firestore, liveStreamsCollection);
    const q = query(ref, orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map((docSnap) => docSnap.data() as LiveStreamEvent);
  } catch {
    return [];
  }
}

export async function updateLiveStream(
  id: string,
  data: Partial<LiveStreamEvent>
) {
  const ref = doc(db!, liveStreamsCollection, id);
  await updateDoc(ref, data);
}

// ===============================================
// Vendor Profile functions
// ===============================================

export async function getVendorProfile(
  userId: string
): Promise<VendorProfile | null> {
  try {
    checkFirebase();
    const ref = doc(db!, vendorsCollection, userId);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() } as VendorProfile;
    }
    return null;
  } catch {
    return null;
  }
}

export async function getVendorProfileById(
  vendorId: string
): Promise<VendorProfile | null> {
  try {
    checkFirebase();
    const ref = doc(db!, vendorsCollection, vendorId);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() } as VendorProfile;
    }
    return null;
  } catch {
    return null;
  }
}

export async function upsertVendorProfile(
  userId: string,
  data: Partial<VendorProfile>
): Promise<void> {
  checkFirebase();
  const ref = doc(db!, vendorsCollection, userId);
  const snap = await getDoc(ref);

  const timestamp = serverTimestamp();

  if (snap.exists()) {
    // Update existing
    await updateDoc(ref, {
      ...data,
      updatedAt: timestamp,
    });
  } else {
    // Create new
    await setDoc(ref, {
      id: userId,
      ownerUserId: userId,
      ...data,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  }
}

export async function deleteVendorProfile(vendorId: string): Promise<void> {
  checkFirebase();
  const ref = doc(db!, vendorsCollection, vendorId);
  await deleteDoc(ref);
}

// ===============================================
// Scholarship Application functions
// ===============================================

type ScholarshipApplicationInput = {
  scholarshipId: string;
  employerId: string;
  memberId: string;
  memberEmail?: string;
  memberDisplayName?: string;
  education?: string;
  essay?: string;
};

export async function createScholarshipApplication(
  input: ScholarshipApplicationInput
): Promise<string> {
  const ref = collection(db!, scholarshipApplicationsCollection);
  const docRef = await addDoc(ref, {
    ...input,
    status: "submitted" as ApplicationStatus,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function listMemberScholarshipApplications(
  memberId: string
): Promise<ScholarshipApplication[]> {
  const ref = collection(db!, scholarshipApplicationsCollection);
  const q = query(
    ref,
    where("memberId", "==", memberId),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((docSnapshot) => {
    const data = docSnapshot.data() as ScholarshipApplication;
    return { ...data, id: docSnapshot.id };
  });
}

export async function listScholarshipApplicantsForEmployer(
  employerId: string,
  scholarshipId?: string
): Promise<ScholarshipApplication[]> {
  const ref = collection(db!, scholarshipApplicationsCollection);
  const constraints: any[] = [where("employerId", "==", employerId)];
  if (scholarshipId) {
    constraints.push(where("scholarshipId", "==", scholarshipId));
  }
  constraints.push(orderBy("createdAt", "desc"));
  const q = query(ref, ...constraints);
  const snap = await getDocs(q);
  return snap.docs.map((docSnapshot) => {
    const data = docSnapshot.data() as ScholarshipApplication;
    return { ...data, id: docSnapshot.id };
  });
}

export async function getScholarship(id: string): Promise<Scholarship | null> {
  try {
    const ref = doc(db!, scholarshipsCollection, id);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    return snap.data() as Scholarship;
  } catch {
    return null;
  }
}

export async function updateScholarshipApplicationStatus(
  applicationId: string,
  status: ApplicationStatus
) {
  const ref = doc(db!, scholarshipApplicationsCollection, applicationId);
  await updateDoc(ref, {
    status,
    updatedAt: serverTimestamp(),
  });
}

export async function withdrawScholarshipApplication(applicationId: string) {
  const ref = doc(db!, scholarshipApplicationsCollection, applicationId);
  await updateDoc(ref, {
    status: "withdrawn" as ApplicationStatus,
    updatedAt: serverTimestamp(),
  });
}

// ===============================================
// Pow Wow Registration functions
// ===============================================

export async function getPowwowEvent(id: string): Promise<PowwowEvent | null> {
  try {
    const ref = doc(db!, powwowsCollection, id);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    return snap.data() as PowwowEvent;
  } catch {
    return null;
  }
}

type PowwowRegistrationInput = Omit<
  PowwowRegistration,
  "id" | "createdAt"
>;

export async function createPowwowRegistration(
  input: PowwowRegistrationInput
): Promise<string> {
  const ref = collection(db!, powwowRegistrationsCollection);
  const docRef = await addDoc(ref, {
    ...input,
    createdAt: serverTimestamp(),
  });
  await updateDoc(doc(db!, powwowRegistrationsCollection, docRef.id), {
    id: docRef.id,
  });
  return docRef.id;
}

export async function listMemberPowwowRegistrations(
  memberId: string
): Promise<PowwowRegistration[]> {
  const ref = collection(db!, powwowRegistrationsCollection);
  const q = query(
    ref,
    where("email", "==", memberId),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((docSnapshot) => {
    const data = docSnapshot.data() as PowwowRegistration;
    return { ...data, id: docSnapshot.id };
  });
}

export async function listPowwowRegistrants(
  employerId: string,
  powwowId?: string
): Promise<PowwowRegistration[]> {
  const ref = collection(db!, powwowRegistrationsCollection);
  const constraints: any[] = [where("employerId", "==", employerId)];
  if (powwowId) {
    constraints.push(where("powwowId", "==", powwowId));
  }
  constraints.push(orderBy("createdAt", "desc"));
  const q = query(ref, ...constraints);
  const snap = await getDocs(q);
  return snap.docs.map((docSnapshot) => {
    const data = docSnapshot.data() as PowwowRegistration;
    return { ...data, id: docSnapshot.id };
  });
}

// ===============================================
// Product/Service Listing functions
// ===============================================

type ProductServiceInput = Omit<
  ProductServiceListing,
  "id" | "createdAt" | "active"
> & { active?: boolean };

export async function createShopListingForVendor(
  vendorId: string,
  data: Omit<ProductServiceInput, "vendorId">
): Promise<string> {
  const ref = collection(db!, productServiceListingsCollection);
  const docRef = await addDoc(ref, {
    vendorId,
    ...data,
    active: data.active ?? true,
    createdAt: serverTimestamp(),
  });
  await updateDoc(doc(db!, productServiceListingsCollection, docRef.id), {
    id: docRef.id,
  });
  return docRef.id;
}

export async function updateShopListingForVendor(
  id: string,
  data: Partial<Omit<ProductServiceListing, "id" | "createdAt" | "vendorId">>
) {
  const ref = doc(db!, productServiceListingsCollection, id);
  await updateDoc(ref, data);
}

export async function deleteShopListingForVendor(id: string) {
  const ref = doc(db!, productServiceListingsCollection, id);
  await deleteDoc(ref);
}

export async function listVendorShopListings(
  vendorId: string
): Promise<ProductServiceListing[]> {
  try {
    const firestore = checkFirebase();
    const ref = collection(firestore, productServiceListingsCollection);
    const q = query(
      ref,
      where("vendorId", "==", vendorId),
      orderBy("createdAt", "desc")
    );
    const snap = await getDocs(q);
    return snap.docs.map((docSnap) => docSnap.data() as ProductServiceListing);
  } catch {
    return [];
  }
}

// ===============================================
// Global Search functions
// ===============================================

export type GlobalSearchResults = {
  jobs: JobPosting[];
  scholarships: Scholarship[];
  conferences: Conference[];
  powwows: PowwowEvent[];
  shop: ShopListing[];
  totalResults: number;
};

/**
 * Global search across all content types
 * @param keyword Search term to match against
 * @param limit Optional limit per category (default: 10)
 */
export async function globalSearch(
  keyword: string,
  limit: number = 10
): Promise<GlobalSearchResults> {
  if (!keyword || keyword.trim().length === 0) {
    return {
      jobs: [],
      scholarships: [],
      conferences: [],
      powwows: [],
      shop: [],
      totalResults: 0,
    };
  }

  const searchTerm = keyword.toLowerCase().trim();

  try {
    checkFirebase();

    // Fetch all data in parallel
    const [jobs, scholarships, conferences, powwows, shop] = await Promise.all([
      listJobPostings({ activeOnly: true }),
      listScholarships(),
      listConferences(),
      listPowwowEvents(),
      listShopListings(),
    ]);

    // Filter results by keyword (client-side for now)
    const matchedJobs = jobs
      .filter((job) => {
        const text = `${job.title ?? ""} ${job.employerName ?? ""} ${job.description ?? ""
          } ${job.location ?? ""}`.toLowerCase();
        return text.includes(searchTerm);
      })
      .slice(0, limit);

    const matchedScholarships = scholarships
      .filter((scholarship) => {
        const text = `${scholarship.title} ${scholarship.provider} ${scholarship.description}`.toLowerCase();
        return text.includes(searchTerm);
      })
      .slice(0, limit);

    const matchedConferences = conferences
      .filter((conference) => {
        const text = `${conference.title} ${conference.employerName ?? ""} ${conference.description
          } ${conference.location}`.toLowerCase();
        return text.includes(searchTerm);
      })
      .slice(0, limit);

    const matchedPowwows = powwows
      .filter((powwow) => {
        const text = `${powwow.name} ${powwow.host ?? ""} ${powwow.description ?? ""
          } ${powwow.location ?? ""}`.toLowerCase();
        return text.includes(searchTerm);
      })
      .slice(0, limit);

    const matchedShop = shop
      .filter((item) => {
        const text = `${item.name} ${item.owner ?? ""} ${item.description ?? ""} ${(item.tags ?? []).join(" ")
          }`.toLowerCase();
        return text.includes(searchTerm);
      })
      .slice(0, limit);

    const totalResults =
      matchedJobs.length +
      matchedScholarships.length +
      matchedConferences.length +
      matchedPowwows.length +
      matchedShop.length;

    return {
      jobs: matchedJobs,
      scholarships: matchedScholarships,
      conferences: matchedConferences,
      powwows: matchedPowwows,
      shop: matchedShop,
      totalResults,
    };
  } catch (error) {
    console.error("Global search error:", error);
    return {
      jobs: [],
      scholarships: [],
      conferences: [],
      powwows: [],
      shop: [],
      totalResults: 0,
    };
  }
}

// ============================================================================
// Contact Submissions
// ============================================================================

export interface ContactSubmissionInput {
  name: string;
  email: string;
  subject?: string;
  message: string;
}

export async function createContactSubmission(
  data: ContactSubmissionInput
): Promise<string> {
  checkFirebase();

  try {
    const submissionData = {
      name: data.name,
      email: data.email,
      subject: data.subject || undefined,
      message: data.message,
      status: "new" as const,
      createdAt: serverTimestamp(),
    };

    const docRef = await addDoc(
      collection(db!, contactSubmissionsCollection),
      submissionData
    );

    return docRef.id;
  } catch (error) {
    console.error("Error creating contact submission:", error);
    throw new Error("Failed to submit contact form");
  }
}

export async function listContactSubmissions(): Promise<ContactSubmission[]> {
  checkFirebase();
  try {
    const q = query(
      collection(db!, contactSubmissionsCollection),
      orderBy("createdAt", "desc")
    );
    const snap = await getDocs(q);
    return snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    } as ContactSubmission));
  } catch (error) {
    console.error("Error listing contact submissions:", error);
    return [];
  }
}

export async function updateContactSubmissionStatus(
  id: string,
  status: "new" | "read" | "responded"
) {
  checkFirebase();
  const ref = doc(db!, contactSubmissionsCollection, id);
  await updateDoc(ref, {
    status,
    updatedAt: serverTimestamp(),
  });
}

// ============================================================================
// Platform Settings
// ============================================================================

const settingsCollection = "settings";
const settingsDocId = "platform";

export async function getPlatformSettings(): Promise<PlatformSettings | null> {
  try {
    checkFirebase();
    const ref = doc(db!, settingsCollection, settingsDocId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    return snap.data() as PlatformSettings;
  } catch (error) {
    console.error("Error fetching platform settings:", error);
    return null;
  }
}

export async function updatePlatformSettings(
  settings: Partial<PlatformSettings>,
  userId: string
) {
  checkFirebase();
  const ref = doc(db!, settingsCollection, settingsDocId);
  await setDoc(
    ref,
    {
      ...settings,
      updatedAt: serverTimestamp(),
      updatedBy: userId,
    },
    { merge: true }
  );
}

// ============================================================================
// RSS Feeds for Job Scraping
// ============================================================================

const rssFeedsCollection = "rssFeeds";

export async function createRSSFeed(
  data: Omit<RSSFeed, "id" | "createdAt" | "updatedAt">
): Promise<string> {
  checkFirebase();
  const ref = collection(db!, rssFeedsCollection);
  const docRef = await addDoc(ref, {
    ...data,
    active: data.active ?? true,
    totalJobsImported: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  await updateDoc(doc(db!, rssFeedsCollection, docRef.id), { id: docRef.id });
  return docRef.id;
}

export async function listRSSFeeds(employerId?: string): Promise<RSSFeed[]> {
  checkFirebase();
  try {
    const ref = collection(db!, rssFeedsCollection);
    const constraints = [];

    if (employerId) {
      constraints.push(where("employerId", "==", employerId));
    }

    constraints.push(orderBy("createdAt", "desc"));

    const q = query(ref, ...constraints);
    const snap = await getDocs(q);
    return snap.docs.map((doc) => doc.data() as RSSFeed);
  } catch (error) {
    console.error("Error listing RSS feeds:", error);
    return [];
  }
}

export async function getRSSFeed(id: string): Promise<RSSFeed | null> {
  checkFirebase();
  try {
    const ref = doc(db!, rssFeedsCollection, id);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    return snap.data() as RSSFeed;
  } catch (error) {
    console.error("Error getting RSS feed:", error);
    return null;
  }
}

export async function updateRSSFeed(
  id: string,
  data: Partial<RSSFeed>
): Promise<void> {
  checkFirebase();
  const ref = doc(db!, rssFeedsCollection, id);
  await updateDoc(ref, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteRSSFeed(id: string): Promise<void> {
  checkFirebase();
  const ref = doc(db!, rssFeedsCollection, id);
  await deleteDoc(ref);
}

// Job Alerts
export async function createJobAlert(alert: Omit<JobAlert, "id" | "createdAt" | "updatedAt">) {
  const ref = collection(db!, jobAlertsCollection);
  const docRef = await addDoc(ref, {
    ...alert,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function getMemberJobAlerts(memberId: string): Promise<JobAlert[]> {
  const q = query(
    collection(db!, jobAlertsCollection),
    where("memberId", "==", memberId),
    orderBy("createdAt", "desc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as JobAlert));
}

export async function deleteJobAlert(alertId: string) {
  await deleteDoc(doc(db!, jobAlertsCollection, alertId));
}

export async function updateJobAlert(alertId: string, data: Partial<JobAlert>) {
  const ref = doc(db!, jobAlertsCollection, alertId);
  await updateDoc(ref, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

// ============================================
// Messaging Functions
// ============================================

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

  // Check if conversation already exists
  const q = query(
    collection(db!, conversationsCollection),
    where("employerId", "==", params.employerId),
    where("memberId", "==", params.memberId),
    where("status", "==", "active")
  );

  const snapshot = await getDocs(q);

  if (!snapshot.empty) {
    // Return existing conversation
    const existingDoc = snapshot.docs[0];
    return { id: existingDoc.id, ...existingDoc.data() } as Conversation;
  }

  // Create new conversation
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

// Get conversations for an employer
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

// Get conversations for a member
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

// Get a single conversation by ID
export async function getConversation(conversationId: string): Promise<Conversation | null> {
  checkFirebase();

  const docRef = doc(db!, conversationsCollection, conversationId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) return null;
  return { id: docSnap.id, ...docSnap.data() } as Conversation;
}

// Send a message in a conversation
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

  // Add message to messages collection
  const messageRef = await addDoc(collection(db!, messagesCollection), messageData);

  // Update conversation with last message info and increment unread count
  const conversationRef = doc(db!, conversationsCollection, params.conversationId);
  const unreadField = params.senderType === "employer" ? "memberUnreadCount" : "employerUnreadCount";

  await updateDoc(conversationRef, {
    lastMessage: params.content.slice(0, 100), // Truncate for preview
    lastMessageAt: serverTimestamp(),
    lastMessageBy: params.senderId,
    [unreadField]: increment(1),
    updatedAt: serverTimestamp(),
  });

  return { id: messageRef.id, ...messageData } as Message;
}

// Get messages for a conversation
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

  // Return last N messages
  return messages.slice(-limitCount);
}

// Mark messages as read for a user in a conversation
export async function markMessagesAsRead(
  conversationId: string,
  userId: string,
  userType: "employer" | "member"
): Promise<void> {
  checkFirebase();

  // Get unread messages not sent by this user
  const q = query(
    collection(db!, messagesCollection),
    where("conversationId", "==", conversationId),
    where("senderId", "!=", userId),
    where("read", "==", false)
  );

  const snapshot = await getDocs(q);

  // Mark each message as read
  const updates = snapshot.docs.map((msgDoc) =>
    updateDoc(doc(db!, messagesCollection, msgDoc.id), { read: true })
  );

  await Promise.all(updates);

  // Reset unread count for this user
  const conversationRef = doc(db!, conversationsCollection, conversationId);
  const unreadField = userType === "employer" ? "employerUnreadCount" : "memberUnreadCount";

  await updateDoc(conversationRef, {
    [unreadField]: 0,
  });
}

// Get total unread count for a user
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

// Archive a conversation
export async function archiveConversation(conversationId: string): Promise<void> {
  checkFirebase();

  const conversationRef = doc(db!, conversationsCollection, conversationId);
  await updateDoc(conversationRef, {
    status: "archived",
    updatedAt: serverTimestamp(),
  });
}

// ===========================================================================
// NOTIFICATIONS
// ===========================================================================

// Create a new notification (via API route for server-side creation)
export async function createNotification(params: {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  relatedJobId?: string;
  relatedApplicationId?: string;
  relatedConversationId?: string;
  relatedEmployerId?: string;
}): Promise<string> {
  if (!auth) {
    throw new Error("Auth not initialized");
  }
  const user = auth.currentUser;
  if (!user) {
    throw new Error("Must be authenticated to create notifications");
  }

  const idToken = await user.getIdToken();
  const response = await fetch("/api/notifications/create", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${idToken}`,
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to create notification");
  }

  const result = await response.json();
  return result.notificationId;
}

// Get notifications for a user
export async function getUserNotifications(
  userId: string,
  limitCount: number = 50
): Promise<Notification[]> {
  checkFirebase();

  const q = query(
    collection(db!, notificationsCollection),
    where("userId", "==", userId),
    orderBy("createdAt", "desc")
  );

  const snapshot = await getDocs(q);
  const notifications = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Notification[];

  // Limit in memory since Firestore limit() would need another import
  return notifications.slice(0, limitCount);
}

// Mark a single notification as read
export async function markNotificationAsRead(
  notificationId: string
): Promise<void> {
  checkFirebase();

  const notificationRef = doc(db!, notificationsCollection, notificationId);
  await updateDoc(notificationRef, {
    read: true,
  });
}

// Mark all notifications as read for a user
export async function markAllNotificationsAsRead(
  userId: string
): Promise<void> {
  checkFirebase();

  const q = query(
    collection(db!, notificationsCollection),
    where("userId", "==", userId),
    where("read", "==", false)
  );

  const snapshot = await getDocs(q);

  const updatePromises = snapshot.docs.map((docSnap) =>
    updateDoc(doc(db!, notificationsCollection, docSnap.id), { read: true })
  );

  await Promise.all(updatePromises);
}

// Get unread notification count for a user
export async function getUnreadNotificationCount(
  userId: string
): Promise<number> {
  checkFirebase();

  const q = query(
    collection(db!, notificationsCollection),
    where("userId", "==", userId),
    where("read", "==", false)
  );

  const snapshot = await getDocs(q);
  return snapshot.size;
}

// Delete a notification
export async function deleteNotification(
  notificationId: string
): Promise<void> {
  checkFirebase();

  await deleteDoc(doc(db!, notificationsCollection, notificationId));
}

// Delete all notifications for a user (cleanup)
export async function deleteAllUserNotifications(
  userId: string
): Promise<void> {
  checkFirebase();

  const q = query(
    collection(db!, notificationsCollection),
    where("userId", "==", userId)
  );

  const snapshot = await getDocs(q);

  const deletePromises = snapshot.docs.map((docSnap) =>
    deleteDoc(doc(db!, notificationsCollection, docSnap.id))
  );

  await Promise.all(deletePromises);
}

