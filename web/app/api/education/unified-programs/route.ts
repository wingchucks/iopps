import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase-admin";
import type { UnifiedEducationListing, ProgramSource, UnifiedProgramType, ProgramLevel, NorthAmericanRegion, ProgramTuition } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Helper to convert Firestore timestamp to date string
function timestampToDateString(timestamp: any): string | null {
  if (!timestamp) return null;
  if (timestamp.toDate) {
    return timestamp.toDate().toISOString();
  }
  if (typeof timestamp === "string") {
    return timestamp;
  }
  return null;
}

// Helper to format duration for education programs
function formatEducationDuration(duration: { value: number; unit: string } | undefined): string | undefined {
  if (!duration) return undefined;
  return `${duration.value} ${duration.unit}`;
}

// Helper to format cost display for education programs
function formatEducationCost(tuition: ProgramTuition | undefined): string | undefined {
  if (!tuition) return undefined;
  if (tuition.domestic) {
    const formatted = new Intl.NumberFormat("en-CA", {
      style: "currency",
      currency: "CAD",
      maximumFractionDigits: 0,
    }).format(tuition.domestic);
    return `${formatted}/${tuition.per}`;
  }
  return undefined;
}

// Normalize education program to unified listing
function normalizeEducationProgram(doc: FirebaseFirestore.DocumentSnapshot): UnifiedEducationListing {
  const data = doc.data()!;

  return {
    id: `edu_${doc.id}`,
    source: "school",
    programType: "academic",

    title: data.name,
    slug: data.slug,
    description: data.description || "",
    shortDescription: data.shortDescription,

    providerName: data.schoolName || "Unknown School",
    providerId: data.schoolId,
    providerType: "school",

    category: data.category,
    level: data.level as ProgramLevel,
    skills: undefined,
    certificationOffered: undefined,

    format: data.deliveryMethod || "in-person",
    duration: formatEducationDuration(data.duration),
    location: data.communityDelivery ? "Community Delivery Available" : undefined,
    region: undefined,

    costDisplay: formatEducationCost(data.tuition),
    fundingAvailable: undefined,
    tuition: data.tuition,

    indigenousFocused: data.indigenousFocused || false,

    enrollmentType: "internal",
    applicationUrl: data.applicationUrl || data.sourceUrl,
    enrollmentUrl: undefined,

    featured: data.featured || false,
    isOngoing: false,
    startDate: data.intakeDates?.[0]?.startDate
      ? timestampToDateString(data.intakeDates[0].startDate)
      : null,

    imageUrl: data.imageUrl,
    viewCount: data.viewCount || data.viewsCount || 0,

    originalId: doc.id,
    originalCollection: "education_programs",
  };
}

// Normalize training program to unified listing
function normalizeTrainingProgram(doc: FirebaseFirestore.DocumentSnapshot): UnifiedEducationListing {
  const data = doc.data()!;

  return {
    id: `train_${doc.id}`,
    source: "provider",
    programType: "training",

    title: data.title,
    slug: undefined,
    description: data.description || "",
    shortDescription: data.shortDescription,

    providerName: data.providerName || data.organizationName || "Training Provider",
    providerId: data.organizationId,
    providerType: "organization",

    category: data.category,
    level: undefined,
    skills: data.skills || [],
    certificationOffered: data.certificationOffered,

    format: data.format || "online",
    duration: data.duration,
    location: data.location,
    region: data.region as NorthAmericanRegion | undefined,

    costDisplay: data.cost,
    fundingAvailable: data.fundingAvailable || false,
    tuition: undefined,

    indigenousFocused: data.indigenousFocused || false,

    enrollmentType: "external",
    applicationUrl: undefined,
    enrollmentUrl: data.enrollmentUrl,

    featured: data.featured || false,
    isOngoing: data.ongoing || false,
    startDate: data.startDate ? timestampToDateString(data.startDate) : null,

    imageUrl: data.imageUrl,
    viewCount: data.viewCount || 0,

    originalId: doc.id,
    originalCollection: "training_programs",
  };
}

/**
 * GET /api/education/unified-programs
 * List both education and training programs with unified filtering
 */
