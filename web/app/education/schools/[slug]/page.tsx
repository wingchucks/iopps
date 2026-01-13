import { db } from "@/lib/firebase-admin";
import SchoolDetailClient from "./SchoolDetailClient";
import type { Metadata } from "next";

interface PageProps {
  params: Promise<{ slug: string }>;
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

async function getSchoolData(slug: string) {
  if (!db) return null;
  // Try slug first
  const snapshot = await db.collection("schools").where("slug", "==", slug).limit(1).get();
  if (snapshot.empty) {
    // Try ID
    const doc = await db.collection("schools").doc(slug).get();
    if (doc.exists) {
      return serializeForClient({ id: doc.id, ...doc.data() });
    }
    return null;
  }
  const doc = snapshot.docs[0];
  return serializeForClient({ id: doc.id, ...doc.data() });
}

// Sub-collections fetching
async function getSubCollection(schoolId: string, collection: string) {
  if (!db) return [];
  const snap = await db.collection("schools").doc(schoolId).collection(collection).get();
  return snap.docs.map(d => serializeForClient({ id: d.id, ...d.data() }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const school = await getSchoolData(slug);

  if (!school) {
    return {
      title: "School Not Found | IOPPS",
    };
  }

  const title = `${school.name} - Indigenous Education | IOPPS`;
  const description = school.description?.slice(0, 160) || "Learn more about this verified Indigenous education provider.";

  const ogUrl = new URL(`${process.env.NEXT_PUBLIC_SITE_URL}/api/og`);
  ogUrl.searchParams.set("title", school.name);
  ogUrl.searchParams.set("subtitle", `${school.headOffice?.city || "Canada"}, ${school.headOffice?.province || ""}`);
  ogUrl.searchParams.set("type", "School");
  if (school.logoUrl) {
    // ogUrl.searchParams.set("image", school.logoUrl); // Optional: Pass logo if URL length allows
  }

  return {
    title,
    description,
    openGraph: {
      title: school.name,
      description,
      type: "website",
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

export default async function SchoolDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const school = await getSchoolData(slug);

  if (!school) {
    return (
      <div className="min-h-screen pt-20 text-center text-white">
        <h1 className="text-2xl font-bold">School not found</h1>
      </div>
    );
  }

  // Fetch related data server-side
  const [programs, scholarships, events] = await Promise.all([
    getSubCollection(school.id, "programs"),
    getSubCollection(school.id, "scholarships"),
    getSubCollection(school.id, "events"),
  ]);

  // Note: 'isSaved' depends on the specific user, so it must be fetched client-side 
  // or via a separate client-side effect in the component. 
  // We'll pass `initialIsSaved={false}` and let the client component useEffect check it.

  return (
    <SchoolDetailClient
      school={school}
      initialPrograms={programs}
      initialScholarships={scholarships}
      initialEvents={events}
      initialIsSaved={false}
    />
  );
}
