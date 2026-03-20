import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import {
  EmployerApiError,
  requireEmployerContext,
  requireEmployerPublishingContext,
} from "@/lib/server/employer-auth";

export async function GET(req: NextRequest) {
  try {
    const employer = await requireEmployerContext(req);
    const db = getAdminDb();
    const snap = await db.collection("scholarships")
      .where("employerId", "==", employer.orgId)
      .orderBy("createdAt", "desc")
      .limit(50)
      .get();

    const scholarships = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return NextResponse.json({ scholarships });
  } catch (error) {
    const status = error instanceof EmployerApiError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Failed to load scholarships.";
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    const employer = await requireEmployerPublishingContext(req);
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
      organization: (employer.organizationData.name as string) || body.organization || "",
      slug,
      status: "active",
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const ref = await db.collection("scholarships").add(data);
    return NextResponse.json({ id: ref.id, ...data }, { status: 201 });
  } catch (error) {
    const status = error instanceof EmployerApiError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Failed to create scholarship.";
    return NextResponse.json({ error: message }, { status });
  }
}
