import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { isPublicJobVisible } from "@/lib/public-jobs";
import { comparePartnerPromotion, withPartnerPromotion } from "@/lib/server/partner-promotion";
import {
  deriveOwnerType,
  matchesOrgName,
  serialize,
  type JsonRecord,
} from "@/lib/server/public-ownership";
import { isSchoolPubliclyVisible } from "@/lib/school-visibility";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export async function GET() {
  try {
    const db = getAdminDb();

    const [typeSnap, tierSnap, programSnap, scholarshipSnap, jobsSnap, jobPostsSnap] = await Promise.all([
      db.collection("organizations").where("type", "==", "school").where("onboardingComplete", "==", true).get(),
      db.collection("organizations").where("tier", "==", "school").where("onboardingComplete", "==", true).get(),
      db.collection("posts").where("type", "==", "program").get(),
      db.collection("scholarships").where("status", "==", "active").get(),
      db.collection("jobs").get(),
      db.collection("posts").where("type", "==", "job").get(),
    ]);

    const seen = new Set<string>();
    const schools = [...typeSnap.docs, ...tierSnap.docs]
      .filter((doc) => {
        if (seen.has(doc.id)) return false;
        seen.add(doc.id);
        return true;
      })
      .map((doc) => serialize({ id: doc.id, ...doc.data() }) as JsonRecord)
      .filter((school) => deriveOwnerType(school) === "school")
      .filter((school) => isSchoolPubliclyVisible(school))
      .map((school) => {
        const schoolId = text(school.id);
        const schoolName = text(school.name);

        const programCount = programSnap.docs.filter((doc) => {
          const data = serialize({ id: doc.id, ...doc.data() }) as JsonRecord;
          if (text(data.status).toLowerCase() === "closed") return false;
          return (
            text(data.orgId) === schoolId ||
            matchesOrgName(data.orgName, schoolName) ||
            matchesOrgName(data.provider, schoolName) ||
            matchesOrgName(data.institutionName, schoolName)
          );
        }).length;

        const scholarshipCount = scholarshipSnap.docs.filter((doc) => {
          const data = serialize({ id: doc.id, ...doc.data() }) as JsonRecord;
          return (
            text(data.orgId) === schoolId ||
            text(data.employerId) === schoolId ||
            matchesOrgName(data.orgName, schoolName) ||
            matchesOrgName(data.organization, schoolName)
          );
        }).length;

        const activeJobCount =
          jobsSnap.docs.filter((doc) => {
            const data = doc.data();
            if (!isPublicJobVisible(data)) return false;
            return text(data.employerId) === schoolId || matchesOrgName(data.employerName, schoolName);
          }).length +
          jobPostsSnap.docs.filter((doc) => {
            const data = doc.data();
            return data.status !== "closed" && (text(data.orgId) === schoolId || matchesOrgName(data.orgName, schoolName));
          }).length;

        return withPartnerPromotion({
          ...school,
          ownerType: "school",
          ownerId: schoolId,
          ownerName: schoolName,
          ownerSlug: text(school.slug) || schoolId,
          openJobs: activeJobCount || Number(school.openJobs || 0),
          programCount,
          scholarshipCount,
          keyStudyAreas: Array.isArray(school.areasOfStudy)
            ? school.areasOfStudy
            : Array.isArray(school.tags)
              ? school.tags
              : [],
        });
      })
      .sort(comparePartnerPromotion);

    return NextResponse.json({ schools });
  } catch (err) {
    console.error("Failed to fetch schools:", err);
    return NextResponse.json({ schools: [] }, { status: 500 });
  }
}
