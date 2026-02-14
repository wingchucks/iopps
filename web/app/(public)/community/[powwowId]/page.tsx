import { notFound } from "next/navigation";
import { getPowwowById } from "@/lib/firestore/powwows";
import type { Metadata } from "next";
import PowwowDetailClient from "./PowwowDetailClient";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PowwowDetailPageProps {
  params: Promise<{ powwowId: string }>;
}

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export async function generateMetadata({
  params,
}: PowwowDetailPageProps): Promise<Metadata> {
  const { powwowId } = await params;
  const powwow = await getPowwowById(powwowId);

  if (!powwow) {
    return { title: "Pow Wow Not Found | IOPPS" };
  }

  return {
    title: `${powwow.name} | IOPPS Community`,
    description:
      powwow.description?.slice(0, 160) ||
      `${powwow.name} - ${powwow.location}`,
    openGraph: {
      title: powwow.name,
      description: powwow.description?.slice(0, 160),
      type: "website",
    },
  };
}

// ---------------------------------------------------------------------------
// Page (Server Component)
// ---------------------------------------------------------------------------

export default async function PowwowDetailPage({
  params,
}: PowwowDetailPageProps) {
  const { powwowId } = await params;
  const powwow = await getPowwowById(powwowId);

  if (!powwow) {
    notFound();
  }

  // Serialize Firestore timestamps for client component
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const serializedPowwow = JSON.parse(JSON.stringify(powwow)) as any;

  return <PowwowDetailClient powwow={serializedPowwow} />;
}
