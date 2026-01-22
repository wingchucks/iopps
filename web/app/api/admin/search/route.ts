import { NextRequest, NextResponse } from "next/server";
import { auth, db } from "@/lib/firebase-admin";
import type { QueryDocumentSnapshot } from "firebase-admin/firestore";

interface SearchResult {
  id: string;
  type: "user" | "member" | "employer" | "job" | "vendor" | "conference" | "powwow";
  title: string;
  subtitle?: string;
  href: string;
}

export async function GET(request: NextRequest) {
  try {
    // Verify Firebase Admin is initialized
    if (!auth || !db) {
      return NextResponse.json(
        { error: "Server configuration error", results: [] },
        { status: 503 }
      );
    }

    // Verify auth - require Bearer token
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Unauthorized", results: [] },
        { status: 401 }
      );
    }

    // Verify the token and get user ID
    const idToken = authHeader.split("Bearer ")[1];
    let userId: string;
    try {
      const decodedToken = await auth.verifyIdToken(idToken);
      userId = decodedToken.uid;
    } catch {
      return NextResponse.json(
        { error: "Invalid token", results: [] },
        { status: 401 }
      );
    }

    // Verify user has admin or moderator role
    const userDoc = await db.collection("users").doc(userId).get();
    const userData = userDoc.data();
    if (!userData || (userData.role !== "admin" && userData.role !== "moderator")) {
      return NextResponse.json(
        { error: "Forbidden - Admin access required", results: [] },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.toLowerCase().trim();
    const limitParam = searchParams.get("limit");
    const limit = Math.min(parseInt(limitParam || "10", 10), 50);

    if (!query || query.length < 2) {
      return NextResponse.json({ results: [] });
    }

    if (!db) {
      return NextResponse.json({ error: "Database not available", results: [] }, { status: 500 });
    }

    const results: SearchResult[] = [];

    // Search employers
    try {
      const employersSnap = await db.collection("employers").get();
      employersSnap.docs.forEach((doc: QueryDocumentSnapshot) => {
        const data = doc.data();
        const name = data.organizationName?.toLowerCase() || "";
        const email = data.contactEmail?.toLowerCase() || "";
        const location = data.location?.toLowerCase() || "";

        if (name.includes(query) || email.includes(query) || location.includes(query)) {
          results.push({
            id: doc.id,
            type: "employer",
            title: data.organizationName || "Unnamed Employer",
            subtitle: data.location || data.contactEmail,
            href: `/admin/employers?search=${encodeURIComponent(data.organizationName || doc.id)}`,
          });
        }
      });
    } catch (e) {
      console.error("Error searching employers:", e);
    }

    // Search jobs
    try {
      const jobsSnap = await db.collection("jobs").get();
      jobsSnap.docs.forEach((doc: QueryDocumentSnapshot) => {
        const data = doc.data();
        const title = data.title?.toLowerCase() || "";
        const employer = data.employerName?.toLowerCase() || "";
        const location = data.location?.toLowerCase() || "";

        if (title.includes(query) || employer.includes(query) || location.includes(query)) {
          results.push({
            id: doc.id,
            type: "job",
            title: data.title || "Untitled Job",
            subtitle: data.employerName || data.location,
            href: `/admin/jobs/${doc.id}/edit`,
          });
        }
      });
    } catch (e) {
      console.error("Error searching jobs:", e);
    }

    // Search users
    try {
      const usersSnap = await db.collection("users").get();
      usersSnap.docs.forEach((doc: QueryDocumentSnapshot) => {
        const data = doc.data();
        const name = data.displayName?.toLowerCase() || "";
        const email = data.email?.toLowerCase() || "";

        if (name.includes(query) || email.includes(query)) {
          results.push({
            id: doc.id,
            type: "user",
            title: data.displayName || data.email || "Unknown User",
            subtitle: data.email,
            href: `/admin/users?search=${encodeURIComponent(data.email || doc.id)}`,
          });
        }
      });
    } catch (e) {
      console.error("Error searching users:", e);
    }

    // Search member profiles
    try {
      const membersSnap = await db.collection("memberProfiles").get();
      membersSnap.docs.forEach((doc: QueryDocumentSnapshot) => {
        const data = doc.data();
        const name = data.fullName?.toLowerCase() || data.displayName?.toLowerCase() || "";
        const headline = data.headline?.toLowerCase() || "";

        if (name.includes(query) || headline.includes(query)) {
          results.push({
            id: doc.id,
            type: "member",
            title: data.fullName || data.displayName || "Unknown Member",
            subtitle: data.headline || data.location,
            href: `/admin/members?search=${encodeURIComponent(data.fullName || doc.id)}`,
          });
        }
      });
    } catch (e) {
      console.error("Error searching members:", e);
    }

    // Search vendors
    try {
      const vendorsSnap = await db.collection("vendors").get();
      vendorsSnap.docs.forEach((doc: QueryDocumentSnapshot) => {
        const data = doc.data();
        const name = data.businessName?.toLowerCase() || "";
        const description = data.description?.toLowerCase() || "";

        if (name.includes(query) || description.includes(query)) {
          results.push({
            id: doc.id,
            type: "vendor",
            title: data.businessName || "Unknown Vendor",
            subtitle: data.location,
            href: `/admin/vendors?search=${encodeURIComponent(data.businessName || doc.id)}`,
          });
        }
      });
    } catch (e) {
      console.error("Error searching vendors:", e);
    }

    // Search conferences
    try {
      const conferencesSnap = await db.collection("conferences").get();
      conferencesSnap.docs.forEach((doc: QueryDocumentSnapshot) => {
        const data = doc.data();
        const title = data.title?.toLowerCase() || "";
        const location = data.location?.toLowerCase() || "";

        if (title.includes(query) || location.includes(query)) {
          results.push({
            id: doc.id,
            type: "conference",
            title: data.title || "Untitled Conference",
            subtitle: data.location,
            href: `/admin/conferences/${doc.id}/edit`,
          });
        }
      });
    } catch (e) {
      console.error("Error searching conferences:", e);
    }

    // Search pow wows
    try {
      const powwowsSnap = await db.collection("powwows").get();
      powwowsSnap.docs.forEach((doc: QueryDocumentSnapshot) => {
        const data = doc.data();
        const name = data.name?.toLowerCase() || "";
        const location = data.location?.toLowerCase() || "";

        if (name.includes(query) || location.includes(query)) {
          results.push({
            id: doc.id,
            type: "powwow",
            title: data.name || "Untitled Pow Wow",
            subtitle: data.location,
            href: `/admin/powwows/${doc.id}/edit`,
          });
        }
      });
    } catch (e) {
      console.error("Error searching powwows:", e);
    }

    // Limit results
    const limitedResults = results.slice(0, limit);

    return NextResponse.json({ results: limitedResults });
  } catch (error) {
    console.error("Admin search error:", error);
    return NextResponse.json(
      { error: "Search failed", results: [] },
      { status: 500 }
    );
  }
}
