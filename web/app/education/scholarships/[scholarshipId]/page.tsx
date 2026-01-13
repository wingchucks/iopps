import { db } from "@/lib/firebase-admin";
import ScholarshipDetailClient from "./ScholarshipDetailClient";
import type { Metadata } from "next";

interface PageProps {
  params: Promise<{ scholarshipId: string }>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serializeForClient(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (obj && typeof obj === 'object' && typeof obj.toDate === 'function') {
    return { _seconds: obj.seconds || Math.floor(obj.toDate().getTime() / 1000) };
  }
  if (obj instanceof Date) {
    return { _seconds: Math.floor(obj.getTime() / 1000) };
  }
  if (Array.isArray(obj)) {
    return obj.map(serializeForClient);
  }
  if (typeof obj === 'object') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any = {};
    for (const key of Object.keys(obj)) {
      result[key] = serializeForClient(obj[key]);
    }
    return result;
  }
  return obj;
}

async function getScholarshipData(id: string) {
  if (!db) return null;
  const doc = await db.collection("scholarships").doc(id).get();
  if (!doc.exists) return null;
  return serializeForClient({ id: doc.id, ...doc.data() });
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { scholarshipId } = await params;
  const scholarship = await getScholarshipData(scholarshipId);

  if (!scholarship) {
    return {
      title: "Scholarship Not Found | IOPPS",
    };
  }

  const title = `${scholarship.title} - ${scholarship.provider} | IOPPS`;
  const description = scholarship.description?.slice(0, 160) || "Apply for this scholarship on IOPPS.ca";

  const ogUrl = new URL(`${process.env.NEXT_PUBLIC_SITE_URL}/api/og`);
  ogUrl.searchParams.set("title", scholarship.title);
  ogUrl.searchParams.set("subtitle", `Provided by ${scholarship.provider} • ${scholarship.amount || ''}`);
  ogUrl.searchParams.set("type", "Scholarship");

  return {
    title,
    description,
    openGraph: {
      title: scholarship.title,
      description: `Provided by ${scholarship.provider}. Amount: ${scholarship.amount || 'Varies'}.`,
      type: "article",
      images: [
        {
          url: ogUrl.toString(),
          width: 1200,
          height: 630,
        },
      ],
    },
  };
}

export default async function ScholarshipDetailPage({ params }: PageProps) {
  const { scholarshipId } = await params;
  const scholarship = await getScholarshipData(scholarshipId);

  if (!scholarship) {
    // You might want to handle not found better, e.g. notFound() from next/navigation
    return (
      <div className="min-h-screen pt-20 text-center text-white">
        <h1 className="text-2xl font-bold">Scholarship not found</h1>
      </div>
    )
  }

  return <ScholarshipDetailClient scholarship={scholarship} />;
}
