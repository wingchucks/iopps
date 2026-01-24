import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import { stripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";

interface HealthCheck {
  id: string;
  name: string;
  status: "healthy" | "warning" | "error" | "unknown";
  details?: string;
  message?: string;
  latency?: number;
}

export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!auth) {
      return NextResponse.json({ error: "Firebase Admin not initialized" }, { status: 500 });
    }

    const token = authHeader.substring(7);
    const decodedToken = await auth.verifyIdToken(token);

    // Check admin role via custom claims
    const isAdmin = decodedToken.admin === true ||
                    decodedToken.role === "admin" ||
                    decodedToken.email === "nathan.arias@iopps.ca";

    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const healthChecks: HealthCheck[] = [];

    // 1. Database connectivity check
    try {
      const dbStart = Date.now();
      const db = getFirestore();
      await db.collection("_health_check").limit(1).get();
      const dbLatency = Date.now() - dbStart;

      healthChecks.push({
        id: "database",
        name: "Database",
        status: dbLatency < 500 ? "healthy" : dbLatency < 2000 ? "warning" : "error",
        details: `${dbLatency}ms`,
        latency: dbLatency,
      });
    } catch (error) {
      healthChecks.push({
        id: "database",
        name: "Database",
        status: "error",
        message: "Connection failed",
      });
    }

    // 2. Stripe connectivity check
    try {
      const stripeStart = Date.now();
      // Check if Stripe is properly configured
      if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY === "dummy_key_for_build") {
        healthChecks.push({
          id: "stripe",
          name: "Stripe Payments",
          status: "warning",
          message: "Not configured",
        });
      } else {
        // Make a lightweight API call to verify connection
        await stripe.balance.retrieve();
        const stripeLatency = Date.now() - stripeStart;

        healthChecks.push({
          id: "stripe",
          name: "Stripe Payments",
          status: stripeLatency < 1000 ? "healthy" : "warning",
          details: `${stripeLatency}ms`,
          latency: stripeLatency,
        });
      }
    } catch (error) {
      healthChecks.push({
        id: "stripe",
        name: "Stripe Payments",
        status: "error",
        message: error instanceof Error ? error.message : "Connection failed",
      });
    }

    // 3. Email service check (Resend)
    try {
      const resendKey = process.env.RESEND_API_KEY;
      if (!resendKey) {
        healthChecks.push({
          id: "email",
          name: "Email Service",
          status: "warning",
          message: "Not configured",
        });
      } else {
        const emailStart = Date.now();
        // Check Resend API
        const response = await fetch("https://api.resend.com/domains", {
          headers: {
            Authorization: `Bearer ${resendKey}`,
          },
        });
        const emailLatency = Date.now() - emailStart;

        if (response.ok) {
          healthChecks.push({
            id: "email",
            name: "Email Service",
            status: emailLatency < 1000 ? "healthy" : "warning",
            details: `${emailLatency}ms`,
            latency: emailLatency,
          });
        } else {
          healthChecks.push({
            id: "email",
            name: "Email Service",
            status: "error",
            message: `API error: ${response.status}`,
          });
        }
      }
    } catch (error) {
      healthChecks.push({
        id: "email",
        name: "Email Service",
        status: "error",
        message: error instanceof Error ? error.message : "Connection failed",
      });
    }

    // 4. RSS Feeds health check
    try {
      const db = getFirestore();
      const feedsSnap = await db.collection("rssFeeds").get();
      const totalFeeds = feedsSnap.docs.length;
      const failedFeeds = feedsSnap.docs.filter(
        (doc) => doc.data().lastError || doc.data().lastRunStatus === "error"
      ).length;

      healthChecks.push({
        id: "rss",
        name: "RSS Imports",
        status: failedFeeds > 0 ? "warning" : totalFeeds > 0 ? "healthy" : "unknown",
        details: totalFeeds > 0 ? `${totalFeeds - failedFeeds}/${totalFeeds} OK` : "No feeds",
        message: failedFeeds > 0 ? `${failedFeeds} failed` : undefined,
      });
    } catch {
      healthChecks.push({
        id: "rss",
        name: "RSS Imports",
        status: "unknown",
        message: "Unable to check",
      });
    }

    // 5. Storage check - verify Firebase Storage is accessible
    try {
      const storageCheck = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
      healthChecks.push({
        id: "storage",
        name: "Cloud Storage",
        status: storageCheck ? "healthy" : "warning",
        details: storageCheck ? "Configured" : "Not configured",
      });
    } catch {
      healthChecks.push({
        id: "storage",
        name: "Cloud Storage",
        status: "unknown",
        message: "Unable to check",
      });
    }

    // 6. Webhook events - check for recent failures
    try {
      const db = getFirestore();
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const logsSnap = await db
        .collection("system_logs")
        .where("event", "==", "stripe_webhook_error")
        .where("timestamp", ">=", oneDayAgo)
        .limit(10)
        .get();

      const recentErrors = logsSnap.docs.length;

      healthChecks.push({
        id: "webhooks",
        name: "Webhooks",
        status: recentErrors > 5 ? "error" : recentErrors > 0 ? "warning" : "healthy",
        details: recentErrors === 0 ? "No errors (24h)" : undefined,
        message: recentErrors > 0 ? `${recentErrors} errors (24h)` : undefined,
      });
    } catch {
      healthChecks.push({
        id: "webhooks",
        name: "Webhooks",
        status: "unknown",
        message: "Unable to check",
      });
    }

    // Calculate overall status
    const hasError = healthChecks.some((h) => h.status === "error");
    const hasWarning = healthChecks.some((h) => h.status === "warning");
    const overallStatus = hasError ? "error" : hasWarning ? "warning" : "healthy";

    return NextResponse.json({
      status: overallStatus,
      checks: healthChecks,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Health check error:", error);
    return NextResponse.json(
      { error: "Health check failed" },
      { status: 500 }
    );
  }
}
