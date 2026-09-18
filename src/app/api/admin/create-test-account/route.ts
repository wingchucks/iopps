import { NextResponse } from "next/server";

export const runtime = "nodejs";

// Fictional accounts belong in the isolated emulator, never in the live project.
function retired() {
  return NextResponse.json(
    { error: "This test-account endpoint has been retired. Use the preview demo or local emulators." },
    { status: 410 },
  );
}

export const POST = retired;
export const DELETE = retired;
