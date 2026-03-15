// Save this as: app/api/newsletter/subscribe/route.ts

import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(request: NextRequest) {
  try {
    if (!adminDb) {
      return NextResponse.json({ error: "DB not initialized" }, { status: 500 });
    }

    const { email, name } = await request.json();

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email required" }, { status: 400 });
    }

    // Check if already subscribed
    const existing = await adminDb
      .collection("newsletter_subscribers")
      .where("email", "==", email.toLowerCase().trim())
      .limit(1)
      .get();

    if (!existing.empty) {
      const doc = existing.docs[0].data();
      if (doc.status === "active") {
        return NextResponse.json({ message: "Already subscribed!" });
      }
      // Re-subscribe
      await existing.docs[0].ref.update({
        status: "active",
        resubscribedAt: FieldValue.serverTimestamp(),
      });
      return NextResponse.json({ message: "Welcome back! You've been re-subscribed." });
    }

    // New subscriber
    await adminDb.collection("newsletter_subscribers").add({
      email: email.toLowerCase().trim(),
      name: name || "",
      status: "active",
      subscribedAt: FieldValue.serverTimestamp(),
      source: "website",
    });

    return NextResponse.json({ message: "You're in! Watch for IOPPS Weekly every Monday." });
  } catch (error) {
    console.error("[Newsletter Subscribe]", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
