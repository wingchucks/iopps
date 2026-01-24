import { NextRequest, NextResponse } from "next/server";
import { auth, db } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export const dynamic = "force-dynamic";

// Submit a new inquiry (public - no auth required)
export async function POST(request: NextRequest) {
  try {
    if (!db) {
      return NextResponse.json({ error: "Database not initialized" }, { status: 500 });
    }

    const body = await request.json();
    const { vendorId, productId, senderName, senderEmail, senderPhone, subject, message } = body;

    // Validate required fields
    if (!vendorId || !senderName || !senderEmail || !subject || !message) {
      return NextResponse.json(
        { error: "Missing required fields: vendorId, senderName, senderEmail, subject, message" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(senderEmail)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
    }

    // Verify vendor exists and is active
    const vendorDoc = await db.collection("vendors").doc(vendorId).get();
    if (!vendorDoc.exists) {
      return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
    }

    const vendorData = vendorDoc.data();
    if (vendorData?.status !== "active") {
      return NextResponse.json({ error: "Vendor is not accepting inquiries" }, { status: 400 });
    }

    // Create the inquiry
    const inquiryRef = await db.collection("vendorInquiries").add({
      vendorId,
      productId: productId || null,
      senderName,
      senderEmail,
      senderPhone: senderPhone || null,
      subject,
      message,
      status: "new",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    // Increment inquiry count on vendor
    await db.collection("vendors").doc(vendorId).update({
      inquiryCount: FieldValue.increment(1),
    });

    return NextResponse.json({
      success: true,
      inquiryId: inquiryRef.id,
      message: "Inquiry submitted successfully",
    });
  } catch (error) {
    console.error("Error submitting inquiry:", error);
    return NextResponse.json(
      { error: "Failed to submit inquiry" },
      { status: 500 }
    );
  }
}

// Get inquiries for a vendor (authenticated vendor only)
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!auth || !db) {
      return NextResponse.json({ error: "Not initialized" }, { status: 500 });
    }

    const token = authHeader.substring(7);
    const decodedToken = await auth.verifyIdToken(token);
    const userId = decodedToken.uid;

    // Get vendor for this user
    const vendorsSnap = await db
      .collection("vendors")
      .where("userId", "==", userId)
      .limit(1)
      .get();

    if (vendorsSnap.empty) {
      return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
    }

    const vendorDoc = vendorsSnap.docs[0];
    const vendorId = vendorDoc.id;

    // Get filter from query params
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const limitParam = searchParams.get("limit");
    const limitNum = limitParam ? parseInt(limitParam, 10) : 50;

    // Build query
    let queryRef = db
      .collection("vendorInquiries")
      .where("vendorId", "==", vendorId)
      .orderBy("createdAt", "desc");

    if (status && status !== "all") {
      queryRef = queryRef.where("status", "==", status);
    }

    const inquiriesSnap = await queryRef.limit(limitNum).get();

    const inquiries = inquiriesSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString(),
      updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString(),
      repliedAt: doc.data().repliedAt?.toDate?.()?.toISOString(),
    }));

    // Get counts by status
    const allInquiriesSnap = await db
      .collection("vendorInquiries")
      .where("vendorId", "==", vendorId)
      .get();

    const counts = {
      total: allInquiriesSnap.size,
      new: 0,
      read: 0,
      replied: 0,
      archived: 0,
    };

    allInquiriesSnap.forEach((doc) => {
      const s = doc.data().status as keyof typeof counts;
      if (counts[s] !== undefined) {
        counts[s]++;
      }
    });

    return NextResponse.json({ inquiries, counts });
  } catch (error) {
    console.error("Error fetching inquiries:", error);
    return NextResponse.json(
      { error: "Failed to fetch inquiries" },
      { status: 500 }
    );
  }
}

// Update inquiry status
export async function PATCH(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!auth || !db) {
      return NextResponse.json({ error: "Not initialized" }, { status: 500 });
    }

    const token = authHeader.substring(7);
    const decodedToken = await auth.verifyIdToken(token);
    const userId = decodedToken.uid;

    const body = await request.json();
    const { inquiryId, status } = body;

    if (!inquiryId || !status) {
      return NextResponse.json(
        { error: "Missing inquiryId or status" },
        { status: 400 }
      );
    }

    // Validate status
    const validStatuses = ["new", "read", "replied", "archived"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    // Get the inquiry and verify ownership
    const inquiryDoc = await db.collection("vendorInquiries").doc(inquiryId).get();
    if (!inquiryDoc.exists) {
      return NextResponse.json({ error: "Inquiry not found" }, { status: 404 });
    }

    const inquiryData = inquiryDoc.data();

    // Verify vendor ownership
    const vendorDoc = await db.collection("vendors").doc(inquiryData?.vendorId).get();
    if (!vendorDoc.exists || vendorDoc.data()?.userId !== userId) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    // Update the inquiry
    const updateData: Record<string, unknown> = {
      status,
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (status === "replied") {
      updateData.repliedAt = FieldValue.serverTimestamp();
    }

    await db.collection("vendorInquiries").doc(inquiryId).update(updateData);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating inquiry:", error);
    return NextResponse.json(
      { error: "Failed to update inquiry" },
      { status: 500 }
    );
  }
}
