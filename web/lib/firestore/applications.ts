// Application-related Firestore operations
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  db,
  applicationsCollection,
  jobsCollection,
} from "./shared";
import type { JobApplication, ApplicationStatus, ApplicantNote } from "@/lib/types";
import { arrayUnion, arrayRemove } from "firebase/firestore";
import { createNotification } from "./notifications";

type ApplicationInput = {
  jobId: string;
  employerId: string;
  memberId: string;
  memberEmail?: string;
  memberDisplayName?: string;
  resumeUrl?: string;
  coverLetter?: string;
  note?: string;
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

  const jobRef = doc(db!, jobsCollection, input.jobId);
  await updateDoc(jobRef, {
    applicationsCount: increment(1),
  });

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
  const appSnap = await getDoc(ref);
  const appData = appSnap.data();

  await updateDoc(ref, {
    status,
    updatedAt: serverTimestamp(),
  });

  if (appData && appData.memberId) {
    try {
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

// ============================================
// APPLICANT NOTES
// ============================================

export async function addApplicantNote(
  applicationId: string,
  note: { content: string; createdBy: string; createdByName?: string }
): Promise<ApplicantNote> {
  const noteId = `note_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const newNote: ApplicantNote = {
    id: noteId,
    content: note.content,
    createdBy: note.createdBy,
    createdByName: note.createdByName,
    createdAt: null, // Will be set by serverTimestamp in the update
  };

  const ref = doc(db!, applicationsCollection, applicationId);

  // We need to manually set the timestamp since arrayUnion doesn't support serverTimestamp
  const noteWithTimestamp = {
    ...newNote,
    createdAt: new Date(),
  };

  await updateDoc(ref, {
    employerNotes: arrayUnion(noteWithTimestamp),
    updatedAt: serverTimestamp(),
  });

  return noteWithTimestamp as unknown as ApplicantNote;
}

export async function updateApplicantNote(
  applicationId: string,
  noteId: string,
  content: string
): Promise<void> {
  const ref = doc(db!, applicationsCollection, applicationId);
  const snap = await getDoc(ref);
  const data = snap.data() as JobApplication;

  if (!data.employerNotes) return;

  const updatedNotes = data.employerNotes.map((note) =>
    note.id === noteId
      ? { ...note, content, updatedAt: new Date() }
      : note
  );

  await updateDoc(ref, {
    employerNotes: updatedNotes,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteApplicantNote(
  applicationId: string,
  noteId: string
): Promise<void> {
  const ref = doc(db!, applicationsCollection, applicationId);
  const snap = await getDoc(ref);
  const data = snap.data() as JobApplication;

  if (!data.employerNotes) return;

  const noteToRemove = data.employerNotes.find((note) => note.id === noteId);
  if (!noteToRemove) return;

  await updateDoc(ref, {
    employerNotes: arrayRemove(noteToRemove),
    updatedAt: serverTimestamp(),
  });
}
