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

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://iopps.ca";
  const description =
    service.tagline ||
    service.description?.substring(0, 160) ||
    `Professional ${service.category} services by ${service.businessName}`;

  // Build subtitle with location and remote info
  const subtitleParts: string[] = [service.category];
  if (service.location) subtitleParts.push(service.location);
  if (service.servesRemote) subtitleParts.push("Remote Available");
  const subtitle = subtitleParts.join(" • ");

  // Generate dynamic OG image URL
  const ogImageUrl = `${siteUrl}/api/og?title=${encodeURIComponent(service.title)}&type=service&subtitle=${encodeURIComponent(subtitle)}${service.logoUrl ? `&image=${encodeURIComponent(service.logoUrl)}` : ''}`;

  return {
    title: `${service.title} | ${service.businessName} | IOPPS`,
    description,
    openGraph: {
      title: service.title,
      description,
      url: `${siteUrl}/marketplace/services/${id}`,
      images: [
        {
          url: service.coverImageUrl || ogImageUrl,
          width: 1200,
          height: 630,
          alt: service.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: service.title,
      description,
      images: [service.coverImageUrl || ogImageUrl],
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
