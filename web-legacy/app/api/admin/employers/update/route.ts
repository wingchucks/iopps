/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { auth, db } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { rateLimiters, getRateLimitHeaders } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Fields that admins can update
const ALLOWED_FIELDS = [
    "organizationName",
    "description",
    "website",
    "location",
    "contactEmail",
    "contactPhone",
    "industry",
    "companySize",
];

export async function POST(req: NextRequest) {
    // Rate limiting
    const rateLimitResult = rateLimiters.admin(req);
    if (!rateLimitResult.success) {
        return NextResponse.json(
            { error: "Too many requests", retryAfter: rateLimitResult.retryAfter },
            { status: 429, headers: getRateLimitHeaders(rateLimitResult) }
        );
    }

    try {
        // Check if Firebase Admin is initialized
        if (!auth || !db) {
            console.error("Firebase Admin not initialized");
            return NextResponse.json(
                { error: "Server configuration error" },
                { status: 503 }
            );
        }

        // Verify authorization
        const authHeader = req.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const idToken = authHeader.split("Bearer ")[1];
        const decodedToken = await auth.verifyIdToken(idToken);

        // Check if caller is admin
        const adminDoc = await db.collection("users").doc(decodedToken.uid).get();
        const adminData = adminDoc.data();

        if (!adminData || adminData.role !== "admin") {
            return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
        }

        // Get request body
        const body = await req.json();
        const { employerId, ...updateData } = body;

        if (!employerId) {
            return NextResponse.json({ error: "Missing employerId" }, { status: 400 });
        }

        // Verify employer exists
        const employerDoc = await db.collection("employers").doc(employerId).get();
        if (!employerDoc.exists) {
            return NextResponse.json({ error: "Employer not found" }, { status: 404 });
        }

        const employerData = employerDoc.data();

        // Filter to only allowed fields
        const filteredUpdate: Record<string, any> = {};
        const changedFields: Record<string, { old: any; new: any }> = {};

        for (const field of ALLOWED_FIELDS) {
            if (updateData[field] !== undefined) {
                filteredUpdate[field] = updateData[field];
                // Track changes for audit log
                if (employerData?.[field] !== updateData[field]) {
                    changedFields[field] = {
                        old: employerData?.[field] ?? null,
                        new: updateData[field],
                    };
                }
            }
        }

        if (Object.keys(filteredUpdate).length === 0) {
            return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
        }

        // Add metadata
        filteredUpdate.updatedAt = FieldValue.serverTimestamp();
        filteredUpdate.lastModifiedBy = decodedToken.uid;

        // Update employer document
        await db.collection("employers").doc(employerId).update(filteredUpdate);

        // Create audit log
        try {
            await db.collection("audit_logs").add({
                action: "employer_profile_updated",
                adminId: decodedToken.uid,
                adminEmail: decodedToken.email,
                targetEmployerId: employerId,
                employerName: employerData?.organizationName,
                changes: changedFields,
                timestamp: new Date(),
                ipAddress: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown",
            });
        } catch (auditError) {
            console.error("Failed to create audit log:", auditError);
        }

        console.log(`[AUDIT] Admin ${decodedToken.email} updated employer ${employerId} (${employerData?.organizationName}): ${Object.keys(changedFields).join(", ")}`);

        return NextResponse.json({
            success: true,
            message: "Employer profile updated successfully",
            updatedFields: Object.keys(filteredUpdate).filter(k => k !== "updatedAt" && k !== "lastModifiedBy"),
        });
    } catch (error) {
        console.error("Error updating employer:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
