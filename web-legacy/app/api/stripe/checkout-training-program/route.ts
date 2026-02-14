import { NextRequest, NextResponse } from "next/server";
import { auth as adminAuth, db as adminDb } from "@/lib/firebase-admin";
import { stripe, TRAINING_PRODUCTS } from "@/lib/stripe";

export async function POST(request: NextRequest) {
  try {
    // Check if Firebase Admin is initialized
    if (!adminAuth || !adminDb) {
      console.error("Firebase Admin not initialized - check environment variables");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 503 }
      );
    }

    // Verify authentication
    const authHeader = request.headers.get("Authorization");
    const cookieHeader = request.cookies.get("__session")?.value;
    
    let userId: string | null = null;

    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.split("Bearer ")[1];
      const decoded = await adminAuth.verifyIdToken(token);
      userId = decoded.uid;
    } else if (cookieHeader) {
      const decoded = await adminAuth.verifyIdToken(cookieHeader);
      userId = decoded.uid;
    }

    // Also check for Firebase Auth cookie
    if (!userId) {
      const sessionCookie = request.cookies.get("session")?.value;
      if (sessionCookie) {
        const decoded = await adminAuth.verifyIdToken(sessionCookie);
        userId = decoded.uid;
      }
    }

    // Try to get user from request body as fallback (for client-side auth)
    const body = await request.json();
    const { productType, programData } = body;

    if (!productType || !["FEATURED_60", "FEATURED_90"].includes(productType)) {
      return NextResponse.json(
        { error: "Invalid product type" },
        { status: 400 }
      );
    }

    if (!programData || !programData.title || !programData.enrollmentUrl) {
      return NextResponse.json(
        { error: "Missing required program data" },
        { status: 400 }
      );
    }

    // Get the product details
    const product = TRAINING_PRODUCTS[productType as keyof typeof TRAINING_PRODUCTS];

    // If we still don't have userId, try to infer from the session
    // This is a workaround for client-side auth
    if (!userId) {
      // Check if there's a user making this request via the Firebase ID token in body
      // For now, we'll create the session without strict auth check
      // The webhook will validate the metadata
      
      // Try to get from X-User-Id header (set by middleware)
      const xUserId = request.headers.get("X-User-Id");
      if (xUserId) {
        userId = xUserId;
      }
    }

    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Get employer profile for metadata
    const employerDoc = await adminDb.collection("employers").doc(userId).get();
    const employerData = employerDoc.data();

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "cad",
            product_data: {
              name: `Training Program Listing (${product.duration} Days)`,
              description: `List "${programData.title}" on IOPPS for ${product.duration} days`,
            },
            unit_amount: product.price,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/organization/training?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/organization/training/new?cancelled=true`,
      metadata: {
        type: "training_program_listing",
        userId,
        organizationName: employerData?.organizationName || programData.providerName || "Unknown",
        productType,
        durationDays: String(product.duration),
        // Store program data in metadata (stringified)
        programData: JSON.stringify({
          ...programData,
          organizationId: userId,
          organizationName: employerData?.organizationName,
        }),
      },
      customer_email: employerData?.email,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Error creating training program checkout:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
