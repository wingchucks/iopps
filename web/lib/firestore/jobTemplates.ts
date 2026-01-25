// Job Template Firestore operations
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
  updateDoc,
  where,
  db,
  jobTemplatesCollection,
} from "./shared";
import type { JobTemplate } from "@/lib/types";

type JobTemplateInput = Omit<JobTemplate, "id" | "createdAt" | "updatedAt" | "usageCount">;

export async function createJobTemplate(data: JobTemplateInput): Promise<string> {
  const ref = collection(db!, jobTemplatesCollection);
  const docRef = await addDoc(ref, {
    ...data,
    usageCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function getJobTemplate(templateId: string): Promise<JobTemplate | null> {
  const ref = doc(db!, jobTemplatesCollection, templateId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const data = snap.data() as JobTemplate;
  return { ...data, id: snap.id };
}

export async function listEmployerTemplates(employerId: string): Promise<JobTemplate[]> {
  const ref = collection(db!, jobTemplatesCollection);
  const q = query(
    ref,
    where("employerId", "==", employerId),
    orderBy("updatedAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((docSnapshot) => {
    const data = docSnapshot.data() as JobTemplate;
    return { ...data, id: docSnapshot.id };
  });
}

export async function updateJobTemplate(
  templateId: string,
  data: Partial<Omit<JobTemplate, "id" | "employerId" | "createdAt">>
): Promise<void> {
  const ref = doc(db!, jobTemplatesCollection, templateId);

  // Filter out undefined values
  const cleanData: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      cleanData[key] = value;
    }
  }

  await updateDoc(ref, {
    ...cleanData,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteJobTemplate(templateId: string): Promise<void> {
  const ref = doc(db!, jobTemplatesCollection, templateId);
  await deleteDoc(ref);
}

export async function incrementTemplateUsage(templateId: string): Promise<void> {
  const ref = doc(db!, jobTemplatesCollection, templateId);
  await updateDoc(ref, {
    usageCount: increment(1),
    updatedAt: serverTimestamp(),
  });
}

// Helper to convert a JobTemplate to job form data
export function templateToJobData(template: JobTemplate): Record<string, unknown> {
  return {
    title: template.title || "",
    location: template.location || "",
    employmentType: template.employmentType || "",
    remoteFlag: template.remoteFlag || false,
    indigenousPreference: template.indigenousPreference || false,
    description: template.jobDescription || "",
    responsibilities: template.responsibilities || [],
    qualifications: template.qualifications || [],
    requirements: template.requirements || "",
    benefits: template.benefits || "",
    salaryRange: template.salaryRange,
    category: template.category,
    locationType: template.locationType,
    cpicRequired: template.cpicRequired || false,
    willTrain: template.willTrain || false,
    driversLicense: template.driversLicense || false,
    quickApplyEnabled: template.quickApplyEnabled || false,
    applicationLink: template.applicationLink || "",
    applicationEmail: template.applicationEmail || "",
  };
}