export async function GET(req: NextRequest) {
  try {
    if (!db) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 503 }
      );
    }

    const { searchParams } = new URL(req.url);

    // Unified filters
    const source = searchParams.get("source") as ProgramSource | null; // "school" | "provider" | null (all)
    const programType = searchParams.get("type") as UnifiedProgramType | null; // "academic" | "training" | null (all)
    const category = searchParams.get("category");
    const level = searchParams.get("level"); // Only applies to education programs
    const format = searchParams.get("format"); // "in-person" | "online" | "hybrid"
    const indigenousFocused = searchParams.get("indigenousFocused");
    const fundingAvailable = searchParams.get("fundingAvailable"); // Only applies to training programs
    const featured = searchParams.get("featured");
    const search = searchParams.get("search");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Determine which collections to query
    const queryEducation = !source || source === "school" || (!programType || programType === "academic");
    const queryTraining = !source || source === "provider" || (!programType || programType === "training");

    // Exclude education programs if training-only filters are applied
    const shouldExcludeEducation = fundingAvailable === "true";
    // Exclude training programs if education-only filters are applied
    const shouldExcludeTraining = !!level;

    const results: UnifiedEducationListing[] = [];

    // Query education programs (if applicable)
    if (queryEducation && !shouldExcludeEducation) {
      let eduQuery: FirebaseFirestore.Query = db.collection("education_programs")
        .where("isPublished", "==", true)
        .where("status", "==", "approved");

      if (category) {
        eduQuery = eduQuery.where("category", "==", category);
      }

      if (level) {
        eduQuery = eduQuery.where("level", "==", level);
      }

      if (format) {
        eduQuery = eduQuery.where("deliveryMethod", "==", format);
      }

      if (indigenousFocused === "true") {
        eduQuery = eduQuery.where("indigenousFocused", "==", true);
      }

      if (featured === "true") {
        eduQuery = eduQuery.where("featured", "==", true);
      }

      // Fetch with higher limit to allow for client-side filtering and pagination
      eduQuery = eduQuery.orderBy("name", "asc").limit(limit * 2);

      const eduSnapshot = await eduQuery.get();
      for (const doc of eduSnapshot.docs) {
        results.push(normalizeEducationProgram(doc));
      }
    }

    // Query training programs (if applicable)
    if (queryTraining && !shouldExcludeTraining) {
      let trainQuery: FirebaseFirestore.Query = db.collection("training_programs")
        .where("status", "==", "approved")
        .where("active", "==", true);

      if (category) {
        trainQuery = trainQuery.where("category", "==", category);
      }

      if (format) {
        trainQuery = trainQuery.where("format", "==", format);
      }

      if (indigenousFocused === "true") {
        trainQuery = trainQuery.where("indigenousFocused", "==", true);
      }

      if (fundingAvailable === "true") {
        trainQuery = trainQuery.where("fundingAvailable", "==", true);
      }

      if (featured === "true") {
        trainQuery = trainQuery.where("featured", "==", true);
      }

      // Fetch with higher limit to allow for client-side filtering and pagination
      trainQuery = trainQuery.orderBy("title", "asc").limit(limit * 2);

      const trainSnapshot = await trainQuery.get();
      for (const doc of trainSnapshot.docs) {
        results.push(normalizeTrainingProgram(doc));
      }
    }

    // Apply client-side text search if specified
    let filteredResults = results;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredResults = results.filter(
        (p) =>
          p.title?.toLowerCase().includes(searchLower) ||
          p.description?.toLowerCase().includes(searchLower) ||
          p.providerName?.toLowerCase().includes(searchLower) ||
          p.category?.toLowerCase().includes(searchLower) ||
          p.skills?.some((s) => s.toLowerCase().includes(searchLower))
      );
    }

    // Filter by source if explicitly set
    if (source === "school") {
      filteredResults = filteredResults.filter((p) => p.source === "school");
    } else if (source === "provider") {
      filteredResults = filteredResults.filter((p) => p.source === "provider");
    }

    // Filter by program type if explicitly set
    if (programType === "academic") {
      filteredResults = filteredResults.filter((p) => p.programType === "academic");
    } else if (programType === "training") {
      filteredResults = filteredResults.filter((p) => p.programType === "training");
    }

    // Sort: featured first, then alphabetically by title
    filteredResults.sort((a, b) => {
      if (a.featured && !b.featured) return -1;
      if (!a.featured && b.featured) return 1;
      return a.title.localeCompare(b.title);
    });

    // Apply pagination
    const total = filteredResults.length;
    const paginatedResults = filteredResults.slice(offset, offset + limit);

    return NextResponse.json({
      programs: paginatedResults,
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
    });
  } catch (error) {
    console.error("Error listing unified programs:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
