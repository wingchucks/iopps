import { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/firebase-admin";
import OrganizationProfileClient from "./OrganizationProfileClient";
import type { EmployerProfile, JobPosting, TrainingProgram, Vendor, Service } from "@/lib/types";

interface Props {
  params: Promise<{ id: string }>;
}

interface OrganizationData {
  profile: EmployerProfile;
  jobs: JobPosting[];
  training: TrainingProgram[];
  vendor: Vendor | null;
  services: Service[];
}

async function getOrganizationData(id: string): Promise<OrganizationData | null> {
  if (!db) {
    console.error("Firebase Admin not initialized");
    return null;
  }

  try {
    // Fetch employer profile
    const profileDoc = await db.collection("employers").doc(id).get();

    if (!profileDoc.exists) {
      return null;
    }

    const profileData = profileDoc.data();
    if (!profileData) return null;

    // Only show approved organizations
    if (profileData.status !== "approved") {
      return null;
    }

    const profile: EmployerProfile = {
      id: profileDoc.id,
      ...profileData,
      createdAt: profileData.createdAt?.toDate?.()?.toISOString() || null,
      updatedAt: profileData.updatedAt?.toDate?.()?.toISOString() || null,
      approvedAt: profileData.approvedAt?.toDate?.()?.toISOString() || null,
    } as EmployerProfile;

    // Fetch active jobs
    const jobsSnapshot = await db
      .collection("jobs")
      .where("employerId", "==", id)
      .where("active", "==", true)
      .orderBy("createdAt", "desc")
      .limit(10)
      .get();

    const jobs: JobPosting[] = jobsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null,
      closingDate: doc.data().closingDate?.toDate?.()?.toISOString() || null,
    })) as JobPosting[];

    // Fetch approved training programs
    const trainingSnapshot = await db
      .collection("training_programs")
      .where("organizationId", "==", id)
      .where("status", "==", "approved")
      .where("active", "==", true)
      .orderBy("createdAt", "desc")
      .limit(10)
      .get();

    const training: TrainingProgram[] = trainingSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null,
      updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || null,
    })) as TrainingProgram[];

    // Fetch vendor profile (if exists)
    const vendorDoc = await db.collection("vendors").doc(id).get();
    let vendor: Vendor | null = null;
    if (vendorDoc.exists) {
      const vendorData = vendorDoc.data();
      if (vendorData?.status === "active") {
        vendor = {
          id: vendorDoc.id,
          ...vendorData,
          createdAt: vendorData.createdAt?.toDate?.()?.toISOString() || null,
          updatedAt: vendorData.updatedAt?.toDate?.()?.toISOString() || null,
        } as Vendor;
      }
    }

    // Fetch active services
    const servicesSnapshot = await db
      .collection("services")
      .where("userId", "==", id)
      .where("status", "==", "active")
      .orderBy("createdAt", "desc")
      .limit(10)
      .get();

    const services: Service[] = servicesSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null,
      updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || null,
    })) as Service[];

    return { profile, jobs, training, vendor, services };
  } catch (error) {
    console.error("Error fetching organization:", error);
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const data = await getOrganizationData(id);

  if (!data) {
    return {
      title: "Organization Not Found | IOPPS",
    };
  }

  const description =
    data.profile.description?.substring(0, 160) ||
    `${data.profile.organizationName} - Indigenous-focused organization on IOPPS`;

  return {
    title: `${data.profile.organizationName} | IOPPS`,
    description,
    openGraph: {
      title: data.profile.organizationName,
      description,
      images: data.profile.logoUrl ? [data.profile.logoUrl] : [],
    },
    twitter: {
      card: "summary_large_image",
      title: data.profile.organizationName,
      description,
    },
  };
}

export default async function OrganizationProfilePage({ params }: Props) {
  const { id } = await params;
  const data = await getOrganizationData(id);

  if (!data) {
    notFound();
  }

  return <OrganizationProfileClient {...data} />;
}
