import { NextRequest, NextResponse } from "next/server";
import { notifyAdmin } from "@/lib/admin-notifications";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/notify
 * Sends admin notification emails for platform events
 * Called client-side after key actions (signup, job post, contact form, etc.)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, ...data } = body;

    if (!type) {
      return NextResponse.json(
        { error: "Missing notification type" },
        { status: 400 }
      );
    }

    // Fire and forget - don't block the response
    notifyAdmin({ type, ...data }).catch((err) => {
      console.error("[Admin Notify API] Error:", err);
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Admin Notify API] Error:", error);
    // Still return success - we don't want to fail user actions due to notification errors
    return NextResponse.json({ success: true });
  }
}
