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
  const snap = await db.collection("scholarships")
    .where("employerId", "==", employer.orgId)
    .orderBy("createdAt", "desc")
    .limit(50)
    .get();

  const scholarships = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return NextResponse.json({ scholarships });
}

export async function POST(req: NextRequest) {
  const employer = await getEmployerOrg(req);
  if (!employer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const db = getAdminDb();

  const slug = (body.title || "scholarship")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);

  const data: Record<string, unknown> = {
    title: body.title || "",
    ...(body.amount ? { amount: body.amount } : {}),
    ...(body.deadline ? { deadline: body.deadline } : {}),
    ...(body.description ? { description: body.description } : {}),
    ...(body.eligibility ? { eligibility: body.eligibility } : {}),
    ...(body.howToApply ? { howToApply: body.howToApply } : {}),
    ...(body.externalUrl ? { externalUrl: body.externalUrl } : {}),
    employerId: employer.orgId,
    organization: employer.orgName || body.organization || "",
    slug,
    status: "active",
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const ref = await db.collection("scholarships").add(data);
  return NextResponse.json({ id: ref.id, ...data }, { status: 201 });
}
