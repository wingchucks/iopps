import type { Metadata } from "next";
import { db } from "@/lib/firebase-admin";
import TrainingDetailClient from "./TrainingDetailClient";
import type { TrainingProgram } from "@/lib/types";

interface PageProps {
  params: Promise<{ id: string }>;
}

// Fetch training program data server-side
async function getTrainingProgramData(
  programId: string
): Promise<TrainingProgram | null> {
  try {
    if (!db) {
      console.error("Firebase Admin not initialized");
      return null;
    }
    const docRef = db.collection("training_programs").doc(programId);
    const docSnap = await docRef.get();
    if (!docSnap.exists) return null;
    return { id: docSnap.id, ...docSnap.data() } as TrainingProgram;
  } catch (error) {
    console.error("Error fetching training program:", error);
    return null;
  }
}

// Generate dynamic metadata for social sharing
export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  const program = await getTrainingProgramData(id);

  if (!program) {
    return {
      title: "Training Program Not Found | IOPPS",
      description: "This training program could not be found.",
    };
  }

  const title = `${program.title} by ${program.providerName} | IOPPS Education`;
  const description =
    program.shortDescription ||
    program.description?.slice(0, 160) ||
    `${program.title} - Training Program`;
  const url = `https://iopps.ca/education/training/${id}`;

  // Build program info
  let programInfo = "";
  if (program.format) {
    programInfo += program.format.charAt(0).toUpperCase() + program.format.slice(1);
  }
  if (program.duration) {
    programInfo += programInfo ? ` | ${program.duration}` : program.duration;
  }

  const fullDescription = programInfo
    ? `${programInfo}\n\n${description}`
    : description;

  return {
    title,
    description: fullDescription,
    openGraph: {
      title: `${program.title} by ${program.providerName}`,
      description: fullDescription,
      url,
      siteName: "IOPPS - Indigenous Opportunities",
      type: "website",
      images: program.imageUrl
        ? [
            {
              url: program.imageUrl,
              width: 1200,
              height: 630,
              alt: `${program.title} training program`,
            },
          ]
        : [
            {
              url: "https://iopps.ca/og-image.png",
              width: 1200,
              height: 630,
              alt: "IOPPS - Indigenous Opportunities",
            },
          ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${program.title} by ${program.providerName}`,
      description: fullDescription,
      images: program.imageUrl
        ? [program.imageUrl]
        : ["https://iopps.ca/og-image.png"],
    },
  };
}

export default async function TrainingProgramDetailPage({
  params,
}: PageProps) {
  const { id } = await params;
  const program = await getTrainingProgramData(id);

  // Serialize Firestore Timestamps for client component
  const serializedProgram = program
    ? {
        ...program,
        createdAt: program.createdAt
          ? typeof program.createdAt === "object" && "_seconds" in program.createdAt
            ? { _seconds: (program.createdAt as any)._seconds }
            : program.createdAt
          : undefined,
        updatedAt: program.updatedAt
          ? typeof program.updatedAt === "object" && "_seconds" in program.updatedAt
            ? { _seconds: (program.updatedAt as any)._seconds }
            : program.updatedAt
          : undefined,
        startDate: program.startDate
          ? typeof program.startDate === "object" && "_seconds" in program.startDate
            ? { _seconds: (program.startDate as any)._seconds }
            : program.startDate
          : undefined,
        endDate: program.endDate
          ? typeof program.endDate === "object" && "_seconds" in program.endDate
            ? { _seconds: (program.endDate as any)._seconds }
            : program.endDate
          : undefined,
      }
    : null;

  return (
    <TrainingDetailClient
      program={serializedProgram as TrainingProgram | null}
      error={!program ? "Training program not found" : undefined}
    />
  );
}
