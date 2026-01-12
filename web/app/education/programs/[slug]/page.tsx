import type { Metadata } from "next";
import { db } from "@/lib/firebase-admin";
import { buildMetadata, buildOgImageUrl } from "@/lib/seo";
import ProgramDetailClient from "./ProgramDetailClient";
import type { EducationProgram } from "@/lib/types";

interface PageProps {
  params: Promise<{ slug: string }>;
}

// Helper to serialize Firestore data for client components
function serializeForClient(obj: any): any {
  if (obj === null || obj === undefined) return obj;

  // Handle Firestore Timestamp
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
    const result: any = {};
    for (const key of Object.keys(obj)) {
      result[key] = serializeForClient(obj[key]);
    }
    return result;
  }

  return obj;
}

// Fetch program data server-side (try by slug first, then by ID)
async function getProgramData(slugOrId: string): Promise<any | null> {
  try {
    if (!db) {
      console.error("Firebase Admin not initialized");
      return null;
    }

    // Try by slug first
    const slugQuery = await db.collection("education_programs")
      .where("slug", "==", slugOrId)
      .where("active", "==", true)
      .limit(1)
      .get();

    if (!slugQuery.empty) {
      const doc = slugQuery.docs[0];
      return serializeForClient({ id: doc.id, ...doc.data() });
    }

    // Try by ID
    const docRef = db.collection("education_programs").doc(slugOrId);
    const docSnap = await docRef.get();
    if (docSnap.exists && docSnap.data()?.active !== false) {
      return serializeForClient({ id: docSnap.id, ...docSnap.data() });
    }

    return null;
  } catch (error) {
    console.error("Error fetching program:", error);
    return null;
  }
}

// Generate dynamic metadata for social sharing
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const program = await getProgramData(slug);

  if (!program) {
    return buildMetadata({
      title: "Program Not Found",
      description: "This education program could not be found.",
      path: `/education/programs/${slug}`,
      noIndex: true,
    });
  }

  const title = `${program.name} — ${program.level || "Program"}`;

  // Build subtitle for OG image
  const subtitleParts = [];
  if (program.schoolName) subtitleParts.push(program.schoolName);
  if (program.duration?.value && program.duration?.unit) {
    subtitleParts.push(`${program.duration.value} ${program.duration.unit}`);
  }
  if (program.deliveryMethod) subtitleParts.push(program.deliveryMethod);
  const subtitle = subtitleParts.join(" • ") || "Education Program";

  // Build description
  const rawDescription = program.description?.replace(/<[^>]*>/g, '').slice(0, 200) || "";
  const description = subtitle
    ? `${subtitle} — ${rawDescription}`
    : rawDescription || `Explore ${program.name} on IOPPS.ca`;

  // Generate dynamic OG image URL
  const ogImageUrl = buildOgImageUrl({
    title: program.name,
    subtitle,
    type: "program",
  });

  return buildMetadata({
    title,
    description,
    path: `/education/programs/${program.slug || program.id}`,
    image: ogImageUrl,
  });
}

export default async function ProgramDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const program = await getProgramData(slug);

  return (
    <ProgramDetailClient
      program={program as EducationProgram | null}
      error={!program ? "Program not found" : undefined}
    />
  );
}
