import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import {
  deriveOwnerType,
  matchesOrgName,
  serialize,
  withPublicOwnership,
  type JsonRecord,
} from "@/lib/server/public-ownership";

export const runtime = "nodejs";
export const revalidate = 60;

export async function GET() {
  try {
    const db = getAdminDb();

    const [programPostsSnap, organizationsSnap] = await Promise.all([
      db.collection("posts").where("type", "==", "program").get(),
      db.collection("organizations").get(),
    ]);

    const organizations = organizationsSnap.docs.map((doc) => serialize({ id: doc.id, ...doc.data() }) as JsonRecord);
    const orgById = new Map(organizations.map((org) => [String(org.id || ""), org]));
    const schoolOrgs = organizations.filter((org) => deriveOwnerType(org) === "school");

    const programs = programPostsSnap.docs
      .map((doc) => serialize({ id: doc.id, ...doc.data() }) as JsonRecord)
      .filter((program) => {
        if (String(program.status || "").toLowerCase() === "closed") return false;
        const org = orgById.get(String(program.orgId || ""));
        if (org) return deriveOwnerType(org) === "school";

        return schoolOrgs.some((school) =>
          matchesOrgName(program.orgName, String(school.name || "")) ||
          matchesOrgName(program.provider, String(school.name || "")) ||
          matchesOrgName(program.institutionName, String(school.name || "")),
        );
      })
      .map((program) => {
        const org =
          orgById.get(String(program.orgId || "")) ||
          schoolOrgs.find((school) =>
            matchesOrgName(program.orgName, String(school.name || "")) ||
            matchesOrgName(program.provider, String(school.name || "")) ||
            matchesOrgName(program.institutionName, String(school.name || "")),
          ) ||
          null;

        const ownerId = String(program.orgId || org?.id || "");
        const ownerName = String(program.orgName || program.institutionName || program.provider || org?.name || "");
        const ownerSlug = String(org?.slug || ownerId);
        const cleanId = String(program.id || "").replace(/^program-/, "");

        return withPublicOwnership(
          {
            ...program,
            id: String(program.id || ""),
            slug: String(program.slug || cleanId),
            href: `/programs/${String(program.slug || cleanId)}`,
            orgId: ownerId,
            orgName: ownerName,
            institutionName: String(program.institutionName || ownerName),
          },
          {
            contentType: "program",
            ownerType: "school",
            ownerId,
            ownerName,
            ownerSlug,
          },
        );
      });

    return NextResponse.json({ programs });
  } catch (err) {
    console.error("Failed to fetch programs:", err);
    return NextResponse.json({ programs: [] }, { status: 500 });
  }
}
