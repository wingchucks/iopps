import type { Metadata } from "next";
import { db } from "@/lib/firebase-admin";
import { buildMetadata, buildOgImageUrl } from "@/lib/seo";
import SchoolDetailClient from "./SchoolDetailClient";
import type { School } from "@/lib/types";

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

// Fetch school data server-side (try by slug first, then by ID)
async function getSchoolData(slugOrId: string): Promise<any | null> {
  try {
    if (!db) {
      console.error("Firebase Admin not initialized");
      return null;
    }

    // Try by slug first
    const slugQuery = await db.collection("schools")
      .where("slug", "==", slugOrId)
      .where("active", "==", true)
      .limit(1)
      .get();

    if (!slugQuery.empty) {
      const doc = slugQuery.docs[0];
      return serializeForClient({ id: doc.id, ...doc.data() });
    }

    // Try by ID
    const docRef = db.collection("schools").doc(slugOrId);
    const docSnap = await docRef.get();
    if (docSnap.exists && docSnap.data()?.active !== false) {
      return serializeForClient({ id: docSnap.id, ...docSnap.data() });
    }

    return null;
  } catch (error) {
    console.error("Error fetching school:", error);
    return null;
  }
}

// Generate dynamic metadata for social sharing
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const school = await getSchoolData(slug);

  if (!school) {
    return buildMetadata({
      title: "School Not Found",
      description: "This school could not be found.",
      path: `/education/schools/${slug}`,
      noIndex: true,
    });
  }

  const title = `${school.name} — School`;

  // Build subtitle for OG image
  const subtitleParts = [];
  if (school.headOffice?.city && school.headOffice?.province) {
    subtitleParts.push(`${school.headOffice.city}, ${school.headOffice.province}`);
  }
  if (school.type) subtitleParts.push(school.type.replace("_", " "));
  if (school.stats?.totalPrograms) subtitleParts.push(`${school.stats.totalPrograms} programs`);
  const subtitle = subtitleParts.join(" • ") || "Educational Institution";

  // Build description
  const rawDescription = school.description?.replace(/<[^>]*>/g, '').slice(0, 200) || "";
  const description = subtitle
    ? `${subtitle} — ${rawDescription}`
    : rawDescription || `Explore ${school.name} on IOPPS.ca`;

  // Generate dynamic OG image URL
  const ogImageUrl = buildOgImageUrl({
    title: school.name,
    subtitle,
    type: "school",
    image: school.logoUrl,
  });

  return buildMetadata({
    title,
    description,
    path: `/education/schools/${school.slug || school.id}`,
    image: ogImageUrl,
  });
}

export default async function SchoolDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const school = await getSchoolData(slug);

  return (
    <SchoolDetailClient
      school={school as School | null}
      error={!school ? "School not found" : undefined}
    />
  );
}
