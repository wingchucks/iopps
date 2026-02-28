import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { getAuth } from "firebase-admin/auth";

async function getEmployerOrg(req: NextRequest) {
  const auth = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!auth) return null;
  try {
    const decoded = await getAuth().verifyIdToken(auth);
    const db = getAdminDb();
    const memberSnap = await db.collection("members").where("uid", "==", decoded.uid).limit(1).get();
    if (memberSnap.empty) return null;
    const member = memberSnap.docs[0].data();
    if (!member.orgId) return null;
    return { uid: decoded.uid, orgId: member.orgId, orgName: member.orgName || "" };
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const employer = await getEmployerOrg(req);
  if (!employer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getAdminDb();
  const snap = await db.collection("events")
    .where("employerId", "==", employer.orgId)
    .orderBy("createdAt", "desc")
    .limit(50)
    .get();

  const events = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return NextResponse.json({ events });
}

export async function POST(req: NextRequest) {
  const employer = await getEmployerOrg(req);
  if (!employer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const db = getAdminDb();

  const slug = (body.title || "event")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);

  const eventData: Record<string, unknown> = {
    title: body.title || "",
    ...(body.eventType ? { eventType: body.eventType } : {}),
    ...(body.date ? { date: body.date } : {}),
    ...(body.endDate ? { endDate: body.endDate } : {}),
    ...(body.location ? { location: body.location } : {}),
    ...(body.description ? { description: body.description } : {}),
    ...(body.posterUrl ? { posterUrl: body.posterUrl } : {}),
    ...(body.admissionType ? { admissionType: body.admissionType } : {}),
    ...(body.externalUrl ? { externalUrl: body.externalUrl } : {}),
    employerId: employer.orgId,
    organizerName: employer.orgName || body.organizerName || "",
    slug,
    status: "active",
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const ref = await db.collection("events").add(eventData);
  return NextResponse.json({ id: ref.id, ...eventData }, { status: 201 });
}
