import { NextRequest, NextResponse } from "next/server";
import { auth, db } from "@/lib/firebase-admin";
import { rateLimiters, getRateLimitHeaders } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

// Valid campaign types that can be triggered
const VALID_CAMPAIGNS = [
    "conference-alerts",
    "powwow-alerts",
    "vendor-alerts",
    "weekly-digest",
    "job-alerts",
] as const;

type CampaignType = typeof VALID_CAMPAIGNS[number];

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

        if (!adminData || (adminData.role !== "admin" && adminData.role !== "moderator")) {
            return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
        }

        // Get campaign type from request
        const body = await req.json();
        const { campaignType, frequency = "weekly" } = body;

        if (!campaignType) {
            return NextResponse.json({ error: "Missing campaignType" }, { status: 400 });
        }

        if (!VALID_CAMPAIGNS.includes(campaignType as CampaignType)) {
            return NextResponse.json({
                error: `Invalid campaignType. Must be one of: ${VALID_CAMPAIGNS.join(", ")}`
            }, { status: 400 });
        }

        // Get the cron secret for internal API call
        const cronSecret = process.env.CRON_SECRET;
        if (!cronSecret) {
            console.error("CRON_SECRET not configured");
            return NextResponse.json({ error: "Server configuration error" }, { status: 503 });
        }

        // Build the internal API URL
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://iopps.ca";
        const apiUrl = `${baseUrl}/api/emails/send-${campaignType}`;

        console.log(`[Admin Trigger] ${decodedToken.email} triggering ${campaignType} campaign`);

        // Call the actual email endpoint with the cron secret
        const response = await fetch(apiUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${cronSecret}`,
            },
            body: JSON.stringify({ frequency }),
        });

        const result = await response.json();

        if (!response.ok) {
            console.error(`[Admin Trigger] Campaign ${campaignType} failed:`, result);
            return NextResponse.json({
                error: result.error || `Failed to trigger ${campaignType} campaign`,
            }, { status: response.status });
        }

        // Log the admin action
        try {
            await db.collection("audit_logs").add({
                action: "email_campaign_triggered",
                adminId: decodedToken.uid,
                adminEmail: decodedToken.email,
                campaignType,
                frequency,
                result,
                timestamp: new Date(),
                ipAddress: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown",
            });
        } catch (auditError) {
            console.error("Failed to create audit log:", auditError);
        }

        console.log(`[Admin Trigger] Campaign ${campaignType} completed:`, result);

        return NextResponse.json({
            success: true,
            message: result.message || `${campaignType} campaign triggered successfully`,
            ...result,
        });
    } catch (error) {
        console.error("Error triggering email campaign:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
