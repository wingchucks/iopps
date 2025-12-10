// Employer-related Firestore operations
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  setDoc,
  updateDoc,
  serverTimestamp,
  Timestamp,
  db,
  employerCollection,
  checkFirebase,
} from "./shared";
import type { EmployerProfile, Interview, EmployerStatus, CompanyVideo } from "@/lib/types";
import { MOCK_EMPLOYERS } from "../mockData";

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
      return MOCK_EMPLOYERS;
    }
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
  }
}

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
