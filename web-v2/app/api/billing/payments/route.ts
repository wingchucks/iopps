import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";
import { getFirestore } from "firebase-admin/firestore";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
    try {
        // Verify authentication
        const authHeader = request.headers.get("authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        if (!adminAuth) {
            return NextResponse.json({ error: "Firebase Admin not initialized" }, { status: 500 });
        }

        const token = authHeader.substring(7);
        const decodedToken = await adminAuth.verifyIdToken(token);
        const userId = decodedToken.uid;
        const db = getFirestore();

        // Fetch payments for this user
        const paymentsSnapshot = await db
            .collection("payments")
            .where("userId", "==", userId)
            .orderBy("createdAt", "desc")
            .limit(50)
            .get();

        const payments = paymentsSnapshot.docs.map((doc) => {
            const data = doc.data();
            return {
                id: doc.id,
                type: data.type,
                description: data.description,
                amount: data.amount,
                currency: data.currency || "cad",
                status: data.status,
                createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
                receiptUrl: data.receiptUrl || null,
                invoiceUrl: data.invoiceUrl || null,
                metadata: data.metadata || {},
            };
        });

        return NextResponse.json({ payments });
    } catch (error) {
        console.error("Error fetching payment history:", error);
        return NextResponse.json(
            { error: "Failed to fetch payment history" },
            { status: 500 }
        );
    }
}
