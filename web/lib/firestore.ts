import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
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
  PowwowEvent,
  LiveStreamEvent,
  Vendor,
  VendorStatus,
  VendorProduct,
  PowwowRegistration,
  ContactSubmission,
  PlatformSettings,
  RSSFeed,
  JobAlert,
  EmployerStatus,
  Conversation,
  Message,
  Notification,
  NotificationType,
  CompanyVideo,
  JobVideo,
} from "@/lib/types";
import { MOCK_JOBS, MOCK_EMPLOYERS, MOCK_CONFERENCES, MOCK_SCHOLARSHIPS } from "./mockData";

// Type aliases for backwards compatibility with legacy code
type VendorProfile = Vendor;
type VendorApprovalStatus = VendorStatus;
type ShopListing = Vendor;

// Form input type that accepts both old and new field names
// Used by upsertVendorProfile to accept form data with legacy field names
type VendorFormInput = Partial<Vendor> & {
  // Legacy field names from old VendorProfile type
  websiteUrl?: string;
  contactEmail?: string;
  contactPhone?: string;
  about?: string;
  heroImageUrl?: string;
  otherLink?: string;
  ownerUserId?: string;
  // Analytics fields not in Vendor type but stored in Firestore
  profileViews?: number;
  websiteClicks?: number;
  favorites?: number;
  followers?: number;
  // Legacy search fields
  name?: string;
  owner?: string;
  tags?: string[];
};

// Extended type for data stored in Firestore that includes both new and legacy fields
type VendorStoredData = Vendor & {
  ownerUserId?: string;
  profileViews?: number;
  websiteClicks?: number;
  favorites?: number;
  followers?: number;
  name?: string;
  owner?: string;
  tags?: string[];
};
type ProductServiceListing = VendorProduct;

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
    // Return null instead of throwing to allow fallback to mock data
    return null;
  }
  return db;
}

