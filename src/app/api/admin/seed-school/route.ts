import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { requireAdminServiceRequest } from "@/lib/internal-auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const unauthorized = requireAdminServiceRequest(request);
  if (unauthorized) return unauthorized;

  const body = await request.json();
  const { id, ...data } = body;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const db = getAdminDb();
  await db.collection("organizations").doc(id).set(data, { merge: true });

  return NextResponse.json({ ok: true, id });
}
