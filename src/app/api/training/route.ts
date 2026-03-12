import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import {
  deriveOwnerType,
  serialize,
  withPublicOwnership,
  type JsonRecord,
} from "@/lib/server/public-ownership";

export const runtime = "nodejs";
export const revalidate = 60;

export async function GET() {
  try {
    const db = getAdminDb();

    const [trainingSnap, organizationsSnap] = await Promise.all([
      db.collection("training_programs").where("active", "==", true).limit(500).get(),
      db.collection("organizations").get(),
    ]);

    const orgById = new Map(
      organizationsSnap.docs.map((doc) => [
        doc.id,
        serialize({ id: doc.id, ...doc.data() }) as JsonRecord,
      ]),
    );

    const training = trainingSnap.docs
      .map((doc) => serialize({ id: doc.id, ...doc.data() }) as JsonRecord)
      .filter((program) => {
        const org = orgById.get(String(program.orgId || ""));
        return deriveOwnerType(org) !== "school";
      })
      .map((program) => {
        const org = orgById.get(String(program.orgId || "")) || null;
        const ownerType = deriveOwnerType(org);
        const ownerId = String(program.orgId || org?.id || "");
        const ownerName = String(program.orgName || org?.name || "");
        const ownerSlug = String(org?.slug || ownerId);

        return withPublicOwnership(
          {
            ...program,
            href: `/training/${String(program.slug || program.id || "")}`,
          },
          {
            contentType: "training",
            ownerType,
            ownerId,
            ownerName,
            ownerSlug,
          },
        );
      });

    return NextResponse.json({ training, programs: training });
  } catch (err) {
    console.error("Failed to fetch training:", err);
    return NextResponse.json({ training: [], programs: [] }, { status: 500 });
  }
}
