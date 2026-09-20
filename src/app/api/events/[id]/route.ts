import { NextResponse } from "next/server";
import { getPublicOpportunity } from "@/lib/server/public-opportunities";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const item = await getPublicOpportunity("events", id);
    return NextResponse.json({ event: item }, { status: item ? 200 : 404, headers: { "Cache-Control": "no-store" } });
  } catch (error) { console.error("event detail:", error); return NextResponse.json({ error: "Could not load this listing. Please try again." }, { status: 500 }); }
}
