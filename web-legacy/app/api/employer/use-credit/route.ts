import { NextRequest, NextResponse } from "next/server";
import { auth, db } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
    try {
        // Check if Firebase Admin is initialized
        if (!auth || !db) {
            console.error("Firebase Admin not initialized");
            return NextResponse.json(
                { error: "Server configuration error" },
                { status: 503 }
            );
        }

        // Verify authentication
        const authHeader = request.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const idToken = authHeader.split("Bearer ")[1];
        const decodedToken = await auth.verifyIdToken(idToken);
        const userId = decodedToken.uid;

        const body = await request.json();
        const { jobId } = body;

        if (!jobId) {
            return NextResponse.json(
                { error: "Missing jobId" },
                { status: 400 }
            );
        }

        // Verify employer has credits
        const employerRef = db.collection("employers").doc(userId);
        const employerDoc = await employerRef.get();
        
        if (!employerDoc.exists) {
            return NextResponse.json(
                { error: "Employer not found" },
                { status: 404 }
            );
        }

        const employerData = employerDoc.data();
        const currentCredits = employerData?.jobCredits || 0;

        if (currentCredits <= 0) {
            return NextResponse.json(
                { error: "No job credits available" },
                { status: 400 }
            );
        }

        // Decrement credits
        await employerRef.update({
            jobCredits: FieldValue.increment(-1),
            lastCreditUsedAt: new Date(),
            lastCreditUsedForJob: jobId,
        });

        return NextResponse.json({ 
            success: true, 
            remainingCredits: currentCredits - 1 
        });

    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to use credit";
        console.error("Use credit error:", error);
        return NextResponse.json(
            { error: message },
            { status: 500 }
        );
    }
}
