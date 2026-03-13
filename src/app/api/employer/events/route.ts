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
    const snap = await db.collection("events")
      .where("employerId", "==", employer.orgId)
      .orderBy("createdAt", "desc")
      .limit(50)
      .get();

    const events = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return NextResponse.json({ events });
  } catch (error) {
    const status = error instanceof EmployerApiError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Failed to load events.";
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    const employer = await requireEmployerPublishingContext(req);
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
      organizerName: (employer.organizationData.name as string) || body.organizerName || "",
      slug,
      status: "active",
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const ref = await db.collection("events").add(eventData);
    return NextResponse.json({ id: ref.id, ...eventData }, { status: 201 });
  } catch (error) {
    const status = error instanceof EmployerApiError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Failed to create event.";
    return NextResponse.json({ error: message }, { status });
  }
}
