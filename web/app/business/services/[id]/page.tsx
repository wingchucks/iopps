import { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/firebase-admin";
import ServiceDetailClient from "./ServiceDetailClient";
import type { Service } from "@/lib/types";

interface Props {
  params: Promise<{ id: string }>;
}

async function getServiceData(id: string): Promise<Service | null> {
  if (!db) {
    console.error("Firebase Admin not initialized");
    return null;
  }

  try {
    const doc = await db.collection("services").doc(id).get();

    if (!doc.exists) {
      return null;
    }

    const data = doc.data();
    if (!data) return null;

    // Only show active services
    if (data.status !== "active") {
      return null;
    }

    return {
      id: doc.id,
      ...data,
      createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
      updatedAt: data.updatedAt?.toDate?.()?.toISOString() || null,
    } as Service;
  } catch (error) {
    console.error("Error fetching service:", error);
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const service = await getServiceData(id);

  if (!service) {
    return {
      title: "Service Not Found | IOPPS",
    };
  }

  const description =
    service.tagline ||
    service.description.substring(0, 160) ||
    `Professional ${service.category} services by ${service.businessName}`;

  return {
    title: `${service.title} | ${service.businessName} | IOPPS`,
    description,
    openGraph: {
      title: service.title,
      description,
      images: service.coverImageUrl ? [service.coverImageUrl] : [],
    },
    twitter: {
      card: "summary_large_image",
      title: service.title,
      description,
    },
  };
}

export default async function ServiceDetailPage({ params }: Props) {
  const { id } = await params;
  const service = await getServiceData(id);

  if (!service) {
    notFound();
  }

  return <ServiceDetailClient service={service} />;
}
