import { NextRequest, NextResponse } from "next/server";
import { auth, db } from "@/lib/firebase-admin";

export async function POST(req: NextRequest) {
    try {
        const authHeader = req.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const idToken = authHeader.split("Bearer ")[1];

        // Verify the admin's token
        const decodedToken = await auth.verifyIdToken(idToken);

        // Check if the user is actually an admin
        // We can check custom claims or look up the user in Firestore
        // For now, let's look up in Firestore as that's how the frontend checks
        const adminDoc = await db.collection("users").doc(decodedToken.uid).get();
        const adminData = adminDoc.data();

        if (!adminData || (adminData.role !== "admin" && adminData.role !== "moderator")) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // Restrict impersonation to super admins only
        const SUPER_ADMIN_EMAILS = (process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAILS || "")
            .split(",")
            .map((email) => email.trim().toLowerCase())
            .filter(Boolean);

        if (!decodedToken.email || !SUPER_ADMIN_EMAILS.includes(decodedToken.email.toLowerCase())) {
            return NextResponse.json({ error: "Forbidden: Only super admins can impersonate users." }, { status: 403 });
        }

        const body = await req.json();
        const { targetUserId } = body;

        if (!targetUserId) {
            return NextResponse.json({ error: "Missing targetUserId" }, { status: 400 });
        }

        // Create custom token for the target user
        const customToken = await auth.createCustomToken(targetUserId);

        return NextResponse.json({ token: customToken });
    } catch (error) {
        console.error("Error creating custom token:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
