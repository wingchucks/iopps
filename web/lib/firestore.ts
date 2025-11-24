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
import { db } from "@/lib/firebase";
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
} from "@/lib/types";

const employerCollection = "employers";
const memberCollection = "memberProfiles";
const jobsCollection = "jobs";
const applicationsCollection = "applications";
const savedJobsCollection = "savedJobs";
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
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
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
  const docRef = await addDoc(ref, {
    ...data,
    active: data.active ?? true,
    viewsCount: 0,
    applicationsCount: 0,
    createdAt: serverTimestamp(),
  });
  await updateDoc(doc(db!, jobsCollection, docRef.id), {
    id: docRef.id,
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
  await updateDoc(ref, {
    status,
    updatedAt: serverTimestamp(),
  });
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
