/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth, db as adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { generateSlug, generateUniqueSlug } from "@/lib/firestore/organizations";
import { upsertDirectoryEntry } from "@/lib/firestore/directory";
import type {
  EmployerProfile,
  OrganizationProfile,
  OrgType,
  OrganizationStatus,
  Vendor,
  School,
  OrganizationModule,
} from "@/lib/types";

// POST: Run migration for all existing employers/vendors/schools
export async function POST(request: Request) {
  try {
    // Verify admin access
    const headersList = await headers();
    const authHeader = headersList.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];
    if (!auth) {
      return NextResponse.json({ error: "Auth not initialized" }, { status: 500 });
    }

    const decodedToken = await auth.verifyIdToken(token);
    const userRecord = await auth.getUser(decodedToken.uid);
    const role = userRecord.customClaims?.role;

    if (role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    if (!adminDb) {
      return NextResponse.json({ error: "Database not available" }, { status: 500 });
    }

    const results = {
      employers: { processed: 0, migrated: 0, skipped: 0, errors: [] as string[] },
      vendors: { processed: 0, linked: 0, errors: [] as string[] },
      schools: { processed: 0, linked: 0, errors: [] as string[] },
      directory: { indexed: 0, errors: [] as string[] },
    };

    // --- MIGRATE EMPLOYERS ---
    const employersSnap = await adminDb.collection("employers").get();

    for (const docSnap of employersSnap.docs) {
      results.employers.processed++;
      const employerId = docSnap.id;
      const data = docSnap.data() as EmployerProfile;

      try {
        // Check if already migrated (has slug)
        if ((data as any).slug) {
          results.employers.skipped++;
          continue;
        }

        // Generate slug
        let slug = generateSlug(data.organizationName || "organization");
        const existingWithSlug = await adminDb
          .collection("employers")
          .where("slug", "==", slug)
          .get();
        if (!existingWithSlug.empty && existingWithSlug.docs[0].id !== employerId) {
          slug = generateUniqueSlug(data.organizationName || "organization");
        }

        // Parse location into province/city
        let province = "";
        let city = "";
        if (data.location) {
          const parts = data.location.split(",").map((s) => s.trim());
          if (parts.length >= 2) {
            city = parts[0];
            province = parts[1];
          } else {
            province = parts[0];
          }
        }

        // Determine org type
        let orgType: OrgType = "EMPLOYER";
        if (data.indigenousVerification?.isIndigenousOwned || data.trcAlignment?.isIndigenousOwned) {
          orgType = "INDIGENOUS_BUSINESS";
        }

        // Build links from existing fields
        const links = {
          website: data.website || "",
          email: data.contactEmail || "",
          phone: data.contactPhone || "",
          linkedin: data.socialLinks?.linkedin || "",
          twitter: data.socialLinks?.twitter || "",
          facebook: data.socialLinks?.facebook || "",
          instagram: data.socialLinks?.instagram || "",
        };

        // Determine publication status
        const publicationStatus: OrganizationStatus =
          data.status === "approved" ? "PUBLISHED" : "DRAFT";
        const directoryVisible = publicationStatus === "PUBLISHED";

        // Detect enabled modules from existing data
        const enabledModules: OrganizationModule[] = data.enabledModules || [];

        // Update the employer document
        const ref = adminDb.collection("employers").doc(employerId);
        await ref.update({
          slug,
          orgType,
          province,
          city,
          links,
          publicationStatus,
          directoryVisible,
          publishedAt: publicationStatus === "PUBLISHED" ? FieldValue.serverTimestamp() : null,
          updatedAt: FieldValue.serverTimestamp(),
        });

        results.employers.migrated++;

        // Index in directory if published
        if (publicationStatus === "PUBLISHED") {
          const updatedDoc = await ref.get();
          if (updatedDoc.exists) {
            const updatedProfile = {
              id: updatedDoc.id,
              ...updatedDoc.data(),
            } as OrganizationProfile;
            await upsertDirectoryEntry(updatedProfile);
            results.directory.indexed++;
          }
        }
      } catch (err) {
        results.employers.errors.push(
          `${employerId}: ${err instanceof Error ? err.message : "Unknown error"}`
        );
      }
    }

    // --- LINK VENDORS TO EMPLOYERS ---
    const vendorsSnap = await adminDb.collection("vendors").get();

    for (const docSnap of vendorsSnap.docs) {
      results.vendors.processed++;
      const vendor = { id: docSnap.id, ...docSnap.data() } as Vendor;

      try {
        // Find the employer with this userId
        const employerSnap = await adminDb
          .collection("employers")
          .where("userId", "==", vendor.userId)
          .get();

        if (!employerSnap.empty) {
          const employerDoc = employerSnap.docs[0];
          const employerData = employerDoc.data();

          // Update employer with sell module and vendorId
          const enabledModules = employerData.enabledModules || [];
          if (!enabledModules.includes("sell")) {
            enabledModules.push("sell");
          }

          await adminDb.collection("employers").doc(employerDoc.id).update({
            enabledModules,
            moduleSettings: {
              ...(employerData.moduleSettings || {}),
              sell: {
                enabled: true,
                setupComplete: true,
                vendorId: vendor.id,
              },
            },
            // If vendor is active, update org type to Indigenous Business
            ...(vendor.status === "active" && !employerData.orgType
              ? { orgType: "INDIGENOUS_BUSINESS" }
              : {}),
            updatedAt: FieldValue.serverTimestamp(),
          });

          results.vendors.linked++;
        }
      } catch (err) {
        results.vendors.errors.push(
          `${vendor.id}: ${err instanceof Error ? err.message : "Unknown error"}`
        );
      }
    }

    // --- LINK SCHOOLS TO EMPLOYERS ---
    const schoolsSnap = await adminDb.collection("schools").get();

    for (const docSnap of schoolsSnap.docs) {
      results.schools.processed++;
      const school = { id: docSnap.id, ...docSnap.data() } as School;

      try {
        // Find the employer with this ID
        const employerRef = adminDb.collection("employers").doc(school.employerId);
        const employerSnap = await employerRef.get();

        if (employerSnap.exists) {
          const employerData = employerSnap.data()!;

          // Update employer with educate module and schoolId
          const enabledModules = employerData.enabledModules || [];
          if (!enabledModules.includes("educate")) {
            enabledModules.push("educate");
          }

          await employerRef.update({
            enabledModules,
            moduleSettings: {
              ...(employerData.moduleSettings || {}),
              educate: {
                enabled: true,
                setupComplete: true,
                schoolId: school.id,
              },
            },
            // Update org type to School if not already set
            ...(employerData.orgType !== "SCHOOL" && !employerData.orgType
              ? { orgType: "SCHOOL" }
              : {}),
            updatedAt: FieldValue.serverTimestamp(),
          });

          results.schools.linked++;
        }
      } catch (err) {
        results.schools.errors.push(
          `${school.id}: ${err instanceof Error ? err.message : "Unknown error"}`
        );
      }
    }

    return NextResponse.json({
      success: true,
      results,
      message: `Migration complete. Employers: ${results.employers.migrated} migrated, ${results.employers.skipped} skipped. Directory: ${results.directory.indexed} indexed.`,
    });
  } catch (error) {
    console.error("Migration error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Migration failed" },
      { status: 500 }
    );
  }
}

