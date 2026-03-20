import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { getAuth } from "firebase-admin/auth";

export async function GET(req: NextRequest) {
  const auth = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const decoded = await getAuth().verifyIdToken(auth);
    const db = getAdminDb();
    const memberSnap = await db.collection("members").where("uid", "==", decoded.uid).limit(1).get();
    if (memberSnap.empty) return NextResponse.json({ applications: [] });
    const member = memberSnap.docs[0].data();
    if (!member.orgId) return NextResponse.json({ applications: [] });

    const snap = await db.collection("applications")
      .where("employerId", "==", member.orgId)
      .orderBy("appliedAt", "desc")
      .limit(100)
      .get();

    const applications = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return NextResponse.json({ applications });
  } catch {
    return NextResponse.json({ applications: [] });
  }
}