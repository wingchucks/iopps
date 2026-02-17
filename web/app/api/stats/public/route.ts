import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function GET() {
  if (!adminDb) return NextResponse.json({ error: "DB not initialized" }, { status: 500 });

  const [jobsSnap, orgsSnap, usersSnap, eventsSnap] = await Promise.all([
    adminDb.collection("posts").where("type", "==", "job").where("status", "==", "active").count().get(),
    adminDb.collection("organizations").where("disabled", "==", false).count().get(),
    adminDb.collection("users").where("disabled", "==", false).count().get(),
    adminDb.collection("posts").where("type", "==", "event").where("status", "==", "active").count().get(),
  ]);

  return NextResponse.json({
    jobCount: jobsSnap.data().count,
    orgCount: orgsSnap.data().count,
    memberCount: usersSnap.data().count,
    eventCount: eventsSnap.data().count,
  });
}