// GET: Check migration status
export async function GET(request: Request) {
  try {
    // Verify admin access
    const headersList = await headers();
    const authHeader = headersList.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];
    if (!auth) {
      return NextResponse.json({ error: "Auth not initialized" }, { status: 500 });
    }

    const decodedToken = await auth.verifyIdToken(token);
    const userRecord = await auth.getUser(decodedToken.uid);
    const role = userRecord.customClaims?.role;

    if (role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    if (!adminDb) {
      return NextResponse.json({ error: "Database not available" }, { status: 500 });
    }

    // Count employers with and without slug
    const employersSnap = await adminDb.collection("employers").get();
    let migratedCount = 0;
    let notMigratedCount = 0;

    employersSnap.docs.forEach((docSnap) => {
      const data = docSnap.data();
      if (data.slug) {
        migratedCount++;
      } else {
        notMigratedCount++;
      }
    });

    // Count directory entries
    const directorySnap = await adminDb.collection("directory_index").get();

    return NextResponse.json({
      employers: {
        total: employersSnap.size,
        migrated: migratedCount,
        needsMigration: notMigratedCount,
      },
      directory: {
        indexed: directorySnap.size,
      },
    });
  } catch (error) {
    console.error("Status check error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Status check failed" },
      { status: 500 }
    );
  }
}