export async function getEmployerProfile(
  userId: string
): Promise<EmployerProfile | null> {
  try {
    const firestore = checkFirebase();
    if (!firestore) {
      return MOCK_EMPLOYERS.find(e => e.userId === userId || e.id === userId) || MOCK_EMPLOYERS[0];
    }
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
  try {
    const firestore = checkFirebase();
    if (!firestore) {
      console.log("[listEmployers] Using mock data");
      return MOCK_EMPLOYERS;
    }
    console.log("[listEmployers] Firestore initialized:", !!firestore);
    const ref = collection(firestore, employerCollection);
    let q;

    if (status) {
      q = query(ref, where("status", "==", status), orderBy("createdAt", "desc"));
    } else {
      q = query(ref, orderBy("createdAt", "desc"));
    }

    const snap = await getDocs(q);
    const results = snap.docs.map((docSnapshot) => ({
      id: docSnapshot.id,
      ...docSnapshot.data()
    } as EmployerProfile));
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

  await updateDoc(ref, updates);
}

// Admin bypass functions for free posting
export async function grantEmployerFreePosting(
  userId: string,
  adminId: string,
  reason?: string
) {
  const ref = doc(db!, employerCollection, userId);
  await updateDoc(ref, {
    freePostingEnabled: true,
    freePostingReason: reason || "Admin granted",
    freePostingGrantedAt: serverTimestamp(),
    freePostingGrantedBy: adminId,
    updatedAt: serverTimestamp(),
  });
}

export async function revokeEmployerFreePosting(userId: string) {
  const ref = doc(db!, employerCollection, userId);
  await updateDoc(ref, {
    freePostingEnabled: false,
    freePostingReason: null,
    freePostingGrantedAt: null,
    freePostingGrantedBy: null,
    updatedAt: serverTimestamp(),
  });
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

// Company Intro Video functions
export async function setEmployerCompanyIntro(
  employerId: string,
  videoData: CompanyVideo
) {
  const ref = doc(db!, employerCollection, employerId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Employer profile not found");

  await updateDoc(ref, {
    companyIntroVideo: videoData,
    updatedAt: serverTimestamp(),
  });
}

export async function removeEmployerCompanyIntro(employerId: string) {
  const ref = doc(db!, employerCollection, employerId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Employer profile not found");

  await updateDoc(ref, {
    companyIntroVideo: null,
    updatedAt: serverTimestamp(),
  });
}

// Job-specific Video functions
export async function setJobVideo(
  jobId: string,
  videoData: JobVideo
) {
  const ref = doc(db!, jobsCollection, jobId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Job posting not found");

  await updateDoc(ref, {
    jobVideo: videoData,
    updatedAt: serverTimestamp(),
  });
}

export async function removeJobVideo(jobId: string) {
  const ref = doc(db!, jobsCollection, jobId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Job posting not found");

  await updateDoc(ref, {
    jobVideo: null,
    updatedAt: serverTimestamp(),
  });
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
    if (!firestore) {
      console.log("[listJobPostings] Using mock data");
      let jobs = [...MOCK_JOBS];

      // Apply simple in-memory filtering for mock data
      if (filters.activeOnly !== false) {
        jobs = jobs.filter(j => j.active);
      }
      if (filters.employmentType) {
        jobs = jobs.filter(j => j.employmentType === filters.employmentType);
      }
      if (filters.remoteOnly) {
        jobs = jobs.filter(j => j.remoteFlag);
      }
      if (filters.indigenousOnly) {
        jobs = jobs.filter(j => j.indigenousPreference);
      }

      return jobs;
    }
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
  const firestore = checkFirebase();
  if (!firestore) {
    return MOCK_JOBS.find(j => j.id === jobId) || null;
  }
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

  // New Fields
  coverLetterType?: 'text' | 'file';
  coverLetterContent?: string;
  coverLetterUrl?: string;
  coverLetterPath?: string;
  portfolioUrls?: string[];
  certificationUrls?: string[];
  additionalDocuments?: {
    name: string;
    url: string;
    type: string;
    path: string;
  }[];
};

export async function checkExistingApplication(
  memberId: string,
  jobId: string
): Promise<boolean> {
  const ref = collection(db!, applicationsCollection);
  const q = query(
    ref,
    where("memberId", "==", memberId),
    where("jobId", "==", jobId),
    limit(1)
  );
  const snap = await getDocs(q);
  return !snap.empty;
}

export async function createJobApplication(
  input: ApplicationInput
): Promise<string> {
  // Check for duplicate application
  const existingApplication = await checkExistingApplication(
    input.memberId,
    input.jobId
  );

  if (existingApplication) {
    throw new Error("You have already applied to this job");
  }

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
      link: `/organization/jobs/${input.jobId}/applications`,
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
    if (!firestore) {
      return MOCK_CONFERENCES;
    }
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
  const firestore = checkFirebase();
  if (!firestore) {
    return MOCK_CONFERENCES.find(c => c.id === id) || null;
  }
  const ref = doc(firestore, conferencesCollection, id);
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
    if (!firestore) {
      return MOCK_SCHOLARSHIPS;
    }
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

export async function listEmployerScholarships(employerId: string): Promise<Scholarship[]> {
  try {
    const firestore = checkFirebase();
    if (!firestore) {
      return [];
    }
    const ref = collection(firestore, scholarshipsCollection);
    const q = query(ref, where("employerId", "==", employerId), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Scholarship));
  } catch {
    return [];
  }
}

export async function deleteScholarship(id: string): Promise<void> {
  const ref = doc(db!, scholarshipsCollection, id);
  await deleteDoc(ref);
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
    if (!firestore) {
      return []; // Return empty for now as we don't have mock shop data
    }
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
    if (!firestore) {
      return []; // Return empty for now
    }
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

export async function listEmployerPowwows(employerId: string): Promise<PowwowEvent[]> {
  try {
    const firestore = checkFirebase();
    if (!firestore) return [];
    const ref = collection(firestore, powwowsCollection);
    const q = query(ref, where("employerId", "==", employerId), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as PowwowEvent));
  } catch {
    return [];
  }
}

export async function deletePowwow(id: string): Promise<void> {
  const ref = doc(db!, powwowsCollection, id);
  await deleteDoc(ref);
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
    if (!firestore) {
      return []; // Return empty for now
    }
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

// Helper to normalize strings for comparison (lowercase, remove extra spaces, remove common suffixes)
function normalizeBusinessName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\b(inc|llc|ltd|corp|company|co|limited)\b\.?/gi, '')
    .replace(/[^\w\s]/g, '')
    .trim();
}

// Helper to normalize URLs for comparison
function normalizeUrl(url: string): string {
  return url
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/+$/, '')
    .trim();
}

// Check for potential duplicate vendors
export async function checkForDuplicateVendor(
  userId: string,
  businessName: string,
  websiteUrl?: string,
  contactEmail?: string,
  contactPhone?: string
): Promise<{ isDuplicate: boolean; flags: string[]; matchingVendors: string[] }> {
  checkFirebase();

  const flags: string[] = [];
  const matchingVendors: string[] = [];

  // Get all active vendors (excluding current user's profile if it exists)
  // We must filter by active == true because security rules only allow reading
  // active vendors or the user's own vendor profile
  const vendorsRef = collection(db!, vendorsCollection);
  const activeVendorsQuery = query(vendorsRef, where('active', '==', true));
  const vendorsSnap = await getDocs(activeVendorsQuery);

  const normalizedNewName = normalizeBusinessName(businessName);
  const normalizedNewUrl = websiteUrl ? normalizeUrl(websiteUrl) : null;
  const normalizedNewEmail = contactEmail?.toLowerCase().trim();
  const normalizedNewPhone = contactPhone?.replace(/\D/g, ''); // Remove non-digits

  vendorsSnap.forEach((vendorDoc) => {
    const vendor = vendorDoc.data() as VendorProfile;

    // Skip the current user's own profile
    if (vendorDoc.id === userId) return;

    // Skip inactive or rejected vendors
    if (vendor.status === 'suspended') return;

    // Check for similar business name (using normalized comparison)
    if (vendor.businessName) {
      const normalizedExistingName = normalizeBusinessName(vendor.businessName);
      // Check for exact match or very similar names
      if (normalizedNewName === normalizedExistingName) {
        flags.push('exact_business_name_match');
        matchingVendors.push(vendorDoc.id);
      } else if (
        normalizedNewName.includes(normalizedExistingName) ||
        normalizedExistingName.includes(normalizedNewName)
      ) {
        // Partial match - one name contains the other
        if (normalizedNewName.length > 3 && normalizedExistingName.length > 3) {
          flags.push('similar_business_name');
          matchingVendors.push(vendorDoc.id);
        }
      }
    }

    // Check for same website
    if (normalizedNewUrl && vendor.website) {
      const normalizedExistingUrl = normalizeUrl(vendor.website);
      if (normalizedNewUrl === normalizedExistingUrl) {
        flags.push('same_website');
        if (!matchingVendors.includes(vendorDoc.id)) {
          matchingVendors.push(vendorDoc.id);
        }
      }
    }

    // Check for same contact email
    if (normalizedNewEmail && vendor.email) {
      if (normalizedNewEmail === vendor.email.toLowerCase().trim()) {
        flags.push('same_contact_email');
        if (!matchingVendors.includes(vendorDoc.id)) {
          matchingVendors.push(vendorDoc.id);
        }
      }
    }

    // Check for same phone number
    if (normalizedNewPhone && normalizedNewPhone.length >= 10 && vendor.phone) {
      const normalizedExistingPhone = vendor.phone.replace(/\D/g, '');
      if (normalizedNewPhone === normalizedExistingPhone) {
        flags.push('same_phone_number');
        if (!matchingVendors.includes(vendorDoc.id)) {
          matchingVendors.push(vendorDoc.id);
        }
      }
    }
  });

  // Remove duplicates from flags
  const uniqueFlags = [...new Set(flags)];

  return {
    isDuplicate: uniqueFlags.length > 0,
    flags: uniqueFlags,
    matchingVendors: [...new Set(matchingVendors)],
  };
}

export async function getVendorProfile(
  userId: string
): Promise<VendorProfile | null> {
  try {
    const firestore = checkFirebase();
    if (!firestore) {
      return MOCK_EMPLOYERS.find(e => e.userId === userId || e.id === userId) as unknown as VendorProfile || null;
    }
    const ref = doc(firestore, vendorsCollection, userId);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const data = snap.data() as any;
      // Convert Timestamps to Dates
      if (data.createdAt?.toDate) data.createdAt = data.createdAt.toDate();
      if (data.updatedAt?.toDate) data.updatedAt = data.updatedAt.toDate();
      if (data.approvedAt?.toDate) data.approvedAt = data.approvedAt.toDate();

      return { id: snap.id, ...data } as VendorProfile;
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
    const firestore = checkFirebase();
    if (!firestore) {
      return null; // No mock data for vendor by ID yet
    }
    const ref = doc(firestore, vendorsCollection, vendorId);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const data = snap.data() as any;
      // Convert Timestamps to Dates
      if (data.createdAt?.toDate) data.createdAt = data.createdAt.toDate();
      if (data.updatedAt?.toDate) data.updatedAt = data.updatedAt.toDate();
      if (data.approvedAt?.toDate) data.approvedAt = data.approvedAt.toDate();

      return { id: snap.id, ...data } as VendorProfile;
    }
    return null;
  } catch {
    return null;
  }
}

// Helper function to generate slug from business name
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function generateUniqueSlug(businessName: string): string {
  const baseSlug = slugify(businessName);
  const uniqueSuffix = Math.random().toString(36).substring(2, 8);
  return `${baseSlug}-${uniqueSuffix}`;
}

export type UpsertVendorResult = {
  success: boolean;
  status: VendorApprovalStatus;
  duplicateFlags?: string[];
  message?: string;
};

export async function upsertVendorProfile(
  userId: string,
  data: VendorFormInput
): Promise<UpsertVendorResult> {
  checkFirebase();
  const ref = doc(db!, vendorsCollection, userId);
  const snap = await getDoc(ref);

  const timestamp = serverTimestamp();
  const isNewProfile = !snap.exists();

  // For new profiles or profiles that don't have business name yet, check for duplicates
  let vendorStatus: VendorApprovalStatus = 'active';
  let duplicateFlags: string[] = [];

  if (data.businessName) {
    const duplicateCheck = await checkForDuplicateVendor(
      userId,
      data.businessName,
      data.websiteUrl,
      data.contactEmail,
      data.contactPhone
    );

    if (duplicateCheck.isDuplicate) {
      // Flag for review if potential duplicate found
      vendorStatus = 'pending';
      duplicateFlags = duplicateCheck.flags;
    }
  }

  if (snap.exists()) {
    // Update existing - check if business details changed significantly
    const existingData = snap.data() as VendorStoredData;
    const businessNameChanged = data.businessName &&
      normalizeBusinessName(data.businessName) !== normalizeBusinessName(existingData.businessName || '');

    // Only re-check duplicates if business name changed
    if (businessNameChanged && data.businessName) {
      const duplicateCheck = await checkForDuplicateVendor(
        userId,
        data.businessName,
        data.websiteUrl || existingData.website,
        data.contactEmail || existingData.email,
        data.contactPhone || existingData.phone
      );

      if (duplicateCheck.isDuplicate) {
        vendorStatus = 'pending';
        duplicateFlags = duplicateCheck.flags;
      } else {
        // If no duplicates and was suspended, keep as suspended
        vendorStatus = existingData.status === 'suspended' ? 'suspended' : 'active';
      }
    } else {
      // Keep existing status if not checking for duplicates
      vendorStatus = existingData.status || 'active';
    }

    // Ensure ownerUserId is set (may be missing if doc was created by verify-vendor-session)
    const updateData: Record<string, any> = {
      ...data,
      status: vendorStatus,
      duplicateFlags: duplicateFlags.length > 0 ? duplicateFlags : null,
      updatedAt: timestamp,
    };

    // Add ownerUserId if missing from existing document
    if (!existingData.ownerUserId) {
      updateData.ownerUserId = userId;
    }

    // Generate slug if missing or empty (required for shop listing)
    // Use the new businessName if provided, otherwise use existing businessName
    const businessNameForSlug = data.businessName || existingData.businessName;
    if ((!existingData.slug || existingData.slug === '') && businessNameForSlug) {
      updateData.slug = generateUniqueSlug(businessNameForSlug);
    }

    // Set status fields for shop listing compatibility
    // Map status to verificationStatus for the shop page queries
    if (vendorStatus === 'active') {
      updateData.verificationStatus = 'verified';
    } else if (vendorStatus === 'pending') {
      updateData.verificationStatus = 'pending';
    } else if (vendorStatus === 'suspended') {
      updateData.verificationStatus = 'rejected';
    }

    // Map VendorProfile fields to Vendor fields for shop display compatibility
    // The shop display pages expect different field names
    if (data.contactEmail) updateData.email = data.contactEmail;
    if (data.contactPhone) updateData.phone = data.contactPhone;
    if (data.websiteUrl) updateData.website = data.websiteUrl;
    if (data.about) updateData.description = data.about;
    if (data.heroImageUrl) updateData.coverImage = data.heroImageUrl;
    if (data.logoUrl) updateData.profileImage = data.logoUrl;
    if (data.tagline) updateData.tagline = data.tagline;

    // Map category string to categories array for shop display filtering
    if (data.category) {
      updateData.categories = [data.category];
      updateData.categoryIds = [data.category.toLowerCase().replace(/\s+&\s+/g, '-').replace(/\s+/g, '-')];
    }

    // Map location and region for shop display
    // Note: These are extended fields not in VendorProfile type but needed for shop display
    if (data.location || data.region) {
      const existingDoc = existingData as Record<string, any>;
      const existingLocation = existingDoc.location || {};
      updateData.location = {
        ...existingLocation,
        city: data.location || existingLocation.city || '',
        province: existingLocation.province || '',
        country: existingLocation.country || 'Canada',
        region: data.region || existingLocation.region || '',
      };
    }

    // Map social links for shop display
    // Note: These are extended fields not in VendorProfile type but needed for shop display
    const hasSocialLinks = data.instagram || data.facebook || data.tiktok || data.otherLink;
    if (hasSocialLinks) {
      const existingDoc = existingData as Record<string, any>;
      const existingSocialLinks = existingDoc.socialLinks || {};
      updateData.socialLinks = {
        instagram: data.instagram || existingSocialLinks.instagram || '',
        facebook: data.facebook || existingSocialLinks.facebook || '',
        tiktok: data.tiktok || existingSocialLinks.tiktok || '',
        pinterest: existingSocialLinks.pinterest || '',
        youtube: existingSocialLinks.youtube || '',
      };
    }

    // Set userId for shop display compatibility (distinct from ownerUserId)
    updateData.userId = userId;

    // Initialize shop display metrics if not present
    if (existingData.profileViews === undefined) updateData.profileViews = 0;
    if (existingData.websiteClicks === undefined) updateData.websiteClicks = 0;
    if (existingData.favorites === undefined) updateData.favorites = 0;
    if (existingData.followers === undefined) updateData.followers = 0;

    await updateDoc(ref, updateData);
  } else {
    // Create new
    // Generate slug for new vendor profiles
    const slug = data.businessName ? generateUniqueSlug(data.businessName) : '';

    // Map status to shop listing status fields
    let statusValue = vendorStatus === 'active' ? 'active' : 'draft';
    let verificationStatus = vendorStatus === 'active' ? 'verified' : 'pending';

    // Map category to categories array
    const categories = data.category ? [data.category] : [];
    const categoryIds = data.category
      ? [data.category.toLowerCase().replace(/\s+&\s+/g, '-').replace(/\s+/g, '-')]
      : [];

    // Build location object for shop display
    const locationObj = {
      city: data.location || '',
      province: '',
      country: 'Canada',
      region: data.region || '',
    };

    // Build social links object for shop display
    const socialLinks = {
      instagram: data.instagram || '',
      facebook: data.facebook || '',
      tiktok: data.tiktok || '',
      pinterest: '',
      youtube: '',
    };

    await setDoc(ref, {
      id: userId,
      ownerUserId: userId,
      userId, // For shop display compatibility
      slug,
      status: statusValue,
      verificationStatus,
      ...data,
      // Map VendorProfile fields to Vendor fields for shop display compatibility
      email: data.contactEmail || '',
      phone: data.contactPhone || '',
      website: data.websiteUrl || '',
      description: data.about || '',
      coverImage: data.heroImageUrl || '',
      profileImage: data.logoUrl || '',
      // Additional shop display fields
      categories,
      categoryIds,
      location: locationObj,
      socialLinks,
      // Initialize shop display metrics
      profileViews: 0,
      websiteClicks: 0,
      favorites: 0,
      followers: 0,
      duplicateFlags: duplicateFlags.length > 0 ? duplicateFlags : null,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  }

  return {
    success: true,
    status: vendorStatus,
    duplicateFlags: duplicateFlags.length > 0 ? duplicateFlags : undefined,
    message: vendorStatus === 'pending'
      ? 'Your vendor profile has been submitted for review due to potential duplicate detection.'
      : undefined,
  };
}

export async function deleteVendorProfile(vendorId: string): Promise<void> {
  checkFirebase();
  const ref = doc(db!, vendorsCollection, vendorId);
  await deleteDoc(ref);
}

// Update vendor shop status (publish/unpublish)
// This allows vendors to control if their shop is visible publicly
export async function updateVendorShopStatus(
  vendorId: string,
  userId: string,
  isPublished: boolean
): Promise<{ success: boolean; error?: string }> {
  checkFirebase();
  const ref = doc(db!, vendorsCollection, vendorId);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    return { success: false, error: 'Vendor profile not found' };
  }

  const existingData = snap.data() as VendorStoredData;

  // Verify ownership
  if (existingData.ownerUserId !== userId) {
    return { success: false, error: 'Unauthorized' };
  }

  // Check if profile can be published (needs basic info)
  if (isPublished) {
    if (!existingData.businessName || !existingData.slug) {
      return { success: false, error: 'Please complete your business name before publishing' };
    }

    // Check if profile was rejected - cannot publish
    if (existingData.status === 'suspended') {
      return { success: false, error: 'Your profile was not approved. Please contact support.' };
    }

    // Check if profile is pending review - cannot publish yet
    if (existingData.status === 'pending') {
      return { success: false, error: 'Your profile is pending review and will be published once approved.' };
    }
  }

  // Update status
  await updateDoc(ref, {
    status: isPublished ? 'active' : 'draft',
    updatedAt: serverTimestamp(),
  });

  return { success: true };
}

// Admin function to approve/reject vendor profiles
export async function updateVendorApprovalStatus(
  vendorId: string,
  newStatus: VendorApprovalStatus
): Promise<void> {
  checkFirebase();
  const ref = doc(db!, vendorsCollection, vendorId);
  await updateDoc(ref, {
    status: newStatus,
    updatedAt: serverTimestamp(),
  });
}

// Admin bypass functions for free vendor listing
export async function grantVendorFreeListing(
  vendorId: string,
  adminId: string,
  reason?: string
) {
  checkFirebase();
  const ref = doc(db!, vendorsCollection, vendorId);
  await updateDoc(ref, {
    freeListingEnabled: true,
    freeListingReason: reason || "Admin granted",
    freeListingGrantedAt: serverTimestamp(),
    freeListingGrantedBy: adminId,
    updatedAt: serverTimestamp(),
  });
}

export async function revokeVendorFreeListing(vendorId: string) {
  checkFirebase();
  const ref = doc(db!, vendorsCollection, vendorId);
  await updateDoc(ref, {
    freeListingEnabled: false,
    freeListingReason: null,
    freeListingGrantedAt: null,
    freeListingGrantedBy: null,
    updatedAt: serverTimestamp(),
  });
}

// Get vendors pending review (for admin)
export async function getVendorsPendingReview(): Promise<VendorProfile[]> {
  checkFirebase();
  const vendorsRef = collection(db!, vendorsCollection);
  const q = query(
    vendorsRef,
    where('status', '==', 'pending'),
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as VendorProfile));
}

// List all approved and active vendors for public display
export async function listApprovedVendors(): Promise<VendorProfile[]> {
  const firestore = checkFirebase();
  if (!firestore) {
    return MOCK_EMPLOYERS.map(e => ({
      ...e,
      ownerUserId: e.userId,
      businessName: e.organizationName,
      isIndigenousOwned: true,
      approvalStatus: 'approved' as const,
    } as unknown as VendorProfile));
  }
  const vendorsRef = collection(firestore, vendorsCollection);
  // Get all vendors that are active
  const q = query(
    vendorsRef,
    where('status', '==', 'active'),
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as VendorProfile));
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
    const firestore = checkFirebase();
    if (!firestore) {
      return MOCK_SCHOLARSHIPS.find(s => s.id === id) || null;
    }
    const ref = doc(firestore, scholarshipsCollection, id);
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
    const firestore = checkFirebase();
    if (!firestore) {
      return null; // No mock data for powwows yet
    }
    const ref = doc(firestore, powwowsCollection, id);
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
    if (!firestore) return [];
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
        const text = `${item.businessName} ${item.nation ?? ""} ${item.description ?? ""} ${item.category ?? ""
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

